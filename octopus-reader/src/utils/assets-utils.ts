import { mergeArrays, mergeArrayMaps } from './array-utils'

import type {
  AggregatedBitmapAssetDescriptor,
  AggregatedDesignBitmapAssetDescriptor,
} from '../types/bitmap-assets.type'
import type {
  AggregatedDesignFontDescriptor,
  AggregatedFontDescriptor,
} from '../types/fonts.type'

export function keepUniqueBitmapAssetDescriptors(
  bitmapAssetDescs: Array<AggregatedBitmapAssetDescriptor>
): Array<AggregatedBitmapAssetDescriptor> {
  const uniqueDescs = new Map<string, AggregatedBitmapAssetDescriptor>()

  bitmapAssetDescs.forEach((assetDesc) => {
    const uniqueDesc = uniqueDescs.get(assetDesc.name) || {
      name: assetDesc.name,
      prerendered: assetDesc.prerendered,
      layerIds: [],
    }

    uniqueDesc.layerIds = mergeArrays(uniqueDesc.layerIds, assetDesc.layerIds)

    if (!uniqueDescs.has(assetDesc.name)) {
      uniqueDescs.set(assetDesc.name, uniqueDesc)
    }
  })

  return [...uniqueDescs.values()]
}

export function keepUniqueFontDescriptors(
  fontDescs: Array<AggregatedFontDescriptor>
): Array<AggregatedFontDescriptor> {
  const uniqueDescs = new Map<string, AggregatedFontDescriptor>()

  fontDescs.forEach((assetDesc) => {
    const uniqueDesc = uniqueDescs.get(assetDesc.fontPostScriptName) || {
      fontPostScriptName: assetDesc.fontPostScriptName,
      fontPostScriptNameSynthetic: assetDesc.fontPostScriptNameSynthetic,
      fontTypes: assetDesc.fontTypes,
      fontName: assetDesc.fontName,
      layerIds: [],
    }

    uniqueDesc.fontTypes = mergeArrays(
      uniqueDesc.fontTypes,
      assetDesc.fontTypes
    )
    uniqueDesc.layerIds = mergeArrays(uniqueDesc.layerIds, assetDesc.layerIds)

    if (!uniqueDescs.has(assetDesc.fontPostScriptName)) {
      uniqueDescs.set(assetDesc.fontPostScriptName, uniqueDesc)
    }
  })

  return [...uniqueDescs.values()]
}

export function keepUniqueDesignBitmapAssetDescriptors(
  bitmapAssetDescs: Array<AggregatedDesignBitmapAssetDescriptor>
): Array<AggregatedDesignBitmapAssetDescriptor> {
  const uniqueDescs = new Map<string, AggregatedDesignBitmapAssetDescriptor>()

  bitmapAssetDescs.forEach((assetDesc) => {
    const uniqueDesc = uniqueDescs.get(assetDesc.name) || {
      name: assetDesc.name,
      prerendered: assetDesc.prerendered,
      artboardLayerIds: {},
    }

    uniqueDesc.artboardLayerIds = mergeArrayMaps(
      uniqueDesc.artboardLayerIds,
      assetDesc.artboardLayerIds
    )

    if (!uniqueDescs.has(assetDesc.name)) {
      uniqueDescs.set(assetDesc.name, uniqueDesc)
    }
  })

  return [...uniqueDescs.values()]
}

export function keepUniqueDesignFontDescriptors(
  fontDescs: Array<AggregatedDesignFontDescriptor>
): Array<AggregatedDesignFontDescriptor> {
  const uniqueDescs = new Map<string, AggregatedDesignFontDescriptor>()

  fontDescs.forEach((assetDesc) => {
    const uniqueDesc = uniqueDescs.get(assetDesc.fontPostScriptName) || {
      fontPostScriptName: assetDesc.fontPostScriptName,
      fontPostScriptNameSynthetic: assetDesc.fontPostScriptNameSynthetic,
      fontTypes: assetDesc.fontTypes,
      fontName: assetDesc.fontName,
      artboardLayerIds: {},
    }

    uniqueDesc.fontTypes = mergeArrays(
      uniqueDesc.fontTypes,
      assetDesc.fontTypes
    )
    uniqueDesc.artboardLayerIds = mergeArrayMaps(
      uniqueDesc.artboardLayerIds,
      assetDesc.artboardLayerIds
    )

    if (!uniqueDescs.has(assetDesc.fontPostScriptName)) {
      uniqueDescs.set(assetDesc.fontPostScriptName, uniqueDesc)
    }
  })

  return [...uniqueDescs.values()]
}
