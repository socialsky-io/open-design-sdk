import createCancelToken, { CancelToken } from '@avocode/cancel-token'
import { basename, join as joinPaths } from 'path'
import {
  checkFile,
  readJsonFile,
  readFileStream,
  writeJsonFile,
  writeJsonFileStream,
  readFileBlob,
  writeFileBlob,
  copyDirectory,
  moveDirectory,
  deleteFile,
} from '../utils/fs-utils'

import {
  ARTBOARD_CONTENT_BASENAME,
  ARTBOARD_DIRECTORY_BASENAME,
  API_DESIGN_INFO_BASENAME,
  BITMAP_ASSET_DIRECTORY_BASENAME,
  BITMAP_ASSET_MAPPING_BASENAME,
  MANIFEST_BASENAME,
  PAGE_CONTENT_BASENAME,
  PAGE_DIRECTORY_BASENAME,
} from './consts'

import type {
  ArtboardId,
  OctopusDocument,
  ManifestData,
  PageId,
} from '@opendesign/octopus-reader'
import type { LocalDesignManager } from './local-design-manager'

export type ApiDesignInfo = {
  apiRoot?: string
  designId?: string
}

export type BitmapAssetDescriptor = { name: string; prerendered: boolean }

export type BitmapMapping = { [bitmapKey: string]: string }

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]/g, '-')
}

export class LocalDesign {
  _localDesignManager: LocalDesignManager

  _filename: string

  _apiDesignInfo: ApiDesignInfo | null
  _destroyToken: CancelToken | null
  _bitmapMapping: BitmapMapping | null = null

  constructor(init: {
    filename: string
    localDesignManager: LocalDesignManager
    apiDesignInfo?: ApiDesignInfo | null
    destroyToken?: CancelToken | null
  }) {
    const filename = init.filename
    if (!filename) {
      throw new Error('A filename must be specified')
    }

    this._filename = init.filename
    this._localDesignManager = init.localDesignManager
    this._apiDesignInfo = init.apiDesignInfo || null
    this._destroyToken = init.destroyToken || null
  }

  get filename(): string {
    return this._filename
  }

  async saveAs(
    nextFilePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const nextFilename = this._localDesignManager.resolvePath(nextFilePath)
    const prevFilename = this._filename
    await copyDirectory(prevFilename, nextFilename)
    cancelToken.throwIfCancelled()

    this._filename = nextFilename
  }

  async move(
    nextFilePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const nextFilename = this._localDesignManager.resolvePath(nextFilePath)
    const prevFilename = this._filename
    await moveDirectory(prevFilename, nextFilename)
    cancelToken.throwIfCancelled()

    this._filename = nextFilename
  }

  async getManifest(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ManifestData> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const manifestFilename = this._getManifestFilename()
    const manifest = (await readJsonFile(manifestFilename, {
      cancelToken,
    })) as ManifestData
    return manifest
  }

  async saveManifest(
    manifest: ManifestData,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const manifestFilename = this._getManifestFilename()
    await writeJsonFile(manifestFilename, manifest, { cancelToken })
  }

  async hasArtboardContent(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<boolean> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const contentFilename = this._getArtboardContentFilename(artboardId)
    return checkFile(contentFilename, { cancelToken })
  }

  async getArtboardContentFilename(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string | null> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    if (!this.hasArtboardContent(artboardId, { cancelToken })) {
      return null
    }

    return this._getArtboardContentFilename(artboardId)
  }

  async getArtboardContent(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<OctopusDocument> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const contentFilename = this._getArtboardContentFilename(artboardId)
    const content = (await readJsonFile(contentFilename, {
      cancelToken,
    })) as OctopusDocument
    return content
  }

  async getArtboardContentJsonStream(
    artboardId: ArtboardId
  ): Promise<NodeJS.ReadableStream> {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    return readFileStream(contentFilename)
  }

  async saveArtboardContent(
    artboardId: ArtboardId,
    content: OctopusDocument,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const contentFilename = this._getArtboardContentFilename(artboardId)
    await writeJsonFile(contentFilename, content, { cancelToken })
  }

  async saveArtboardContentJsonStream(
    artboardId: ArtboardId,
    contentStream: NodeJS.ReadableStream,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const contentFilename = this._getArtboardContentFilename(artboardId)
    await writeJsonFileStream(contentFilename, contentStream, { cancelToken })
  }

