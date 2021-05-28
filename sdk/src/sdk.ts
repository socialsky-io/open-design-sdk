import { createCancelToken } from './utils/cancel-token-utils'
import {
  createDesignFromLocalDesign,
  createDesignFromOpenDesignApiDesign,
} from './utils/design-factories-utils'
import { inspect } from 'util'
import { v4 as uuid } from 'uuid'

import { DesignListItemFacade } from './design-list-item-facade'
import { Env } from './env'

import type { CancelToken } from '@avocode/cancel-token'
import type {
  DesignImportFormatEnum,
  IApiDesign,
  IApiDesignExport,
  IOpenDesignApi,
} from '@opendesign/api'
import type {
  createRenderingEngine,
  IRenderingEngine,
} from '@opendesign/rendering'
import type { components } from 'open-design-api-types'
import type { DesignFacade } from './design-facade'
import type { FileManager } from './local/file-manager'
import type { LocalDesign } from './local/local-design'
import type { LocalDesignCache } from './local/local-design-cache'
import type { LocalDesignManager } from './local/local-design-manager'
import type { SystemFontManager } from './local/system-font-manager'

type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']

export class Sdk {
  private _env: Env = new Env()

  private _openDesignApi: IOpenDesignApi | null = null
  private _fileManager: FileManager | null = null
  private _localDesignCache: LocalDesignCache | null = null
  private _localDesignManager: LocalDesignManager | null = null
  private _renderingEngineFactory: typeof createRenderingEngine | null = null
  private _systemFontManager: SystemFontManager | null = null

  private _destroyed: boolean = false

  private _console: Console
  private _renderingEngine: Promise<IRenderingEngine | null> | null = null

  /** @internal */
  constructor(params: { console?: Console | null } = {}) {
    this._console = params.console || console
  }

  /** @internal */
  toString() {
    return `OpenDesignSdk ${inspect(this.toJSON())}`
  }

  /** @internal */
  [inspect.custom]() {
    return this.toString()
  }

  /** @internal */
  toJSON() {
    return {
      workingDirectory: this.getWorkingDirectory(),
    }
  }

  /**
   * Returns whether the SDK has been destroyed.
   *
   * @category Status
   */
  isDestroyed() {
    return this._destroyed
  }

  /**
   * Destroys the SDK instance.
   *
   * The local rendering engine process is terminated if it has been configured.
   *
   * Any design objects created by the SDK are no longer usable and the user should dispose any references to such objects to prevent memory leaks.
   *
   * @category Status
   *
   * @example
   * ```typescript
   * sdk.destroy()
   *
   * sdk.importDesignFile('./design.sketch') // throws
   * ```
   */
  async destroy() {
    if (this._destroyed) {
      return
    }

    this._destroyed = true

    const openDesignApi = this._openDesignApi
    if (openDesignApi) {
      openDesignApi.destroy()
    }

    const systemFontManager = this._systemFontManager
    if (systemFontManager) {
      systemFontManager.destroy()
    }

    const fileManager = this._fileManager
    if (fileManager) {
      fileManager.destroy()
    }

    const localDesignManager = this._localDesignManager
    if (localDesignManager) {
      localDesignManager.destroy()
    }

    const renderingEngine = await this._renderingEngine
    if (renderingEngine && !renderingEngine.isDestroyed()) {
      this._renderingEngine = null
      await renderingEngine.destroy()
    }
  }

  /**
   * Returns the current "working directory" which is used for storing the local cache and temporary files.
   *
   * The SDK creates and reads from a `.opendesign` subdirectory within the working directory.
   *
   * Note that the `.opendesign` subdirectory should likely not be included in version control systems.
   *
   * @category Configuration
   * @returns An absolute path to the working directory. Defaults to the current process working directory (`process.cwd()` in node.js) when the workspace directory is not configured via {@link Sdk.setWorkingDirectory}.
   *
   * @example Default directory (the process working directory)
   * ```typescript
   * sdk.getWorkingDirectory() // == process.cwd()
   * ```
   *
   * @example Custom directory (relative path to the process working directory)
   * ```typescript
   * sdk.setWorkingDirectory('data')
   * sdk.getWorkingDirectory() // == path.join(process.cwd(), 'data')
   * ```
   *
   * @example Custom directory (absolute path)
   * ```typescript
   * sdk.setWorkingDirectory('/tmp/data')
   * sdk.getWorkingDirectory() // == '/tmp/data'
   * ```
   */
  getWorkingDirectory(): string | null {
    return this._env.workingDirectory
  }

