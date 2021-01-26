import type { IArtboard } from './artboard.iface'
import type { IBitmap } from './bitmap.iface'
import type { IEffects } from './effects.iface'
import type { LayerId } from './ids.type'
import type { ILayerCollection } from './layer-collection.iface'
import type { LayerOctopusData } from './octopus.type'
import type { LayerSelector } from './selectors.type'
import type { IShape } from './shape.iface'
import type { IText } from './text.iface'

export interface ILayer {
  readonly id: LayerId
  readonly name: string | null
  readonly type: LayerOctopusData['type']
  readonly octopus: LayerOctopusData

  getArtboard(): IArtboard | null

  isRootLayer(): boolean
  getDepth(): number

  getParentLayer(): ILayer | null
  getParentLayers(): ILayerCollection
  getParentLayerIds(): Array<LayerId>
  findParentLayer(selector: LayerSelector): ILayer | null
  findParentLayers(selector: LayerSelector): ILayerCollection

  hasNestedLayers(): boolean
  getNestedLayers(options?: Partial<{ depth: number }>): ILayerCollection
  findNestedLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayer | null
  findNestedLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollection

  isMasked(): boolean
  getMaskLayer(): ILayer | null
  getMaskLayerId(): LayerId | null

  getBitmap(): IBitmap | null
  getPrerenderedBitmap(): IBitmap | null
  getShape(): IShape | null
  getText(): IText | null

  getEffects(): IEffects
}
