import { keys } from './object'

type SkipFirstCharacter<S> = S extends `${infer _}${infer RestOfString}`
  ? RestOfString
  : ''

export type PathParams<
  Pattern extends string
> = Pattern extends `{${infer ParamName}}${infer RestOfPattern}`
  ? ParamName extends string
    ? Record<ParamName, string | number> & PathParams<RestOfPattern>
    : Record<never, never>
  : Pattern extends ''
  ? Record<never, never>
  : PathParams<SkipFirstCharacter<Pattern>>

export function populatePathPattern<Pattern extends string>(
  pathPattern: Pattern,
  pathParams: PathParams<Pattern>
): string {
  return keys(pathParams).reduce((pathResult: string, paramName) => {
    const paramValue = pathParams[paramName]
    return pathResult.replace(
      `{${paramName}}`,
      encodeURIComponent(String(paramValue))
    )
  }, pathPattern)
}
