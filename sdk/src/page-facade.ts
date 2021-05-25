import { inspect } from 'util'
import { enumerablizeWithPrototypeGetters } from './utils/object'
import { createLayerEntitySelector } from './utils/selector-utils'

import { DesignLayerCollectionFacade } from './design-layer-collection-facade'

import type { CancelToken } from '@avocode/cancel-token'
import type {
  ArtboardId,
  ArtboardSelector,
  ComponentId,
  FileLayerSelector,
  IPage,
  LayerId,
  PageSelector,
} from '@opendesign/octopus-reader'
import type { ArtboardFacade } from './artboard-facade'
import type { DesignFacade } from './design-facade'
import type { FontDescriptor, LayerFacade } from './layer-facade'
import type { BitmapAssetDescriptor } from './local/local-design'
import { toFileKey } from './utils/id-utils'

export class PageFacade {
  private _pageEntity: IPage
  private _designFacade: DesignFacade

  /** @internal */
  constructor(pageEntity: IPage, params: { designFacade: DesignFacade }) {
    this._pageEntity = pageEntity
    this._designFacade = params.designFacade

    enumerablizeWithPrototypeGetters(this)
  }

  /**
   * The ID of the page.
   *
   * Beware that this value may not be safely usable for naming files in the file system and the {@link fileKey} value should be instead.
   *
   * @category Identification
   */
  get id() {
    return this._pageEntity.id
  }

  /**
   * The key which can be used to name files in the file system. It SHOULD be unique within a design.
   *
   * IDs can include characters invalid for use in file names (such as `:`).
   *
   * @category Identification
   *
   * @example
   * ```typescript
   * // Safe:
   * page.renderToFile(`./pages/${page.fileKey}.png`)
   *
   * // Unsafe:
   * page.renderToFile(`./pages/${page.id}.png`)
   * ```
   */
  get fileKey() {
    return toFileKey(this.id)
  }

  /**
   * The name of the artboard.
   * @category Identification
   */
  get name() {
    return this._pageEntity.name
  }

  /** @internal */
  toString() {
    const artboardInfo = this.toJSON()
    return `Page ${inspect(artboardInfo)}`
  }

  /** @internal */
  [inspect.custom]() {
    return this.toString()
  }

  /** @internal */
  toJSON() {
    return { ...this }
  }

  /** @internal */
  setPageEntity(pageEntity: IPage) {
    this._pageEntity = pageEntity
  }

  /**
   * Returns the design object associated with the page object.
   * @category Reference
   *
   * @example
   * ```typescript
   * const design = page.getDesign()
   * ```
   */
  getDesign(): DesignFacade {
    return this._designFacade
  }

