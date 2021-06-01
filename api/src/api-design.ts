import type {
  ArtboardId,
  ManifestData,
  PageId,
} from '@opendesign/octopus-reader'
import type { CancelToken } from '@avocode/cancel-token'
import type { components } from 'open-design-api-types'
import type {
  DesignSummary,
  OctopusDocument,
  OpenDesignApi,
} from './open-design-api'
import type { IApiDesign } from './types/ifaces'
import { ApiDesignExport } from './api-design-export'

type DesignExportId = components['schemas']['DesignExportId']
type Design = components['schemas']['Design']
type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']

export class ApiDesign implements IApiDesign {
  _info: Design
  _openDesignApi: OpenDesignApi

  constructor(info: Design, params: { openDesignApi: OpenDesignApi }) {
    this._info = info
    this._openDesignApi = params.openDesignApi
  }

  get id(): Design['id'] {
    return this._info['id']
  }

  get name(): Design['name'] {
    return this._info['name']
  }

  get format(): Design['format'] {
    return this._info['format']
  }

  get createdAt(): Design['created_at'] {
    return this._info['created_at']
  }

  get completedAt(): Design['completed_at'] {
    return this._info['completed_at']
  }

  get status(): Design['status'] {
    return this._info['status']
  }

  getApiRoot(): string {
    return this._openDesignApi.getApiRoot()
  }

  async getManifest(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ManifestData> {
    const summary = await this.getSummary(options)
    const {
      'artboards': artboardDataList,
      'pages': pageDataList,
      ...info
    } = summary

    this._info = info

    const pageNames: Record<PageId, string> | null = pageDataList
      ? pageDataList.reduce((names, pageData) => {
          return { ...names, [pageData['id']]: pageData['name'] }
        }, {})
      : null

    return {
      'pages': pageNames,
      'artboards': artboardDataList.map((artboardData) => {
        return {
          'artboard_original_id': artboardData['id'],
          'artboard_name': artboardData['name'],
          'failed': artboardData['status'] === 'failed',
          'url':
            artboardData['status'] === 'done'
              ? `${this._openDesignApi.getApiRoot()}/designs/${
                  this.id
                }/artboards/${artboardData['id']}/content`
              : null,
          'preview_url': null,
          'is_symbol': false,
          'symbol_id': null,
          ...(artboardData['page_id']
            ? {
                'page_original_id': artboardData['page_id'],
                'page_name': pageNames
                  ? pageNames[artboardData['page_id']]
                  : null,
              }
            : {}),
        }
      }),
    }
  }

  getSummary(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignSummary> {
    return this._openDesignApi.getDesignSummary(this.id, options)
  }

  getArtboardContent(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<OctopusDocument> {
    return this._openDesignApi.getDesignArtboardContent(
      this.id,
      artboardId,
      options
    )
  }

  getArtboardContentJsonStream(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    return this._openDesignApi.getDesignArtboardContentJsonStream(
      this.id,
      artboardId,
      options
    )
  }

  exportDesign(params: {
    format: DesignExportTargetFormatEnum
    cancelToken?: CancelToken | null
  }): Promise<ApiDesignExport> {
    return this._openDesignApi.exportDesign(this.id, params)
  }

  getDesignExportById(
    designExportId: DesignExportId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesignExport> {
    return this._openDesignApi.getDesignExportById(
      this.id,
      designExportId,
      options
    )
  }

  getDesignExportResultStream(
    designExportId: DesignExportId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    return this._openDesignApi.getDesignExportResultStream(
      this.id,
      designExportId,
      options
    )
  }

  getBitmapAssetStream(
    bitmapKey: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    return this._openDesignApi.getDesignBitmapAssetStream(
      this.id,
      bitmapKey,
      options
    )
  }
}
