import type { IArtboard } from './artboard.iface'
import type { AggregatedDesignBitmapAssetDescriptor } from './bitmap-assets.type'
import type { AggregatedDesignFontDescriptor } from './fonts.type'
import type { ArtboardId, ComponentId, LayerId, PageId } from './ids.type'
import type { ILayer } from './layer.iface'
import type { ILayerCollection } from './layer-collection.iface'
import type {
  ArtboardSelector,
  LayerSelector,
  PageSelector,
} from './selectors.type'

export interface IPage {
  readonly id: PageId
  name: string | null

  matches(selector: PageSelector): boolean

  unloadArtboards(): void

  addArtboard(artboardId: ArtboardId): void
  removeArtboard(
    artboardId: ArtboardId,
    options?: Partial<{ unassign: boolean }>
  ): void

  getArtboards(): Array<IArtboard>
  getComponentArtboards(): Array<IArtboard>
  getArtboardById(artboardId: ArtboardId): IArtboard | null
  getArtboardByComponentId(componentId: ComponentId): IArtboard | null
  findArtboard(
    selector: ArtboardSelector | ((artboard: IArtboard) => boolean)
  ): IArtboard | null
  findArtboards(
    selector: ArtboardSelector | ((artboard: IArtboard) => boolean)
  ): Array<IArtboard>

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Array<AggregatedDesignBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedDesignFontDescriptor>

  getFlattenedLayers(options?: Partial<{ depth: number }>): ILayerCollection

  findLayerById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): ILayer | null
  findLayersById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): ILayerCollection
  findLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayer | null
  findLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayerCollection
}
