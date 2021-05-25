import { Bitmap } from '../layer-info/bitmap'
import { Effects } from '../layer-info/effects'
import { LayerCollection } from '../collections/layer-collection'
import { Shape } from '../layer-info/shape'
import { Text } from '../layer-info/text'

import {
  keepUniqueBitmapAssetDescriptors,
  keepUniqueFontDescriptors,
} from '../utils/assets-utils'
import { getLayerBitmapAssets } from '../utils/layer-bitmaps-utils'
import { createLayers } from '../utils/layer-factories-utils'
import { matchLayer } from '../utils/layer-lookup-utils'
import { memoize } from '../utils/memoize-utils'

import type { IArtboard } from '../types/artboard.iface'
import type { IBitmap } from '../types/bitmap.iface'
import type { AggregatedBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { IEffects } from '../types/effects.iface'
import type {
  AggregatedFontDescriptor,
  FontDescriptor,
} from '../types/fonts.type'
import type { LayerId } from '../types/ids.type'
import type { ILayer } from '../types/layer.iface'
import type { ILayerCollection } from '../types/layer-collection.iface'
import type { ComponentId, LayerOctopusData } from '../types/octopus.type'
import type { FileLayerSelector, LayerSelector } from '../types/selectors.type'
import type { IShape } from '../types/shape.iface'
import type { IText } from '../types/text.iface'
import { BitmapMask } from '../layer-info/bitmap-mask'
import { IBitmapMask } from '../types/bitmap-mask.iface'

export class Layer implements ILayer {
  readonly octopus: LayerOctopusData

  private _artboard: IArtboard | null
  private _parentLayerId: LayerId | null

  constructor(
    layerOctopus: LayerOctopusData,
    params: Partial<{
      parentLayerId: LayerId | null
      artboard: IArtboard | null
    }> = {}
  ) {
    this.octopus = layerOctopus

    this._artboard = params.artboard || null
    this._parentLayerId = params.parentLayerId || null
  }

  get id() {
    return this.octopus['id']
  }

  get name() {
    return this.octopus['name'] == null ? null : this.octopus['name']
  }

  get type() {
    return this.octopus['type']
  }

  get artboardId() {
    return this._artboard?.id || null
  }

  getArtboard(): IArtboard | null {
    return this._artboard
  }

  isRootLayer() {
    return !this._parentLayerId
  }

  getDepth(): number {
    const parentLayerId = this._parentLayerId
    if (!parentLayerId) {
      return 1
    }

    const artboard = this._artboard
    if (!artboard) {
      throw new Error('Cannot determine detached layer depth')
    }

    const parentLayerDepth = artboard.getLayerDepth(parentLayerId)
    if (parentLayerDepth === null) {
      throw new Error('Cannot determine parent layer depth')
    }

    return 1 + parentLayerDepth
  }

  getParentLayerId(): LayerId | null {
    return this._parentLayerId
  }

  getParentLayer(): ILayer | null {
    const parentLayerId = this._parentLayerId
    if (!parentLayerId) {
      return null
    }

    const artboard = this._artboard
    if (!artboard) {
      throw new Error('Cannot retrieve the parent layer of a detached layer')
    }

    const parentLayer = artboard.getLayerById(parentLayerId)
    if (!parentLayer) {
      throw new Error('Cannot retrieve the parent layer')
    }

    return parentLayer
  }

  getParentLayerIds(): Array<LayerId> {
    const parentLayer = this.getParentLayer()

    return parentLayer
      ? [parentLayer.id, ...parentLayer.getParentLayerIds()]
      : []
  }

  getParentLayers(): ILayerCollection {
    const parentLayer = this.getParentLayer()
    return parentLayer
      ? new LayerCollection([parentLayer]).concat(parentLayer.getParentLayers())
      : new LayerCollection([])
  }

  findParentLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean)
  ): ILayer | null {
    const parentLayers = this.getParentLayers()
    return parentLayers.findLayer(selector, { depth: 1 })
  }

  findParentLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean)
  ): ILayerCollection {
    const parentLayers = this.getParentLayers()
    return parentLayers.findLayers(selector, { depth: 1 })
  }

  hasNestedLayers(): boolean {
    return Boolean(
      'layers' in this.octopus &&
        this.octopus['layers'] &&
        this.octopus['layers'].length > 0
    )
  }

  getNestedLayers = memoize(
    (options: Partial<{ depth: number }> = {}): ILayerCollection => {
      const depth = options.depth || 1

      const nestedLayers = this._getDirectlyNestedLayers()

      return depth === 1
        ? nestedLayers
        : nestedLayers.flatten({ depth: depth - 1 })
    },
    2
  )

  findNestedLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options: Partial<{ depth: number }> = {}
  ): ILayer | null {
    const depth = options.depth || Infinity
    const nestedLayers = this._getDirectlyNestedLayers()

    return nestedLayers.findLayer(selector, { depth })
  }

  findNestedLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options: Partial<{ depth: number }> = {}
  ): ILayerCollection {
    const depth = options.depth || Infinity
    const nestedLayers = this._getDirectlyNestedLayers()

    return nestedLayers.findLayers(selector, { depth })
  }

  _getDirectlyNestedLayers = memoize(
    (): ILayerCollection => {
      const nestedLayerDataList =
        'layers' in this.octopus ? this.octopus['layers'] || [] : []

      return new LayerCollection(
        createLayers(nestedLayerDataList, {
          parentLayerId: this.id,
          artboard: this._artboard,
        })
      )
    }
  )

  matches(selector: FileLayerSelector): boolean {
    return matchLayer(selector, this)
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedBitmapAssetDescriptor> {
    const layerBitmapAssetDescs = this._createBitmapAssetDescriptors({
      includePrerendered: options.includePrerendered !== false,
    }).map((desc) => {
      const { layerId, ...data } = desc
      return { ...data, layerIds: [layerId] }
    })

    const depth = options.depth || Infinity
    const nestedLayerBitmapAssetDescs =
      depth === 1
        ? []
        : this.getNestedLayers({ depth: 1 }).flatMap((nestedLayer) => {
            return nestedLayer.getBitmapAssets({
              ...options,
              depth: depth - 1,
            })
          })

    return keepUniqueBitmapAssetDescriptors([
      ...layerBitmapAssetDescs,
      ...nestedLayerBitmapAssetDescs,
    ])
  }

  getFonts(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedFontDescriptor> {
    const layerFontDescs = this._createFontDescriptors().map((desc) => {
      const { layerId, ...data } = desc
      return { ...data, layerIds: [layerId] }
    })

    const depth = options.depth || Infinity
    const nestedLayerFontDescs =
      depth === 1
        ? []
        : this.getNestedLayers({ depth: 1 }).flatMap((nestedLayer) => {
            return nestedLayer.getFonts({
              ...options,
              depth: depth - 1,
            })
          })

    return keepUniqueFontDescriptors([
      ...layerFontDescs,
      ...nestedLayerFontDescs,
    ])
  }

  isMasked(): boolean {
    return Boolean(this.octopus['clipped'])
  }

  getMaskLayerId(): LayerId | null {
    return this.octopus['maskedBy'] || null
  }

  getMaskLayer(): ILayer | null {
    const maskLayerId = this.getMaskLayerId()
    if (!maskLayerId) {
      return null
    }

    const artboard = this._artboard
    if (!artboard) {
      throw new Error('Cannot retrieve a detached layer mask')
    }

    const maskLayer = artboard.getLayerById(maskLayerId)
    if (!maskLayer) {
      throw new Error('Cannot retrieve the mask layer')
    }

    return maskLayer
  }

  isInlineArtboard(): boolean {
    return Boolean('artboard' in this.octopus && this.octopus['artboard'])
  }

  isComponentInstance(): boolean {
    return Boolean(
      this.octopus['symbolID'] ||
        ('documentId' in this.octopus && this.octopus['documentId'])
    )
  }

  getComponentId(): ComponentId | null {
    return this.octopus['symbolID'] || null
  }

  getComponentArtboard(): IArtboard | null {
    const componentArtboardId =
      'documentId' in this.octopus ? this.octopus['documentId'] : null
    const componentId = this.octopus['symbolID']
    if (!componentArtboardId && !componentId) {
      return null
    }

    const artboard = this._artboard
    if (!artboard) {
      throw new Error('Cannot retrieve detached layer component artboard info')
    }

    const file = artboard.getFile()
    if (!file) {
      throw new Error(
        'Cannot retrieve detached artboard layer component artboard info'
      )
    }

    return componentArtboardId
      ? file.getArtboardById(componentArtboardId)
      : componentId
      ? file.getArtboardByComponentId(componentId)
      : null
  }

  hasComponentOverrides(): boolean {
    return Boolean(
      this.octopus['overrides'] && this.octopus['overrides'].length > 0
    )
  }

  getBitmap = memoize((): IBitmap | null => {
    return this.type === 'layer' && this.octopus['bitmap']
      ? new Bitmap(this.octopus['bitmap'])
      : null
  })

  getPrerenderedBitmap = memoize((): IBitmap | null => {
    return this.type !== 'layer' && this.octopus['bitmap']
      ? new Bitmap(this.octopus['bitmap'])
      : null
  })

  getBitmapMask = memoize((): IBitmapMask | null => {
    return this.octopus['bitmapMask']
      ? new BitmapMask(this.octopus['bitmapMask'])
      : null
  })

  getShape = memoize((): IShape | null => {
    return this.octopus['shape'] ? new Shape(this.octopus['shape']) : null
  })

  getText = memoize((): IText | null => {
    return 'text' in this.octopus && this.octopus['text']
      ? new Text(this.octopus['text'])
      : null
  })

  getEffects = memoize(
    (): IEffects => {
      return new Effects(this.octopus['effects'] || {})
    }
  )

  _createBitmapAssetDescriptors = memoize(
    (params: { includePrerendered: boolean }) => {
      return getLayerBitmapAssets(this, params)
    },
    2
  )

  _createFontDescriptors = memoize(
    (): Array<FontDescriptor> => {
      const layerId = this.id
      const text = this.getText()
      const fonts = text ? text.getFonts() : []

      return fonts.map((fontDesc) => {
        return {
          ...fontDesc,
          layerId,
        }
      })
    }
  )
}
