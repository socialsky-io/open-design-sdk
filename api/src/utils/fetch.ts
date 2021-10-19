import { populatePathPattern, PathParams } from './paths'
import fetchInternal, { Headers, RequestInit } from 'node-fetch'
import FormData from 'form-data'

import type { CancelToken } from '@avocode/cancel-token'
import type { ReadStream } from 'fs'
import type { OptionalKeys, RequiredKeys } from 'utility-types'
import type { paths } from 'open-design-api-types'
import type {
  OperationBodyParams,
  OperationMultipartBodyParams,
  OperationResponse,
  OperationStatusCodes,
} from '../types/operation.type'
import { IOperation } from '../types/openapi-typescript.type'
import { keys } from './object'

type MethodPathPatterns<M> = {
  [P in keyof paths]: M extends keyof paths[P] ? P : never
}[keyof paths]

type AuthInfo = { token: string }

export async function fetch(
  url: string,
  params: Omit<RequestInit, 'signal'> & {
    console?: Console
    cancelToken?: CancelToken | null
  } = {}
): ReturnType<typeof fetchInternal> {
  const {
    console: fetchConsole = console,
    cancelToken,
    ...requestInit
  } = params

  const method = requestInit.method?.toUpperCase() || 'GET'
  fetchConsole.debug('API:', method, url, '...')

  const signal = cancelToken?.signal
  try {
    const res = await fetchInternal(url, { ...requestInit, signal })

    const logData = [
      'API:',
      method,
      url,
      '->',
      `${res.status} ${res.statusText}`,
    ]
    if (res.status >= 400) {
      fetchConsole.error(...logData)
    } else {
      fetchConsole.info(...logData)
    }

    return res
  } catch (err) {
    const typedErr = err as Error & { type?: string }
    if (typedErr.type === 'AbortError' && cancelToken) {
      cancelToken.throwIfCancelled()
    }
    throw err
  }
}

// JSON

export async function get<
  PathPattern extends MethodPathPatterns<'get'>,
  Operation extends paths[PathPattern]['get']
>(
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  authInfo: AuthInfo,
  options: {
    console?: Console | null
    cancelToken?: CancelToken | null
  } = {}
): Promise<Exclude<OperationResponse<Operation>, { statusCode: 500 }>> {
  return request('get', apiRoot, pathPattern, pathParams, {}, authInfo, options)
}

export async function post<
  PathPattern extends MethodPathPatterns<'post'>,
  Operation extends paths[PathPattern]['post']
>(
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  data: OperationBodyParams<Operation, 'application/json'>,
  authInfo: AuthInfo | null = null,
  options: {
    console?: Console | null
    cancelToken?: CancelToken | null
  } = {}
): Promise<Exclude<OperationResponse<Operation>, { statusCode: 500 }>> {
  return request(
    'post',
    apiRoot,
    pathPattern,
    pathParams,
    {
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    },
    authInfo,
    options
  )
}

// Streams

export async function getStream<
  PathPattern extends MethodPathPatterns<'get'>,
  Operation extends paths[PathPattern]['get']
>(
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  authInfo: AuthInfo,
  options: {
    console?: Console | null

    cancelToken?: CancelToken | null
  } = {}
): Promise<{
  statusCode: Exclude<OperationStatusCodes<Operation>, 500>
  headers: Headers
  stream: NodeJS.ReadableStream
}> {
  return requestStream(
    'get',
    apiRoot,
    pathPattern,
    pathParams,
    {},
    authInfo,
    options
  )
}

// MultipartFilePart

export async function postMultipart<
  PathPattern extends MethodPathPatterns<'post'>,
  Operation extends paths[PathPattern]['post'],
  MultipartBody extends OperationMultipartBodyParams<Operation>
>(
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  data: {
    [K in Extract<RequiredKeys<MultipartBody>, string>]:
      | MultipartBody[K]
      | ReadStream
  } &
    {
      [K in Extract<OptionalKeys<MultipartBody>, string>]?:
        | MultipartBody[K]
        | ReadStream
    },
  authInfo: AuthInfo,
  options: {
    console?: Console | null
    cancelToken?: CancelToken | null
  } = {}
): Promise<Exclude<OperationResponse<Operation>, { statusCode: 500 }>> {
  const path = populatePathPattern(pathPattern, pathParams)

  const requestBody = new FormData()
  keys(data).forEach((fieldName) => {
    requestBody.append(fieldName, data[fieldName])
  })

  const res = await fetch(`${apiRoot}${path}`, {
    method: 'post',
    body: requestBody,
    headers: {
      'Authorization': `Bearer ${authInfo.token}`,
    },
    console: options.console || console,
    cancelToken: options.cancelToken || null,
  })
  options.cancelToken?.throwIfCancelled()

  const body = await res.json()
  options.cancelToken?.throwIfCancelled()

  if (res.status === 500) {
    throw new Error('Server Error')
  }

  return {
    statusCode: res.status,
    headers: res.headers,
    body,
  } as Exclude<OperationResponse<Operation>, { statusCode: 500 }>
}

// General

async function request<
  PathPattern extends string,
  Operation extends IOperation
>(
  method: string,
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  requestParams: Omit<RequestInit, 'method'> = {},
  authInfo: AuthInfo | null,
  options: {
    console?: Console | null
    cancelToken?: CancelToken | null
  } = {}
) {
  const path = populatePathPattern(pathPattern, pathParams)
  const res = await fetch(`${apiRoot}${path}`, {
    method,
    ...requestParams,
    headers: {
      ...(authInfo ? { 'Authorization': `Bearer ${authInfo.token}` } : {}),
      ...(requestParams.headers || {}),
    },
    console: options.console || console,
    cancelToken: options.cancelToken || null,
  })
  options.cancelToken?.throwIfCancelled()

  const body = await res.json()
  options.cancelToken?.throwIfCancelled()

  if (res.status === 500) {
    throw new Error('Server Error')
  }

  return {
    statusCode: res.status,
    headers: res.headers,
    body,
  } as Exclude<OperationResponse<Operation>, { statusCode: 500 }>
}

async function requestStream<
  PathPattern extends string,
  Operation extends IOperation
>(
  method: string,
  apiRoot: string,
  pathPattern: PathPattern,
  pathParams: PathParams<PathPattern>,
  requestParams: Omit<RequestInit, 'method'> = {},
  authInfo: AuthInfo | null,
  options: {
    console?: Console | null
    cancelToken?: CancelToken | null
  } = {}
) {
  const path = populatePathPattern(pathPattern, pathParams)

  const res = await fetch(`${apiRoot}${path}`, {
    method,
    ...requestParams,
    headers: {
      ...(authInfo ? { 'Authorization': `Bearer ${authInfo.token}` } : {}),
      ...(requestParams.headers || {}),
    },
    console: options.console || console,
    cancelToken: options.cancelToken || null,
  })
  options.cancelToken?.throwIfCancelled()

  if (res.status === 500) {
    throw new Error('Server Error')
  }

  if (!res.body) {
    throw new Error('Response body stream not available')
  }

  return {
    statusCode: res.status as Exclude<OperationStatusCodes<Operation>, 500>,
    headers: res.headers,
    stream: res.body,
  }
}