  /**
   * Sets the "working directory" which is used for storing the local cache and temporary files.
   *
   * The SDK creates and reads from a `.opendesign` subdirectory within the working directory.
   *
   * Note that the `.opendesign` subdirectory should likely not be included in version control systems.
   *
   * @category Configuration
   * @param workingDirectory An absolute path to the directory or a path relative to the process working directory (`process.cwd()` in node.js). When `null` is provided, the working directory is reset to the process working directory.
   *
   * @exmaple Custom directory (relative path to the process working directory)
   * ```typescript
   * sdk.setWorkingDirectory('data')
   * sdk.getWorkingDirectory() // == path.join(process.cwd(), 'data')
   * ```
   *
   * @example Custom directory (absolute path)
   * ```typescript
   * sdk.setWorkingDirectory('/tmp/data')
   * sdk.getWorkingDirectory() // == '/tmp/data'
   * ```
   *
   * @example Reset to the default directory (the process working directory)
   * ```typescript
   * sdk.setWorkingDirectory(null)
   * sdk.getWorkingDirectory() // == process.cwd()
   * ```
   */
  setWorkingDirectory(workingDirectory: string | null) {
    this._env.workingDirectory = workingDirectory || null
  }

  /**
   * Sets the directory where fonts should be looked up when rendering the design.
   *
   * This configuration can be overriden/extended for each individual design via {@link DesignFacade.setFontDirectory}.
   *
   * @category Configuration
   * @param fontDirectoryPath An absolute path to a directory or a path relative to the process working directory (`process.cwd()` in node.js). When `null` is provided, the global configuration is cleared.
   */
  setGlobalFontDirectory(fontDirectoryPath: string | null) {
    const systemFontManager = this._systemFontManager
    if (!systemFontManager) {
      throw new Error('Font management is not configured.')
    }

    systemFontManager.setGlobalFontDirectory(fontDirectoryPath)
  }

  /**
   * Sets the fonts which should be used as a fallback in case the actual fonts needed for rendering text layers are not available.
   *
   * The first font from this list which is available in the system is used for all text layers with missing actual fonts. If none of the fonts are available, the text layers are not rendered.
   *
   * This configuration can be overriden/extended for each individual design via {@link DesignFacade.setFallbackFonts}. Fonts provided to an individual design are preferred over fonts specified here.
   *
   * @example Set preferred fallback fonts
   * ```typescript
   * sdk.setFallbackFonts(['Arial', 'Courier-Bold'])
   * ```
   *
   * @category Configuration
   * @param fallbackFonts An ordered list of font postscript names or font file paths.
   */
  setGlobalFallbackFonts(fallbackFonts: Array<string>) {
    const systemFontManager = this._systemFontManager
    if (!systemFontManager) {
      throw new Error('Font management is not configured.')
    }

    systemFontManager.setGlobalFallbackFonts(fallbackFonts)
  }

  /**
   * Opens a local `.octopus` file.
   *
   * The local cache has to be configured when using this method.
   *
   * In case the file references a server-side design and the API is configured, missing data of partially downloaded files can be fetched from the server.
   *
   * @internal
   * @category Local Design File Usage
   * @param filePath An absolute `.octopus` file path or a path relative to the current working directory.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted. A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the local `.octopus` file or a referenced server-side design (see above).
   */
  async openOctopusFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const localDesignManager = this._localDesignManager
    if (!localDesignManager) {
      throw new Error('Local design manager is not configured.')
    }

