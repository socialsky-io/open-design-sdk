import { dirname } from 'path'
import { sequence } from './utils/async-utils'
import { mergeBounds, parseBounds, serializeBounds } from './utils/bounds-utils'
import { serializeLayerAttributes } from './utils/layer-attributes-utils'
import mkdirp from 'mkdirp'
import { v4 as uuid } from 'uuid'

import type { RenderingProcess } from './rendering-process'
import type { Bounds } from './types/bounds.type'
import type { LayerAttributes } from './types/commands.type'
import type {
  IRenderingArtboard,
  LayerBounds,
} from './types/rendering-artboard.iface'
import type { LayerAttributesConfig } from './types/layer-attributes.type'

export class RenderingArtboard implements IRenderingArtboard {
  readonly id: string
  readonly symbolId: string | null

  private _renderingProcess: RenderingProcess
  private _console: Console

  private _designId: string
  private _pageId: string | null

  private _ready: boolean
  private _pendingSymbolIds: Array<string>

  constructor(
    id: string,
    params: {
      renderingProcess: RenderingProcess
      console?: Console | null
      designId: string
      symbolId?: string | null
      pageId?: string | null
      ready?: boolean
      pendingSymbolIds?: Array<string>
    }
  ) {
    this.id = id
    this.symbolId = params.symbolId || null

    this._renderingProcess = params.renderingProcess
    this._console = params.console || console

    this._designId = params.designId
    this._pageId = params.pageId || null

    this._pendingSymbolIds = params.pendingSymbolIds || []
    this._ready = params.ready !== false && this._pendingSymbolIds.length === 0
  }

  get ready(): boolean {
    return this._ready
  }

  get pendingSymbolIds(): Array<string> {
    return this._pendingSymbolIds
  }

  async load(params: {
    octopusFilename: string
    bitmapAssetDirectoryPath?: string | null
    fontDirectoryPath?: string | null
    offset?: { x: number; y: number } | null
  }): Promise<void> {
    const loadResult = await this._renderingProcess.execCommand(
      'load-artboard',
      {
        'design': this._designId,
        'artboard': this.id,
        'file': params.octopusFilename,
        'assetpath': params.bitmapAssetDirectoryPath,
        'fontpath': params.fontDirectoryPath,
        'page': this._pageId,
        ...(this.symbolId ? { 'symbol': this.symbolId } : {}),
      }
    )

    if (!loadResult['ok']) {
      throw new Error('Failed to load design artboard')
    }

    const pendingSymbolIds = await this._getPendingArtboardDependencies()
    this._pendingSymbolIds = pendingSymbolIds
  }

  async setPage(nextPageId: string | null): Promise<void> {
    const setPageResult = await this._renderingProcess.execCommand(
      'set-artboard-page',
      {
        'design': this._designId,
        'artboard': this.id,
        'page': nextPageId,
      }
    )
    if (!setPageResult['ok']) {
      throw new Error('Failed to assign artboard')
    }

    this._pageId = nextPageId
  }

  async setOffset(nextOffset: { x: number; y: number }): Promise<void> {
    const setOffsetResult = await this._renderingProcess.execCommand(
      'set-artboard-offset',
      {
        'design': this._designId,
        'artboard': this.id,
        'offset': [nextOffset.x, nextOffset.y],
      }
    )
    if (!setOffsetResult['ok']) {
      throw new Error('Failed to update artboard offset')
    }
  }

  async _getPendingArtboardDependencies(): Promise<Array<string>> {
    const dependencyResult = await this._renderingProcess.execCommand(
      'get-artboard-dependencies',
      {
        'design': this._designId,
        'artboard': this.id,
      }
    )
    if (!dependencyResult['ok']) {
      throw new Error('Failed to get pending artboard dependency list')
    }

    return dependencyResult['symbols'] || []
  }

  async markAsReady(): Promise<void> {
    const finalizeResult = await this._renderingProcess.execCommand(
      'finalize-artboard',
      {
        'design': this._designId,
        'artboard': this.id,
      }
    )
    if (!finalizeResult['ok']) {
      throw new Error('The artboard cannot be marked as ready')
    }

    this._ready = true
  }

  async renderToFile(
    filePath: string,
    options: { scale?: number; bounds?: Bounds } = {}
  ): Promise<void> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    await mkdirp(dirname(filePath))

