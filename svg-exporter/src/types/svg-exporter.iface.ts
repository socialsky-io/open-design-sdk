import type { CancelToken } from '@avocode/cancel-token'
import type { components } from 'open-design-api-types/typescript/octopus'

type LayerOctopusData = components['schemas']['Layer']
type LayerId = LayerOctopusData['id']

export interface ISvgExporter {
  exportSvg(
    layerOctopusDataList: Array<LayerOctopusData>,
    options?: {
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
    }
  ): Promise<string>

  destroy(): void
}
