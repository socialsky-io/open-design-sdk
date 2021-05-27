import {
  keepUniqueDesignBitmapAssetDescriptors,
  keepUniqueDesignFontDescriptors,
} from './assets-utils'

import type { IArtboard } from '../types/artboard.iface'
import type { AggregatedDesignBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { ILayer } from '../types/layer.iface'
import type { AggregatedDesignFontDescriptor } from '../types/fonts.type'
import type { LayerId } from '../types/ids.type'
import type { LayerSelector } from '../types/selectors.type'

export function getBitmapAssets(
  artboards: Array<IArtboard>,
  options: Partial<{ depth: number; includePrerendered: boolean }>
): Array<AggregatedDesignBitmapAssetDescriptor> {
  return keepUniqueDesignBitmapAssetDescriptors(
    artboards.flatMap((artboard) => {
      return artboard.getBitmapAssets(options)
    })
  )
}

export function getFonts(
  artboards: Array<IArtboard>,
  options: Partial<{ depth: number }>
): Array<AggregatedDesignFontDescriptor> {
  return keepUniqueDesignFontDescriptors(
    artboards.flatMap((artboard) => {
      return artboard.getFonts(options)
    })
  )
}

export function getFlattenedLayers(
  artboards: Array<IArtboard>,
  options: Partial<{ depth: number }> = {}
): Array<ILayer> {
  return artboards.flatMap((artboard) => {
    return artboard.getFlattenedLayers(options).map((layer) => {
      return layer
    })
  })
}

export function findLayerById(
  artboards: Array<IArtboard>,
  layerId: LayerId
): ILayer | null {
  for (const artboard of artboards) {
    const layer = artboard.getLayerById(layerId)
    if (layer) {
      return layer
    }
  }

  return null
}

export function findLayersById(
  artboards: Array<IArtboard>,
  layerId: LayerId
): Array<ILayer> {
  const layers = artboards.flatMap((artboard) => {
    const layer = artboard.getLayerById(layerId)
    return layer ? [layer] : []
  })

  return layers
}

export function findLayer(
  artboards: Array<IArtboard>,
  selector: LayerSelector | ((layer: ILayer) => boolean),
  options: Partial<{ depth: number }> = {}
): ILayer | null {
  const depthWithinArtboard = options.depth || Infinity

  for (const artboard of artboards) {
    const layer = artboard.findLayer(selector, { depth: depthWithinArtboard })
    if (layer) {
      return layer
    }
  }

  return null
}

export function findLayers(
  artboards: Array<IArtboard>,
  selector: LayerSelector | ((layer: ILayer) => boolean),
  options: Partial<{ depth: number }> = {}
): Array<ILayer> {
  const depthWithinArtboard = options.depth || Infinity

  const layers = artboards.flatMap((artboard) => {
    return artboard
      .findLayers(selector, { depth: depthWithinArtboard })
      .map((layer) => {
        return layer
      })
  })

  return layers
}
