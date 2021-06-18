import { relative, resolve as resolvePath } from 'path'
import { checkFile, readJsonFile, writeJsonFile } from '../utils/fs-utils'

import { Env } from '../env'

import type { CancelToken } from '@avocode/cancel-token'

const VERSION = 2

type DesignCacheInfo = {
  'version': typeof VERSION
  'design_cache': Record<string, Record<string, Record<number, string>>>
}

export class LocalDesignCache {
  private _env: Env = new Env()
  private _cacheInfo: DesignCacheInfo | null = null

  setEnv(env: Env): void {
    this._env = env
  }

  async getDesignOctopusFilename(
    apiRoot: string,
    designId: string,
    designVersionId: number,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string | null> {
    const octopusFilenames = await this._loadOctopusFilenames(apiRoot, options)
    const optimizedFilename =
      octopusFilenames[designId]?.[designVersionId] || null

    return optimizedFilename ? this._resolvePath(optimizedFilename) : null
  }

  async setDesignOctopusFilename(
    apiRoot: string,
    designId: string,
    designVersionId: number,
    octopusFilename: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const octopusFilenames = await this._loadOctopusFilenames(apiRoot, options)

    const optimizedFilename = this._getRelativePath(octopusFilename)
    octopusFilenames[designId] = {
      ...(octopusFilenames[designId] || {}),
      [designVersionId]: optimizedFilename,
    }

    await this._saveOctopusFilenames(apiRoot, octopusFilenames)
  }

  async _loadOctopusFilenames(
    apiRoot: string,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<Record<string, Record<number, string>>> {
    const cacheInfo = await this._loadCacheInfo(options)
    return cacheInfo['design_cache'][apiRoot] || {}
  }

  async _loadCacheInfo(options: {
    cancelToken?: CancelToken | null
  }): Promise<DesignCacheInfo> {
    if (this._cacheInfo) {
      return this._cacheInfo
    }

    const cacheFilename = this._getCacheFilename()
    const cacheExists = await checkFile(cacheFilename, options)
    const cacheInfoData = cacheExists
      ? await readJsonFile(cacheFilename, options)
      : null

    const cacheInfoCandidate =
      typeof cacheInfoData === 'object' &&
      cacheInfoData &&
      'version' in cacheInfoData
        ? (cacheInfoData as { 'version': unknown })
        : null

    const cacheInfo =
      cacheInfoCandidate && cacheInfoCandidate['version'] === VERSION
        ? (cacheInfoCandidate as DesignCacheInfo)
        : this._createCacheInfo()

    this._cacheInfo = cacheInfo
    return cacheInfo
  }

  async _saveOctopusFilenames(
    apiRoot: string,
    octopusFilenames: Record<string, Record<number, string>>
  ): Promise<void> {
    const prevCacheInfo = this._getCacheInfo()
    const nextCacheInfo = {
      ...prevCacheInfo,
      'design_cache': {
        ...prevCacheInfo['design_cache'],
        [apiRoot]: octopusFilenames,
      },
    }

    const cacheFilename = this._getCacheFilename()
    await writeJsonFile(cacheFilename, nextCacheInfo)
  }

  _getCacheInfo(): DesignCacheInfo {
    if (this._cacheInfo) {
      return this._cacheInfo
    }

    return this._createCacheInfo()
  }

  _createCacheInfo(): DesignCacheInfo {
    return {
      'version': VERSION,
      'design_cache': {},
    }
  }

  _getCacheFilename(): string {
    return this._resolvePath('./.opendesign/temp/design-cache.json')
  }

  _resolvePath(filePath: string): string {
    return resolvePath(this._env.workingDirectory || '.', `${filePath}`)
  }

  _getRelativePath(filePath: string): string {
    return relative(this._resolvePath('.'), this._resolvePath(filePath))
  }
}
