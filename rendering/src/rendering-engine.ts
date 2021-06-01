import { RenderingDesign } from './rendering-design'
import { RenderingProcess } from './rendering-process'

import type { IRenderingEngine } from './types/rendering-engine.iface'

export class RenderingEngine implements IRenderingEngine {
  private _renderingProcess: RenderingProcess
  private _console: Console

  private _designs: Map<string, RenderingDesign> = new Map()

  // TODO: Move rendering process init to a factory.
  constructor(params: {
    renderingProcess: RenderingProcess
    console?: Console | null
  }) {
    if (!params.renderingProcess) {
      throw new Error('Rendering process not provided')
    }

    this._renderingProcess = params.renderingProcess
    this._console = params.console || console
  }

  isDestroyed(): boolean {
    return this._renderingProcess.isDestroyed()
  }

  async destroy(): Promise<void> {
    await this._renderingProcess.destroy()
  }

  async createDesign(
    designId: string,
    params: {
      bitmapAssetDirectoryPath?: string | null
      fontDirectoryPath?: string | null
    } = {}
  ): Promise<RenderingDesign> {
    const result = await this._renderingProcess.execCommand('create-design', {
      'design': designId,
    })
    if (!result['ok']) {
      throw new Error('Failed to create a design rendering session')
    }

    const design = new RenderingDesign({
      id: designId,
      renderingProcess: this._renderingProcess,
      console: this._console,
      bitmapAssetDirectoryPath: params.bitmapAssetDirectoryPath || null,
      fontDirectoryPath: params.fontDirectoryPath || null,
    })

    this._designs.set(designId, design)

    return design
  }
}
