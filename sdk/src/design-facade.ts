import { ArtboardFacade, LayerAttributesConfig } from './artboard-facade'
import { DesignExportFacade } from './design-export-facade'
import { DesignListItemFacade } from './design-list-item-facade'
import { LayerCollectionFacade } from './layer-collection-facade'
import { PageFacade } from './page-facade'

import { basename } from 'path'
import { inspect } from 'util'
import {
  createEmptyDesign,
  ArtboardId,
  OctopusDocument,
  ArtboardSelector,
  ComponentId,
  DesignLayerSelector,
  IArtboard,
  IDesign,
  IPage,
  LayerId,
  ManifestData,
  PageId,
  PageSelector,
  LayerOctopusData,
} from '@opendesign/octopus-reader'
import { sequence } from './utils/async-utils'
import { toFileKey } from './utils/id-utils'
import { memoize } from './utils/memoize-utils'
import { getDesignFormatByFileName } from './utils/design-format-utils'
import { enumerablizeWithPrototypeGetters } from './utils/object-utils'
import { createLayerEntitySelector } from './utils/selector-utils'

import type { CancelToken } from '@avocode/cancel-token'
import type { DesignId, DesignVersionId, IApiDesign } from '@opendesign/api'
import type {
  Bounds,
  IRenderingDesign,
  BlendingMode,
  LayerBounds,
} from '@opendesign/rendering'
import type { components } from 'open-design-api-types'
import type {
  FontDescriptor,
  LayerAttributes,
  LayerFacade,
  LayerOctopusAttributesConfig,
} from './layer-facade'
import type { Sdk } from './sdk'
import type { FontSource } from './local/font-source'
import type { BitmapAssetDescriptor, LocalDesign } from './local/local-design'

type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']

export class DesignFacade {
  /**
   * The absolute path of the original design file. This is not available for designs loaded from the API.
   * @category Identification
   */
  readonly sourceFilename: string | null

  private _sdk: Sdk
  private _console: Console

  private _designEntity: IDesign | null = null
  private _localDesign: LocalDesign | null = null
  private _apiDesign: IApiDesign | null = null
  private _renderingDesign: IRenderingDesign | null = null
  private _fontSource: FontSource | null = null

  private _artboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()
  private _pageFacades: Map<PageId, PageFacade> = new Map()

  private _manifestLoaded = false
  private _pendingManifestUpdate: ManifestData | null = null
  private _loadingArtboardPromises: Map<ArtboardId, Promise<void>> = new Map()

  private _designExports: Map<
    DesignExportTargetFormatEnum,
    DesignExportFacade
  > = new Map()

  /** @internal */
  constructor(params: {
    sdk: Sdk
    console?: Console | null
    sourceFilename?: string | null
  }) {
    this.sourceFilename = params.sourceFilename || null

    this._sdk = params.sdk
    this._console = params.console || console

    enumerablizeWithPrototypeGetters(this, {
      enumerableOwnKeys: ['sourceFilename'],
      omittedPrototypeKeys: ['octopusFilename'],
    })
  }

  /**
   * The ID of the referenced server-side design. This is not available when the API is not configured for the SDK.
   * @category Identification
   */
  get id(): DesignId | null {
    const apiDesign = this._apiDesign
    return apiDesign?.id || null
  }

  /**
   * The ID of the referenced server-side design version. This is not available when the API is not configured for the SDK.
   * @category Identification
   */
  get versionId(): DesignVersionId | null {
    const apiDesign = this._apiDesign
    return apiDesign?.versionId || null
  }

  /**
   * The key which can be used to name files in the file system.
   *
   * This is the ID of the referenced server-side design or (if the API is not configured) the basename of the local file.
   *
   * It can theoretically be `null` when the design is created only virtually in memory but such feature is yet to be implemented thus the value can safely be assumed as always available and for that reason, it is annotated as non-nullable.
   *
   * @category Identification
   *
   * @example
   * ```typescript
   * design.renderArtboardToFile(`./artboards/${design.fileKey}/${artboard.fileKey}.png`)
   * ```
   */
  get fileKey(): string {
    const id = this.id
    if (id) {
      return toFileKey(id)
    }

    const localDesign = this._localDesign
    if (localDesign) {
      return basename(localDesign.filename)
    }

    // @ts-expect-error When empty in-memory designs are supported, this is going to be a valid value.
    return null
  }

  /**
   * The name of the design. This is the basename of the file by default or a custom name provided during design import.
   * @category Data
   */
  get name(): string | null {
    const apiDesign = this._apiDesign
    if (apiDesign) {
      return apiDesign.name
    }

    const localDesign = this._localDesign
    if (localDesign) {
      return basename(localDesign.filename)
    }

    return null
  }

  /**
   * The absolute path of the local cache. This is not available when the local cache is not configured for the SDK.
   * @internal
   * @category Identification
   */
  get octopusFilename(): string | null {
    const localDesign = this._localDesign
    return localDesign?.filename || null
  }

  /** @internal */
  toString(): string {
    const designInfo = this.toJSON()
    return `Design ${inspect(designInfo)}`
  }

  /** @internal */
  [inspect.custom](): string {
    return this.toString()
  }

  /** @internal */
  toJSON(): unknown {
    return { ...this }
  }

  /** @internal */
  getManifest(): ManifestData {
    if (this._pendingManifestUpdate) {
      return this._pendingManifestUpdate
    }

    const entity = this._getDesignEntity()
    return entity.getManifest()
  }

  /** @internal */
  setManifest(nextManifest: ManifestData): void {
    this._pendingManifestUpdate = nextManifest
    this._manifestLoaded = true

    this._getDesignEntity.clear()
    this._getArtboardsMemoized.clear()
    this._getPagesMemoized.clear()
  }

  private _getDesignEntity = memoize(
    (): IDesign => {
      const entity = this._designEntity || createEmptyDesign()

      const pendingManifestUpdate = this._pendingManifestUpdate
      if (pendingManifestUpdate) {
        this._pendingManifestUpdate = null
        entity.setManifest(pendingManifestUpdate)

        this._getArtboardsMemoized.clear()
        this._getPagesMemoized.clear()
      }

      return entity
    }
  )

  /** @internal */
  getLocalDesign(): LocalDesign | null {
    return this._localDesign
  }

