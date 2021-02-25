import {
  createDesignFromLocalDesign,
  createDesignFromOpenDesignApiDesign,
} from './utils/design-factories'

import type { IOpenDesignApi } from '@opendesign/api/types'
import type { ISdk } from './types/ifaces'
import type { DesignFacade } from './design-facade'
import type { DesignFileManager } from './local/design-file-manager'
import type { LocalDesignManager } from './local/local-design-manager'

export class Sdk implements ISdk {
  _openDesignApi: IOpenDesignApi | null = null
  _designFileManager: DesignFileManager | null = null
  _localDesignManager: LocalDesignManager | null = null

  async openOctopusFile(relPath: string): Promise<DesignFacade> {
    const localDesignManager = this._localDesignManager
    if (!localDesignManager) {
      throw new Error('Local design manager is not configured.')
    }

    const localDesign = await localDesignManager.openOctopusFile(relPath)
    const designFacade = await createDesignFromLocalDesign(localDesign, {
      sdk: this,
    })

    return designFacade
  }

  async openDesignFile(relPath: string): Promise<DesignFacade> {
    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const designFileManager = this._designFileManager
    if (!designFileManager) {
      throw new Error('Design file manager is not configured.')
    }

    const designFileStream = await designFileManager.readDesignFileStream(
      relPath
    )
    const apiDesign = await openDesignApi.importDesignFile(designFileStream)

    return this.fetchDesignById(apiDesign.id)
  }

  async openFigmaDesign(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string>
    designName?: string | null
  }): Promise<DesignFacade> {
    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.importFigmaDesignLink(params)

    return this.fetchDesignById(apiDesign.id)
  }

  async fetchDesignById(designId: string): Promise<DesignFacade> {
    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.getDesignById(designId)
    const designFacade = await createDesignFromOpenDesignApiDesign(apiDesign, {
      sdk: this,
    })

    const localDesignManager = this._localDesignManager
    if (localDesignManager) {
      const localDesign = await localDesignManager.createOctopusFileFromManifest(
        designFacade.getManifest()
      )
      await designFacade.setLocalDesign(localDesign)
    }

    return designFacade
  }

  useDesignFileManager(designFileManager: DesignFileManager): void {
    this._designFileManager = designFileManager
  }

  useLocalDesignManager(localDesignManager: LocalDesignManager): void {
    this._localDesignManager = localDesignManager
  }

  useOpenDesignApi(api: IOpenDesignApi): void {
    this._openDesignApi = api
  }
}
