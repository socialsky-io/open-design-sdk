declare module '@avocode/svg-exporter' {
  import type { components } from 'open-design-api-types/typescript/octopus'

  type LayerOctopusData = components['schemas']['Layer']

  export default function createSvg(
    layerDataList: Array<LayerOctopusData>,
    options: {
      scale: number
      /** Use `@avocode/svg-exporter/lib/index-node` in node.js to allow base64 data URL input here. */
      bitmaps: Record<
        string,
        HTMLCanvasElement | HTMLImageElement | typeof Image
      >
      env: {
        canvas?: unknown
      }
    }
  ): string
}

declare module '@avocode/svg-exporter/lib/index-node' {
  import type { components } from 'open-design-api-types/typescript/octopus'

  type LayerOctopusData = components['schemas']['Layer']

  export default function createSvg(
    layerDataList: Array<LayerOctopusData>,
    options: {
      scale: number
      bitmaps: Record<string, string>
      env: {
        canvas?: unknown
        svgdom?: unknown
      }
    }
  ): string
}
