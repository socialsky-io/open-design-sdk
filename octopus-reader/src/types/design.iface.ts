import type { IArtboard } from './artboard.iface'
import type { AggregatedDesignBitmapAssetDescriptor } from './bitmap-assets.type'
import type { AggregatedDesignFontDescriptor } from './fonts.type'
import type { ArtboardId, ComponentId, LayerId, PageId } from './ids.type'
import type { ILayer } from './layer.iface'
import type { ILayerCollection } from './layer-collection.iface'
import type { ArtboardManifestData, ManifestData } from './manifest.type'
import type { OctopusDocument } from './octopus.type'
import type { IPage } from './page.iface'
import type {
  ArtboardSelector,
  DesignLayerSelector,
  PageSelector,
} from './selectors.type'

export interface IDesign {
  isLoaded(): boolean
  unloadArtboards(): void
  unloadArtboard(artboardId: ArtboardId): void
  unloadPage(pageId: PageId): void

  /** @category Octopus File Manifest */
  getManifest(): ManifestData
  /** @category Octopus File Manifest */
  setManifest(nextManifest: ManifestData): void

  /** @category Page Management */
  addPage(
    pageId: PageId,
    params?: Partial<{
      name: string | null
    }>
  ): IPage

  /** @category Page Management */
  removePage(
    pageId: PageId,
    options?: Partial<{ unassignArtboards: boolean }>
  ): boolean

  /**
   * @category Artboard Management
   */
  addArtboard(
    artboardId: ArtboardId,
    octopus: OctopusDocument,
    params?: Partial<{
      manifest: ArtboardManifestData
      pageId: PageId | null
      componentId: ComponentId | null
      name: string | null
    }>
  ): IArtboard

  /** @category Artboard Management */
  removeArtboard(artboardId: ArtboardId): boolean

  /** @category Page Lookup */
  isPaged(): boolean
  /** @category Page Lookup */
  getPages(): Array<IPage>
  /** @category Page Lookup */
  getPageById(pageId: PageId): IPage | null
  /** @category Page Lookup */
  findPage(selector: PageSelector | ((page: IPage) => boolean)): IPage | null
  /** @category Page Lookup */
  findPages(selector: PageSelector | ((page: IPage) => boolean)): Array<IPage>

  /** @category Artboard Lookup */
  getArtboards(): Array<IArtboard>
  /** @category Artboard Lookup */
  getPageArtboards(pageId: PageId): Array<IArtboard>
  /** @category Artboard Lookup */
  getComponentArtboards(): Array<IArtboard>
  /** @category Artboard Lookup */
  getArtboardById(artboardId: ArtboardId): IArtboard | null
  /** @category Artboard Lookup */
  getArtboardByComponentId(componentId: ComponentId): IArtboard | null
  /** @category Artboard Lookup */
  findArtboard(
    selector: ArtboardSelector | ((artboard: IArtboard) => boolean)
  ): IArtboard | null
  /** @category Artboard Lookup */
  findArtboards(
    selector: ArtboardSelector | ((artboard: IArtboard) => boolean)
  ): Array<IArtboard>

  /** @category Layer Lookup */
  getFlattenedLayers(options?: Partial<{ depth: number }>): ILayerCollection
  /** @category Layer Lookup */
  findLayerById(layerId: LayerId): ILayer | null
  /** @category Layer Lookup */
  findLayersById(layerId: LayerId): ILayerCollection
  /** @category Layer Lookup */
  findLayer(
    selector: DesignLayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayer | null
  /** @category Layer Lookup */
  findLayers(
    selector: DesignLayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayerCollection

  /** @category Asset */
  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedDesignBitmapAssetDescriptor>
  /** @category Asset */
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedDesignFontDescriptor>
}