  /**
   * Returns whether the page content and the content of all artboards the page contains are loaded in memory from the API, a local `.octopus` file or a local cache.
   *
   * @category Status
   *
   * @example
   * ```typescript
   * const loaded = page.isLoaded()
   * ```
   */
  isLoaded(): boolean {
    const artboards = this.getArtboards()
    return artboards.every((artboard) => {
      return artboard.isLoaded()
    })
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

  /**
   * Returns whether the page matches the provided selector.
   *
   * @category Page Lookup
   * @param selector The selector against which to test the page.
   *
   * @example
   * ```typescript
   * console.log(page.name) // A
   * page.matches({ name: 'A' }) // true
   * ```
   */
  matches(selector: PageSelector): boolean {
    return this._pageEntity.matches(selector)
  }

  /**
   * Returns a list of artboard object the page contains. These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   *
   * @example
   * ```typescript
   * const artboards = page.getArtboards()
   * ```
   */
  getArtboards(): Array<ArtboardFacade> {
    return this._designFacade.getPageArtboards(this.id)
  }

  /**
   * Returns a single artboard object. This can be used to work with the artboard contents. Artboards from other pages are not returned.
   *
   * @category Artboard Lookup
   * @param artboardId An artboard ID.
   *
   * @example
   * ```typescript
   * const artboard = page.getArtboardById('<ARTBOARD_ID>')
   * ```
   */
  getArtboardById(artboardId: ArtboardId): ArtboardFacade | null {
    const artboard = this._designFacade.getArtboardById(artboardId)
    if (!artboard || artboard.pageId !== this.id) {
      return null
    }

    return artboard
  }

  /**
   * Returns (main/master) component artboard objects the page contains. These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   *
   * @example
   * ```typescript
   * const componentArtboards = page.getComponentArtboards()
   * ```
   */
  getComponentArtboards(): Array<ArtboardFacade> {
    return this.getArtboards().filter((artboard) => {
      return artboard.isComponent()
    })
  }

  /**
   * Returns an artboard object of a specific (main/master) component. These can be used to work with the artboard contents. Component artboards from other pages are not returned.
   *
   * @category Artboard Lookup
   * @param componentId A component ID.
   *
   * @example
   * ```typescript
   * const artboard = page.getArtboardByComponentId('<COMPONENT_ID>')
   * ```
   */
  getArtboardByComponentId(componentId: ComponentId): ArtboardFacade | null {
    const artboard = this._designFacade.getArtboardByComponentId(componentId)
    if (!artboard || artboard.pageId !== this.id) {
      return null
    }

    return artboard
  }

  /**
   * Looks up the first artboard object the page contains matching the provided criteria.
   *
   * @category Artboard Lookup
   * @param selector An artboard selector. All specified fields must be matched by the result.
   *
   * @example
   * ```typescript
   * const productArtboard = page.findArtboard({ name: /Product/i })
   * const productArtboard = page.findArtboard((artboard) => /Product/i.test(artboard.name))
   * const oneOfArtboards123 = page.findArtboard({ id: ['<ID1>', '<ID2>', '<ID3>'] })
   * ```
   */
  findArtboard(
    selector: ArtboardSelector | ((artboard: ArtboardFacade) => boolean)
  ): ArtboardFacade | null {
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

    const matchingArtboards = this._designFacade.findArtboards(selector)

    return (
      matchingArtboards.find((artboard) => {
        return artboard.pageId === this.id
      }) || null
    )
  }

  /**
   * Looks up all artboard objects the page contains matching the provided criteria.
   *
   * @category Artboard Lookup
   * @param selector An artboard selector. All specified fields must be matched by the results.
   *
   * @example
   * ```typescript
   * const productArtboards = page.findArtboards({ name: /Product/i })
   * const productArtboards = page.findArtboards((artboard) => /Product/i.test(artboard.name))
   * const artboards123 = page.findArtboards({ id: ['<ID1>', '<ID2>', '<ID3>'] })
   * ```
   */
  findArtboards(
    selector: ArtboardSelector | ((artboard: ArtboardFacade) => boolean)
  ): Array<ArtboardFacade> {
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

    return this._designFacade.findArtboards(selector).filter((artboard) => {
      return artboard.pageId === this.id
    })
  }

  /**
   * Returns a list of bitmap assets used by layers in all artboards the page contains (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all artboards the page contains. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for bitmap asset usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example All bitmap assets from all artboards on the page
   * ```typescript
   * const bitmapAssetDescs = await page.getBitmapAssets()
   * ```
   *
   * @example Bitmap assets excluding pre-rendered bitmaps from all artboards on the page
   * ```typescript
   * const bitmapAssetDescs = await page.getBitmapAssets({
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
    const { cancelToken = null, ...bitmapOptions } = options

    await this.load({ cancelToken })

    return this._pageEntity.getBitmapAssets(bitmapOptions)
  }

  /**
   * Returns a list of fonts used by layers in all artboards the page contains (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all artboards the page contains. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example All fonts from all artboards on the page
   * ```typescript
   * const fontDescs = await page.getFonts()
   * ```
   */
  async getFonts(
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<
    Array<
      FontDescriptor & { artboardLayerIds: Record<ArtboardId, Array<LayerId>> }
    >
  > {
    const { cancelToken = null, ...fontOptions } = options

    await this.load({ cancelToken })

    return this._pageEntity.getFonts(fontOptions)
  }

  /**
   * Returns a collection of all layers from all artboards within the page (optionally down to a specific nesting level).
   *
   * The produced collection can be queried further for narrowing down the search.
   *
   * This method internally triggers loading of all artboards within the page. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param options.depth The maximum nesting level of layers within the artboards to include in the collection. By default, all levels are included. `0` also means "no limit"; `1` means only root layers in the artboard should be included.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example All layers from all artboards on the page
   * ```typescript
   * const layers = await page.getFlattenedLayers()
   * ```
   *
   * @example Root layers from all artboards on the page
   * ```typescript
   * const rootLayers = await page.getFlattenedLayers({ depth: 1 })
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layers = await page.getFlattenedLayers({ cancelToken: token })
   * ```
   */
  async getFlattenedLayers(
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignLayerCollectionFacade> {
    const { cancelToken = null, ...layerOptions } = options

    await this.load({ cancelToken })

    const layerCollection = this._pageEntity.getFlattenedLayers(layerOptions)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns the first layer object which has the specified ID within the artboards on the page.
   *
   * Layer IDs are unique within individual artboards but different artboards can potentially have layer ID clashes. This is the reason the method is not prefixed with "get".
   *
   * This method internally triggers loading of all the artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   * @param options.depth The maximum nesting level within artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const layer = await page.findLayerById('<ID>')
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layer = await page.findLayerById('<ID>', { cancelToken: token })
   * ```
   */
  async findLayerById(
    layerId: LayerId,
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    const { cancelToken = null, ...layerOptions } = options

    await this.load({ cancelToken })

    const layerEntity = this._pageEntity.findLayerById(layerId, layerOptions)
    const layerFacade =
      layerEntity && layerEntity.artboardId
        ? this._designFacade.getArtboardLayerFacade(
            layerEntity.artboardId,
            layerEntity.id
          )
        : null

    return layerFacade
  }

  /**
   * Returns a collection of all layer objects which have the specified ID within the artboards on the page.
   *
   * Layer IDs are unique within individual artboards but different artboards can potentially have layer ID clashes.
   *
   * This method internally triggers loading of all the artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   * @param options.depth The maximum nesting level within artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const layers = await page.findLayersById('<ID>')
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layers = await page.findLayersById('<ID>', { cancelToken: token })
   * ```
   */
  async findLayersById(
    layerId: LayerId,
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignLayerCollectionFacade> {
    const { cancelToken = null, ...layerOptions } = options

    await this.load({ cancelToken })

    const layerCollection = this._pageEntity.findLayersById(
      layerId,
      layerOptions
    )
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns the first layer object from any artboard within the page (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of all the artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param selector A design-wide layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within the artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example Layer by name from any artboard on the page
   * ```typescript
   * const layer = await page.findLayer({ name: 'Share icon' })
   * ```
   *
   * @example Layer by function selector from any artboard on the page
   * ```typescript
   * const shareIconLayer = await page.findLayer((layer) => {
   *   return layer.name === 'Share icon'
   * })
   * ```
   *
   * @example Layer by name from a certain artboad subset within the page
   * ```typescript
   * const layer = await page.findLayer({
   *   name: 'Share icon',
   *   artboardId: [ '<ID1>', '<ID2>' ],
   * })
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layer = await page.findLayer(
   *   { name: 'Share icon' },
   *   { cancelToken: token }
   * )
   * ```
   */
  async findLayer(
    selector: FileLayerSelector | ((layer: LayerFacade) => boolean),
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    const { cancelToken = null, ...layerOptions } = options

    await this.load({ cancelToken })

    const entitySelector = createLayerEntitySelector(
      this._designFacade,
      selector
    )
    const layerEntity = this._pageEntity.findLayer(entitySelector, layerOptions)

    const layerFacade =
      layerEntity && layerEntity.artboardId
        ? this._designFacade.getArtboardLayerFacade(
            layerEntity.artboardId,
            layerEntity.id
          )
        : null

    return layerFacade
  }

  /**
   * Returns a collection of all layer objects from all artboards within the page (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of all the artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param selector A design-wide layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within the artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example Layers by name from all artboards on the page
   * ```typescript
   * const layers = await page.findLayers({ name: 'Share icon' })
   * ```
   *
   * @example Layers by function selector from all artboards on the page
   * ```typescript
   * const shareIconLayers = await page.findLayers((layer) => {
   *   return layer.name === 'Share icon'
   * })
   * ```
   *
   * @example Invisible layers from all a certain artboard subset within the page
   * ```typescript
   * const layers = await page.findLayers({
   *   visible: false,
   *   artboardId: [ '<ID1>', '<ID2>' ],
   * })
   * ```
   *
   * @example With timeout
   * ```typescript
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layer = await page.findLayers(
   *   { type: 'shapeLayer' },
   *   { cancelToken: token }
   * )
   * ```
   */
  async findLayers(
    selector: FileLayerSelector | ((layer: LayerFacade) => boolean),
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignLayerCollectionFacade> {
    const { cancelToken = null, ...layerOptions } = options

    await this.load({ cancelToken })

    const entitySelector = createLayerEntitySelector(
      this._designFacade,
      selector
    )
    const layerCollection = this._pageEntity.findLayers(
      entitySelector,
      layerOptions
    )

    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Renders all artboards from the page as a single PNG image file.
   *
   * All visible layers from the artboards are included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param filePath The target location of the produced PNG image file.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the created image file is not deleted when cancelled during actual rendering). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example With default options (1x, whole page area)
   * ```typescript
   * await page.renderPageToFile('./rendered/page.png')
   * ```
   *
   * @example With custom scale and crop
   * ```typescript
   * await page.renderPageToFile('./rendered/page.png', {
   *   scale: 2,
   *   // The result is going to have the dimensions of 400x200 due to the 2x scale.
   *   bounds: { left: 100, top: 0, width: 100, height: 50 },
   * })
   * ```
   */
  renderToFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    return this._designFacade.renderPageToFile(this.id, filePath, options)
  }
}
