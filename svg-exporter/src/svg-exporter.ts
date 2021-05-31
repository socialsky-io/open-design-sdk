import { promises as fs } from 'fs'
import createCancelToken, { CancelToken } from '@avocode/cancel-token'
import createSvg from '@avocode/svg-exporter/lib/index-node'
import imageType from 'image-type'

import type { components } from 'open-design-api-types/typescript/octopus'
import type { ISvgExporter } from './types/svg-exporter.iface'

type LayerOctopusData = components['schemas']['Layer']
type LayerId = LayerOctopusData['id']

export class SvgExporter implements ISvgExporter {
  private _console: Console
  private _destroyTokenController = createCancelToken()

  constructor(
    params: {
      console?: Console | null
    } = {}
  ) {
    this._console = params.console || console
  }

  async exportSvg(
    layerOctopusDataList: Array<LayerOctopusData>,
    options: {
      bitmapAssetFilenames?: Record<string, string>
      scale?: number
      parentLayers?: Record<LayerId, LayerOctopusData>
      parentLayerIds?: Record<LayerId, Array<LayerId>>
      viewBoxBounds?: {
        left: number
        top: number
        width: number
        height: number
      }
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string> {
    const {
      bitmapAssetFilenames = {},
      scale = 1,
      cancelToken: operationCancelToken,
      ...svgOptions
    } = options

    const cancelToken = createCancelToken.race([
      operationCancelToken,
      this._destroyTokenController.token,
    ])

    const bitmaps = await this._loadBitmapAssets(bitmapAssetFilenames, {
      cancelToken,
    })

    this._console.debug('SvgExporter:', 'creating SVG')

    const [canvas, svgdom] = await Promise.all([
      import('canvas'),
      import('svgdom'),
    ])

    cancelToken.throwIfCancelled()

    return createSvg(layerOctopusDataList, {
      scale,
      bitmaps,
      ...svgOptions,
      env: {
        canvas: canvas.default,
        svgdom: svgdom.createSVGWindow(),
      },
    })
  }

  destroy(): void {
    this._destroyTokenController.cancel('The SVG exporter has been destroyed.')
  }

  async _loadBitmapAssets<T extends Record<string, string>>(
    bitmapAssetFilenames: T,
    params: { cancelToken: CancelToken }
  ): Promise<Record<string, string>> {
    const bitmapAssetNames = Object.keys(bitmapAssetFilenames) as Array<
      keyof typeof bitmapAssetFilenames
    >

    this._console.debug(
      'SvgExporter:',
      'loading bitmaps for export',
      bitmapAssetNames.length
    )

    const bitmapEntries = await Promise.all(
      bitmapAssetNames.map(async (name) => {
        return [
          name,
          await this._loadBitmapAsset(bitmapAssetFilenames[name], params),
        ]
      })
    )

    params.cancelToken.throwIfCancelled()

    return Object.fromEntries(bitmapEntries)
  }

  async _loadBitmapAsset(
    bitmapAssetFilename: string,
    params: { cancelToken: CancelToken }
  ): Promise<string> {
    const imageBuffer = await fs.readFile(bitmapAssetFilename)
    params.cancelToken.throwIfCancelled()

    const type = imageType(imageBuffer.slice(0, imageType.minimumBytes))
    const mimeType = type ? type.mime : ''

    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`
  }
}
