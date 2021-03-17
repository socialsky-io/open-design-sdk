import type {
  CommandResults,
  CommonResult,
  RenderingCommand,
} from './commands.type'

export interface IRenderingProcess {
  execCommand<
    CmdName extends RenderingCommand['cmd'],
    Cmd extends Extract<RenderingCommand, { 'cmd': CmdName }>
  >(
    cmdName: CmdName,
    data: Omit<Cmd, 'cmd'>
  ): Promise<
    CmdName extends keyof CommandResults
      ? CommandResults[CmdName]
      : CommonResult
  >
}
