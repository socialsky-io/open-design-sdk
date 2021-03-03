import { memoize } from '@opendesign/octopus-reader/src/utils/memoize'

import type {
  AggregatedBitmapAssetDescriptor,
  AggregatedFontDescriptor,
  ILayerCollection,
  LayerId,
  LayerSelector,
} from '@opendesign/octopus-reader/types'
import type { ArtboardFacade } from './artboard-facade'
import type { LayerFacade } from './layer-facade'
import type { ILayerCollectionFacade } from './types/layer-collection-facade.iface'

export class LayerCollectionFacade implements ILayerCollectionFacade {
  private _layerCollection: ILayerCollection
  private _artboardFacade: ArtboardFacade

  constructor(
    layerCollection: ILayerCollection,
    params: { artboardFacade: ArtboardFacade }
  ) {
    this._layerCollection = layerCollection
    this._artboardFacade = params.artboardFacade
  }

  [Symbol.iterator](): Iterator<LayerFacade> {
    return this.getLayers().values()
  }

  get length() {
    return this._layerCollection.length
  }

  getLayerCollectionEntity() {
    return this._layerCollection
  }

  getLayers() {
    return this._getLayersMemoized()
  }

  private _getLayersMemoized = memoize(
    (): Array<LayerFacade> => {
      return this._layerCollection
        .map((layerEntity) => {
          return this._artboardFacade.getLayerFacadeById(layerEntity.id)
        })
        .filter(Boolean) as Array<LayerFacade>
    }
  )

  getLayerById(layerId: LayerId): LayerFacade | null {
    const layerFacadesById = this._getLayerFacadeMapMemoized()
    return layerFacadesById.get(layerId) || null
  }

  private _getLayerFacadeMapMemoized = memoize(() => {
    const map: Map<LayerId, LayerFacade> = new Map()
    this.getLayers().forEach((layerFacade) => {
      map.set(layerFacade.id, layerFacade)
    })
    return map
  })

  findLayer(
    selector: LayerSelector,
    options: { depth?: number } = {}
  ): LayerFacade | null {
    const layerEntity = this._layerCollection.findLayer(selector, options)
    return layerEntity
      ? this._artboardFacade.getLayerFacadeById(layerEntity.id)
      : null
  }

  findLayers(
    selector: LayerSelector,
    options: { depth?: number } = {}
  ): LayerCollectionFacade {
    const layerCollection = this._layerCollection.findLayers(selector, options)
    return new LayerCollectionFacade(layerCollection, {
      artboardFacade: this._artboardFacade,
    })
  }

  filter(filter: (layer: LayerFacade) => boolean): LayerCollectionFacade {
    const layerCollection = this._layerCollection.filter((layer) => {
      const layerFacade = this._artboardFacade.getLayerFacadeById(layer.id)
      return Boolean(layerFacade && filter(layerFacade))
    })

    return new LayerCollectionFacade(layerCollection, {
      artboardFacade: this._artboardFacade,
    })
  }

  map<T>(mapper: (layer: LayerFacade) => T): Array<T> {
    return this.getLayers().map(mapper)
  }

  flatMap<T>(mapper: (layer: LayerFacade) => Array<T>): Array<T> {
    return this.getLayers().flatMap(mapper)
  }

  reduce<T>(
    reducer: (state: T, layer: LayerFacade, index: number) => T,
    initialValue: T
  ): T {
    return this.getLayers().reduce(reducer, initialValue)
  }

  concat(
    addedLayers: LayerCollectionFacade | Array<LayerFacade>
  ): LayerCollectionFacade {
    const addedLayerList = Array.isArray(addedLayers)
      ? addedLayers.map((layerFacade) => layerFacade.getLayerEntity())
      : addedLayers.getLayerCollectionEntity()

    const nextLayerCollection = this._layerCollection.concat(addedLayerList)

    return new LayerCollectionFacade(nextLayerCollection, {
      artboardFacade: this._artboardFacade,
    })
  }

  flatten(options: { depth?: number } = {}): LayerCollectionFacade {
    const flattenedLayerCollection = this._layerCollection.flatten(options)

    return new LayerCollectionFacade(flattenedLayerCollection, {
      artboardFacade: this._artboardFacade,
    })
  }

  getBitmapAssets(
    options: { depth?: number; includePrerendered?: boolean } = {}
  ): Array<AggregatedBitmapAssetDescriptor> {
    return this._layerCollection.getBitmapAssets(options)
  }

  getFonts(options: { depth?: number } = {}): Array<AggregatedFontDescriptor> {
    return this._layerCollection.getFonts(options)
  }
}
