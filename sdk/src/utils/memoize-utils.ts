function shallowEqual(a: unknown, b: unknown, depth: number = 1): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return shallowEqualArrays(a, b, depth)
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return shallowEqualObjects(a, b, depth)
  }

  return a === b
}

function shallowEqualObjects(a: object, b: object, depth: number = 1): boolean {
  return [...Object.keys(a), ...Object.keys(b)].every((key) => {
    return (
      key in a &&
      key in b &&
      // @ts-ignore Kill me now.
      (depth <= 1 ? a[key] === b[key] : shallowEqual(a[key], b[key], depth - 1))
    )
  })
}

function shallowEqualArrays(
  a: Array<unknown>,
  b: Array<unknown>,
  depth: number = 1
): boolean {
  const length = Math.max(a.length, b.length)

  for (let i = 0; i < length; ++i) {
    if (depth <= 1 ? a[i] !== b[i] : !shallowEqual(a[i], b[i], depth - 1)) {
      return false
    }
  }

  return true
}

export function memoize<A extends Array<unknown>, R>(
  fn: (...args: A) => R,
  depth: number = 1
) {
  const cache: Array<{ args: A; result: R }> = []

  const memoizer = (...args: A): R => {
    const cached = cache.find(({ args: cachedResultArgs }) => {
      return shallowEqualArrays(args, cachedResultArgs, depth)
    })

    if (cached) {
      return cached.result
    }

    const calculatedResult = fn(...args)
    cache.push({ args, result: calculatedResult })

    return calculatedResult
  }

  memoizer.clear = () => {
    cache.splice(0, cache.length)
  }

  return memoizer
}