  /** @internal */
  async setLocalDesign(
    localDesign: LocalDesign,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<void> {
    if (!this._manifestLoaded) {
      this.setManifest(await localDesign.getManifest(options))
    }

    this._localDesign = localDesign
  }

  /** @internal */
  async setApiDesign(
    apiDesign: IApiDesign,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<void> {
    if (!this._manifestLoaded) {
      this.setManifest(await apiDesign.getManifest(options))
    }

    this._apiDesign = apiDesign
  }

  /** @internal */
  setRenderingDesign(renderingDesign: IRenderingDesign): void {
    this._renderingDesign = renderingDesign
  }

  /**
   * Returns a complete list of versions of the design.
   *
   * Data of the design versions themselves are not downloaded at this point. Each item in the design version list can be expanded to a full-featured design entity.
   *
   * The design version list contains both processed and unprocessed design versions.
   *
   * The API has to be configured when using this method.
   *
   * @example
   * ```typescript
   * const versionList = await design.getVersions()
   * const versionItem = versionList.find((version) => version.status === 'done')
   * // Expand the design version list item to a full design entity
   * const version = await versionItem.fetchDesign()
   * // Continue working with the processed design version
   * const versionArtboards = version.getArtboards()
   * ```
   *
   * @category Design Versions
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected. A cancellation token can be created via {@link createCancelToken}.
   * @returns An array of design list item objects which can be used for retrieving the design versions using the API.
   */
  async getVersions(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Array<DesignListItemFacade>> {
    const apiDesign = this._apiDesign
    if (!apiDesign) {
      throw new Error('The API is not configured.')
    }

    const apiDesignVersions = await apiDesign.getVersionList(options)
    const versionItems = apiDesignVersions.map((apiDesignVersion) => {
      const versionItem = new DesignListItemFacade(apiDesignVersion, {
        sdk: this._sdk,
      })
      if (this._fontSource) {
        versionItem.setFontSource(this._fontSource.clone())
      }
      return versionItem
    })

    return versionItems
  }

  /**
   * Fetches a previously imported version of the design from the API.
   *
   * The API has to be configured when using this method. Local caching is established in case the local cache is configured.
   *
   * @example
   * ```typescript
   * const version = await design.getVersionById('<VERSION_ID>')
   *
   * // Continue working with the processed design version
   * const versionArtboards = version.getArtboards()
   * ```
   *
   * @category Design Versions
   * @param designVersionId An ID of a server-side design version assigned during import (via `importVersionDesignFile()`).
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the local cache is not cleared once created). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the design version using the API.
   */
  getVersionById(
    designVersionId: DesignVersionId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade> {
    const apiDesign = this._apiDesign
    if (!apiDesign) {
      throw new Error('The API is not configured.')
    }

    return this._sdk.fetchDesignById(apiDesign.id, {
      ...options,
      designVersionId,
    })
  }

  /**
   * Fetches a previously imported version of the design newer than the current version of the {@link DesignFacade} entity from the API.
   *
   * The API has to be configured when using this method. Local caching is established in case the local cache is configured.
   *
   * @example
   * ```typescript
   * const nextVersion = await design.getNextVersion()
   *
   * // Continue working with the processed design version
   * const versionArtboards = nextVersion.getArtboards()
   * ```
   *
   * @category Design Versions
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the local cache is not cleared once created). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the design version using the API.
   */
  async getNextVersion(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade | null> {
    const versionItems = await this.getVersions(options)

    const currentVersionIndex = versionItems.findIndex((versionItem) => {
      return versionItem.versionId === this.versionId
    })

    const nextVersionIndex =
      currentVersionIndex > 0 ? currentVersionIndex - 1 : -1
    const nextVersionItem =
      nextVersionIndex > -1 ? versionItems[nextVersionIndex] : null

    return nextVersionItem ? nextVersionItem.fetchDesign(options) : null
  }

  /**
   * Fetches a previously imported version of the design older than the current version of the {@link DesignFacade} entity from the API.
   *
   * The API has to be configured when using this method. Local caching is established in case the local cache is configured.
   *
   * @example
   * ```typescript
   * const prevVersion = await design.getPrevVersion()
   *
   * // Continue working with the processed design version
   * const versionArtboards = prevVersion.getArtboards()
   * ```
   *
   * @category Design Versions
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the local cache is not cleared once created). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the design version using the API.
   */
  async getPreviousVersion(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade | null> {
    const versionItems = await this.getVersions()

    const currentVersionIndex = versionItems.findIndex((versionItem) => {
      return versionItem.versionId === this.versionId
    })

    const prevVersionIndex =
      currentVersionIndex > -1 ? currentVersionIndex + 1 : -1
    const prevVersionItem =
      currentVersionIndex > -1 ? versionItems[prevVersionIndex] : null

    return prevVersionItem ? prevVersionItem.fetchDesign(options) : null
  }

  /**
   * Imports a local design file (Photoshop, Sketch, Xd, Illustrator) as a version of the design.
   *
   * All versions of a design must originate from the same design file format.
   *
   * The API has to be configured when using this method. This is also requires a file system (i.e. it is not available in the browser).
   *
   * The design file is automatically uploaded to the API and local caching is established.
   *
   * @example
   * ```typescript
   * const version = await design.importVersionDesignFile('data.sketch')
   * console.log(version.sourceFilename) // == path.join(process.cwd(), 'data.sketch')
   * console.log(version.id) // == server-generated UUID
   *
   * // Continue working with the processed design version
   * const versionArtboards = version.getArtboards()
   * ```
   *
   * @category Design Versions
   * @param filePath An absolute design file path or a path relative to the current working directory.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the design is not deleted from the server when the token is cancelled during processing; the server still finishes the processing but the SDK stops watching its progress and does not download the result). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the design version using the API.
   */
  importVersionDesignFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade> {
    return this._sdk.importDesignFile(filePath, {
      ...options,
      designId: this.id,
    })
  }

  /**
   * Imports a design file located at the specified URL as a version of the design.
   *
   * All versions of a design must originate from the same design file format.
   *
   * The API has to be configured when using this method.
   *
   * The design file is not downloaded to the local environment but rather imported via the API directly. Once imported via the API, the design version behaves exactly like a design version fetched via {@link DesignFacade.getVersionById}.
   *
   * @example
   * ```typescript
   * const version = await sdk.importVersionDesignLink('https://example.com/designs/data.sketch')
   * console.log(version.id) // == server-generated UUID
   *
   * // Continue working with the processed design version
   * const versionArtboards = version.getArtboards()
   * ```
   *
   * @category Design Versions
   * @param url A design file URL.
   * @param options Options
   * @param options.format The format of the design file in case it cannot be inferred from the URL.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the design is not deleted from the server when the token is cancelled during processing; the server still finishes the processing but the SDK stops watching its progress and does not download the result). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the design version using the API.
   */
  importVersionDesignLink(
    url: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade> {
    return this._sdk.importDesignLink(url, {
      ...options,
      designId: this.id,
    })
  }

  /**
   * Imports a Figma design as a version of the design.
   *
   * All versions of a design must originate from the same design file format which makes this method usable only for designs originally also imported from Figma.
   *
   * The API has to be configured when using this method.
   *
   * The design is automatically imported by the API and local caching is established.
   *
   * @example
   * ```typescript
   * const version = await design.importVersionFigmaDesign({
   *   figmaToken: '<FIGMA_TOKEN>',
   *   figmaFileKey: 'abc',
   * })
   *
   * console.log(version.id) // == server-generated UUID
   *
   * // Continue working with the processed design version
   * const artboards = version.getArtboards()
   * ```
   *
   * @category Figma Design Usage
   * @param params Info about the Figma design
   * @param params.figmaToken A Figma access token generated in the "Personal access tokens" section of [Figma account settings](https://www.figma.com/settings).
   * @param params.figmaFileKey A Figma design "file key" from the design URL (i.e. `abc` from `https://www.figma.com/file/abc/Sample-File`).
   * @param params.figmaIds A listing of Figma design frames to use.
   * @param params.designName A name override for the design version. The original Figma design name is used by default.
   * @param params.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the design is not deleted from the server when the token is cancelled during processing; the server still finishes the processing but the SDK stops watching its progress and does not download the result). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the design version using the API.
   */
  importVersionFigmaDesign(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string>
    designName?: string | null
    cancelToken?: CancelToken | null
  }): Promise<DesignFacade> {
    return this._sdk.importFigmaDesign({
      ...params,
      designId: this.id,
    })
  }

  /**
   * Returns a complete list of artboard object in the design. These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   * @returns An artboard list.
   *
   * @example
   * ```typescript
   * const artboards = design.getArtboards()
   * ```
   */
  getArtboards(): Array<ArtboardFacade> {
    return this._getArtboardsMemoized()
  }

  private _getArtboardsMemoized = memoize(
    (): Array<ArtboardFacade> => {
      const prevArtboardFacades = this._artboardFacades
      const nextArtboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()

      const entity = this._getDesignEntity()
      const artboardEntities = entity.getArtboards()

      artboardEntities.forEach((artboardEntity) => {
        const artboardId = artboardEntity.id
        const artboardFacade =
          prevArtboardFacades.get(artboardId) ||
          this._createArtboardFacade(artboardEntity)

        artboardFacade.setArtboardEntity(artboardEntity)

        nextArtboardFacades.set(artboardId, artboardFacade)
      })

      this._artboardFacades = nextArtboardFacades

      return [...nextArtboardFacades.values()]
    }
  )

  /**
   * Returns a single artboard object. These can be used to work with the artboard contents.
   *
   * @category Artboard Lookup
   * @param artboardId An artboard ID.
   * @returns An artboard object.
   *
   * @example
   * ```typescript
   * const artboard = design.getArtboardById('<ARTBOARD_ID>')
   * ```
   */
  getArtboardById(artboardId: ArtboardId): ArtboardFacade | null {
    const prevArtboardFacade = this._artboardFacades.get(artboardId)
    if (prevArtboardFacade) {
      return prevArtboardFacade
    }

    const entity = this._getDesignEntity()
    const artboardEntity = entity.getArtboardById(artboardId)
    if (!artboardEntity) {
      return null
    }

    const artboardFacade = this._createArtboardFacade(artboardEntity)
    artboardFacade.setArtboardEntity(artboardEntity)

    const nextArtboardFacades = new Map(this._artboardFacades.entries())
    nextArtboardFacades.set(artboardId, artboardFacade)

    return artboardFacade
  }

  /**
   * Returns artboard objects for a specific page (in case the design is paged). These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   * @param pageId A page ID.
   * @returns An artboard list.
   *
   * @example
   * ```typescript
   * const pageArtboards = design.getPageArtboards('<PAGE_ID>')
   * ```
   */
  getPageArtboards(pageId: PageId): Array<ArtboardFacade> {
    const entity = this._getDesignEntity()
    const artboardEntities = entity.getPageArtboards(pageId)

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  /**
   * Returns (main/master) component artboard objects. These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   * @returns An artboard list.
   *
   * @example
   * ```typescript
   * const componentArtboards = design.getComponentArtboards()
   * ```
   */
  getComponentArtboards(): Array<ArtboardFacade> {
    const entity = this._getDesignEntity()
    const artboardEntities = entity.getComponentArtboards()

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  /**
   * Returns an artboard object of a specific (main/master) component. These can be used to work with the artboard contents.
   *
   * @category Artboard Lookup
   * @param componentId A component ID.
   * @returns An artboard object.
   *
   * @example
   * ```typescript
   * const artboard = design.getArtboardByComponentId('<COMPONENT_ID>')
   * ```
   */
  getArtboardByComponentId(componentId: ComponentId): ArtboardFacade | null {
    const entity = this._getDesignEntity()
    const artboardEntity = entity.getArtboardByComponentId(componentId)

    return artboardEntity ? this.getArtboardById(artboardEntity.id) : null
  }

  /**
   * Returns info about whether the design is paged (i.e. has artboards organized on different pages).
   *
   * @category Page Lookup
   * @returns Whether the design is paged.
   *
   * @example
   * ```typescript
   * const shouldRenderPageList = design.isPaged()
   * ```
   */
  isPaged(): boolean {
    const entity = this._getDesignEntity()
    return entity.isPaged()
  }

  /**
   * Returns a complete list of page object in the design. These can be used to work with artboard contents.
   *
   * An empty list is returned for unpaged designs.
   *
   * @category Page Lookup
   * @returns A page list.
   *
   * @example
   * ```typescript
   * const pages = design.getPages()
   * ```
   */
  getPages(): Array<PageFacade> {
    return this._getPagesMemoized()
  }

  private _getPagesMemoized = memoize(
    (): Array<PageFacade> => {
      const prevPageFacades = this._pageFacades
      const nextPageFacades: Map<PageId, PageFacade> = new Map()

      const entity = this._getDesignEntity()
      const pageEntities = entity.getPages()

      pageEntities.forEach((pageEntity) => {
        const pageId = pageEntity.id
        const pageFacade =
          prevPageFacades.get(pageId) || this._createPageFacade(pageEntity)

        pageFacade.setPageEntity(pageEntity)

        nextPageFacades.set(pageId, pageFacade)
      })

      this._pageFacades = nextPageFacades

      return [...nextPageFacades.values()]
    }
  )

  /**
   * Returns a single page object. These can be used to work with the page contents and contents of artboards inside the page.
   *
   * @category Page Lookup
   * @param pageId A page ID.
   * @returns A page object.
   *
   * @example
   * ```typescript
   * const page = design.getPageById('<PAGE_ID>')
   * ```
   */
  getPageById(pageId: PageId): PageFacade | null {
    const prevPageFacade = this._pageFacades.get(pageId)
    if (prevPageFacade) {
      return prevPageFacade
    }

    const entity = this._getDesignEntity()
    const pageEntity = entity.getPageById(pageId)
    if (!pageEntity) {
      return null
    }

    const pageFacade = this._createPageFacade(pageEntity)
    pageFacade.setPageEntity(pageEntity)

    const nextPageFacades = new Map(this._pageFacades.entries())
    nextPageFacades.set(pageId, pageFacade)

    return pageFacade
  }

  private _createArtboardFacade(artboardEntity: IArtboard): ArtboardFacade {
    const artboard = new ArtboardFacade(artboardEntity, { designFacade: this })
    return artboard
  }

  private _createPageFacade(pageEntity: IPage): PageFacade {
    const page = new PageFacade(pageEntity, { designFacade: this })
    return page
  }

  /**
   * Looks up the first artboard object matching the provided criteria.
   *
   * @category Artboard Lookup
   * @param selector An artboard selector. All specified fields must be matched by the result.
   * @returns An artboard object.
   *
   * @example
   * ```typescript
   * const productArtboard = design.findArtboard({ name: /Product/i })
   * const productArtboard = design.findArtboard((artboard) => /Product/i.test(artboard.name))
   * const oneOfArtboards123 = design.findArtboard({ id: ['<ID1>', '<ID2>', '<ID3>'] })
   * ```
   */
  findArtboard(
    selector: ArtboardSelector | ((artboard: ArtboardFacade) => boolean)
  ): ArtboardFacade | null {
    if (typeof selector === 'function') {
      return this.getArtboards().find(selector) || null
    }

    const entity = this._getDesignEntity()
    const artboardEntity = entity.findArtboard(selector)

    return artboardEntity ? this.getArtboardById(artboardEntity.id) : null
  }

  /**
   * Looks up all artboard objects matching the provided criteria.
   *
   * @category Artboard Lookup
   * @param selector An artboard selector. All specified fields must be matched by the results.
   * @returns An artboard list.
   *
   * @example
   * ```typescript
   * const productArtboards = design.findArtboards({ name: /Product/i })
   * const productArtboards = design.findArtboards((artboard) => /Product/i.test(artboard.name))
   * const artboards123 = design.findArtboards({ id: ['<ID1>', '<ID2>', '<ID3>'] })
   * ```
   */
  findArtboards(
    selector: ArtboardSelector | ((artboard: ArtboardFacade) => boolean)
  ): Array<ArtboardFacade> {
    if (typeof selector === 'function') {
      return this.getArtboards().filter((artboard) => selector(artboard))
    }

    const entity = this._getDesignEntity()
    const artboardEntities = entity.findArtboards(selector)

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  /**
   * Looks up the first artboard object matching the provided criteria.
   *
   * @category Page Lookup
   * @param selector A page selector. All specified fields must be matched by the result.
   * @returns A page object.
   *
   * @example
   * ```typescript
   * const mobilePage = design.findPage({ name: /mobile/i })
   * const mobilePage = design.findPage((page) => /mobile/i.test(page.name))
   * const oneOfPages123 = design.findPage({ id: ['<ID1>', '<ID2>', '<ID3>'] })
   * ```
   */
  findPage(
    selector: PageSelector | ((page: PageFacade) => boolean)
  ): PageFacade | null {
    if (typeof selector === 'function') {
      return this.getPages().find(selector) || null
    }

    const entity = this._getDesignEntity()
    const pageEntity = entity.findPage(selector)

    return pageEntity ? this.getPageById(pageEntity.id) : null
  }

  /**
   * Looks up all artboard objects matching the provided criteria.
   *
   * @category Page Lookup
   * @param selector A page selector. All specified fields must be matched by the results.
   * @returns A page list.
   *
   * @example
   * ```typescript
   * const mobilePages = design.findPages({ name: /mobile/i })
   * const mobilePages = design.findPages((page) => /mobile/i.test(page.name))
   * const pages123 = design.findPages({ id: ['<ID1>', '<ID2>', '<ID3>'] })
   * ```
   */
  findPages(
    selector: PageSelector | ((page: PageFacade) => boolean)
  ): Array<PageFacade> {
    if (typeof selector === 'function') {
      return this.getPages().filter((page) => selector(page))
    }

    const entity = this._getDesignEntity()
    const pageEntities = entity.findPages(selector)

    return pageEntities
      .map((pageEntity) => {
        return this.getPageById(pageEntity.id)
      })
      .filter(Boolean) as Array<PageFacade>
  }

  /**
   * Returns a collection of all layers from all pages and artboards (optionally down to a specific nesting level).
   *
   * The produced collection can be queried further for narrowing down the search.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param options Object
   * @param options.depth The maximum nesting level of layers within pages and artboards to include in the collection. By default, all levels are included. `0` also means "no limit"; `1` means only root layers in artboards should be included.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns A layer collection with the flattened layers.
   *
   * @example All layers from all artboards
   * ```typescript
   * const layers = await design.getFlattenedLayers()
   * ```
   *
   * @example Root layers from all artboards
   * ```typescript
   * const rootLayers = await design.getFlattenedLayers({ depth: 1 })
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layers = await design.getFlattenedLayers({ cancelToken: token })
   * ```
   */
  async getFlattenedLayers(
    options: { depth?: number; cancelToken?: CancelToken | null } = {}
  ): Promise<LayerCollectionFacade> {
    await this.load({ cancelToken: options.cancelToken || null })

    const entity = this._getDesignEntity()
    const layerCollection = entity.getFlattenedLayers({
      depth: options.depth || 0,
    })

    return new LayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  /**
   * Returns the first layer object which has the specified ID.
   *
   * Layer IDs are unique within individual artboards but different artboards can potentially have layer ID clashes. This is the reason the method is not prefixed with "get".
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns A layer object.
   *
   * @example
   * ```typescript
   * const layer = await design.findLayerById('<ID>')
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layer = await design.findLayerById('<ID>', { cancelToken: token })
   * ```
   */
  async findLayerById(
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    await this.load(options)

    const entity = this._getDesignEntity()
    const layerEntity = entity.findLayerById(layerId)
    const artboardId = layerEntity ? layerEntity.artboardId : null
    if (!layerEntity || !artboardId) {
      return null
    }

    return this.getArtboardLayerFacade(artboardId, layerEntity.id)
  }

  /**
   * Returns a collection of all layer objects which have the specified ID.
   *
   * Layer IDs are unique within individual artboards but different artboards can potentially have layer ID clashes.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns A layer collection with layer matches.
   *
   * @example
   * ```typescript
   * const layers = await design.findLayersById('<ID>')
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layers = await design.findLayersById('<ID>', { cancelToken: token })
   * ```
   */
  async findLayersById(
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerCollectionFacade> {
    await this.load(options)

    const entity = this._getDesignEntity()
    const layerCollection = entity.findLayersById(layerId)

    return new LayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  /**
   * Returns the first layer object from any page or artboard (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param selector A design-wide layer selector. All specified fields must be matched by the result.
   * @param options Options
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns A matched layer object.
   *
   * @example Layer by name from any artboard
   * ```typescript
   * const layer = await design.findLayer({ name: 'Share icon' })
   * ```
   *
   * @example Layer by function selector from any artboard
   * ```typescript
   * const shareIconLayer = await design.findLayer((layer) => {
   *   return layer.name === 'Share icon'
   * })
   * ```
   *
   * @example Layer by name from a certain artboard subset
   * ```typescript
   * const layer = await design.findLayer({
   *   name: 'Share icon',
   *   artboardId: [ '<ID1>', '<ID2>' ],
   * })
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layer = await design.findLayer(
   *   { name: 'Share icon' },
   *   { cancelToken: token }
   * )
   * ```
   */
  async findLayer(
    selector: DesignLayerSelector | ((layer: LayerFacade) => boolean),
    options: { depth?: number; cancelToken?: CancelToken | null } = {}
  ): Promise<LayerFacade | null> {
    await this.load({ cancelToken: options.cancelToken || null })

    const entitySelector = createLayerEntitySelector(this, selector)
    const entity = this._getDesignEntity()

    const layerEntity = entity.findLayer(entitySelector, {
      depth: options.depth || 0,
    })
    const artboardId = layerEntity ? layerEntity.artboardId : null
    if (!layerEntity || !artboardId) {
      return null
    }

    return this.getArtboardLayerFacade(artboardId, layerEntity.id)
  }

  /**
   * Returns a collection of all layer objects from all pages and artboards (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param selector A design-wide layer selector. All specified fields must be matched by the result.
   * @param options Options
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns A layer collection with layer matches.
   *
   * @example Layers by name from all artboards
   * ```typescript
   * const layers = await design.findLayers({ name: 'Share icon' })
   * ```
   *
   * @example Layers by function selector from all artboards
   * ```typescript
   * const shareIconLayers = await design.findLayers((layer) => {
   *   return layer.name === 'Share icon'
   * })
   * ```
   *
   * @example Invisible layers from all a certain artboard subset
   * ```typescript
   * const layers = await design.findLayers({
   *   visible: false,
   *   artboardId: [ '<ID1>', '<ID2>' ],
   * })
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layer = await design.findLayers(
   *   { type: 'shapeLayer' },
   *   { cancelToken: token }
   * )
   * ```
   */
  async findLayers(
    selector: DesignLayerSelector | ((layer: LayerFacade) => boolean),
    options: { depth?: number; cancelToken?: CancelToken | null } = {}
  ): Promise<LayerCollectionFacade> {
    await this.load({ cancelToken: options.cancelToken || null })

    const entitySelector = createLayerEntitySelector(this, selector)
    const entity = this._getDesignEntity()

    const layerCollection = entity.findLayers(entitySelector, {
      depth: options.depth || 0,
    })

    return new LayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  /**
   * Returns a list of bitmap assets used by layers in all pages and artboards (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Asset
   * @param options Options
   * @param options.depth The maximum nesting level within page and artboard layers to search for bitmap asset usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns A list of bitmap assets.
   *
   * @example All bitmap assets from all artboards
   * ```typescript
   * const bitmapAssetDescs = await design.getBitmapAssets()
   * ```
   *
   * @example Bitmap assets excluding pre-rendered bitmaps from all artboards
   * ```typescript
   * const bitmapAssetDescs = await design.getBitmapAssets({
   *   includePrerendered: false,
   * })
   * ```
   */
  async getBitmapAssets(
    options: {
      depth?: number
      includePrerendered?: boolean
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<
    Array<
      BitmapAssetDescriptor & {
        artboardLayerIds: Record<ArtboardId, Array<LayerId>>
      }
    >
  > {
    await this.load({ cancelToken: options.cancelToken || null })

    const entity = this._getDesignEntity()
    return entity.getBitmapAssets({
      depth: options.depth || 0,
      includePrerendered: options.includePrerendered !== false,
    })
  }

  /**
   * Returns a list of fonts used by layers in all pages and artboards (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @param options Options
   * @returns A list of fonts.
   *
   * @example All fonts from all artboards
   * ```typescript
   * const fontDescs = await design.getFonts()
   * ```
   */
  async getFonts(
    options: { depth?: number; cancelToken?: CancelToken | null } = {}
  ): Promise<
    Array<
      FontDescriptor & { artboardLayerIds: Record<ArtboardId, Array<LayerId>> }
    >
  > {
    await this.load({ cancelToken: options.cancelToken || null })

    const entity = this._getDesignEntity()
    return entity.getFonts({ depth: options.depth || 0 })
  }

  /** @internal */
  setFontSource(fontSource: FontSource | null): void {
    this._fontSource = fontSource
  }

  /**
   * Sets the directory where fonts should be looked up when rendering the design.
   *
   * Fonts are matched based on their postscript names, not the file basenames.
   *
   * This configuration overrides the global font directory configuration (set up via {@link Sdk.setGlobalFontDirectory}) – i.e. fonts from the globally configured directory are not used for the design.
   *
   * This configuration is copied to any other versions of the design later obtained through this design object as the default font configuration.
   *
   * @category Configuration
   * @param fontDirectoryPath An absolute path to a directory or a path relative to the process working directory (`process.cwd()` in node.js). When `null` is provided, the configuration is cleared for the design.
   *
   * @example
   * ```typescript
   * design.setFontDirectory('./custom-fonts')
   * design.setFontDirectory('/var/custom-fonts')
   * ```
   */
  setFontDirectory(fontDirectoryPath: string): void {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error(
        'Cannot set the font directory when the rendering engine is not configured'
      )
    }

    renderingDesign.setFontDirectory(fontDirectoryPath)

    const fontSource = this._fontSource
    if (fontSource) {
      fontSource.setFontDirectory(fontDirectoryPath)
    }
  }

  /**
   * Sets the fonts which should be used as a fallback in case the actual fonts needed for rendering text layers are not available.
   *
   * The first font from this list which is available in the system is used for all text layers with missing actual fonts. If none of the fonts are available, the text layers are not rendered.
   *
   * This configuration overrides/extends the global configuration set via {@link Sdk.setGlobalFallbackFonts}. Fonts specified here are preferred over the global config.
   *
   * This configuration is copied to any other versions of the design later obtained through this design object as the default font configuration.
   *
   * @category Configuration
   * @param fallbackFonts An ordered list of font postscript names or font file paths.
   *
   * @example
   * ```typescript
   * design.setFallbackFonts([ 'Calibri', './custom-fonts/Carolina.otf', 'Arial' ])
   * ```
   */
  setFallbackFonts(fallbackFonts: Array<string>): void {
    const fontSource = this._fontSource
    if (fontSource) {
      fontSource.setFallbackFonts(fallbackFonts)
    }
  }

  /**
   * Renders the specified artboard as an PNG image file.
   *
   * All visible layers from the artboard are included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard to render.
   * @param filePath The target location of the produced PNG image file.
   * @param options Render options
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.bounds The area (in the coordinate system of the artboard) to include. This can be used to either crop or expand (add empty space to) the default artboard area.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example With default options (1x, whole artboard area)
   * ```typescript
   * await design.renderArtboardToFile('<ARTBOARD_ID>', './rendered/artboard.png')
   * ```
   *
   * @example With custom scale and crop
   * ```typescript
   * await design.renderArtboardToFile('<ARTBOARD_ID>', './rendered/artboard.png', {
   *   scale: 4,
   *   // The result is going to have the dimensions of 400x200 due to the 4x scale.
   *   bounds: { left: 100, top: 0, width: 100, height: 50 },
   * })
   * ```
   */
  async renderArtboardToFile(
    artboardId: ArtboardId,
    filePath: string,
    options: {
      scale?: number
      bounds?: Bounds
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: true,
      cancelToken: options.cancelToken || null,
    })

    await renderingDesign.renderArtboardToFile(artboardId, filePath, options)
  }

  /**
   * Renders all artboards from the specified page as a single PNG image file.
   *
   * All visible layers from the artboards are included.
   *
   * Uncached items (artboard contents and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param pageId The ID of the page to render.
   * @param filePath The target location of the produced PNG image file.
   * @param options Render options
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.bounds The area (in the coordinate system of the page) to include. This can be used to either crop or expand (add empty space to) the default page area.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example With default options (1x, whole page area)
   * ```typescript
   * await design.renderPageToFile('<PAGE_ID>', './rendered/page.png')
   * ```
   *
   * @example With custom scale and crop
   * ```typescript
   * await design.renderPageToFile('<PAGE_ID>', './rendered/page.png', {
   *   scale: 2,
   *   // The result is going to have the dimensions of 400x200 due to the 2x scale.
   *   bounds: { left: 100, top: 0, width: 100, height: 50 },
   * })
   * ```
   */
  async renderPageToFile(
    pageId: PageId,
    filePath: string,
    options: {
      scale?: number
      bounds?: Bounds
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignPage(pageId, { loadAssets: true })

    await renderingDesign.renderPageToFile(pageId, filePath, options)
  }

  /**
   * Renders the specified layer from the specified artboard as an PNG image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param layerId The ID of the artboard layer to render.
   * @param filePath The target location of the produced PNG image file.
   * @param options Render options
   * @param options.blendingMode The blending mode to use for rendering the layer instead of its default blending mode.
   * @param options.clip Whether to apply clipping by a mask layer if any such mask is set for the layer (see {@link LayerFacade.isMasked}). Clipping is disabled by default. Setting this flag for layers which do not have a mask layer set has no effect on the results.
   * @param options.includeComponentBackground Whether to render the component background from the main/master component. By default, the configuration from the main/master component is used. Note that this configuration has no effect when the artboard background is not included via explicit `includeComponentBackground=true` nor the main/master component configuration as there is nothing with which to blend the layer.
   * @param options.includeEffects Whether to apply layer effects of the layer. Rendering of effects of nested layers is not affected. By defaults, effects of the layer are applied.
   * @param options.opacity The opacity to use for the layer instead of its default opacity.
   * @param options.bounds The area (in the coordinate system of the artboard) to include. This can be used to either crop or expand (add empty space to) the default layer area.
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript With default options (1x, whole layer area)
   * await design.renderArtboardLayerToFile(
   *   '<ARTBOARD_ID>',
   *   '<LAYER_ID>',
   *   './rendered/layer.png'
   * )
   * ```
   *
   * @example With custom scale and crop and using the component background color
   * ```typescript
   * await design.renderArtboardLayerToFile(
   *   '<ARTBOARD_ID>',
   *   '<LAYER_ID>',
   *   './rendered/layer.png',
   *   {
   *     scale: 2,
   *     // The result is going to have the dimensions of 400x200 due to the 2x scale.
   *     bounds: { left: 100, top: 0, width: 100, height: 50 },
   *     includeComponentBackground: true,
   *   }
   * )
   * ```
   */
  async renderArtboardLayerToFile(
    artboardId: ArtboardId,
    layerId: LayerId,
    filePath: string,
    options: {
      includeEffects?: boolean
      clip?: boolean
      includeComponentBackground?: boolean
      blendingMode?: BlendingMode
      opacity?: number
      bounds?: Bounds
      scale?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const { bounds, scale, cancelToken = null, ...layerAttributes } = options

    await this.renderArtboardLayersToFile(artboardId, [layerId], filePath, {
      ...(bounds ? { bounds } : {}),
      scale: scale || 1,
      layerAttributes: { [layerId]: layerAttributes },
      cancelToken,
    })
  }

  /**
   * Renders the specified layers from the specified artboard as a single composed PNG image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard from which to render the layers.
   * @param layerIds The IDs of the artboard layers to render.
   * @param filePath The target location of the produced PNG image file.
   * @param options Render options
   * @param options.bounds The area (in the coordinate system of the artboard) to include. This can be used to either crop or expand (add empty space to) the default layer area.
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.layerAttributes Layer-specific options to use for the rendering instead of the default values.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example With default options (1x, whole combined layer area)
   * ```typescript
   * await design.renderArtboardLayersToFile(
   *   '<ARTBOARD_ID>',
   *   ['<LAYER1>', '<LAYER2>'],
   *   './rendered/layers.png'
   * )
   * ```
   *
   * @example With custom scale and crop and using the custom layer configuration
   * ```typescript
   * await design.renderArtboardLayersToFile(
   *   '<ARTBOARD_ID>',
   *   ['<LAYER1>', '<LAYER2>'],
   *   './rendered/layers.png',
   *   {
   *     scale: 2,
   *     // The result is going to have the dimensions of 400x200 due to the 2x scale.
   *     bounds: { left: 100, top: 0, width: 100, height: 50 },
   *     layerAttributes: {
   *       '<LAYER1>': { blendingMode: 'SOFT_LIGHT', includeComponentBackground: true },
   *       '<LAYER2>': { opacity: 0.6 },
   *     }
   *   }
   * )
   * ```
   */
  async renderArtboardLayersToFile(
    artboardId: ArtboardId,
    layerIds: Array<LayerId>,
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const { cancelToken = null, ...layerOptions } = options

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: false,
      cancelToken,
    })

    const resolvedLayerSubtrees = await Promise.all(
      layerIds.map((layerId) => {
        return this._resolveVisibleArtboardLayerSubtree(artboardId, layerId, {
          cancelToken,
        })
      })
    )
    const resolvedLayerIds = resolvedLayerSubtrees.flat(1)
    if (resolvedLayerIds.length === 0) {
      throw new Error('No such layer')
    }

    const bitmapAssetDescs = (
      await Promise.all(
        layerIds.map(async (layerId) => {
          const layer = await artboard.getLayerById(layerId, { cancelToken })
          return layer ? layer.getBitmapAssets() : []
        })
      )
    ).flat(1)

    const fonts = (
      await Promise.all(
        layerIds.map(async (layerId) => {
          const layer = await artboard.getLayerById(layerId, { cancelToken })
          return layer ? layer.getFonts() : []
        })
      )
    ).flat(1)

    await Promise.all([
      this.downloadBitmapAssets(bitmapAssetDescs, { cancelToken }),
      this._loadFontsToRendering(fonts, { cancelToken }),
    ])

    await renderingDesign.markArtboardAsReady(artboardId)
    cancelToken?.throwIfCancelled()

    await renderingDesign.renderArtboardLayersToFile(
      artboardId,
      resolvedLayerIds,
      filePath,
      layerOptions
    )
  }

  /**
   * Returns an SVG document string of the specified layer from the specified artboard.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Bitmap assets are serialized as base64 data URIs.
   *
   * Uncached items (artboard content and bitmap assets of exported layers) are downloaded and cached.
   *
   * The SVG exporter has to be configured when using this methods. The local cache has to also be configured when working with layers with bitmap assets.
   *
   * @category SVG Export
   * @param artboardId The ID of the artboard from which to export the layer.
   * @param layerId The IDs of the artboard layer to export.
   * @param options Export options
   * @param options.blendingMode The blending mode to use for the layer instead of its default blending mode.
   * @param options.clip Whether to apply clipping by a mask layer if any such mask is set for the layer (see {@link LayerFacade.isMasked}). Clipping is disabled by default. Setting this flag for layers which do not have a mask layer set has no effect on the results.
   * @param options.includeEffects Whether to apply layer effects of the layer. Effects of nested layers are not affected. By defaults, effects of the layer are applied.
   * @param options.opacity The opacity to use for the layer instead of its default opacity.
   * @param options.scale The scale (zoom) factor to use instead of the default 1x factor.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns An SVG document string.
   *
   * @example With default options (1x)
   * ```typescript
   * const svg = await design.exportArtboardLayerToSvgCode(
   *   '<ARTBOARD_ID>',
   *   '<LAYER_ID>'
   * )
   * ```
   *
   * @example With custom scale and opacity
   * ```typescript
   * const svg = await design.exportArtboardLayerToSvgCode(
   *   '<ARTBOARD_ID>',
   *   '<LAYER_ID>',
   *   {
   *     opacity: 0.6,
   *     scale: 2,
   *   }
   * )
   * ```
   */
  async exportArtboardLayerToSvgCode(
    artboardId: ArtboardId,
    layerId: LayerId,
    options: {
      includeEffects?: boolean
      clip?: boolean
      blendingMode?: BlendingMode
      opacity?: number
      scale?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string> {
    const { scale = 1, cancelToken = null, ...layerAttributes } = options

    return this.exportArtboardLayersToSvgCode(artboardId, [layerId], {
      scale,
      cancelToken,
      layerAttributes: { [layerId]: layerAttributes },
    })
  }

  /**
   * Exports the specified layer from the specified artboard as an SVG file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Bitmap assets are serialized as base64 data URIs.
   *
   * Uncached items (artboard content and bitmap assets of exported layers) are downloaded and cached.
   *
   * The SVG exporter has to be configured when using this methods. The local cache has to also be configured when working with layers with bitmap assets.
   *
   * @category SVG Export
   * @param artboardId The ID of the artboard from which to export the export.
   * @param layerId The IDs of the artboard layer to export.
   * @param filePath The target location of the produced SVG file.
   * @param options Export options.
   * @param options.blendingMode The blending mode to use for the layer instead of its default blending mode.
   * @param options.clip Whether to apply clipping by a mask layer if any such mask is set for the layer (see {@link LayerFacade.isMasked}). Clipping is disabled by default. Setting this flag for layers which do not have a mask layer set has no effect on the results.
   * @param options.includeEffects Whether to apply layer effects of the layer. Effects of nested layers are not affected. By defaults, effects of the layer are applied.
   * @param options.opacity The opacity to use for the layer instead of its default opacity.
   * @param options.scale The scale (zoom) factor to use instead of the default 1x factor.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example With default options (1x)
   * ```typescript
   * await design.exportArtboardLayerToSvgFile(
   *   '<ARTBOARD_ID>',
   *   '<LAYER_ID>',
   *   './layer.svg'
   * )
   * ```
   *
   * @example With custom scale and opacity
   * ```typescript
   * await design.exportArtboardLayerToSvgFile(
   *   '<ARTBOARD_ID>',
   *   '<LAYER_ID>',
   *   './layer.svg',
   *   {
   *     opacity: 0.6,
   *     scale: 2,
   *   }
   * )
   * ```
   */
  async exportArtboardLayerToSvgFile(
    artboardId: ArtboardId,
    layerId: LayerId,
    filePath: string,
    options: {
      scale?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const svg = await this.exportArtboardLayerToSvgCode(
      artboardId,
      layerId,
      options
    )

    await this._sdk.saveTextFile(filePath, svg, {
      cancelToken: options.cancelToken,
    })
  }

  /**
   * Returns an SVG document string of the specified layers from the specified artboard.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Bitmap assets are serialized as base64 data URIs.
   *
   * Uncached items (artboard content and bitmap assets of exported layers) are downloaded and cached.
   *
   * The SVG exporter has to be configured when using this methods. The local cache has to also be configured when working with layers with bitmap assets.
   *
   * @category SVG Export
   * @param artboardId The ID of the artboard from which to export the layers.
   * @param layerIds The IDs of the artboard layers to export.
   * @param options Export options.
   * @param options.layerAttributes Layer-specific options to use for instead of the default values.
   * @param options.scale The scale (zoom) factor to use instead of the default 1x factor.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns An SVG document string.
   *
   * @example With default options (1x)
   * ```typescript
   * const svg = await design.exportArtboardLayersToSvgCode(
   *   '<ARTBOARD_ID>',
   *   ['<LAYER1>', '<LAYER2>']
   * )
   * ```
   *
   * @example With custom scale
   * ```typescript
   * const svg = await design.exportArtboardLayersToSvgCode(
   *   '<ARTBOARD_ID>',
   *   ['<LAYER1>', '<LAYER2>'],
   *   {
   *     scale: 2,
   *     layerAttributes: {
   *       '<LAYER1>': { blendingMode: 'SOFT_LIGHT' },
   *       '<LAYER2>': { opacity: 0.6 },
   *     }
   *   }
   * )
   * ```
   */
  async exportArtboardLayersToSvgCode(
    artboardId: ArtboardId,
    layerIds: Array<LayerId>,
    options: {
      layerAttributes?: Record<LayerId, LayerOctopusAttributesConfig>
      scale?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const { layerAttributes = {}, scale = 1, cancelToken = null } = options

    await artboard.load({ cancelToken })

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const data = await layerIds.reduce(
      async (prevResultPromise, layerId) => {
        const [prevResult, layer] = await Promise.all([
          prevResultPromise,
          artboard.getLayerById(layerId, { cancelToken }),
        ])
        if (!layer) {
          return prevResult
        }

        const parentLayers = layer.getParentLayers().getLayers()

        return {
          bitmapAssetDescs: prevResult.bitmapAssetDescs.concat(
            layer.getBitmapAssets()
          ),
          fonts: prevResult.fonts.concat(layer.getFonts()),
          parentLayers: parentLayers.reduce((layers, parentLayer) => {
            return {
              ...layers,
              [parentLayer.id]: parentLayer.getOctopusForAttributes(
                layerAttributes[parentLayer.id] || {}
              ),
            }
          }, prevResult.parentLayers),
          parentLayerIds: {
            ...prevResult.parentLayerIds,
            [layerId]: layer.getParentLayerIds(),
          },
          layerOctopusDataList: prevResult.layerOctopusDataList.concat([
            layer.getOctopusForAttributes(layerAttributes[layer.id] || {}),
          ]),
        }
      },
      Promise.resolve({
        bitmapAssetDescs: [] as Array<BitmapAssetDescriptor>,
        fonts: [] as Array<FontDescriptor>,
        parentLayers: {} as Record<LayerId, LayerOctopusData>,
        parentLayerIds: {} as Record<LayerId, Array<LayerId>>,
        layerOctopusDataList: [] as Array<LayerOctopusData>,
      })
    )

    const [bitmapAssetFilenames] = await Promise.all([
      this.downloadBitmapAssets(data.bitmapAssetDescs, { cancelToken }),
      this._loadFontsToRendering(data.fonts, { cancelToken }),
    ])

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: false,
      cancelToken,
    })

    const viewBoxBounds = await renderingDesign.getArtboardLayerCompositionBounds(
      artboardId,
      layerIds,
      { scale, layerAttributes }
    )

    return this._sdk.exportLayersToSvgCode(data.layerOctopusDataList, {
      scale,
      parentLayerIds: data.parentLayerIds,
      parentLayers: data.parentLayers,
      viewBoxBounds,
      bitmapAssetFilenames,
      cancelToken,
    })
  }

  /**
   * Export the specified layers from the specified artboard as an SVG file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Bitmap assets are serialized as base64 data URIs.
   *
   * Uncached items (artboard content and bitmap assets of exported layers) are downloaded and cached.
   *
   * The SVG exporter has to be configured when using this methods. The local cache has to also be configured when working with layers with bitmap assets.
   *
   * @category SVG Export
   * @param artboardId The ID of the artboard from which to export the layers.
   * @param layerIds The IDs of the artboard layers to export.
   * @param filePath The target location of the produced SVG file.
   * @param options Export options
   * @param options.layerAttributes Layer-specific options to use for instead of the default values.
   * @param options.scale The scale (zoom) factor to use instead of the default 1x factor.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example With default options (1x)
   * ```typescript
   * await design.exportArtboardLayersToSvgFile(
   *   '<ARTBOARD_ID>',
   *   ['<LAYER1>', '<LAYER2>'],
   *   './layers.svg'
   * )
   * ```
   *
   * @example With custom scale
   * ```typescript
   * await design.exportArtboardLayersToSvgFile(
   *   '<ARTBOARD_ID>',
   *   ['<LAYER1>', '<LAYER2>'],
   *   './layers.svg',
   *   {
   *     scale: 2,
   *     layerAttributes: {
   *       '<LAYER1>': { blendingMode: 'SOFT_LIGHT' },
   *       '<LAYER2>': { opacity: 0.6 },
   *     }
   *   }
   * )
   * ```
   */
  async exportArtboardLayersToSvgFile(
    artboardId: ArtboardId,
    layerIds: Array<LayerId>,
    filePath: string,
    options: {
      scale?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const svg = await this.exportArtboardLayersToSvgCode(
      artboardId,
      layerIds,
      options
    )

    await this._sdk.saveTextFile(filePath, svg, {
      cancelToken: options.cancelToken,
    })
  }

  /**
   * Returns the bounds of the specified artboard.
   *
   * The API has to be configured when using this method to get bounds of an uncached artboard.
   *
   * @category Data
   * @param options Options
   * @param artboardId The ID of the artboard to inspect.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns The artboard bounds.
   *
   * @example
   * ```typescript
   * const artboardBounds = await design.getArtboardBounds('<ARTBOARD_ID>')
   * ```
   */
  async getArtboardBounds(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Bounds> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.getBounds(options)
  }

  /**
   * Returns various bounds of the specified layer.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Data
   * @param artboardId The ID of the artboard from which to inspect the layer.
   * @param layerId The ID of the layer to inspect.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns Various layer bounds.
   *
   * @example
   * ```typescript
   * const layerBounds = await design.getArtboardLayerBounds('<ARTBOARD_ID>', '<LAYER_ID>')
   * const boundsWithEffects = layerBounds.fullBounds
   * ```
   */
  async getArtboardLayerBounds(
    artboardId: ArtboardId,
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerBounds> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const layer = await artboard.getLayerById(layerId, options)
    if (!layer) {
      throw new Error('No such layer')
    }

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: false,
      ...options,
    })

    const fonts = layer.getFonts()
    await this._loadFontsToRendering(fonts, options)

    return renderingDesign.getArtboardLayerBounds(artboardId, layerId)
  }

  /**
   * Returns the attributes of the spececified layer.
   *
   * @category Data
   * @param artboardId The ID of the artboard from which to inspect the layer.
   * @param layerId The ID of the layer to inspect.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns Layer attributes.
   *
   * @example
   * ```typescript
   * const attrs = await design.getArtboardLayerAttributes('<ARTBOARD_ID>', '<LAYER_ID>')
   * const { blendingMode, opacity, visible } = attrs
   * ```
   */
  async getArtboardLayerAttributes(
    artboardId: ArtboardId,
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerAttributes> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const layer = await artboard.getLayerById(layerId, options)
    if (!layer) {
      throw new Error('No such layer')
    }

    return layer.getAttributes()
  }

  /**
   * Returns the top-most layer located at the specified coordinates within the specified artboard.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Layer Lookup
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param x The X coordinate in the coordinate system of the artboard where to look for a layer.
   * @param y The Y coordinate in the coordinate system of the artboard where to look for a layer.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns A layer object.
   *
   * @example
   * ```typescript
   * const layerId = await design.getArtboardLayerAtPosition('<ARTBOARD_ID>', 100, 200)
   * ```
   */
  async getArtboardLayerAtPosition(
    artboardId: ArtboardId,
    x: number,
    y: number,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: true,
      ...options,
    })

    const layerId = await renderingDesign.getArtboardLayerAtPosition(
      artboardId,
      x,
      y
    )
    return layerId ? this.getArtboardLayerFacade(artboardId, layerId) : null
  }

  /**
   * Returns all layers located within the specified area of the the specified artboard.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Layer Lookup
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param bounds The area in the corrdinate system of the artboard where to look for layers.
   * @param options Options
   * @param options.partialOverlap Whether to also return layers which are only partially contained within the specified area.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   * @returns A layer list.
   *
   * @example Layers fully contained in the area
   * ```typescript
   * const layerIds = await design.getArtboardLayersInArea(
   *   '<ARTBOARD_ID>',
   *   { left: 80, top: 150, width: 40, height: 30 }
   * )
   * ```
   *
   * @example Layers fully or partially contained in the area
   * ```typescript
   * const layerIds = await design.getArtboardLayersInArea(
   *   '<ARTBOARD_ID>',
   *   { left: 80, top: 150, width: 40, height: 30 },
   *   { partialOverlap: true }
   * )
   * ```
   */
  async getArtboardLayersInArea(
    artboardId: ArtboardId,
    bounds: Bounds,
    options: {
      partialOverlap?: boolean
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Array<LayerFacade>> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const { cancelToken = null, ...layerOptions } = options

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: true,
      cancelToken,
    })

    const layerIds = await renderingDesign.getArtboardLayersInArea(
      artboardId,
      bounds,
      layerOptions
    )

    return layerIds.flatMap((layerId) => {
      const layerFacade = this.getArtboardLayerFacade(artboardId, layerId)
      return layerFacade ? [layerFacade] : []
    })
  }

  /** @internal */
  getArtboardLayerFacade(
    artboardId: ArtboardId,
    layerId: LayerId
  ): LayerFacade | null {
    const artboardFacade = this.getArtboardById(artboardId)
    return artboardFacade ? artboardFacade.getLayerFacadeById(layerId) : null
  }

  /** @internal */
  async load(options: { cancelToken?: CancelToken | null }): Promise<void> {
    const artboards = this.getArtboards()

    await Promise.all(
      artboards.map((artboard) => {
        return artboard.load(options)
      })
    )
  }

  /** @internal */
  async loadArtboard(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<ArtboardFacade> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const prevArtboardLoadingPromise = this._loadingArtboardPromises.get(
      artboardId
    )
    if (prevArtboardLoadingPromise) {
      await prevArtboardLoadingPromise
    } else if (!artboard.isLoaded()) {
      // NOTE: Maybe use the Octopus Reader file entity instead for clearer source of truth.
      const artboardEntity = artboard.getArtboardEntity()
      const artboardLoadingPromise = this._loadArtboardContent(
        artboardId,
        options
      ).then((content) => {
        artboardEntity.setOctopus(content)
      })

      this._loadingArtboardPromises.set(artboardId, artboardLoadingPromise)
      await artboardLoadingPromise
    }

    return artboard
  }

  /**
   * Releases all loaded data of the design from memory. The design object is no longer usable after this.
   *
   * If it is only desired to clean loaded data from memory while keeping the object usable, call {@link DesignFacade.unload} instead.
   *
   * @category Status
   */
  async destroy(): Promise<void> {
    this._designEntity = null
    this._getDesignEntity.clear()

    const localDesign = this._localDesign
    if (localDesign) {
      localDesign.unload()
    }

    const renderingDesign = this._renderingDesign
    if (renderingDesign) {
      await renderingDesign.destroy()
    }
  }

  /**
   * Releases all loaded data of the design from memory. The design object can be used for loading the data again later.
   *
   * @category Status
   */
  async unload(): Promise<void> {
    const designEntity = this._getDesignEntity()
    designEntity.unloadArtboards()

    const localDesign = this._localDesign
    if (localDesign) {
      localDesign.unload()
    }

    const renderingDesign = this._renderingDesign
    if (renderingDesign) {
      await renderingDesign.unloadArtboards()
    }
  }

  /**
   * Releases data related to the specified artboard from memory.
   *
   * @param artboardId The ID of the artboard to unload.
   * @category Status
   */
  async unloadArtboard(artboardId: ArtboardId): Promise<void> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    if (!artboard.isLoaded()) {
      this._console.warn(
        'Trying to unload an artboard which has not been loaded.'
      )
      return
    }

    const artboardEntity = artboard.getArtboardEntity()
    artboardEntity.unload()

    const renderingDesign = this._renderingDesign
    if (renderingDesign) {
      await renderingDesign.unloadArtboard(artboardId)
    }
  }

  private async _loadArtboardContent(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<OctopusDocument> {
    const localDesign = this._localDesign
    const apiDesign = this._apiDesign

    if (localDesign) {
      if (!(await localDesign.hasArtboardContent(artboardId))) {
        if (!apiDesign) {
          throw new Error(
            'The artboard is not locally available and the API is not configured'
          )
        }

        const contentStream = await apiDesign.getArtboardContentJsonStream(
          artboardId,
          options
        )
        await localDesign.saveArtboardContentJsonStream(
          artboardId,
          contentStream,
          options
        )
      }

      return localDesign.getArtboardContent(artboardId, options)
    }

    if (!apiDesign) {
      throw new Error('The artboard cannot be loaded')
    }

    return apiDesign.getArtboardContent(artboardId, options)
  }

  /**
   * Downloads the specified bitmap assets to the local cache.
   *
   * Assets which have already been downloaded are skipped.
   *
   * The API and the local cache have to be configured when using this method.
   *
   * @category Asset
   * @param bitmapAssetDescs A list of bitmap assets to download. When not provided, all bitmap assets of the design are downloaded.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the asset is not deleted from the disk). A cancellation token can be created via {@link createCancelToken}.
   * @returns The locations of the bitmap assets within the file system. Keys of the produced object are the `name` values from the provided bitmap asset descriptors (or all bitmap asset names by default).
   *
   * @example Download all assets
   * ```typescript
   * const bitmapAssetFilenames = await design.downloadBitmapAssets()
   * ```
   *
   * @example Download specific assets
   * ```typescript
   * const bitmapAssetDescs = await design.getBitmapAssets({ depth: 1 })
   * const bitmapAssetFilenames = await design.downloadBitmapAssets(bitmapAssetDescs)
   * ```
   */
  async downloadBitmapAssets(
    bitmapAssetDescs?: Array<BitmapAssetDescriptor>,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Record<string, string>> {
    bitmapAssetDescs = bitmapAssetDescs || (await this.getBitmapAssets())

    const filenames = await sequence(
      bitmapAssetDescs,
      async (bitmapAssetDesc) => {
        return this.downloadBitmapAsset(bitmapAssetDesc, options)
      }
    )

    const bitmapAssetFilenames = {} as {
      [K in BitmapAssetDescriptor['name']]: string
    }
    bitmapAssetDescs.forEach((bitmapAssetDesc, index) => {
      const filename = filenames[index] as string
      bitmapAssetFilenames[bitmapAssetDesc['name']] = filename
    })

    return bitmapAssetFilenames
  }

  /**
   * Downloads the specified bitmap asset to the local cache.
   *
   * The API and the local cache have to be configured when using this method.
   *
   * @category Asset
   * @param bitmapAssetDesc The bitmap asset to download.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. assets are not deleted from the disk). A cancellation token can be created via {@link createCancelToken}.
   * @returns The location of the bitmap asset within the file system.
   *
   * @example
   * ```typescript
   * const bitmapAssetDescs = await design.getBitmapAssets({ depth: 1 })
   * await Promise.all(bitmapAssetDescs.map(async (bitmapAssetDesc) => {
   *   return design.downloadBitmapAsset(bitmapAssetDesc)
   * }))
   * ```
   */
  async downloadBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string> {
    const apiDesign = this._apiDesign
    if (!apiDesign) {
      throw new Error(
        'The API is not configured, cannot download bitmap assets'
      )
    }

    const localDesign = this._localDesign
    if (!localDesign) {
      throw new Error('The design is not configured to be a local file')
    }

    const { available, filename } = await localDesign.resolveBitmapAsset(
      bitmapAssetDesc,
      options
    )
    if (available) {
      return filename
    }

    const bitmapAssetStream = await apiDesign.getBitmapAssetStream(
      bitmapAssetDesc.name,
      options
    )
    return localDesign.saveBitmapAssetStream(
      bitmapAssetDesc,
      bitmapAssetStream,
      options
    )
  }

  /**
   * Returns the file system location of the specified bitmap asset if it is downloaded.
   *
   * The local cache has to be configured when using this method.
   *
   * @category Asset
   * @param bitmapAssetDesc A list of bitmap assets to download.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected. A cancellation token can be created via {@link createCancelToken}.
   * @returns The location of the bitmap asset. `null` is returned when the asset is not downloaded.
   *
   * @example
   * ```typescript
   * const bitmapAssetDescs = await design.getBitmapAssets({ depth: 1 })
   *
   * const downlodedBitmapAssetFilenames = []
   * await Promise.all(bitmapAssetDescs.map(async (bitmapAssetDesc) => {
   *   const filename = design.getBitmapAssetFilename(bitmapAssetDesc)
   *   if (filename) {
   *     downlodedBitmapAssetFilenames.push(filename)
   *   }
   * }))
   * ```
   */
  async getBitmapAssetFilename(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string | null> {
    const localDesign = this._localDesign
    if (!localDesign) {
      throw new Error('The design is not configured to be a local file')
    }

    const { available, filename } = await localDesign.resolveBitmapAsset(
      bitmapAssetDesc,
      options
    )

    return available ? filename : null
  }

  /**
   * Downloads all uncached pages, artboards and bitmap assets to the local `.octopus` file or the local cache.
   *
   * In case a new file path is provided for a design loaded from an existing `.octopus` file, all of its contents are copied to the new location and this method essentially serves the purpose of a "save as" action.
   *
   * The produced `.octopus` file preserves a reference to a server-side design.
   *
   * The design object switches to using the new location as the local `.octopus` file and considers the file a local cache.
   *
   * @internal
   * @category Serialization
   * @param options.filePath An absolute path of the target `.octopus` file or a path relative to the current working directory. When omitted, the open `.octopus` file location is used instead. The API has to be configured in case there are uncached items.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the created files are not deleted). A cancellation token can be created via {@link createCancelToken}.
   */
  async saveOctopusFile(
    options: { filePath?: string | null; cancelToken?: CancelToken | null } = {}
  ): Promise<void> {
    const cancelToken = options.cancelToken || null

    const localDesign = await this._getLocalDesign({
      filePath: options.filePath || null,
      cancelToken,
    })
    const apiDesign = this._apiDesign

    const manifest = this.getManifest()
    await localDesign.saveManifest(manifest, { cancelToken })

    if (apiDesign) {
      await localDesign.saveApiDesignInfo(
        {
          apiRoot: apiDesign.getApiRoot(),
          designId: apiDesign.id,
        },
        { cancelToken }
      )
    }

    await Promise.all(
      this.getArtboards().map(async (artboard) => {
        const artboardOctopus = await artboard.getContent({ cancelToken })
        if (!artboardOctopus) {
          throw new Error('Artboard octopus not available')
        }

        await localDesign.saveArtboardContent(artboard.id, artboardOctopus, {
          cancelToken,
        })
      })
    )

    await this.setLocalDesign(localDesign, { cancelToken })

    const bitmapAssetDescs = await this.getBitmapAssets({ cancelToken })
    await this.downloadBitmapAssets(bitmapAssetDescs, { cancelToken })
  }

  /**
   * Downloads the design file of the specified format produced by a server-side design file export.
   *
   * In case no such export has been done for the design yet, a new export is initiated and the resulting design file is downloaded.
   *
   * @category Serialization
   * @param filePath An absolute path to which to save the design file or a path relative to the current working directory.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. a partially downloaded file is not deleted). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example Export a Figma design as a Sketch design file (the only supported conversion)
   * ```typescript
   * await design.exportDesignFile('./exports/design.sketch')
   * ```
   */
  async exportDesignFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const format = getDesignFormatByFileName(filePath)
    if (!format) {
      throw new Error('Unknown target design file format')
    }
    if (format !== 'sketch') {
      throw new Error('Unsupported target design file format')
    }

    const designExport = await this.getExportToFormat(format, options)
    await this._sdk.saveDesignFileStream(
      filePath,
      await designExport.getResultStream(options),
      options
    )
  }

  private async _getLocalDesign(params: {
    filePath: string | null
    cancelToken?: CancelToken | null
  }): Promise<LocalDesign> {
    const cancelToken = params.cancelToken || null
    const localDesign = this._localDesign

    if (!params.filePath) {
      if (!localDesign) {
        throw new Error('The design is not configured to be a local file')
      }

      return localDesign
    }

    if (localDesign) {
      await localDesign.saveAs(params.filePath, { cancelToken })
      return localDesign
    }

    const targetDesignFacade = await this._sdk.openOctopusFile(
      params.filePath,
      { cancelToken }
    )
    const targetLocalDesign = targetDesignFacade.getLocalDesign()
    if (!targetLocalDesign) {
      throw new Error('Target location is not available')
    }

    return targetLocalDesign
  }

  /** @internal */
  addDesignExport(designExport: DesignExportFacade): void {
    const format = designExport.resultFormat
    this._designExports.set(format, designExport)
  }

  /**
   * Returns info about a design file of the specified format produced by a server-side design file format export.
   *
   * In case no such export has been done for the design yet, a new export is initiated and the resulting design file info is then returned.
   *
   * @category Serialization
   * @param format The format to which the design should be exported.
   * @param options Options
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected. A cancellation token can be created via {@link createCancelToken}.
   * @returns A design export object.
   *
   * @example
   * ```typescript
   * // Initiate/fetch an export of a Figma design to the Sketch format (the only supported conversion)
   * const export = await design.getExportToFormat('sketch')
   *
   * // Optional step to get lower-level info
   * const url = await export.getResultUrl()
   * console.log('Downloading export:', url)
   *
   * // Download the exported Sketch design file
   * await export.exportDesignFile('./exports/design.sketch')
   * ```
   */
  async getExportToFormat(
    format: DesignExportTargetFormatEnum,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignExportFacade> {
    const prevExport = this._designExports.get(format)
    if (prevExport) {
      return prevExport
    }

    const apiDesign = this._apiDesign
    if (!apiDesign) {
      throw new Error('The API is not configured, cannot export the design')
    }

    const designExport = await apiDesign.exportDesign({
      format,
      cancelToken: options.cancelToken || null,
    })
    const designExportFacade = new DesignExportFacade(designExport, {
      sdk: this._sdk,
    })
    this._designExports.set(format, designExportFacade)

    return designExportFacade
  }

  private async _loadRenderingDesignPage(
    pageId: string,
    params: {
      loadAssets: boolean
      cancelToken?: CancelToken | null
    }
  ) {
    const pageArtboards = this.getPageArtboards(pageId)

    await sequence(pageArtboards, (artboard) => {
      return this._loadRenderingDesignArtboard(artboard.id, params)
    })
  }

  private async _loadRenderingDesignArtboard(
    artboardId: string,
    params: {
      loadAssets: boolean
      cancelToken?: CancelToken | null
    }
  ) {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    if (renderingDesign.isArtboardReady(artboardId)) {
      return
    }

    const localDesign = this._localDesign
    if (!localDesign) {
      throw new Error('Local cache is not configured')
    }

    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const cancelToken = params.cancelToken || null

    await artboard.load({ cancelToken })

    const octopusFilename = await localDesign.getArtboardContentFilename(
      artboardId,
      { cancelToken }
    )
    if (!octopusFilename) {
      throw new Error('The artboard octopus location is not available')
    }

    const desc = await renderingDesign.loadArtboard(artboardId, {
      octopusFilename,
      symbolId: artboard.componentId,
      pageId: artboard.pageId,
    })
    cancelToken?.throwIfCancelled()

    // NOTE: This logic is more a future-proofing of the logic rather than a required step
    //   as the SDK works with "expanded" octopus documents only and there should thus not be
    //   any pending symbols.
    await sequence(desc.pendingSymbolIds, async (componentId: string) => {
      const componentArtboard = this.getArtboardByComponentId(componentId)
      if (!componentArtboard) {
        throw new Error('A dependency component artboard is not available')
      }

      return this._loadRenderingDesignArtboard(componentArtboard.id, params)
    })

    if (params.loadAssets) {
      const bitmapAssetDescs = await artboard.getBitmapAssets()
      cancelToken?.throwIfCancelled()

      const fonts = await artboard.getFonts()
      cancelToken?.throwIfCancelled()

      await Promise.all([
        this.downloadBitmapAssets(bitmapAssetDescs, { cancelToken }),
        this._loadFontsToRendering(fonts, { cancelToken }),
      ])
    }

    await renderingDesign.markArtboardAsReady(artboardId)
    cancelToken?.throwIfCancelled()

    if (!renderingDesign.isArtboardReady(artboardId)) {
      throw new Error('The artboard failed to be loaded to a ready state')
    }
  }

  private async _loadFontsToRendering(
    fonts: Array<{ fontPostScriptName: string }>,
    options: {
      cancelToken?: CancelToken | null
    }
  ) {
    const fontSource = this._fontSource
    if (!fontSource) {
      return
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await sequence(fonts, async ({ fontPostScriptName }) => {
      const fontMatch = await fontSource.resolveFontPath(
        fontPostScriptName,
        options
      )
      if (fontMatch) {
        await renderingDesign.loadFont(
          fontPostScriptName,
          fontMatch.fontFilename,
          { facePostscriptName: fontMatch.fontPostscriptName }
        )
        options.cancelToken?.throwIfCancelled()
      } else {
        this._console.warn(`Font not available: ${fontPostScriptName}`)
      }
    })
  }

  private _resolveVisibleArtboardLayerSubtree(
    artboardId: ArtboardId,
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<Array<LayerId>> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.resolveVisibleLayerSubtree(layerId, options)
  }
}
