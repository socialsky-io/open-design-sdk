import { ILayer } from '../types/layer.iface'

export function getLayerBitmapAssets(
  layer: ILayer,
  params: { includePrerendered: boolean }
) {
  const bitmap = layer.getBitmap()
  const bitmapAssetName = bitmap ? bitmap.getBitmapAssetName() : null

  const maskBitmap = layer.getBitmapMask()?.getBitmap() || null
  const maskBitmapAssetName = maskBitmap
    ? maskBitmap.getBitmapAssetName()
    : null

  const prerenderedBitmap = params.includePrerendered
    ? layer.getPrerenderedBitmap()
    : null
  const prerenderedBitmapAssetName = prerenderedBitmap
    ? prerenderedBitmap.getBitmapAssetName()
    : null

  const effects = layer.getEffects()
  const patternEffects = [
    ...effects.getPatternFills(),
    ...effects.getPatternBorders(),
  ]
  const patternBitmapAssetNames = patternEffects
    .map((patternEffect) => {
      const bitmap = patternEffect.getBitmap()
      return bitmap ? bitmap.getBitmapAssetName() : null
    })
    .filter(Boolean) as Array<string>

  const bitmapAssetNames = new Set([
    ...(maskBitmapAssetName ? [maskBitmapAssetName] : []),
    ...(bitmapAssetName ? [bitmapAssetName] : []),
    ...patternBitmapAssetNames,
  ])

  return [
    ...[...bitmapAssetNames].map((name) => {
      return {
        name,
        layerId: layer.id,
        prerendered: false,
      }
    }),
    ...(prerenderedBitmapAssetName &&
    !bitmapAssetNames.has(prerenderedBitmapAssetName)
      ? [
          {
            name: prerenderedBitmapAssetName,
            layerId: layer.id,
            prerendered: true,
          },
        ]
      : []),
  ]
}
