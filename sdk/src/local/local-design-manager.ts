import createCancelToken, { CancelToken } from '@avocode/cancel-token'
import { stat } from 'fs'
import { extname, join as joinPaths, resolve as resolvePath } from 'path'
import { promisify } from 'util'
import { writeJsonFile } from '../utils/fs-utils'
import mkdirp from 'mkdirp'
import { v4 as uuid } from 'uuid'

import { Env } from '../env'
import { ApiDesignInfo, LocalDesign } from './local-design'

import { MANIFEST_BASENAME } from './consts'

import type { ManifestData } from '@opendesign/octopus-reader'

const statPromised = promisify(stat)

export class LocalDesignManager {
  private _console: Console
  private _env: Env = new Env()
  private _destroyTokenController = createCancelToken()

  constructor(params: { console?: Console | null } = {}) {
    this._console = params.console || console
  }

  setEnv(env: Env) {
    this._env = env
  }

  destroy() {
    this._destroyTokenController.cancel()
  }

  resolvePath(filePath: string) {
    return resolvePath(this._env.workingDirectory || '.', `${filePath}`)
  }

  async openOctopusFile(
    filePath: string,
    options: {
      apiDesignInfo?: ApiDesignInfo | null
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LocalDesign> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const filename = this.resolvePath(filePath)
    this._checkOctopusFileName(filename)

    const fileStatus = await this._checkOctopusFileStatus(filename)
    if (fileStatus === 'missing') {
      throw new Error('No such .octopus file')
    }
    if (fileStatus === 'invalid') {
      throw new Error('The file is not a valid Octopus file')
    }

    const manifestFilename = joinPaths(filename, MANIFEST_BASENAME)
    await this._checkFilePresence(manifestFilename)

    const localDesign = new LocalDesign({ filename, localDesignManager: this })
    if (
      options.apiDesignInfo &&
      !(await this._checkApiDesignInfo(localDesign, options.apiDesignInfo, {
        cancelToken,
      }))
    ) {
      throw new Error('Incompatible API design entity info')
    }

    return localDesign
  }

  async createOctopusFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LocalDesign> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const filename = this.resolvePath(filePath)
    this._checkOctopusFileName(filename)

    await this._createDirectory(filename)
    cancelToken.throwIfCancelled()

    const emptyManifest = { 'artboards': [], 'pages': {} }
    await writeJsonFile(`${filename}/${MANIFEST_BASENAME}`, emptyManifest, {
      ...options,
      cancelToken,
    })

    return new LocalDesign({ filename, localDesignManager: this })
  }

  async createOctopusFileFromManifest(
    manifest: ManifestData,
    options: {
      name?: string | null
      apiDesignInfo?: ApiDesignInfo | null
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LocalDesign> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const filename = await this._createTempLocation(options.name || null)
    options.cancelToken?.throwIfCancelled()

    const localDesign = await this.createOctopusFile(filename, {
      ...options,
      cancelToken,
    })
    this._console.debug('Cache:', filename)

    await localDesign.saveManifest(manifest, {
      ...options,
      cancelToken,
    })

    if (options.apiDesignInfo) {
      await localDesign.saveApiDesignInfo(options.apiDesignInfo, {
        ...options,
        cancelToken,
      })
    }

    return localDesign
  }

  _checkOctopusFileName(filename: string) {
    const ext = extname(filename)
    if (ext !== '.octopus') {
      throw new Error('The file is not a .octopus file')
    }
  }

  async _createDirectory(dirname: string): Promise<void> {
    await mkdirp(dirname)
  }

  async _checkOctopusFileStatus(
    filename: string
  ): Promise<'valid' | 'invalid' | 'missing'> {
    try {
      const stats = await statPromised(filename)
      return stats.isDirectory() ? 'valid' : 'invalid'
    } catch (err) {
      return 'missing'
    }
  }

  async _checkFilePresence(dirname: string): Promise<void> {
    const stats = await statPromised(dirname)
    if (stats.isDirectory()) {
      throw new Error('The path is not a valid Octopus file')
    }
  }

  async _createTempLocation(name: string | null = null): Promise<string> {
    const dirname = this.resolvePath(
      `./.opendesign/temp/${uuid()}/${sanitizeName(name || 'design')}.octopus`
    )

    await mkdirp(dirname)

    return dirname
  }

  async _checkApiDesignInfo(
    localDesign: LocalDesign,
    nextApiDesignInfo: ApiDesignInfo,
    params: {
      cancelToken: CancelToken
    }
  ): Promise<boolean> {
    const prevApiDesignInfo = await localDesign.getApiDesignInfo(params)
    if (!prevApiDesignInfo) {
      return true
    }

    return (
      (!prevApiDesignInfo.apiRoot ||
        prevApiDesignInfo.apiRoot === nextApiDesignInfo.apiRoot) &&
      (!prevApiDesignInfo.designId ||
        !nextApiDesignInfo.designId ||
        prevApiDesignInfo.designId === nextApiDesignInfo.designId)
    )
  }
}

function sanitizeName(name: string): string {
  return name.replace(/\.[^\.]+$/, '').replace(/[\^:~\/\\]/g, '-')
}
