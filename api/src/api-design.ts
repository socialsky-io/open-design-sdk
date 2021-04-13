import type { ArtboardId, PageId } from '@opendesign/octopus-reader'
import type { components } from 'open-design-api-types'
import type { OpenDesignApi } from './open-design-api'
import type { IApiDesign } from './types/ifaces'

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

  get id() {
    return this._info['id']
  }

  get name() {
    return this._info['name']
  }

  get format() {
    return this._info['format']
  }

  get createdAt() {
    return this._info['created_at']
  }

  get completedAt() {
    return this._info['completed_at']
  }

  get status() {
    return this._info['status']
  }

  getApiRoot() {
    return this._openDesignApi.getApiRoot()
  }

  async getManifest() {
    const summary = await this.getSummary()
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

  getSummary() {
    return this._openDesignApi.getDesignSummary(this.id)
  }

  getArtboardContent(artboardId: ArtboardId) {
    return this._openDesignApi.getDesignArtboardContent(this.id, artboardId)
  }

  getArtboardContentJsonStream(artboardId: ArtboardId) {
    return this._openDesignApi.getDesignArtboardContentJsonStream(
      this.id,
      artboardId
    )
  }

  exportDesign(params: { format: DesignExportTargetFormatEnum }) {
    return this._openDesignApi.exportDesign(this.id, params)
  }

  getDesignExportById(designExportId: DesignExportId) {
    return this._openDesignApi.getDesignExportById(this.id, designExportId)
  }

  getDesignExportResultStream(designExportId: DesignExportId) {
    return this._openDesignApi.getDesignExportResultStream(
      this.id,
      designExportId
    )
  }

  getBitmapAssetStream(bitmapKey: string) {
    return this._openDesignApi.getDesignBitmapAssetStream(this.id, bitmapKey)
  }
}
