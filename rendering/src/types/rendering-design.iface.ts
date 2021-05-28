import type { Bounds } from './bounds.type'
import type { LayerAttributesConfig } from './layer-attributes.type'
import type { LayerBounds } from './rendering-artboard.iface'

export interface IRenderingDesign {
  readonly id: string
  readonly bitmapAssetDirectoryPath: string | null
  readonly fontDirectoryPath: string | null

  isArtboardLoaded(artboardId: string): boolean
  isArtboardReady(artboardId: string): boolean

  loadArtboard(
    artboardId: string,
    params: {
      octopusFilename: string
      symbolId?: string | null
      pageId?: string | null
      offset?: { x: number; y: number } | null
    }
  ): Promise<{ ready: boolean; pendingSymbolIds: Array<string> }>

  markArtboardAsReady(artboardId: string): Promise<void>

  unloadArtboard(artboardId: string): Promise<void>
  unloadArtboards(): Promise<void>

  destroy(): Promise<void>

  loadImage(bitmapKey: string, filename: string): Promise<void>

  setFontDirectory(nextDirname: string): void

  loadFont(
    postscriptName: string,
    filename: string,
    options: {
      facePostscriptName?: string | null
    }
  ): Promise<void>

  renderArtboardToFile(
    artboardId: string,
    filePath: string,
    options?: { scale?: number; bounds?: Bounds }
  ): Promise<void>

  renderPageToFile(
    pageId: string,
    filePath: string,
    options?: { scale?: number; bounds?: Bounds }
  ): Promise<void>

  renderArtboardLayerToFile(
    artboardId: string,
    layerId: string,
    filePath: string,
    options?: LayerAttributesConfig & {
      scale?: number
      bounds?: Bounds
    }
  ): Promise<void>

  renderArtboardLayersToFile(
    artboardId: string,
    layerIds: Array<string>,
    filePath: string,
    options?: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    }
  ): Promise<void>

  getArtboardLayerBounds(
    artboardId: string,
    layerId: string
  ): Promise<LayerBounds>

  getArtboardLayerCompositionBounds(
    artboardId: string,
    layerIds: Array<string>,
    options?: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
    }
  ): Promise<Bounds>

  getArtboardLayerAtPosition(
    artboardId: string,
    x: number,
    y: number
  ): Promise<string | null>

  getArtboardLayersInArea(
    artboardId: string,
    bounds: Bounds,
    options?: { partialOverlap?: boolean }
  ): Promise<Array<string>>
}