  async hasPageContent(
    pageId: PageId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<boolean> {
    const contentFilename = this._getPageContentFilename(pageId)
    return checkFile(contentFilename, options)
  }

  async getPageContent(
    pageId: PageId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<OctopusDocument> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const contentFilename = this._getPageContentFilename(pageId)
    const content = (await readJsonFile(contentFilename, {
      cancelToken,
    })) as OctopusDocument
    return content
  }

  async getPageContentJsonStream(
    pageId: PageId
  ): Promise<NodeJS.ReadableStream> {
    const contentFilename = this._getPageContentFilename(pageId)
    return readFileStream(contentFilename)
  }

  async savePageContent(
    pageId: PageId,
    content: OctopusDocument,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const contentFilename = this._getPageContentFilename(pageId)
    await writeJsonFile(contentFilename, content, { cancelToken })
  }

  async savePageContentJsonStream(
    pageId: PageId,
    contentStream: NodeJS.ReadableStream,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const contentFilename = this._getPageContentFilename(pageId)
    await writeJsonFileStream(contentFilename, contentStream, { cancelToken })
  }

  async hasBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<boolean> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const { available } = await this.resolveBitmapAsset(bitmapAssetDesc, {
      cancelToken,
    })
    return available
  }

  getBitmapAssetDirectory(): string {
    return joinPaths(this._filename, BITMAP_ASSET_DIRECTORY_BASENAME)
  }

  async getBitmapAssetStream(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const {
      filename: bitmapAssetFilename,
      available,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, { cancelToken })
    if (!available) {
      throw new Error('No such asset')
    }

    return readFileStream(bitmapAssetFilename)
  }

  async getBitmapAssetBlob(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Buffer> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const {
      filename: bitmapAssetFilename,
      available,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, { cancelToken })
    if (!available) {
      throw new Error('No such asset')
    }

    return readFileBlob(bitmapAssetFilename)
  }

  async saveBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor,
    content: OctopusDocument,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    await this._loadBitmapMapping({ cancelToken })

    const {
      filename: bitmapAssetFilename,
      basename,
      mapped,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, { cancelToken })
    await writeJsonFile(bitmapAssetFilename, content)

    if (mapped) {
      await this.saveBitmapMapping(
        {
          ...(this._bitmapMapping || {}),
          [bitmapAssetDesc.name]: basename,
        },
        { cancelToken }
      )
    }

