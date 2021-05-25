import { inspect } from 'util'
import { enumerablizeWithPrototypeGetters } from './utils/object-utils'

import type { CancelToken } from '@avocode/cancel-token'
import type { IApiDesignExport } from '@opendesign/api'
import type { Sdk } from './sdk'

export class DesignExportFacade {
  private _sdk: Sdk
  private _designExport: IApiDesignExport

  /** @internal */
  constructor(designExport: IApiDesignExport, params: { sdk: Sdk }) {
    this._sdk = params.sdk
    this._designExport = designExport

    enumerablizeWithPrototypeGetters(this)
  }

  /**
   * The ID of the export task.
   * @category Identification
   */
  get id() {
    return this._designExport.id
  }

  /**
   * The ID of the exported design.
   * @category Reference
   */
  get designId() {
    return this._designExport.designId
  }

  /**
   * The status of the export task.
   * @category Data
   */
  get status() {
    return this._designExport.status
  }

  /**
   * The target format to which the design is exported.
   * @category Data
   */
  get resultFormat() {
    return this._designExport.resultFormat
  }

  /** @internal */
  toString() {
    const exportInfo = this.toJSON()
    return `DesignExport ${inspect(exportInfo)}`
  }

  /** @internal */
  [inspect.custom]() {
    return this.toString()
  }

  /** @internal */
  toJSON() {
    return { ...this }
  }

  /**
   * Returns the URL of the produced design file.
   * @category Serialization
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected. A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const url = await export.getResultUrl()
   *
   * const response = await fetch(url)
   * if (response.status !== 200) throw new Error('Export result unavailable')
   *
   * const writeStream = fs.createWriteStream('./exports/design.sketch')
   * response.pipe(writeStream)
   * ```
   */
  async getResultUrl(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    const processedDesignExport = await this._designExport.getProcessedDesignExport(
      options
    )

    const resultUrl = processedDesignExport.resultUrl
    if (!resultUrl) {
      throw new Error('The export result location is not available')
    }

    this._designExport = processedDesignExport

    return resultUrl
  }

  /**
   * Returns a readable binary stream of the produced design file.
   * @category Serialization
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected. A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const resultStream = await export.getResultStream()
   *
   * const writeStream = fs.createWriteStream('./exports/design.sketch')
   * resultStream.pipe(writeStream)
   * ```
   */
  async getResultStream(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    return this._designExport.getResultStream(options)
  }

  /**
   * Downloads the produced design file to the file system.
   *
   * A file system has to be available when using this method.
   *
   * @category Serialization
   * @param filePath An absolute path to which to save the design file or a path relative to the current working directory.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. a partially downloaded file is not deleted). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * await export.exportDesignFile('./exports/design.sketch')
   * ```
   */
  async exportDesignFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    return this._sdk.saveDesignFileStream(
      filePath,
      await this.getResultStream(options),
      options
    )
  }
}
