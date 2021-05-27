import { Artboard } from './artboard'
import { DesignData } from '../data/design-data'
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

import type { IDesign } from '../types/design.iface'
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
  DesignLayerSelector,
  PageSelector,
} from '../types/selectors.type'
import type { AggregatedDesignBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { AggregatedDesignFontDescriptor } from '../types/fonts.type'
import type { ArtboardManifestData, ManifestData } from '../types/manifest.type'
import type { IPage } from '../types/page.iface'

export class Design implements IDesign {
  private _designData = new DesignData(this)

  isLoaded(): boolean {
    return this._designData.isLoaded()
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
    return this._designData.getManifest()
  }

  setManifest(nextManifest: ManifestData) {
    this._designData.setManifest(nextManifest)
  }

  addPage(
    pageId: PageId,
    params: Partial<{
      name: string | null
    }> = {}
  ): IPage {
    return this._designData.addPage(pageId, params)
  }

  removePage(
    pageId: PageId,
    options: Partial<{ unassignArtboards: boolean }> = {}
  ): boolean {
    return this._designData.removePage(pageId, options)
  }

  isPaged(): boolean {
    return this._designData.isPaged()
  }

  getPages(): Array<IPage> {
    return this._designData.getPageList()
  }

  getPageById(pageId: PageId): IPage | null {
    const pagesById = this._designData.getPageMap()
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
    return this._designData.addArtboard(artboardId, octopus, params)
  }

  removeArtboard(artboardId: ArtboardId): boolean {
    return this._designData.removeArtboard(artboardId)
  }

  getArtboards(): Array<IArtboard> {
    return this._designData.getArtboardList()
  }

  getPageArtboards(pageId: PageId): Array<IArtboard> {
    return this._designData.getPageArtboards(pageId)
  }

  getComponentArtboards(): Array<IArtboard> {
    return this._designData.getComponentArtboards()
  }

  getArtboardById(artboardId: ArtboardId): IArtboard | null {
    const artboardsById = this._designData.getArtboardMap()
    return artboardsById[artboardId] || null
  }

  getArtboardByComponentId(componentId: ComponentId): IArtboard | null {
    const artboardsByComponentId = this._designData.getComponentArtboardMap()
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
  ): Array<AggregatedDesignBitmapAssetDescriptor> {
    return getBitmapAssets(this.getArtboards(), options)
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedDesignFontDescriptor> {
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
    selector: DesignLayerSelector,
    options: Partial<{ depth: number }> = {}
  ): ILayer | null {
    return findLayer(this.getArtboards(), selector, options)
  }

  findLayers(
    selector: DesignLayerSelector,
    options: Partial<{ depth: number }> = {}
  ): LayerCollection {
    const layers = findLayers(this.getArtboards(), selector, options)

    return new LayerCollection(layers)
  }
}
