import { Design } from './nodes/design'

import type { IDesign } from './types/design.iface'
import type { ManifestData } from './types/manifest.type'

export function createEmptyDesign(): IDesign {
  return new Design()
}

export function createDesignFromManifest(manifest: ManifestData): IDesign {
  const design = new Design()

  design.setManifest(manifest)

  return design
}

export * from './types/artboard.iface'
export * from './types/bitmap-assets.type'
export * from './types/bitmap.iface'
export * from './types/bitmap-mask.iface'
export * from './types/effects.iface'
export * from './types/design.iface'
export * from './types/fonts.type'
export * from './types/ids.type'
export * from './types/layer-collection.iface'
export * from './types/layer.iface'
export * from './types/manifest.type'
export * from './types/octopus.type'
export * from './types/page.iface'
export * from './types/selectors.type'
export * from './types/shape.iface'
export * from './types/text.iface'
