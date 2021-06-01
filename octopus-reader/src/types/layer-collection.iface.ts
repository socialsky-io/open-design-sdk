import type { AggregatedDesignBitmapAssetDescriptor } from './bitmap-assets.type'
import type { AggregatedDesignFontDescriptor } from './fonts.type'
import type { LayerId } from './ids.type'
import type { ILayer } from './layer.iface'
import type { LayerSelector } from './selectors.type'

export interface ILayerCollection {
  readonly length: number

  [Symbol.iterator](): Iterator<ILayer>

  getLayers(): Array<ILayer>
  getLayerById(layerId: LayerId): ILayer | null

  findLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayer | null
  findLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayerCollection

  forEach(
    fn: (layer: ILayer, index: number, layers: Array<ILayer>) => unknown
  ): void

  filter(
    filter: (layer: ILayer, index: number, layers: Array<ILayer>) => boolean
  ): ILayerCollection

  map<T>(
    mapper: (layer: ILayer, index: number, layers: Array<ILayer>) => T
  ): Array<T>
  flatMap<T>(
    mapper: (layer: ILayer, index: number, layers: Array<ILayer>) => Array<T>
  ): Array<T>

  reduce<T>(
    reducer: (state: T, layer: ILayer, index: number) => T,
    initialValue?: T
  ): T

  concat(addedLayers: ILayerCollection | Array<ILayer>): ILayerCollection

  flatten(options?: Partial<{ depth: number }>): ILayerCollection

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedDesignBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedDesignFontDescriptor>
}
