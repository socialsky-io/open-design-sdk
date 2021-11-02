import type {
  CommandResults,
  CommonResult,
  RenderingCommand,
} from './types/commands.type'
import type { RenderingProcess } from './rendering-process'

export class RenderingSession {
  readonly id: string

  private _renderingProcess: RenderingProcess
  private _console: Console

  private _designPromise: Promise<void> | null = null

  constructor(params: {
    id: string
    renderingProcess: RenderingProcess
    console?: Console | null
  }) {
    this.id = params.id

    this._renderingProcess = params.renderingProcess
    this._console = params.console || console
  }

  async execCommand<
    CmdName extends RenderingCommand['cmd'],
    Cmd extends Extract<RenderingCommand, { 'cmd': CmdName }>
  >(
    cmdName: CmdName,
    data: Omit<Cmd, 'cmd'>
  ): Promise<
    CmdName extends keyof CommandResults
      ? CommandResults[CmdName]
      : CommonResult
  > {
    await this._ensureDesign()

    return this._renderingProcess.execCommand(cmdName, data)
  }

  async destroy(): Promise<void> {
    await this._ensureDesign()

    const result = await this._renderingProcess.execCommand('unload-design', {
      'design': this.id,
    })

    if (!result['ok']) {
      this._console.error('Rendering:', 'unload-design', '->', result)
      throw new Error('Failed to destroy design')
    }
  }

  async _ensureDesign(): Promise<void> {
    if (!this._designPromise) {
      this._designPromise = this._createDesign()
    }

    await this._designPromise
  }

  async _createDesign(): Promise<void> {
    const result = await this._renderingProcess.execCommand('create-design', {
      'design': this.id,
    })
    if (!result['ok']) {
      throw new Error('Failed to create a design rendering session')
    }
  }
}
