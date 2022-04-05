import createCancelToken, { CancelToken } from '@avocode/cancel-token'
import { fetch, get, getStream, post, postMultipart } from './utils/fetch'
import { sleep } from './utils/sleep'
import cplus from 'cplus'
import PQueue from 'p-queue'

import { ApiDesign } from './api-design'
import { ApiDesignExport } from './api-design-export'
import { OpenDesignApiError } from './open-design-api-error'

import type { ReadStream } from 'fs'
import type { ArtboardId } from '@opendesign/octopus-reader'
import type { components } from 'open-design-api-types'
import type { IOpenDesignApi } from './types/ifaces'

export type DesignExportId = components['schemas']['DesignExportId']
export type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']
export type Design = components['schemas']['Design']
export type DesignId = components['schemas']['DesignId']
export type DesignImportFormatEnum = components['schemas']['DesignImportFormatEnum']
export type DesignSummary = components['schemas']['DesignSummary']
export type DesignVersionId = components['schemas']['DesignVersionId']
export type OctopusDocument = components['schemas']['OctopusDocument']

export class OpenDesignApi implements IOpenDesignApi {
  private _apiRoot: string
  private _token: string

  private _console: Console
  private _destroyTokenController = createCancelToken()

  private _requestQueue = new PQueue({ concurrency: 10 })

  constructor(params: {
    apiRoot: string
    token: string
    console?: Console | null
  }) {
    this._apiRoot = params.apiRoot
    this._token = params.token

    this._console = params.console || cplus.create()
  }

  getApiRoot(): string {
    return this._apiRoot
  }

  _getAuthInfo(): { token: string } {
    return { token: this._token }
  }

  destroy(): void {
    this._destroyTokenController.cancel('The API has been destroyed.')
  }