    const localDesign = await localDesignManager.openOctopusFile(filePath, {
      apiDesignInfo: this._getCommonApiDesignInfo(),
      ...options,
    })
    const designFacade = await createDesignFromLocalDesign(localDesign, {
      sdk: this,
      console: this._console,
      ...options,
    })

    const apiDesign = await this._getApiDesignByLocalDesign(
      localDesign,
      options
    )
    if (apiDesign) {
      await designFacade.setApiDesign(apiDesign, options)
    }

    const renderingEngine = await this._getRenderingEngine()
    if (renderingEngine) {
      const renderingDesign = await renderingEngine.createDesign(uuid(), {
        bitmapAssetDirectoryPath: localDesign.getBitmapAssetDirectory(),
        // fontDirectoryPath: localDesign.getFontDirectory(),
      })
      designFacade.setRenderingDesign(renderingDesign)
    }

    return designFacade
  }

  /**
   * Creates an empty local `.octopus` file.
   *
   * This method expects a path value previously obtained from {@link DesignFacade.filename}.
   *
   * The local cache has to be configured when using this method.
   *
   * @internal
   * @category Local Design File Usage
   * @param filePath An absolute `.octopus` file path or a path relative to the current working directory.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted. A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for creating `.octopus` file content.
   */
  async createOctopusFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const localDesignManager = this._localDesignManager
    if (!localDesignManager) {
      throw new Error('Local design manager is not configured.')
    }

    const localDesign = await localDesignManager.createOctopusFile(
      filePath,
      options
    )
    const designFacade = await createDesignFromLocalDesign(localDesign, {
      sdk: this,
      console: this._console,
    })

    const renderingEngine = await this._getRenderingEngine()
    if (renderingEngine) {
      const renderingDesign = await renderingEngine.createDesign(uuid(), {
        bitmapAssetDirectoryPath: localDesign.getBitmapAssetDirectory(),
        // fontDirectoryPath: localDesign.getFontDirectory(),
      })
      designFacade.setRenderingDesign(renderingDesign)
    }

    return designFacade
  }

  /**
   * Imports a local design file (Photoshop, Sketch, Xd, Illustrator).
   *
   * The API has to be configured when using this method. This is also requires a file system (i.e. it is not available in the browser).
   *
   * The design is automatically uploaded to the API and local caching is established.
   *
   * @example
   * ```typescript
   * const design = await sdk.importDesignFile('data.sketch')
   * console.log(design.sourceFilename) // == path.join(process.cwd(), 'data.sketch')
   * console.log(design.id) // == server-generated UUID
   *
   * // Continue working with the processed design
   * const artboards = design.getArtboards()
   * ```
   *
   * @category Local Design File Usage
   * @param filePath An absolute design file path or a path relative to the current working directory.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the design is not deleted from the server when the token is cancelled during processing; the server still finishes the processing but the SDK stops watching its progress and does not download the result). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the local design file using the API.
   */
  async importDesignFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const fileManager = this._fileManager
    if (!fileManager) {
      throw new Error('Design file manager is not configured.')
    }

    const designFileStream = await fileManager.readFileStream(filePath, options)
    const apiDesign = await openDesignApi.importDesignFile(
      designFileStream,
      options
    )

    return this._fetchDesignById(apiDesign.id, {
      sourceFilename: String(designFileStream.path),
    })
  }

  /**
   * Imports a design file located at the specified URL.
   *
   * The API has to be configured when using this method.
   *
   * The design file is not downloaded to the local environment but rather imported via the API directly. Once imported via the API, the design behaves exactly like a design fetched via {@link Sdk.fetchDesignById}.
   *
   * @example
   * ```typescript
   * const design = await sdk.importDesignLink('https://example.com/designs/data.sketch')
   * console.log(design.id) // == server-generated UUID
   *
   * // Continue working with the processed design
   * const artboards = design.getArtboards()
   * ```
   *
   * @category Local Design File Usage
   * @param filePath An absolute design file path or a path relative to the current working directory.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the design is not deleted from the server when the token is cancelled during processing; the server still finishes the processing but the SDK stops watching its progress and does not download the result). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the local design file using the API.
   */
  async importDesignLink(
    url: string,
    options: {
      format?: DesignImportFormatEnum
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.importDesignLink(url, options)

    return this.fetchDesignById(apiDesign.id, {
      cancelToken: options.cancelToken || null,
    })
  }

  /**
   * Imports a Figma design.
   *
   * The API has to be configured when using this method.
   *
   * The design is automatically imported by the API and local caching is established.
   *
   * @example
   * ```typescript
   * const design = await sdk.importFigmaDesign({
   *   figmaToken: '<FIGMA_TOKEN>',
   *   figmaFileKey: 'abc',
   * })
   *
   * console.log(design.id) // == server-generated UUID
   *
   * // Continue working with the processed design
   * const artboards = design.getArtboards()
   * ```
   *
   * @category Figma Design Usage
   * @param params Info about the Figma design
   * @param params.figmaToken A Figma access token generated in the "Personal access tokens" section of [Figma account settings](https://www.figma.com/settings).
   * @param params.figmaFileKey A Figma design "file key" from the design URL (i.e. `abc` from `https://www.figma.com/file/abc/Sample-File`).
   * @param params.figmaIds A listing of Figma design frames to use.
   * @param params.designName A name override for the design. The original Figma design name is used by default.
   * @param params.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the design is not deleted from the server when the token is cancelled during processing; the server still finishes the processing but the SDK stops watching its progress and does not download the result). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the Figma design using the API.
   */
  async importFigmaDesign(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string>
    designName?: string | null
    cancelToken?: CancelToken | null
  }): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.importFigmaDesignLink(params)

    return this.fetchDesignById(apiDesign.id)
  }

  /**
   * Imports a Figma design while initiating an export to another design file format (currently only Sketch is available).
   *
   * The API has to be configured when using this method. A file system has to be available for downloading the converted design file from the API but downloading the result is not a required step as it can be done later from another client.
   *
   * The design is automatically imported by the API and local caching is established in case the local cache is configured.
   *
   * @example
   * ```typescript
   * const design = await sdk.importFigmaDesign({
   *   figmaToken: '<FIGMA_TOKEN>',
   *   figmaFileKey: 'abc',
   *   conversions: [
   *     { format: 'sketch' }
   *   ]
   * })
   *
   * // Download the converted design file
   * await design.exportDesignFile('./design.sketch')
   * ```
   *
   * @category Figma Design Usage
   * @param params Info about the Figma design
   * @param params.figmaToken A Figma access token generated in the "Personal access tokens" section of [Figma account settings](https://www.figma.com/settings).
   * @param params.figmaFileKey A Figma design "file key" from the design URL (i.e. `abc` from `https://www.figma.com/file/abc/Sample-File`).
   * @param params.figmaIds A listing of Figma design frames to use.
   * @param params.designName A name override for the design. The original Figma design name is used by default.
   * @param params.exports Design file export configurations. Only a single export to the `"sketch"` (Sketch) file format is available currently.
   * @param params.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the design is not deleted from the server when the token is cancelled during processing; the server still finishes the processing but the SDK stops watching its progress and does not download the result). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the Figma design or downloading the exported design file using the API.
   */
  async convertFigmaDesign(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string>
    designName?: string | null
    exports: Array<{ format: DesignExportTargetFormatEnum }>
    cancelToken?: CancelToken | null
  }): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const {
      designId,
      exports,
    } = await openDesignApi.importFigmaDesignLinkWithExports({
      ...params,
      cancelToken: params.cancelToken || null,
    })

    return this._fetchDesignById(designId, {
      exports,
      cancelToken: params.cancelToken || null,
    })
  }

  /**
   * Fetches the list of previously imported designs from the API.
   *
   * Data of the designs themselves are not downloaded at this point. Each item in the design list can be expanded to a full-featured design entity.
   *
   * The design list contains both processed and unprocessed designs.
   *
   * The API has to be configured when using this method.
   *
   * @example
   * ```typescript
   * const designList = await sdk.fetchDesignList()
   * const designItem = designList.find((design) => design.name === 'My design')
   * // Expand the design list item to a full design entity
   * const design = await designItem.fetchDesign()
   * // Continue working with the processed design
   * const artboards = design.getArtboards()
   * ```
   *
   * @category Server Side Design File Usage
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected. A cancellation token can be created via {@link createCancelToken}.
   * @returns An array of design list item objects which can be used for retrieving the designs using the API.
   */
  async fetchDesignList(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Array<DesignListItemFacade>> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesigns = await openDesignApi.getDesignList(options)
    const designDescs = apiDesigns.map((apiDesign) => {
      return new DesignListItemFacade(apiDesign, {
        sdk: this,
      })
    })

    return designDescs
  }

  /**
   * Fetches a previously imported design from the API.
   *
   * The API has to be configured when using this method. Local caching is established in case the local cache is configured.
   *
   * @example
   * ```typescript
   * const design = await sdk.fetchDesignById('<DESIGN_ID>')
   *
   * // Continue working with the processed design
   * const artboards = design.getArtboards()
   * ```
   *
   * @category Server Side Design File Usage
   * @param designId An ID of a server-side design assigned during import (via `importDesignFile()`, `openFigmaDesign()` or `convertFigmaDesign()`).
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the local cache is not cleared once created). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the design using the API.
   */
  async fetchDesignById(
    designId: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignFacade> {
    return this._fetchDesignById(designId, options)
  }

  private async _fetchDesignById(
    designId: string,
    params: {
      sourceFilename?: string | null
      exports?: Array<IApiDesignExport> | null
      cancelToken?: CancelToken | null
    }
  ): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const cancelToken = params.cancelToken || null

    const apiDesign = await openDesignApi.getDesignById(designId, {
      cancelToken,
    })
    const designFacade = await createDesignFromOpenDesignApiDesign(apiDesign, {
      sdk: this,
      console: this._console,
      sourceFilename: params.sourceFilename || null,
      exports: params.exports || null,
      cancelToken,
    })

    const localDesignManager = this._localDesignManager
    if (localDesignManager) {
      const apiRoot = apiDesign.getApiRoot()
      const apiDesignInfo = {
        apiRoot,
        designId: apiDesign.id,
      }

      const localDesignCache = this._localDesignCache
      const cachedOctopusFilename = localDesignCache
        ? await localDesignCache.getDesignOctopusFilename(apiRoot, designId, {
            cancelToken,
          })
        : null

      const localDesign = cachedOctopusFilename
        ? await localDesignManager.openOctopusFile(cachedOctopusFilename, {
            apiDesignInfo,
            cancelToken,
          })
        : await localDesignManager.createOctopusFileFromManifest(
            designFacade.getManifest(),
            {
              name: apiDesign.name,
              apiDesignInfo,
              cancelToken,
            }
          )

      if (localDesignCache && !cachedOctopusFilename) {
        localDesignCache.setDesignOctopusFilename(
          apiRoot,
          designId,
          localDesign.filename
        )
      }

      await designFacade.setLocalDesign(localDesign, {
        cancelToken,
      })

      const systemFontManager = this._systemFontManager
      const fontSource = systemFontManager
        ? systemFontManager.createFontSource(/* fontDirectoryPath */)
        : null
      if (fontSource) {
        designFacade.setFontSource(fontSource)
      }

      const renderingEngine = await this._getRenderingEngine()
      params.cancelToken?.throwIfCancelled()

      if (renderingEngine) {
        const renderingDesign = await renderingEngine.createDesign(uuid(), {
          bitmapAssetDirectoryPath: localDesign.getBitmapAssetDirectory(),
          // fontDirectoryPath: localDesign.getFontDirectory(),
        })
        params.cancelToken?.throwIfCancelled()
        designFacade.setRenderingDesign(renderingDesign)
      }
    }

    return designFacade
  }

  /** @internal */
  async saveDesignFileStream(
    filePath: string,
    designFileStream: NodeJS.ReadableStream,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<void> {
    const fileManager = this._fileManager
    if (!fileManager) {
      throw new Error('Design file manager is not configured.')
    }

    return fileManager.saveFileStream(filePath, designFileStream, options)
  }

  /** @internal */
  useFileManager(fileManager: FileManager): void {
    fileManager.setEnv(this._env)
    this._fileManager = fileManager
  }

  /** @internal */
  useLocalDesignManager(localDesignManager: LocalDesignManager): void {
    localDesignManager.setEnv(this._env)
    this._localDesignManager = localDesignManager
  }

  /** @internal */
  useLocalDesignCache(localDesignCache: LocalDesignCache): void {
    localDesignCache.setEnv(this._env)
    this._localDesignCache = localDesignCache
  }

  /** @internal */
  useSystemFontManager(systemFontManager: SystemFontManager): void {
    systemFontManager.setEnv(this._env)
    this._systemFontManager = systemFontManager
  }

  /** @internal */
  useOpenDesignApi(api: IOpenDesignApi): void {
    this._openDesignApi = api
  }

  /** @internal */
  useRenderingEngineFactory(
    renderingEngineFactory: typeof createRenderingEngine
  ): void {
    this._renderingEngineFactory = renderingEngineFactory
  }

  /**
   * This method is just an alias of {@link @opendesign/sdk.createCancelToken}.
   *
   * Creates a cancellation token which can be used for aborting asynchronous operations of the SDK.
   *
   * Most asynchronous methods accept a cancellation token (the returned `token`). The same cancellation token can be used for multiple sequential as well as parallel operations. Finished operations no longer react to cancellations.
   *
   * This mechanism is analogous to the standard `AbortSignal`/`AbortController` API with the difference that a cancellation reason can be specified. The created tokens are also somehow compatible with the standard API by exposing the standard `AbortSignal` as `token.signal`, just as it is possible to create a `CancelToken` from an `AbortSignal` via `createCancelToken.fromSignal()`.
   *
   * @category Utility
   *
   * @example
   * ```typescript
   * const controller = sdk.createCancelToken()
   *
   * sdk.fetchDesignById('<ID>', { cancelToken: controller.token })
   *   .then((design) => {
   *     doStuffWithDesign(design)
   *     controller.dispose()
   *   })
   *   .catch((err) => {
   *     if (err.code !== 'OperationCancelled') { throw err }
   *   })
   *
   * setTimeout(() => {
   *   controller.cancel('Timed out.')
   * }, 2000)
   * ```
   */
  createCancelToken() {
    return createCancelToken()
  }

  private _getRenderingEngine() {
    if (this._renderingEngine) {
      return this._renderingEngine
    }

    const renderingEngineFactory = this._renderingEngineFactory
    if (!renderingEngineFactory) {
      return Promise.resolve(null)
    }
    this._renderingEngine = Promise.resolve(
      renderingEngineFactory({
        console: this._console,
      })
    ).catch((err) => {
      this._console.error('Rendering engine cound not be initialized', err)
      this.destroy()
      return null
    })

    return this._renderingEngine
  }

  private _getCommonApiDesignInfo() {
    const openDesignApi = this._openDesignApi
    return openDesignApi ? { apiRoot: openDesignApi.getApiRoot() } : null
  }

  private async _getApiDesignByLocalDesign(
    localDesign: LocalDesign,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<IApiDesign | null> {
    const apiDesignInfo = await localDesign.getApiDesignInfo(options)
    const designId = apiDesignInfo ? apiDesignInfo.designId : null
    if (!designId) {
      return null
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      this._console.warn(
        'The local design references an API design but the API is not configured.'
      )
      return null
    }

    try {
      return await openDesignApi.getDesignById(designId, options)
    } catch (err) {
      this._console.warn(
        'API design referenced by the opened local design is not available'
      )
      return null
    }
  }
}
