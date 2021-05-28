import type { Bounds } from './bounds.type'
import type { LayerAttributesConfig } from './layer-attributes.type'

export type LayerBounds = {
  /**
   * Area in which the complete layer content (without effects) is located.
   */
  bounds: Bounds

  /**
   * Area in which the complete layer content and its effects are located.
   */
  fullBounds: Bounds

  /**
   * Area which has to be rerendered when the layer visibility is toggled.
   */
  affectedBounds: Bounds

  /**
   * Area of the layer the user would likely consider the actual layer area.
   *
   * The layer content can overflow outside of these bound just as there can be empty space around the layer content.
   */
  logicalBounds: Bounds

  /**
   * Area in which the layer content would be located had it not been transformed (rotated).
   */
  untransformedBounds: Bounds
}

export interface IRenderingArtboard {
  readonly id: string
  readonly symbolId: string | null

  readonly ready: boolean
  readonly pendingSymbolIds: Array<string>

  load(params: {
    octopusFilename: string
    bitmapAssetDirectoryPath?: string | null
    fontDirectoryPath?: string | null
    offset?: { x: number; y: number } | null
  }): Promise<void>

  unload(): Promise<void>

  markAsReady(): Promise<void>

  setPage(nextPageId: string | null): Promise<void>

  setOffset(nextOffset: { x: number; y: number }): Promise<void>

  renderToFile(
    filePath: string,
    options?: { scale?: number; bounds?: Bounds }
  ): Promise<void>

  renderLayerToFile(
    layerId: string,
    filePath: string,
    options?: LayerAttributesConfig & {
      scale?: number
      bounds?: Bounds
    }
  ): Promise<void>

  renderLayersToFile(
    layerIds: Array<string>,
    filePath: string,
    options?: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    }
  ): Promise<void>

  getLayerBounds(layerId: string): Promise<LayerBounds>

  getLayerCompositionBounds(
    layerIds: Array<string>,
    options?: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
    }
  ): Promise<Bounds>

  getLayerAtPosition(x: number, y: number): Promise<string | null>

  getLayersInArea(
    bounds: Bounds,
    options?: { partialOverlap?: boolean }
  ): Promise<Array<string>>
}