  async getDesignList(options: {
    cancelToken?: CancelToken | null
  }): Promise<Array<ApiDesign>> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      get(this._apiRoot, '/designs', {}, this._getAuthInfo(), {
        console: this._console,
        ...options,
        cancelToken,
      })
    )

    if (res.statusCode !== 200) {
      throw new OpenDesignApiError(res, 'Cannot fetch design list')
    }

    const designInfoList =
      'designs' in res.body ? (res.body['designs'] as Array<Design>) : []

    return designInfoList.map((designInfo) => {
      return new ApiDesign(designInfo, {
        openDesignApi: this,
      })
    })
  }

  async getDesignVersionList(
    designId: DesignId,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<Array<ApiDesign>> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      get(
        this._apiRoot,
        '/designs/{design_id}/versions',
        { 'design_id': designId },
        this._getAuthInfo(),
        {
          console: this._console,
          ...options,
          cancelToken,
        }
      )
    )

    if (res.statusCode !== 200) {
      throw new OpenDesignApiError(res, 'Cannot fetch design version list')
    }

    const designInfoList =
      'design_versions' in res.body
        ? (res.body['design_versions'] as Array<Design>)
        : []

    return designInfoList.map((designInfo) => {
      return new ApiDesign(designInfo, {
        openDesignApi: this,
      })
    })
  }

  async getDesignById(
    designId: DesignId,
    options: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesign> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      options.designVersionId
        ? get(
            this._apiRoot,
            '/designs/{design_id}/versions/{version_id}',
            {
              'design_id': designId,
              'version_id': options.designVersionId,
            },
            this._getAuthInfo(),
            {
              console: this._console,
              ...options,
              cancelToken,
            }
          )
        : get(
            this._apiRoot,
            '/designs/{design_id}',
            {
              'design_id': designId,
            },
            this._getAuthInfo(),
            {
              console: this._console,
              ...options,
              cancelToken,
            }
          )
    )

    if (
      res.statusCode === 401 ||
      // @ts-expect-error 403 is not included in the spec but checking it just in case.
      res.statusCode === 403
    ) {
      this._console.error(
        'OpenDesignApi#getDesignById()',
        { designId },
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(
        res,
        'Cannot fetch design due to missing permissions'
      )
    }

    const body = res.body
    const design = 'status' in body ? body : null

    if (!design) {
      this._console.error(
        'OpenDesignApi#getDesignById()',
        { designId },
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(res, 'Cannot fetch design')
    }
    if (design['status'] === 'failed') {
      throw new OpenDesignApiError(res, 'The design processing failed')
    }

    if (
      res.statusCode === 202 ||
      design['status'] !== 'done' ||
      !('completed_at' in design)
    ) {
      await sleep(1000)
      cancelToken.throwIfCancelled()

      return this.getDesignById(designId, options)
    }

    const apiDesign = new ApiDesign(design, {
      openDesignApi: this,
    })

    return apiDesign
  }

  async getDesignSummary(
    designId: DesignId,
    options: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignSummary> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      options.designVersionId
        ? get(
            this._apiRoot,
            '/designs/{design_id}/versions/{version_id}/summary',
            {
              'design_id': designId,
              'version_id': options.designVersionId,
            },
            this._getAuthInfo(),
            {
              console: this._console,
              ...options,
              cancelToken,
            }
          )
        : get(
            this._apiRoot,
            '/designs/{design_id}/summary',
            {
              'design_id': designId,
            },
            this._getAuthInfo(),
            {
              console: this._console,
              ...options,
              cancelToken,
            }
          )
    )

    if (
      res.statusCode === 401 ||
      // @ts-expect-error 403 is not included in the spec but checking it just in case.
      res.statusCode === 403
    ) {
      this._console.error(
        'OpenDesignApi#getDesignSummary()',
        { designId },
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(
        res,
        'Cannot fetch design due to missing permissions'
      )
    }

    const body = res.body
    const designSummary = 'status' in body ? body : null

    if (!designSummary) {
      this._console.error(
        'OpenDesignApi#getDesignSummary()',
        { designId },
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(res, 'Cannot fetch design')
    }
    if (designSummary['status'] === 'failed') {
      throw new OpenDesignApiError(res, 'The design processing failed')
    }

    if (
      res.statusCode === 202 ||
      designSummary['status'] !== 'done' ||
      !('artboards' in designSummary)
    ) {
      await sleep(1000)
      cancelToken.throwIfCancelled()

      return this.getDesignSummary(designId, options)
    }

    return designSummary
  }

  async importDesignFile(
    designFileStream: ReadStream,
    options: {
      designId?: DesignId | null
      format?: DesignImportFormatEnum
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesign> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      options.designId
        ? postMultipart(
            this._apiRoot,
            '/designs/{design_id}/versions/upload',
            { 'design_id': options.designId },
            {
              'file': designFileStream,
              ...(options.format ? { 'format': options.format } : {}),
            },
            this._getAuthInfo(),
            {
              console: this._console,
              cancelToken,
            }
          )
        : postMultipart(
            this._apiRoot,
            '/designs/upload',
            {},
            {
              'file': designFileStream,
              ...(options.format ? { 'format': options.format } : {}),
            },
            this._getAuthInfo(),
            {
              console: this._console,
              cancelToken,
            }
          )
    )

    if (res.statusCode !== 201) {
      this._console.error(
        'OpenDesignApi#importDesignFile()',
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(res, 'Cannot import design')
    }

    const design = res.body['design']

    // NOTE: Waits for the design to become fully processed.
    return this.getDesignById(design['id'], {
      designVersionId: design['version_id'],
    })
  }

  async importDesignLink(
    url: string,
    options: {
      designId?: DesignId | null
      format?: DesignImportFormatEnum
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesign> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      options.designId
        ? post(
            this._apiRoot,
            '/designs/{design_id}/versions/link',
            { 'design_id': options.designId },
            {
              'url': url,
              ...(options.format ? { 'format': options.format } : {}),
            },
            this._getAuthInfo(),
            {
              console: this._console,
              cancelToken,
            }
          )
        : post(
            this._apiRoot,
            '/designs/link',
            {},
            {
              'url': url,
              ...(options.format ? { 'format': options.format } : {}),
            },
            this._getAuthInfo(),
            {
              console: this._console,
              cancelToken,
            }
          )
    )

    if (res.statusCode !== 201) {
      this._console.error(
        'OpenDesignApi#importDesignLink()',
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(res, 'Cannot import design')
    }

    const design = res.body['design']

    // NOTE: Waits for the design to become fully processed.
    return this.getDesignById(design['id'], {
      designVersionId: design['version_id'],
    })
  }

  async importFigmaDesignLink(params: {
    designId?: DesignId | null
    figmaFileKey: string
    figmaToken?: string | null
    figmaIds?: Array<string> | null
    name?: string | null
    cancelToken?: CancelToken | null
  }): Promise<ApiDesign> {
    const cancelToken = createCancelToken.race([
      params.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      params.designId
        ? post(
            this._apiRoot,
            '/designs/{design_id}/versions/figma-link',
            { 'design_id': params.designId },
            {
              'figma_filekey': params.figmaFileKey,
              ...(params.figmaToken
                ? { 'figma_token': params.figmaToken }
                : {}),
              ...(params.figmaIds ? { 'figma_ids': params.figmaIds } : {}),
              ...(params.name ? { 'design_name': params.name } : {}),
            },
            this._getAuthInfo(),
            {
              console: this._console,
              cancelToken,
            }
          )
        : post(
            this._apiRoot,
            '/designs/figma-link',
            {},
            {
              'figma_filekey': params.figmaFileKey,
              ...(params.figmaToken
                ? { 'figma_token': params.figmaToken }
                : {}),
              ...(params.figmaIds ? { 'figma_ids': params.figmaIds } : {}),
              ...(params.name ? { 'design_name': params.name } : {}),
            },
            this._getAuthInfo(),
            {
              console: this._console,
              cancelToken,
            }
          )
    )

    const figmaTokenErrorData =
      res.statusCode === 409 ? res.body['error'] : null
    if (
      figmaTokenErrorData &&
      figmaTokenErrorData['code'] === 'FigmaTokenNotProvided'
    ) {
      this._console.warn(
        `Figma is not connected; you can connect your Figma account at ${figmaTokenErrorData['settings_url']}`
      )
    }

    if (res.statusCode !== 201) {
      this._console.error(
        'OpenDesignApi#importFigmaDesignLink()',
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(res, 'Cannot import design')
    }

    const design = res.body['design']
    // NOTE: Waits for the design to become fully processed.
    return this.getDesignById(design['id'], {
      designVersionId: design['version_id'],
    })
  }

  async importFigmaDesignLinkWithExports(params: {
    figmaFileKey: string
    figmaToken?: string | null
    figmaIds?: Array<string> | null
    name?: string | null
    exports: Array<{ format: DesignExportTargetFormatEnum }>
    cancelToken?: CancelToken | null
  }): Promise<{ design: ApiDesign; exports: Array<ApiDesignExport> }> {
    const cancelToken = createCancelToken.race([
      params.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      post(
        this._apiRoot,
        '/designs/figma-link',
        {},
        {
          'figma_filekey': params.figmaFileKey,
          'exports': params.exports,
          ...(params.figmaToken ? { 'figma_token': params.figmaToken } : {}),
          ...(params.figmaIds ? { 'figma_ids': params.figmaIds } : {}),
          ...(params.name ? { 'design_name': params.name } : {}),
        },
        this._getAuthInfo(),
        {
          console: this._console,
          cancelToken,
        }
      )
    )

    const figmaTokenErrorData =
      res.statusCode === 409 ? res.body['error'] : null
    if (
      figmaTokenErrorData &&
      figmaTokenErrorData['code'] === 'FigmaTokenNotProvided'
    ) {
      this._console.warn(
        `Figma is not connected; you can connect your Figma account at ${figmaTokenErrorData['settings_url']}`
      )
    }

    if (res.statusCode !== 201) {
      this._console.error(
        'OpenDesignApi#importFigmaDesignLinkWithExports()',
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(res, 'Cannot import design')
    }

    const design = res.body['design']

    return {
      // NOTE: Waits for the design to become fully processed.
      design: await this.getDesignById(design['id'], {
        designVersionId: design['version_id'],
      }),
      exports: res.body['exports'].map((designExportData) => {
        return new ApiDesignExport(designExportData, {
          designId: design['id'],
          openDesignApi: this,
        })
      }),
    }
  }

  async getDesignArtboardContent(
    designId: DesignId,
    artboardId: ArtboardId,
    options: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<OctopusDocument> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      options.designVersionId
        ? get(
            this._apiRoot,
            '/designs/{design_id}/versions/{version_id}/artboards/{artboard_id}/content',
            {
              'design_id': designId,
              'version_id': options.designVersionId,
              'artboard_id': artboardId,
            },
            this._getAuthInfo(),
            {
              console: this._console,
              ...options,
              cancelToken,
            }
          )
        : get(
            this._apiRoot,
            '/designs/{design_id}/artboards/{artboard_id}/content',
            { 'design_id': designId, 'artboard_id': artboardId },
            this._getAuthInfo(),
            {
              console: this._console,
              ...options,
              cancelToken,
            }
          )
    )

    if (res.statusCode !== 200 && res.statusCode !== 202) {
      this._console.error(
        'OpenDesignApi#getDesignArtboardContent()',
        { designId },
        res.statusCode,
        res.body
      )
      throw new OpenDesignApiError(res, 'Cannot fetch artboard content')
    }

    if (res.statusCode === 202) {
      await sleep(1000)
      cancelToken.throwIfCancelled()

      return this.getDesignArtboardContent(designId, artboardId, options)
    }

    return res.body
  }

  async getDesignArtboardContentJsonStream(
    designId: DesignId,
    artboardId: ArtboardId,
    options: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      options.designVersionId
        ? getStream(
            this._apiRoot,
            '/designs/{design_id}/versions/{version_id}/artboards/{artboard_id}/content',
            {
              'design_id': designId,
              'version_id': options.designVersionId,
              'artboard_id': artboardId,
            },
            this._getAuthInfo(),
            {
              console: this._console,
              ...options,
              cancelToken,
            }
          )
        : getStream(
            this._apiRoot,
            '/designs/{design_id}/artboards/{artboard_id}/content',
            { 'design_id': designId, 'artboard_id': artboardId },
            this._getAuthInfo(),
            {
              console: this._console,
              ...options,
              cancelToken,
            }
          )
    )

    if (res.statusCode !== 200 && res.statusCode !== 202) {
      this._console.error(
        'OpenDesignApi#getDesignArtboardContentJsonStream()',
        { designId },
        res
      )
      throw new OpenDesignApiError(res, 'Cannot fetch artboard content')
    }

    if (res.statusCode === 202) {
      await sleep(1000)
      cancelToken?.throwIfCancelled()

      return this.getDesignArtboardContentJsonStream(
        designId,
        artboardId,
        options
      )
    }

    return res.stream
  }

  async exportDesign(
    designId: DesignId,
    params: {
      format: DesignExportTargetFormatEnum
      cancelToken?: CancelToken | null
    }
  ): Promise<ApiDesignExport> {
    const cancelToken = createCancelToken.race([
      params.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      post(
        this._apiRoot,
        '/designs/{design_id}/exports',
        { 'design_id': designId },
        { 'format': params.format },
        this._getAuthInfo(),
        {
          console: this._console,
          cancelToken,
        }
      )
    )

    if (res.statusCode !== 201) {
      this._console.error(
        'OpenDesignApi#exportDesign()',
        { designId, ...params },
        res
      )
      throw new OpenDesignApiError(res, 'Cannot export the design')
    }
    if (res.body['status'] === 'failed') {
      throw new OpenDesignApiError(res, 'Design export failed')
    }

    return new ApiDesignExport(res.body, {
      designId,
      openDesignApi: this,
    })
  }

  async getDesignExportById(
    designId: DesignId,
    designExportId: DesignExportId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesignExport> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      get(
        this._apiRoot,
        '/designs/{design_id}/exports/{export_id}',
        { 'design_id': designId, 'export_id': designExportId },
        this._getAuthInfo(),
        {
          console: this._console,
          ...options,
          cancelToken,
        }
      )
    )

    if (res.statusCode !== 200) {
      this._console.error(
        'OpenDesignApi#getDesignExportById()',
        { designId },
        res
      )
      throw new OpenDesignApiError(res, 'Cannot fetch design export info')
    }
    if (res.body['status'] === 'failed') {
      throw new OpenDesignApiError(res, 'Design export failed')
    }

    return new ApiDesignExport(res.body, {
      designId,
      openDesignApi: this,
    })
  }

  async getDesignExportResultStream(
    designId: DesignId,
    designExportId: DesignExportId,
    options: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    const designExport = await this.getDesignExportById(
      designId,
      designExportId,
      options
    )
    return designExport.getResultStream()
  }

  async getDesignBitmapAssetStream(
    designId: DesignId,
    bitmapKey: string,
    options: {
      designVersionId?: DesignVersionId | null
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    const absolute = /^https?:\/\//.test(bitmapKey)
    if (!absolute) {
      throw new Error('Relative asset paths are not supported')
    }

    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const res = await this._requestQueue.add(() =>
      fetch(bitmapKey, {
        console: this._console,
        ...options,
        cancelToken,
      })
    )
    if (res.status !== 200 || !res.body) {
      this._console.debug('OpenDesignApi#getDesignBitmapAssetStream()', {
        bitmapKey,
        statusCode: res.status,
      })
      throw new Error('Asset not available')
    }

    return res.body
  }
}
