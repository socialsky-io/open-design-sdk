import { OpenDesignApi } from '@opendesign/api'
import { SvgExporter } from '@opendesign/svg-exporter'
import { createRenderingEngine } from '@opendesign/rendering'
import { createCancelToken } from './utils/cancel-token-utils'
import { ConsoleConfig, getConsole } from './utils/console-utils'
import { FileManager } from './local/file-manager'
import { LocalDesignCache } from './local/local-design-cache'
import { LocalDesignManager } from './local/local-design-manager'
import { SystemFontManager } from './local/system-font-manager'
import { Sdk } from './sdk'

import type { CancelToken } from '@avocode/cancel-token'
export type {
  ArtboardId,
  OctopusDocument,
  ArtboardSelector,
  ComponentId,
  DesignLayerSelector,
  IBitmap,
  IBitmapMask,
  IEffects,
  IPatternFillEffect,
  IPatternBorderEffect,
  IText,
  LayerId,
  LayerOctopusData,
  LayerSelector,
  PageId,
  PageSelector,
} from '@opendesign/octopus-reader'
export type { BlendingMode, Bounds, LayerBounds } from '@opendesign/rendering'

export type { ArtboardFacade, LayerAttributesConfig } from './artboard-facade'
export type { DesignExportFacade } from './design-export-facade'
export type { DesignFacade } from './design-facade'
export type { DesignListItemFacade } from './design-list-item-facade'
export type { LayerCollectionFacade } from './layer-collection-facade'
export type {
  FontDescriptor,
  LayerFacade,
  LayerAttributes,
  LayerOctopusAttributesConfig,
} from './layer-facade'
export type { BitmapAssetDescriptor } from './local/local-design'
export type { PageFacade } from './page-facade'

/**
 * Creates an SDK instance
 *
 * Based on the provided configuration, various services are made available:
 *
 * - When Open Design API credentials (a token) is provided, the API is configured and available for uploading and downloading designs.
 * - A local rendering engine is available by default.
 * - Local system fonts can be used for rendering design by default.
 * - A local cache is available by default.
 *
 * @example Full SDK
 * ```typescript
 * const sdk = createSdk({
 *   token: '<TOKEN>',
 * })
 * ```
 * @example Full SDK with all logs for debugging purposes
 * ```typescript
 * const sdk = createSdk({
 *   token: '<TOKEN>',
 *   console: { level: 'debug' }
 * })
 * ```
 * @example SDK without the local rendering engine
 * ```typescript
 * const sdk = createSdk({
 *   token: '<TOKEN>',
 *   rendering: false,
 *   systemFonts: false,
 * })
 * ```
 *
 * @category Primary Entry Point
 * @param params SDK Parameters
 * @param params.token An Open Design API access token. Test tokens can be generated within the [Open Design API documentation](https://opendesign.dev/docs/authentication). When no token is provided, online services (the API) is not configured.
 * @param params.apiRoot The URL base for Open Design API calls. By default, production Avocode Open Design API servers are used.
 * @param params.workingDirectory An absolute path to the directory against which should the SDK resolve relative file paths and where should it look for its cache directory.
 * @param params.cached Whether to use a local (file system) cache in the form for `.octopus` files. This is enabled by default.
 * @param params.rendering Whether to use a local rendering engine for rendering designs. This is enabled by default. `cached` must not be set to `false` for the rendering engine to be available.
 * @param params.systemFonts Whether to use local system fonts for rendering designs via the rendering engine. This is enabled by default.
 * @param params.svgExport Whether to use a local SVG exporter. This is enabled by default.
 * @param params.console Configuration of the console/logger. This can either be a log level configuration for the bundled logger or a custom console object. The bundled logger can be replaced with the default node.js console via `{ console: console }`.
 * @returns An SDK instance.
 */
export function createSdk(params: {
  token: string
  apiRoot?: string
  workingDirectory?: string | null
  cached?: boolean
  rendering?: boolean
  systemFonts?: boolean
  svgExport?: boolean
  console?: ConsoleConfig | null
}): Sdk {
  if (params.rendering && !params.cached) {
    throw new Error(
      'The local cache has to be enabled when using the rendering engine.'
    )
  }

  const sdkConsole = getConsole(params.console || null)

  const sdk = new Sdk({ console: sdkConsole })

  sdk.useFileManager(new FileManager())
  sdk.useLocalDesignManager(
    new LocalDesignManager({
      console: sdkConsole,
    })
  )

  sdk.useOpenDesignApi(
    createOpenDesignApi({
      token: params.token,
      apiRoot: params.apiRoot || null,
      console: sdkConsole,
    })
  )

  if (params.systemFonts !== false) {
    sdk.useSystemFontManager(new SystemFontManager())
  }

  if (params.cached !== false) {
    sdk.useLocalDesignCache(new LocalDesignCache())
  }

  if (params.rendering !== false) {
    sdk.useRenderingEngineFactory(createRenderingEngine)
  }

  if (params.svgExport !== false) {
    sdk.useSvgExporter(
      new SvgExporter({
        console: sdkConsole,
      })
    )
  }

  sdk.setWorkingDirectory(params.workingDirectory || null)

  return sdk
}

function createOpenDesignApi(params: {
  token: string
  apiRoot?: string | null
  console: Console
}) {
  const apiRoot = params.apiRoot || 'https://api.opendesign.dev'
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

export { Sdk, ConsoleConfig }
export { createCancelToken, CancelToken }
