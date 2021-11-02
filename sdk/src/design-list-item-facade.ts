import { inspect } from 'util'
import { enumerablizeWithPrototypeGetters } from './utils/object-utils'

import type { CancelToken } from '@avocode/cancel-token'
import type {
  DesignId,
  DesignVersionId,
  Design,
  IApiDesign,
} from '@opendesign/api'
import type { DesignFacade } from './design-facade'
import type { Sdk } from './sdk'

export class DesignListItemFacade {
  private _apiDesign: IApiDesign
  private _sdk: Sdk

  /** @internal */
  constructor(
    apiDesign: IApiDesign,
    params: {
      sdk: Sdk
    }
  ) {
    this._apiDesign = apiDesign
    this._sdk = params.sdk

    enumerablizeWithPrototypeGetters(this)
  }

  /**
   * The ID of the referenced server-side design.
   * @category Identification
   */
  get id(): DesignId {
    return this._apiDesign.id
  }

  /**
   * The ID of the referenced server-side design version.
   * @category Identification
   */
  get versionId(): DesignVersionId {
    return this._apiDesign.versionId
  }

  /**
   * The name of the design. This is the basename of the file by default or a custom name provided during design import.
   * @category Data
   */
  get name(): string | null {
    return this._apiDesign.name
  }

  /**
   * The status of the server-side design processing.
   * @category Data
   */
  get status(): Design['status'] {
    return this._apiDesign.status
  }

  /** @internal */
  toString(): string {
    const designListItemInfo = this.toJSON()
    return `DesignListItem ${inspect(designListItemInfo)}`
  }

  /** @internal */
  [inspect.custom](): string {
    return this.toString()
  }

  /** @internal */
  toJSON(): unknown {
    return { ...this }
  }

  /**
   * Fetches a previously imported design at the version (the Id of which is accessible via {@link DesignListItemFacade.versionId}) from the API.
   *
   * The API has to be configured when using this method. Local caching is established in case the local cache is configured.
   *
   * @example
   * ```typescript
   * const design = await designListItem.fetchDesign()
   *
   * // Continue working with the processed design
   * const artboards = design.getArtboards()
   * ```
   *
   * @category Server Side Design File Usage
   * @param options Options.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the local cache is not cleared once created). A cancellation token can be created via {@link createCancelToken}.
   * @returns A design object which can be used for retrieving data from the design using the API.
   */
  fetchDesign(options: {
    cancelToken?: CancelToken | null
  }): Promise<DesignFacade> {
    return this._sdk.fetchDesignById(this.id, {
      ...options,
      designVersionId: this.versionId,
    })
  }
}
