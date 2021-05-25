import createCancelToken, { CancelToken } from '@avocode/cancel-token'
import { OpenDesignApi } from '@opendesign/api'
import { Sdk } from './sdk'
import { ConsoleConfig, getConsole } from './utils/console-utils'

/**
 * Creates an SDK instance with the API configured.
 *
 * Such an SDK instance is not able to upload design files to the Open Design API (except design link imports). It can, however, download data from the API and query the designs for various content (layers, bitmap assets, font usage, …).
 *
 * @category Experimental Entry Point
 * @param params.token An Open Design API access token. Test tokens can be generated within the [Open Design API documentation](https://opendesign.avocode.com/docs/authentication).
 * @param params.apiRoot The URL base for Open Design API calls. By default, production Avocode Open Design API servers are used.
 * @param params.console Configuration of the console/logger. This can either be a log level configuration for the bundled logger or a custom console object. The bundled logger can be replaced with the default browser console via `{ console: console }`.
 */
export function createSdk(params: {
  token: string
  apiRoot?: string | null
  console?: ConsoleConfig | null
}) {
  const sdkConsole = getConsole(params.console || null)
  const sdk = new Sdk({ console: sdkConsole })

  configureOnlineServices(sdk, { ...params, console: sdkConsole })

  return sdk
}

function configureOnlineServices(
  sdk: Sdk,
  params: { token: string; apiRoot?: string | null; console: Console }
) {
  sdk.useOpenDesignApi(createOpenDesignApi(params))
  return sdk
}

function createOpenDesignApi(params: {
  token: string
  apiRoot?: string | null
  console: Console
}) {
  const apiRoot = params.apiRoot || 'https://opendesign.avocode.com/api'
  const token = params.token
  if (!token) {
    throw new Error('Open Design API access token not provided')
  }

  const openDesignApi = new OpenDesignApi({
    apiRoot,
    token,
    console: params.console,
  })

  return openDesignApi
}

export { OpenDesignApi, Sdk }
export { createCancelToken, CancelToken }
