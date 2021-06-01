import {
  keepUniqueDesignBitmapAssetDescriptors,
  keepUniqueDesignFontDescriptors,
} from '../utils/assets-utils'
import { createLayerMap } from '../utils/layer-factories-utils'
import {
  findLayerInLayers,
  findLayersInLayers,
} from '../utils/layer-lookup-utils'

import type { ILayerCollection } from '../types/layer-collection.iface'
import type { LayerId } from '../types/ids.type'
import type { ILayer } from '../types/layer.iface'
import type { LayerSelector } from '../types/selectors.type'
import type { AggregatedDesignBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { AggregatedDesignFontDescriptor } from '../types/fonts.type'

export class LayerCollection implements ILayerCollection {
  readonly length: number

  private _layerList: Array<ILayer>
  private _layersById: Record<LayerId, ILayer>

  constructor(layerList: Array<ILayer>) {
    this.length = layerList.length

    this._layerList = layerList

    this._layersById = createLayerMap(layerList)
  }

  [Symbol.iterator](): Iterator<ILayer> {
    return this._layerList[Symbol.iterator]()
  }

  getLayers(): Array<ILayer> {
    return this._layerList
  }

  getLayerById(layerId: LayerId): ILayer | null {
    return this._layersById[layerId] || null
  }

  findLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options: Partial<{ depth: number }> = {}
  ): ILayer | null {
    return findLayerInLayers(selector, this._layerList, options)
  }

  findLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options: Partial<{ depth: number }> = {}
  ): ILayerCollection {
    const matchedLayers = findLayersInLayers(selector, this._layerList, options)
    return new LayerCollection(matchedLayers)
  }

  filter(
    filter: (layer: ILayer, index: number, layers: Array<ILayer>) => boolean
  ): ILayerCollection {
    const filteredLayers = this.getLayers().filter(filter)
    return new LayerCollection(filteredLayers)
  }

  forEach(
    fn: (layer: ILayer, index: number, layers: Array<ILayer>) => boolean
  ): void {
    this.getLayers().forEach(fn)
  }

  map<T>(
    mapper: (layer: ILayer, index: number, layers: Array<ILayer>) => T
  ): Array<T> {
    return this.getLayers().map(mapper)
  }

  flatMap<T>(
    mapper: (layer: ILayer, index: number, layers: Array<ILayer>) => Array<T>
  ): Array<T> {
    return this.getLayers().flatMap(mapper)
  }

  reduce<T>(
    reducer: (state: T, layer: ILayer, index: number) => T,
    initialValue: T
  ): T {
    return this.getLayers().reduce(reducer, initialValue)
  }

  concat(addedLayers: Array<ILayer> | ILayerCollection): ILayerCollection {
    const addedLayerList = Array.isArray(addedLayers)
      ? addedLayers
      : addedLayers.getLayers()
    const layers = [...this.getLayers(), ...addedLayerList]

    return new LayerCollection(layers)
  }

  flatten(options: Partial<{ depth: number }> = {}): ILayerCollection {
    const depth = options.depth || Infinity

    const flattenedLayers = this.getLayers().flatMap((layer) => {
      const nestedLayers = layer.getNestedLayers({ depth }).filter((layer) => {
        return !this._layersById[layer.id]
      })

      return [layer, ...nestedLayers]
    })

    return new LayerCollection(flattenedLayers)
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedDesignBitmapAssetDescriptor> {
    return keepUniqueDesignBitmapAssetDescriptors(
      this.getLayers().flatMap((layer) => {
        return layer.getBitmapAssets(options).flatMap((bitmapAssetDesc) => {
          const artboardId = layer.artboardId
          if (!artboardId) {
            return []
          }

          const { layerIds, ...desc } = bitmapAssetDesc
          return [{ ...desc, artboardLayerIds: { [artboardId]: layerIds } }]
        })
      })
    )
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedDesignFontDescriptor> {
    return keepUniqueDesignFontDescriptors(
      this.getLayers().flatMap((layer) => {
        return layer.getFonts(options).flatMap((fontDesc) => {
          const artboardId = layer.artboardId
          if (!artboardId) {
            return []
          }

          const { layerIds, ...desc } = fontDesc
          return [{ ...desc, artboardLayerIds: { [artboardId]: layerIds } }]
        })
      })
    )
  }
}