    const result = await this._renderingProcess.execCommand('render-artboard', {
      'design': this._designId,
      'artboard': this.id,
      'file': filePath,
      'scale': options.scale || 1,
      ...(options.bounds ? { 'bounds': serializeBounds(options.bounds) } : {}),
    })
    if (!result['ok']) {
      this._console.error('Rendering:', 'render-artboard', '->', result)
      throw new Error('Failed to render artboard')
    }
  }

  async renderLayerToFile(
    layerId: string,
    filePath: string,
    options: LayerAttributesConfig & {
      scale?: number
      bounds?: Bounds
    } = {}
  ): Promise<void> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    const { bounds: boundsOverride, scale = 1, ...layerAttributes } = options

    const bounds =
      boundsOverride ||
      (await this._getLayerRenderBounds(layerId, layerAttributes))

    return this.renderLayersToFile([layerId], filePath, {
      layerAttributes: { [layerId]: layerAttributes },
      scale,
      bounds,
    })
  }

  async renderLayersToFile(
    layerIds: Array<string>,
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    } = {}
  ): Promise<void> {
    const [{ imageName, releaseImage }] = await Promise.all([
      this._composeLayers(layerIds, options),
      mkdirp(dirname(filePath)),
    ])

    const result = await this._renderingProcess.execCommand('save-image', {
      'image': imageName,
      'file': filePath,
    })

    await releaseImage()

    if (!result['ok']) {
      this._console.error('Rendering: save-image', '->', result)
      throw new Error('Failed to save layer composition')
    }
  }

  async getLayerBounds(layerId: string): Promise<LayerBounds> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    const result = await this._renderingProcess.execCommand('get-layer', {
      'design': this._designId,
      'artboard': this.id,
      'layer': layerId,
    })
    if (!result['ok']) {
      this._console.error('Rendering:', 'get-layer', '->', result)
      throw new Error('Failed to retrieve artboard layer info')
    }

    return {
      bounds: parseBounds(result['bounds']),
      fullBounds: parseBounds(result['full-bounds']),
      affectedBounds: parseBounds(result['affected-bounds']),
      logicalBounds: parseBounds(result['logical-bounds']),
      untransformedBounds: parseBounds(result['untransformed-bounds']),
    }
  }

  async getLayerCompositionBounds(
    layerIds: Array<string>,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
    } = {}
  ): Promise<Bounds> {
    const { imageName, releaseImage } = await this._composeLayers(
      layerIds,
      options
    )

    const result = await this._renderingProcess.execCommand('get-image', {
      'image': imageName,
    })

    await releaseImage()

    if (!result['ok']) {
      this._console.error('Rendering:', 'get-image', '->', result)
      throw new Error('Failed to trim image')
    }

    return parseBounds(result['bounds'])
  }

  async getLayerAtPosition(x: number, y: number): Promise<string | null> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    const result = await this._renderingProcess.execCommand('identify-layer', {
      'design': this._designId,
      'artboard': this.id,
      'position': [x, y],
    })
    if (!result['ok']) {
      this._console.error('Rendering:', 'identify-layer', '->', result)
      throw new Error('Failed to retrieve artboard layer info')
    }

    return result['layer'] || null
  }

  async getLayersInArea(
    bounds: Bounds,
    options: { partialOverlap?: boolean } = {}
  ): Promise<Array<string>> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    const result = await this._renderingProcess.execCommand('identify-layers', {
      'design': this._designId,
      'artboard': this.id,
      'bounds': serializeBounds(bounds),
      'policy': options.partialOverlap ? 'partial' : 'partial-external',
    })
    if (!result['ok']) {
      this._console.error('Rendering:', 'identify-layers', '->', result)
      throw new Error('Failed to retrieve artboard layer info')
    }

    return result['layers']
  }

  async unload(): Promise<void> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    this._ready = false

    const result = await this._renderingProcess.execCommand('unload-artboard', {
      'design': this._designId,
      'artboard': this.id,
    })

    if (!result['ok']) {
      this._console.error('Rendering:', 'unload-artboard', '-', result)
      throw new Error('Failed to unload artboard')
    }
  }

  async _getLayerRenderBounds(
    layerId: string,
    layerAttributes: LayerAttributesConfig
  ): Promise<Bounds> {
    const layerBounds = await this.getLayerBounds(layerId)
    return layerAttributes.includeEffects
      ? layerBounds.fullBounds
      : layerBounds.bounds
  }

  async _getCompoundLayerRenderBounds(
    layerIds: Array<string>,
    layerAttributes: Record<string, LayerAttributesConfig>
  ): Promise<Bounds> {
    if (layerIds.length === 0) {
      throw new Error('Empty layer list provided')
    }

    const layerBoundsList = await sequence(layerIds, async (layerId) => {
      return this._getLayerRenderBounds(layerId, layerAttributes[layerId] || {})
    })

    return layerBoundsList.reduce((compoundBounds, partialBounds) => {
      return mergeBounds(compoundBounds, partialBounds)
    })
  }

  async _composeLayers(
    layerIds: Array<string>,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    }
  ): Promise<{
    imageName: string
    releaseImage: () => void
  }> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    const layerAttributes = options.layerAttributes || {}
    const bounds =
      options.bounds ||
      (await this._getCompoundLayerRenderBounds(layerIds, layerAttributes))

    const imageName = uuid()

    const result = await this._renderingProcess.execCommand(
      'render-artboard-composition',
      {
        'design': this._designId,
        'artboard': this.id,
        'bounds': serializeBounds(bounds),
        'scale': options.scale || 1,
        'background': { 'enable': false },
        'draw-shown-only': true,
        'layer-attributes': layerIds.map((layerId): LayerAttributes & {
          'layer': string
        } => {
          return {
            'layer': layerId,
            'visibility': 'force-show',
            ...serializeLayerAttributes(layerAttributes[layerId] || {}),
          }
        }),
        'image': imageName,
      }
    )
    if (!result['ok']) {
      this._console.error(
        'Rendering: render-artboard-composition',
        '->',
        result
      )
      throw new Error('Failed to render artboard layers')
    }

    return {
      imageName,
      releaseImage: () => {
        return this._renderingProcess.execCommand('release-image', {
          'image': imageName,
        })
      },
    }
  }
}
