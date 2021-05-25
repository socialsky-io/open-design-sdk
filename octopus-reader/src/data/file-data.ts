import { Artboard } from '../nodes/artboard'
import { Page } from '../nodes/page'

import { memoize } from '../utils/memoize-utils'

import type { IArtboard } from '../types/artboard.iface'
import type { IFile } from '../types/file.iface'
import type { ArtboardId, PageId } from '../types/ids.type'
import type { ArtboardManifestData, ManifestData } from '../types/manifest.type'
import type { ComponentId, OctopusDocument } from '../types/octopus.type'
import type { IPage } from '../types/page.iface'

export class FileData {
  private _file: IFile

  private _loaded: boolean = false
  private _paged: boolean = false
  private _pageList: Array<IPage> = []
  private _artboardList: Array<IArtboard> = []

  constructor(file: IFile) {
    this._file = file
  }

  isLoaded(): boolean {
    return this._loaded
  }

  getManifest = memoize(() => {
    return {
      'artboards': this._artboardList.map((artboard) => {
        return artboard.getManifest()
      }),

      'pages': this._paged
        ? this._pageList.reduce((pageNameMap, page) => {
            return { ...pageNameMap, [page.id]: page.name }
          }, {})
        : null,
    }
  })

  setManifest(nextManifest: ManifestData) {
    const pageNames = nextManifest['pages']

    this._paged = Boolean(pageNames)

    if (pageNames) {
      Object.keys(pageNames).forEach((pageId) => {
        const pageName = pageNames[pageId] || null
        const prevPage = this.getPageById(pageId)

        if (prevPage) {
          prevPage.name = pageName
        } else {
          this.addPage(pageId, { name: pageName })
        }
      })
    }

    nextManifest['artboards'].forEach((nextArtboardManifest) => {
      const artboardId = nextArtboardManifest['artboard_original_id']
      const prevArtboard = this.getArtboardById(artboardId)

      if (prevArtboard) {
        prevArtboard.setManifest(nextArtboardManifest)
      } else {
        this.addArtboard(nextArtboardManifest['artboard_original_id'], null, {
          manifest: nextArtboardManifest,
        })
      }
    })

    this._loaded = true
  }

  isPaged() {
    return this._paged
  }

  addPage(
    pageId: PageId,
    params?: Partial<{
      name: string | null
    }>
  ): IPage {
    const index = this._pageList.findIndex((page) => page.id === pageId)
    if (index > -1) {
      throw new Error('Duplicate page')
    }

    const page = new Page(pageId, { ...params, file: this._file })
    this._replacePageList((prevPageList) => {
      return [...prevPageList, page]
    })

    return page
  }

  removePage(
    pageId: PageId,
    options: Partial<{ unassignArtboards: boolean }> = {}
  ): boolean {
    return this._replacePageList((pageList) => {
      const index = pageList.findIndex((page) => page.id === pageId)
      const removedPage = index > -1 ? pageList[index] : null
      if (!removedPage) {
        return pageList
      }

      removedPage.getArtboards().forEach((artboard) => {
        if (options.unassignArtboards) {
          artboard.unassignFromPage()
        } else {
          this.removeArtboard(artboard.id)
        }
      })

      return [...pageList.slice(0, index), ...pageList.slice(index + 1)]
    })
  }

  getPageList(): Array<IPage> {
    return this._pageList
  }

  getPageMap = memoize(() => {
    const pagesById: Record<PageId, IPage> = {}
    this._pageList.forEach((page) => {
      pagesById[page.id] = page
    })

    return pagesById
  })

  getPageById(pageId: PageId): IPage | null {
    const pagesById = this.getPageMap()
    return pagesById[pageId] || null
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
    const index = this._artboardList.findIndex(
      (artboard) => artboard.id === artboardId
    )
    if (index > -1) {
      throw new Error('Duplicate artboard')
    }

    const artboard = new Artboard(artboardId, octopus, {
      ...params,
      file: this._file,
    })
    this._replaceArtboardList((prevArtboardList) => {
      return [...prevArtboardList, artboard]
    })

    return artboard
  }

  removeArtboard(artboardId: ArtboardId): boolean {
    return this._replaceArtboardList((artboardList) => {
      const index = artboardList.findIndex(
        (artboard) => artboard.id === artboardId
      )
      const removedArtboard = index > -1 ? artboardList[index] : null
      if (!removedArtboard) {
        return artboardList
      }

      return [...artboardList.slice(0, index), ...artboardList.slice(index + 1)]
    })
  }

  getArtboardList(): Array<IArtboard> {
    return this._artboardList
  }

  getPageArtboards(pageId: PageId): Array<IArtboard> {
    return this._artboardList.filter((artboard) => {
      return artboard.pageId === pageId
    })
  }

  getArtboardById(artboardId: ArtboardId): IArtboard | null {
    const artboardsById = this.getArtboardMap()
    return artboardsById[artboardId] || null
  }

  getArtboardByComponentId(componentId: ComponentId): IArtboard | null {
    const artboardsByComponentId = this.getArtboardMap()
    return artboardsByComponentId[componentId] || null
  }

  getArtboardMap = memoize(() => {
    const artboardsById: Record<ArtboardId, IArtboard> = {}
    this._artboardList.forEach((artboard) => {
      artboardsById[artboard.id] = artboard
    })

    return artboardsById
  })

  getComponentArtboards = memoize(
    (): Array<IArtboard> => {
      return this.getArtboardList().filter((artboard) => {
        return artboard.isComponent()
      })
    }
  )

  getComponentArtboardMap = memoize(() => {
    const artboardsByComponentId: Record<ComponentId, IArtboard> = {}
    this._artboardList.forEach((artboard) => {
      const componentId = artboard.componentId
      if (componentId) {
        artboardsByComponentId[componentId] = artboard
      }
    })

    return artboardsByComponentId
  })

  _replacePageList(
    mapper: (prevPageList: Array<IPage>) => Array<IPage>
  ): boolean {
    const prevPageList = this._pageList
    const nextPageList = mapper(prevPageList)
    if (prevPageList === nextPageList) {
      return false
    }

    this._pageList = nextPageList
    this._paged = true

    this.getPageMap.clear()
    this.getManifest.clear()

    return true
  }

  _replaceArtboardList(
    mapper: (prevArtboardList: Array<IArtboard>) => Array<IArtboard>
  ): boolean {
    const prevArtboardList = this._artboardList
    const nextArtboardList = mapper(prevArtboardList)
    if (prevArtboardList === nextArtboardList) {
      return false
    }

    this._artboardList = nextArtboardList

    this.getArtboardMap.clear()
    this.getComponentArtboards.clear()
    this.getComponentArtboardMap.clear()
    this.getManifest.clear()

    return true
  }
}
