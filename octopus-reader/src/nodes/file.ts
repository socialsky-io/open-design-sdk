import { Artboard } from './artboard'
import { FileData } from '../data/file-data'
import { LayerCollection } from '../collections/layer-collection'

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

import type { IFile } from '../types/file.iface'
import type { ILayer } from '../types/layer.iface'
import type {
  ArtboardId,
  ComponentId,
  LayerId,
  PageId,
} from '../types/ids.type'
import type { IArtboard } from '../types/artboard.iface'
import type { OctopusDocument } from '../types/octopus.type'
import type {
  ArtboardSelector,
  FileLayerSelector,
  PageSelector,
} from '../types/selectors.type'
import type { AggregatedFileBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { AggregatedFileFontDescriptor } from '../types/fonts.type'
import type { ArtboardManifestData, ManifestData } from '../types/manifest.type'
import type { IPage } from '../types/page.iface'

export class File implements IFile {
  private _fileData = new FileData(this)

  isLoaded(): boolean {
    return this._fileData.isLoaded()
  }

  unloadPage(pageId: PageId) {
    const page = this.getPageById(pageId)
    if (page) {
      page.unloadArtboards()
    }
  }

  unloadArtboards() {
    const artboards = this.getArtboards()
    artboards.forEach((artboard) => {
      artboard.unload()
    })
  }

  unloadArtboard(artboardId: ArtboardId) {
    const artboard = this.getArtboardById(artboardId)
    if (artboard) {
      artboard.unload()
    }
  }

  getManifest(): ManifestData {
    return this._fileData.getManifest()
  }

  setManifest(nextManifest: ManifestData) {
    this._fileData.setManifest(nextManifest)
  }

  addPage(
    pageId: PageId,
    params: Partial<{
      name: string | null
    }> = {}
  ): IPage {
    return this._fileData.addPage(pageId, params)
  }

  removePage(
    pageId: PageId,
    options: Partial<{ unassignArtboards: boolean }> = {}
  ): boolean {
    return this._fileData.removePage(pageId, options)
  }

  isPaged(): boolean {
    return this._fileData.isPaged()
  }

  getPages(): Array<IPage> {
    return this._fileData.getPageList()
  }

  getPageById(pageId: PageId): IPage | null {
    const pagesById = this._fileData.getPageMap()
    return pagesById[pageId] || null
  }

  findPage(selector: PageSelector): IPage | null {
    const selectorKeys = Object.keys(selector)
    if (
      selectorKeys.length === 1 &&
      selectorKeys[0] === 'id' &&
      typeof selector['id'] === 'string'
    ) {
      return this.getPageById(selector['id'])
    }

    for (const page of this.getPages()) {
      if (matchPage(selector, page)) {
        return page
      }
    }

    return null
  }

  findPages(selector: PageSelector): Array<IPage> {
    const selectorKeys = Object.keys(selector)
    if (
      selectorKeys.length === 1 &&
      selectorKeys[0] === 'id' &&
      typeof selector['id'] === 'string'
    ) {
      const page = this.getPageById(selector['id'])
      return page ? [page] : []
    }

    return this.getPages().filter((page) => {
      return matchPage(selector, page)
    })
  }

  addArtboard(
    artboardId: ArtboardId,
    octopus: OctopusDocument | null,
    params: Partial<{
      manifest: ArtboardManifestData
      pageId: PageId | null
      componentId: ComponentId | null
      name: string | null
    }> = {}
  ): Artboard {
    return this._fileData.addArtboard(artboardId, octopus, params)
  }

  removeArtboard(artboardId: ArtboardId): boolean {
    return this._fileData.removeArtboard(artboardId)
  }

  getArtboards(): Array<IArtboard> {
    return this._fileData.getArtboardList()
  }

  getPageArtboards(pageId: PageId): Array<IArtboard> {
    return this._fileData.getPageArtboards(pageId)
  }

  getComponentArtboards(): Array<IArtboard> {
    return this._fileData.getComponentArtboards()
  }

  getArtboardById(artboardId: ArtboardId): IArtboard | null {
    const artboardsById = this._fileData.getArtboardMap()
    return artboardsById[artboardId] || null
  }

  getArtboardByComponentId(componentId: ComponentId): IArtboard | null {
    const artboardsByComponentId = this._fileData.getComponentArtboardMap()
    return artboardsByComponentId[componentId] || null
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
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedFileBitmapAssetDescriptor> {
    return getBitmapAssets(this.getArtboards(), options)
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
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
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ): ILayer | null {
    return findLayer(this.getArtboards(), selector, options)
  }

  findLayers(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ): LayerCollection {
    const layers = findLayers(this.getArtboards(), selector, options)

    return new LayerCollection(layers)
  }
}
