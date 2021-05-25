import { Layer } from '../nodes/layer'

import type { IArtboard } from '../types/artboard.iface'
import type { ILayer } from '../types/layer.iface'
import type { LayerId, LayerOctopusData } from '../types/octopus.type'

export function createLayers(
  layerDataList: Array<LayerOctopusData>,
  params: Partial<{
    parentLayerId: LayerId | null
    artboard: IArtboard | null
  }> = {}
): Array<ILayer> {
  return layerDataList.map((layerData) => {
    return createLayer(layerData, params)
  })
}

export function createFlattenedLayers(
  layerDataList: Array<LayerOctopusData>,
  params: Partial<{
    depth: number
    parentLayerId: LayerId | null
    artboard: IArtboard | null
  }> = {}
): Array<ILayer> {
  const depth = params.depth || Infinity

  return layerDataList.flatMap((layerData) => {
    const nestedLayerDataList =
      'layers' in layerData ? layerData['layers'] || [] : []

    return [
      createLayer(layerData, params),
      ...(depth <= 1
        ? []
        : createFlattenedLayers(nestedLayerDataList, {
            ...params,
            depth: depth - 1,
            parentLayerId: layerData['id'],
          })),
    ]
  })
}

export function createLayer(
  layerData: LayerOctopusData,
  params: Partial<{
    parentLayerId: LayerId | null
    artboard: IArtboard | null
  }> = {}
): ILayer {
  return new Layer(layerData, params)
}

export function createLayerMap<L extends ILayer>(
  layerList: Array<L>
): Record<LayerId, L> {
  const layersById: Record<LayerId, L> = {}
  layerList.forEach((layer) => {
    layersById[layer.id] = layer
  })

  return layersById
}
