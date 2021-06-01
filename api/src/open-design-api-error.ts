export class OpenDesignApiError extends Error {
  name = 'OpenDesignApiError'

  constructor(
    res: {
      statusCode: number
      body?: {
        'error'?: {
          'code': string
          'message'?: string
          'docs_url'?: string
        }
      } & Record<string, unknown>
    },
    message: string | null = null
  ) {
    super()

    const body = 'body' in res ? res.body || {} : {}
    const errorInfo: {
      'code': string
      'message'?: string
      'docs_url'?: string
    } | null = 'error' in body ? body['error'] || null : null

    const apiErrorStr = errorInfo
      ? `${errorInfo['code']}${
          errorInfo['message'] ? `: ${errorInfo['message']}` : ''
        }`
      : ''

    const docsUrlStr =
      errorInfo && errorInfo['docs_url']
        ? `See ${errorInfo['docs_url']} for more info.`
        : ''

    this.message = [
      `[${res.statusCode}]`,
      apiErrorStr ? ` ${apiErrorStr}` : '',
      message ? `\n  -> ${message}` : '',
      docsUrlStr ? `\n  -> ${docsUrlStr}` : '',
    ].join('')
  }
}
