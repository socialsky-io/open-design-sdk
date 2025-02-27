import { RenderingArtboard } from './rendering-artboard'

import { dirname } from 'path'
import { sequence } from './utils/async-utils'
import { serializeBounds } from './utils/bounds-utils'
import mkdirp from 'mkdirp'

import type { Bounds } from './types/bounds.type'
import type { LayerAttributesConfig } from './types/layer-attributes.type'
import type { IRenderingDesign } from './types/rendering-design.iface'
import type { RenderingSession } from './rendering-session'
import type { LayerBounds } from './index'

export class RenderingDesign implements IRenderingDesign {
  readonly id: string
  readonly bitmapAssetDirectoryPath: string | null

  private _fontDirectoryPath: string | null
  private _renderingSession: RenderingSession
  private _console: Console

  private _artboards: Map<string, RenderingArtboard> = new Map()
  private _loadedBitmaps: Set<string> = new Set()
  private _loadedFonts: Set<string> = new Set()

  constructor(params: {
    id: string
    bitmapAssetDirectoryPath: string | null
    fontDirectoryPath: string | null
    renderingSession: RenderingSession
    console?: Console | null
  }) {
    this.id = params.id
    this.bitmapAssetDirectoryPath = params.bitmapAssetDirectoryPath || null

    this._fontDirectoryPath = params.fontDirectoryPath || null
    this._renderingSession = params.renderingSession
    this._console = params.console || console
  }

  get fontDirectoryPath(): string | null {
    return this._fontDirectoryPath
  }

  setFontDirectory(fontDirectoryPath: string | null): void {
    this._fontDirectoryPath = fontDirectoryPath
  }

  isArtboardLoaded(artboardId: string): boolean {
    const artboard = this._artboards.get(artboardId)
    return Boolean(artboard)
  }

  isArtboardReady(artboardId: string): boolean {
    const artboard = this._artboards.get(artboardId)
    return Boolean(artboard?.ready)
  }

  async loadArtboard(
    artboardId: string,
    params: {
      octopusFilename: string
      symbolId?: string | null
      pageId?: string | null
      offset?: { x: number; y: number } | null
    }
  ): Promise<RenderingArtboard> {
    const prevArtboard = this._artboards.get(artboardId)
    if (prevArtboard) {
      return prevArtboard
    }

    const artboard = new RenderingArtboard(artboardId, {
      designId: this.id,
      renderingSession: this._renderingSession,
      console: this._console,
      pageId: params.pageId || null,
      symbolId: params.symbolId || null,
      ready: false,
    })
    this._artboards.set(artboardId, artboard)

    await artboard.load({
      octopusFilename: params.octopusFilename,
      bitmapAssetDirectoryPath: this.bitmapAssetDirectoryPath,
      fontDirectoryPath: this.fontDirectoryPath,
      offset: params.offset || null,
    })

    return artboard
  }

  async loadFont(
    postscriptName: string,
    filename: string,
    options: {
      facePostscriptName?: string | null
    }
  ): Promise<void> {
    if (this._loadedFonts.has(postscriptName)) {
      return
    }

    this._loadedFonts.add(postscriptName)

    await this._renderingSession.execCommand('load-font', {
      'design': this.id,
      'key': postscriptName,
      'file': filename,
      ...(options.facePostscriptName
        ? { 'face-name': options.facePostscriptName }
        : {}),
    })
  }

  async loadImage(bitmapKey: string, filename: string): Promise<void> {
    if (this._loadedBitmaps.has(bitmapKey)) {
      return
    }

    await this._renderingSession.execCommand('load-image', {
      'design': this.id,
      'key': bitmapKey,
      'file': filename,
    })

    this._loadedBitmaps.add(bitmapKey)
  }

  async markArtboardAsReady(artboardId: string): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.markAsReady()
  }

  async renderArtboardToFile(
    artboardId: string,
    filePath: string,
    options: { scale?: number; bounds?: Bounds } = {}
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.renderToFile(filePath, options)
  }

  async renderPageToFile(
    pageId: string,
    filePath: string,
    options: { scale?: number; bounds?: Bounds } = {}
  ): Promise<void> {
    await mkdirp(dirname(filePath))

    const result = await this._renderingSession.execCommand('render-page', {
      'design': this.id,
      'page': pageId,
      'file': filePath,
      'scale': options.scale || 1,
      ...(options.bounds ? { 'bounds': serializeBounds(options.bounds) } : {}),
    })
    if (!result['ok']) {
      this._console.error('Rendering:', 'render-page', '->', result)
      throw new Error('Failed to render page')
    }
  }

  async renderArtboardLayerToFile(
    artboardId: string,
    layerId: string,
    filePath: string,
    options: LayerAttributesConfig & {
      scale?: number
      bounds?: Bounds
    } = {}
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.renderLayerToFile(layerId, filePath, options)
  }

  async renderArtboardLayersToFile(
    artboardId: string,
    layerIds: Array<string>,
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    } = {}
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.renderLayersToFile(layerIds, filePath, options)
  }

  getArtboardLayerCompositionBounds(
    artboardId: string,
    layerIds: Array<string>,
    options?: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
    }
  ): Promise<Bounds> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.getLayerCompositionBounds(layerIds, options)
  }

  async getArtboardLayerBounds(
    artboardId: string,
    layerId: string
  ): Promise<LayerBounds> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.getLayerBounds(layerId)
  }

  async getArtboardLayerAtPosition(
    artboardId: string,
    x: number,
    y: number
  ): Promise<string | null> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.getLayerAtPosition(x, y)
  }

  async getArtboardLayersInArea(
    artboardId: string,
    bounds: Bounds,
    options?: { partialOverlap?: boolean }
  ): Promise<Array<string>> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.getLayersInArea(bounds, options)
  }

  async unloadArtboards(): Promise<void> {
    await sequence([...this._artboards.entries()], async ([artboardId]) => {
      return this.unloadArtboard(artboardId)
    })
  }

  async unloadArtboard(artboardId: string): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    await artboard.unload()

    this._artboards.delete(artboardId)
  }

  async destroy(): Promise<void> {
    await this._renderingSession.destroy()
  }
}