    return bitmapAssetFilename
  }

  async saveBitmapAssetStream(
    bitmapAssetDesc: BitmapAssetDescriptor,
    contentStream: NodeJS.ReadableStream,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    await this._loadBitmapMapping({ cancelToken })

    const {
      filename: bitmapAssetFilename,
      basename,
      mapped,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, { cancelToken })
    await writeJsonFileStream(bitmapAssetFilename, contentStream, {
      cancelToken,
    })

    if (mapped) {
      await this.saveBitmapMapping(
        {
          ...(this._bitmapMapping || {}),
          [bitmapAssetDesc.name]: basename,
        },
        { cancelToken }
      )
    }

    return bitmapAssetFilename
  }

  async saveBitmapAssetBlob(
    bitmapAssetDesc: BitmapAssetDescriptor,
    bitmapAssetBlob: Buffer,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    await this._loadBitmapMapping({ cancelToken })

    const {
      filename: bitmapAssetFilename,
      basename,
      mapped,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, { cancelToken })
    await writeFileBlob(bitmapAssetFilename, bitmapAssetBlob, { cancelToken })

    if (mapped) {
      await this.saveBitmapMapping(
        {
          ...(this._bitmapMapping || {}),
          [bitmapAssetDesc.name]: basename,
        },
        { cancelToken }
      )
    }

    return bitmapAssetFilename
  }

  async getBitmapMapping(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<BitmapMapping> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    await this._loadBitmapMapping({ cancelToken })

    if (!this._bitmapMapping) {
      throw new Error('Bitmap mapping is not available')
    }

    return this._bitmapMapping
  }

  async _loadBitmapMapping(options: { cancelToken?: CancelToken | null }) {
    if (this._bitmapMapping) {
      return
    }

    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const bitmapMappingFilename = this._getBitmapMappingFilename()

    const bitmapMappingExists = await checkFile(bitmapMappingFilename)
    cancelToken.throwIfCancelled()

    if (!bitmapMappingExists) {
      this._bitmapMapping = {}
      return
    }

    this._bitmapMapping = (await readJsonFile(
      bitmapMappingFilename,
      options
    )) as BitmapMapping
  }

  unload() {
    this._unloadBitmapMapping()
  }

  _unloadBitmapMapping() {
    this._bitmapMapping = null
  }

  async saveBitmapMapping(
    bitmapMapping: BitmapMapping,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const prevBitmapMapping = this._bitmapMapping
    this._bitmapMapping = bitmapMapping

    const unregisterCanceller = cancelToken.onCancelled(() => {
      if (this._bitmapMapping === bitmapMapping) {
        this._bitmapMapping = prevBitmapMapping
      }
    })

    const bitmapMappingFilename = this._getBitmapMappingFilename()
    await writeJsonFile(bitmapMappingFilename, bitmapMapping, { cancelToken })

    unregisterCanceller()
  }

  async getApiDesignInfo(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesignInfo | null> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    await this._loadApiDesignInfo({ cancelToken })

    return this._apiDesignInfo
  }

  async _loadApiDesignInfo(options: { cancelToken?: CancelToken | null }) {
    if (this._apiDesignInfo) {
      return
    }

    const apiDesignInfoFilename = this._getApiDesignInfoFilename()
    const apiDesignInfoExists = await checkFile(apiDesignInfoFilename)
    options.cancelToken?.throwIfCancelled()

    if (!apiDesignInfoExists) {
      this._apiDesignInfo = null
      return
    }

    this._apiDesignInfo = (await readJsonFile(
      apiDesignInfoFilename,
      options
    )) as ApiDesignInfo
  }

  async saveApiDesignInfo(
    apiDesignInfo: ApiDesignInfo | null,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    this._apiDesignInfo = apiDesignInfo

    const apiDesignInfoFilename = this._getApiDesignInfoFilename()
    if (apiDesignInfo) {
      await writeJsonFile(apiDesignInfoFilename, apiDesignInfo, { cancelToken })
    } else {
      await deleteFile(apiDesignInfoFilename)
    }
  }

  _getManifestFilename(): string {
    return joinPaths(this._filename, MANIFEST_BASENAME)
  }

  _getBitmapMappingFilename(): string {
    return joinPaths(this._filename, BITMAP_ASSET_MAPPING_BASENAME)
  }

  _getApiDesignInfoFilename(): string {
    return joinPaths(this._filename, API_DESIGN_INFO_BASENAME)
  }

  _getArtboardContentFilename(artboardId: ArtboardId): string {
    return joinPaths(
      this._filename,
      ARTBOARD_DIRECTORY_BASENAME,
      sanitizeName(artboardId),
      ARTBOARD_CONTENT_BASENAME
    )
  }

  _getPageContentFilename(pageId: PageId): string {
    return joinPaths(
      this._filename,
      PAGE_DIRECTORY_BASENAME,
      pageId,
      PAGE_CONTENT_BASENAME
    )
  }

  async resolveBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<{
    basename: string
    mapped: boolean
    filename: string
    available: boolean
  }> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    const {
      basename,
      mapped,
    } = await this._getBitmapAssetBasename(bitmapAssetDesc, { cancelToken })
    const filename = joinPaths(
      this._filename,
      BITMAP_ASSET_DIRECTORY_BASENAME,
      basename
    )

    return {
      basename,
      mapped,
      filename,
      available: await checkFile(filename, { cancelToken }),
    }
  }

  async _getBitmapAssetBasename(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<{ basename: string; mapped: boolean }> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyToken,
    ])

    await this._loadBitmapMapping({ cancelToken })

    const bitmapMapping = this._bitmapMapping || {}
    const mappedBasename = bitmapMapping[bitmapAssetDesc.name]

    return mappedBasename
      ? { basename: mappedBasename, mapped: true }
      : this._createBitmapAssetBasename(bitmapAssetDesc)
  }

  _createBitmapAssetBasename(
    bitmapAssetDesc: BitmapAssetDescriptor
  ): { basename: string; mapped: boolean } {
    const bitmapKey = bitmapAssetDesc.name.toLowerCase()
    if (this._checkBitmapBasenameValid(bitmapKey)) {
      return { basename: bitmapKey, mapped: false }
    }

    // const ext = extname(bitmapKey)
    const name = basename(bitmapKey).replace(/[#:\?\/\*](.*?)$/, '$1')

    return { basename: name, mapped: true }
  }

  _checkBitmapBasenameValid(basename: string): boolean {
    return !/[#:?/*]/.test(basename)
  }
}
