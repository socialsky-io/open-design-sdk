import { FileManager } from '../../src/local/file-manager'
import { LocalDesignManager } from '../../src/local/local-design-manager'
import { Sdk } from '../../src/sdk'

import { createOpenDesignApi } from './open-design-api'

export async function createSdk(params: {
  token?: string | null
  localDesigns?: boolean
  designFiles?: boolean
  api?: boolean
}): Promise<{
  sdk: Sdk
  apiRoot: string | null
  token: string | null
}> {
  const sdk = new Sdk()

  if (params.localDesigns) {
    sdk.useLocalDesignManager(new LocalDesignManager())
  }
  if (params.designFiles) {
    sdk.useFileManager(new FileManager())
  }

  const { openDesignApi, apiRoot, token } = params.api
    ? await createOpenDesignApi({ token: params.token })
    : { openDesignApi: null, apiRoot: null, token: null }

  if (openDesignApi) {
    sdk.useOpenDesignApi(openDesignApi)
  }

  return { sdk, apiRoot, token }
}
