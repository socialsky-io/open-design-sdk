import cplus, { LogLevels } from 'cplus'

const cplusLogLevels = {
  'error': LogLevels.ERROR,
  'warn': LogLevels.WARN,
  'info': LogLevels.INFO,
  'debug': LogLevels.DEBUG,
}

/**
 * Configuration of the console/logger. This can either be a log level configuration for the bundled logger or a custom console object. The bundled logger can be replaced with the default node.js/browser console by providing `console`.
 *
 * The bundled logger log levels include these logs:
 * - `error` – API request errors; rendering engine errors; font file errors
 * - `warn` – Redundant design artboard unloading; non-fatal SDK configuration issues related to specific designs; missing fallback font files
 * - `info` – Successful API requests
 * - `debug` – Initiated API requests; details about bitmap asset downloading; successful rendering engine initialization and messaging; local cache locations
 */
export type ConsoleConfig =
  | Console
  | { level: 'error' | 'warn' | 'info' | 'debug' }

export function getConsole(consoleConfig: ConsoleConfig | null): Console {
  const sdkConsole =
    consoleConfig && !('level' in consoleConfig)
      ? consoleConfig
      : cplus.create({
          logLevel: cplusLogLevels[consoleConfig?.level || 'warn'],
        })

  return sdkConsole
}
