import { IArtboard } from '../types/artboard.iface'
import { AggregatedFileBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import { IFile } from '../types/file.iface'
import { AggregatedFileFontDescriptor } from '../types/fonts.type'
import { ArtboardId, ComponentId, LayerId, PageId } from '../types/ids.type'
import { ILayer } from '../types/layer.iface'
import { LayerCollection } from '../collections/layer-collection'
import { IPage } from '../types/page.iface'
import {
  ArtboardSelector,
  LayerSelector,
  PageSelector,
} from '../types/selectors.type'
import {
  findLayer,
  findLayerById,
  findLayers,
  findLayersById,
  getBitmapAssets,
  getFlattenedLayers,
  getFonts,
} from '../utils/aggregation-utils'
import { matchArtboard } from '../utils/artboard-lookup-utils'
import { matchPage } from '../utils/page-lookup-utils'

export class Page implements IPage {
  readonly id: PageId

  private _file: IFile
  private _name: string | null

  constructor(id: PageId, params: { name?: string | null; file: IFile }) {
    this.id = id

    this._file = params.file
    this._name = params.name || null
  }

  get name() {
    return this._name
  }

  set name(nextName: string | null) {
    this._name = nextName
  }

  matches(selector: PageSelector): boolean {
    return matchPage(selector, this)
  }

  unloadArtboards() {
    this.getArtboards().forEach((artboard) => {
      artboard.unload()
    })
  }

  addArtboard(artboardId: ArtboardId): void {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('Artboard not found')
    }

    artboard.setPage(this.id)
  }

  removeArtboard(artboardId: ArtboardId): boolean {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      return false
    }

    return this._file.removeArtboard(artboardId)
  }

  unassignArtboard(artboardId: ArtboardId): boolean {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      return false
    }

    artboard.unassignFromPage()
    return true
  }

  getArtboards(): Array<IArtboard> {
    return this._file.getPageArtboards(this.id)
  }

  getArtboardById(artboardId: ArtboardId): IArtboard | null {
    const artboard = this._file.getArtboardById(artboardId)
    if (!artboard || artboard.pageId !== this.id) {
      return null
    }

    return artboard
  }

  getArtboardByComponentId(componentId: ComponentId): IArtboard | null {
    const artboard = this._file.getArtboardByComponentId(componentId)
    if (!artboard || artboard.pageId !== this.id) {
      return null
    }

    return artboard
  }

  getComponentArtboards(): Array<IArtboard> {
    return this.getArtboards().filter((artboard) => {
      return artboard.isComponent()
    })
  }

  findArtboard(
    selector: ArtboardSelector | ((artboard: IArtboard) => boolean)
  ): IArtboard | null {
    if (typeof selector === 'object') {
      const selectorKeys = Object.keys(selector)
      if (
        selectorKeys.length === 1 &&
        selectorKeys[0] === 'id' &&
        typeof selector['id'] === 'string'
      ) {
        return this.getArtboardById(selector['id'])
      }
    }

    for (const artboard of this.getArtboards()) {
      if (
        typeof selector === 'function'
          ? selector(artboard)
          : matchArtboard(selector, artboard)
      ) {
        return artboard
      }
    }

    return null
  }

  findArtboards(
    selector: ArtboardSelector | ((artboard: IArtboard) => boolean)
  ): Array<IArtboard> {
    if (typeof selector === 'object') {
      const selectorKeys = Object.keys(selector)
      if (
        selectorKeys.length === 1 &&
        selectorKeys[0] === 'id' &&
        typeof selector['id'] === 'string'
      ) {
        const artboard = this.getArtboardById(selector['id'])
        return artboard ? [artboard] : []
      }
    }

    return this.getArtboards().filter((artboard) => {
      return typeof selector === 'function'
        ? selector(artboard)
        : matchArtboard(selector, artboard)
    })
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor> {
    return getBitmapAssets(this.getArtboards(), options)
  }

  getFonts(
    options: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor> {
    return getFonts(this.getArtboards(), options)
  }

  getFlattenedLayers(
    options: Partial<{ depth: number }> = {}
  ): LayerCollection {
    const layers = getFlattenedLayers(this.getArtboards(), options)

    return new LayerCollection(layers)
  }

  findLayerById(layerId: LayerId): ILayer | null {
    return findLayerById(this.getArtboards(), layerId)
  }

  findLayersById(layerId: LayerId): LayerCollection {
    const layers = findLayersById(this.getArtboards(), layerId)

    return new LayerCollection(layers)
  }

  findLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options: Partial<{ depth: number }> = {}
  ): ILayer | null {
    return findLayer(this.getArtboards(), selector, options)
  }

  findLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options: Partial<{ depth: number }> = {}
  ): LayerCollection {
    const layers = findLayers(this.getArtboards(), selector, options)

    return new LayerCollection(layers)
  }
}
