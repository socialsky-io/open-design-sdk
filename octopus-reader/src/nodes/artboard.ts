import { LayerCollection } from '../collections/layer-collection'

import { matchArtboard } from '../utils/artboard-lookup-utils'
import {
  createFlattenedLayers,
  createLayers,
} from '../utils/layer-factories-utils'
import { memoize } from '../utils/memoize-utils'

import type { ArtboardBounds, IArtboard } from '../types/artboard.iface'
import type { AggregatedDesignBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { IDesign } from '../types/design.iface'
import type { AggregatedDesignFontDescriptor } from '../types/fonts.type'
import type { ArtboardId, LayerId, PageId } from '../types/ids.type'
import type { ILayer } from '../types/layer.iface'
import type { ILayerCollection } from '../types/layer-collection.iface'
import type { ArtboardManifestData } from '../types/manifest.type'
import type {
  OctopusDocument,
  Bounds,
  ComponentId,
  RgbaColor,
} from '../types/octopus.type'
import type { ArtboardSelector, LayerSelector } from '../types/selectors.type'
import { IPage } from '../types/page.iface'

export class Artboard implements IArtboard {
  private _manifest: ArtboardManifestData
  private _octopus: OctopusDocument | null
  private _design: IDesign | null

  constructor(
    id: ArtboardId,
    octopus: OctopusDocument | null,
    params: Partial<{
      manifest: ArtboardManifestData
      pageId: PageId | null
      componentId: ComponentId | null
      name: string | null
      design: IDesign | null
    }> = {}
  ) {
    const { design, pageId, manifest, ...manifestParams } = params

    this._manifest = this._createManifest(params.manifest || null, octopus, {
      id,
      pageId,
      ...manifestParams,
    })

    this._octopus = octopus || null
    this._design = design || null
  }

  getManifest(): ArtboardManifestData {
    return this._manifest
  }

  setManifest(nextManifest: ArtboardManifestData) {
    if (nextManifest['artboard_original_id'] !== this.id) {
      throw new Error('Cannot replace existing artboard ID')
    }

    this._manifest = this._createManifest(nextManifest, this._octopus, {
      id: this.id,
    })
  }

  get id(): ArtboardId {
    return this._manifest['artboard_original_id']
  }

  get componentId(): ComponentId | null {
    return this._manifest['symbol_id'] || null
  }

  get pageId(): ComponentId | null {
    return this._manifest['page_original_id'] || null
  }

  get name(): string | null {
    return this._manifest['artboard_name'] || null
  }

  matches(selector: ArtboardSelector): boolean {
    return matchArtboard(selector, this)
  }

  isLoaded(): boolean {
    return Boolean(this._octopus)
  }

  unload() {
    this._octopus = null
  }

  getOctopus() {
    return this._octopus
  }

  setOctopus(nextOctopus: OctopusDocument) {
    this._octopus = nextOctopus

    this._manifest = this._createManifest(this._manifest, nextOctopus, {
      id: this.id,
    })

    this.getRootLayers.clear()
    this.getFlattenedLayers.clear()
  }

  getDesign(): IDesign | null {
    return this._design
  }

  getPage(): IPage | null {
    const pageId = this.pageId
    if (!pageId) {
      return null
    }

    const design = this._design
    if (!design) {
      throw new Error('Cannot retrieve a detached artboard page')
    }

    return design.getPageById(pageId)
  }

  setPage(nextPageId: PageId) {
    this._manifest = this._createManifest(this._manifest, this._octopus, {
      id: this.id,
      pageId: nextPageId,
    })
  }

  unassignFromPage() {
    this._manifest = this._createManifest(this._manifest, this._octopus, {
      id: this.id,
      pageId: null,
    })
  }

  getBounds(): ArtboardBounds | null {
    const bounds = this._octopus?.['bounds']
    const frame = this._octopus?.['frame']

    return bounds && frame
      ? {
          'left': frame['x'],
          'top': frame['y'],
          'width': bounds['width'] || 0,
          'height': bounds['height'] || 0,
        }
      : null
  }

  getRootLayers = memoize(
    (): ILayerCollection => {
      const layerDataList = this._octopus?.['layers'] || []
      const layerList = createLayers(layerDataList, { artboard: this })

      return new LayerCollection(layerList)
    }
  )

  getFlattenedLayers = memoize(
    (options: Partial<{ depth: number }> = {}): ILayerCollection => {
      const layerDataList = this._octopus?.['layers'] || []
      const depth = options.depth || Infinity
      const layerList = createFlattenedLayers(layerDataList, {
        artboard: this,
        depth,
      })

      return new LayerCollection(layerList)
    },
    2
  )

  getLayerById(layerId: LayerId): ILayer | null {
    return this.getFlattenedLayers().getLayerById(layerId)
  }

  findLayer(selector: LayerSelector): ILayer | null {
    return this.getFlattenedLayers().findLayer(selector, { depth: 1 })
  }

  findLayers(selector: LayerSelector): ILayerCollection {
    return this.getFlattenedLayers().findLayers(selector, { depth: 1 })
  }

  getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ): Array<AggregatedDesignBitmapAssetDescriptor> {
    const depth = options.depth || Infinity

    return this.getFlattenedLayers({ depth }).getBitmapAssets({
      ...options,
      depth: 1,
    })
  }

  getFonts(
    options: Partial<{ depth: number }> = {}
  ): Array<AggregatedDesignFontDescriptor> {
    const depth = options.depth || Infinity

    return this.getFlattenedLayers({ depth }).getFonts({ depth: 1 })
  }

  getLayerDepth(layerId: LayerId): number | null {
    const layer = this.getLayerById(layerId)
    return layer ? layer.getDepth() : null
  }

  getBackgroundColor(): RgbaColor | null {
    return this._octopus?.['hasBackgroundColor']
      ? this._octopus['backgroundColor'] || null
      : null
  }

  isComponent(): boolean {
    return Boolean(this.componentId)
  }

  _createManifest(
    prevManifest: ArtboardManifestData | null,
    octopus: OctopusDocument | null,
    params: {
      id: ArtboardId
      pageId?: PageId | null
      componentId?: ComponentId | null
      name?: string | null
    }
  ): ArtboardManifestData {
    const {
      id,
      pageId = prevManifest?.['page_original_id'],
      componentId = octopus?.['symbolID'] || prevManifest?.['symbol_id'],
      name = prevManifest?.['artboard_name'],
    } = params

    const page =
      this._design && pageId ? this._design.getPageById(pageId) : null

    return {
      ...(prevManifest || {
        'failed': false,
        'url': null,
        'preview_url': null,
      }),

      'artboard_original_id': id,
      'artboard_name': name || null,

      'is_symbol': Boolean(componentId),
      'symbol_id': componentId || null,

      ...(pageId
        ? {
            'page_original_id': pageId,
            'page_name':
              page?.name ||
              (pageId === prevManifest?.['page_original_id']
                ? prevManifest?.['page_name']
                : null) ||
              null,
          }
        : {}),
    }
  }
}
