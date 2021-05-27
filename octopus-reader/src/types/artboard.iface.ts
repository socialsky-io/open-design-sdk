import type { AggregatedDesignBitmapAssetDescriptor } from './bitmap-assets.type'
import type { IDesign } from './design.iface'
import type { AggregatedDesignFontDescriptor } from './fonts.type'
import type { ArtboardId, ComponentId, LayerId, PageId } from './ids.type'
import type { ILayerCollection } from './layer-collection.iface'
import type { ILayer } from './layer.iface'
import type { ArtboardManifestData } from './manifest.type'
import type { OctopusDocument, RgbaColor } from './octopus.type'
import type { IPage } from './page.iface'
import type { ArtboardSelector, LayerSelector } from './selectors.type'

export type ArtboardBounds = {
  'left': number
  'top': number
  'width': number
  'height': number
}

export interface IArtboard {
  readonly id: ArtboardId
  readonly pageId: PageId | null
  readonly componentId: ComponentId | null
  readonly name: string | null

  getManifest(): ArtboardManifestData
  setManifest(nextManifest: ArtboardManifestData): void

  matches(selector: ArtboardSelector): boolean

  isLoaded(): boolean
  unload(): void
  getOctopus(): OctopusDocument | null
  setOctopus(nextOctopus: OctopusDocument): void

  getDesign(): IDesign | null

  getPage(): IPage | null
  setPage(nextPageId: PageId | null): void
  unassignFromPage(): void

  getBounds(): ArtboardBounds | null

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Array<AggregatedDesignBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedDesignFontDescriptor>

  getBackgroundColor(): RgbaColor | null

  getRootLayers(): ILayerCollection
  getFlattenedLayers(options?: Partial<{ depth: number }>): ILayerCollection

  getLayerById(layerId: LayerId): ILayer | null
  findLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayer | null

  findLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayerCollection

  getLayerDepth(layerId: LayerId): number | null

  isComponent(): boolean
}
