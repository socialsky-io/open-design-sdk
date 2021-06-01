import fetch from 'node-fetch'
import { sleep } from './utils/sleep'

import type { CancelToken } from '@avocode/cancel-token'
import type { components } from 'open-design-api-types'
import type { OpenDesignApi } from './open-design-api'
import type { IApiDesignExport } from './types/ifaces'

type DesignExport = components['schemas']['DesignExport']
type DesignId = components['schemas']['DesignId']

export class ApiDesignExport implements IApiDesignExport {
  readonly designId: DesignId

  _exportData: DesignExport
  _openDesignApi: OpenDesignApi

  constructor(
    exportData: DesignExport,
    params: { designId: DesignId; openDesignApi: OpenDesignApi }
  ) {
    this.designId = params.designId

    this._exportData = exportData
    this._openDesignApi = params.openDesignApi
  }

  get id(): DesignExport['id'] {
    return this._exportData['id']
  }

  get status(): DesignExport['status'] {
    return this._exportData['status']
  }

  get resultFormat(): DesignExport['result_format'] {
    return this._exportData['result_format']
  }

  get resultUrl(): string | null {
    return this._exportData['result_url']
  }

  async refresh(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesignExport> {
    return this._openDesignApi.getDesignExportById(
      this.designId,
      this.id,
      options
    )
  }

  async getProcessedDesignExport(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesignExport> {
    if (this.status === 'uploading' || this.status === 'processing') {
      await sleep(1000)
      options.cancelToken?.throwIfCancelled()

      const nextExport = await this.refresh(options)
      return nextExport.getProcessedDesignExport(options)
    }

    return this
  }

  async getResultStream(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    const processedExport = await this.getProcessedDesignExport(options)

    const resultUrl = processedExport.resultUrl
    if (!resultUrl) {
      throw new Error('The design export result location is not available')
    }

    const res = await fetch(resultUrl, {
      signal: options.cancelToken?.signal || null,
    })
    options.cancelToken?.throwIfCancelled()

    if (res.status !== 200 || !res.body) {
      throw new Error('The design export result is not available')
    }

    return res.body
  }
}
