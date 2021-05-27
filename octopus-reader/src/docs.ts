import type { IArtboard } from './types/artboard.iface'
import type { IBitmap } from './types/bitmap.iface'
import type { IEffects } from './types/effects.iface'
import type { IDesign } from './types/design.iface'
import type { ILayer } from './types/layer.iface'
import type { IPage } from './types/page.iface'
import type { IText } from './types/text.iface'

import type { components } from 'open-design-api-types/typescript/octopus'
import type { ArtboardManifestData, ManifestData } from './types/manifest.type'

export * from './index'

export type { IArtboard, IBitmap, IEffects, IDesign, ILayer, IPage, IText }

type LayerOctopusData = components['schemas']['Layer']
type OctopusDocument = components['schemas']['OctopusDocument']

export type {
  ArtboardManifestData,
  LayerOctopusData,
  OctopusDocument,
  ManifestData,
}
