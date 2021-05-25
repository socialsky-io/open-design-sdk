export function mergeArrays<A, B>(a: Array<A>, b: Array<B>): Array<A | B> {
  const set = new Set([...a, ...b])
  return [...set]
}

export function mergeArrayMaps<V>(
  a: Record<string, Array<V>>,
  b: Record<string, Array<V>>
): Record<string, Array<V>> {
  const result: Record<string, Array<V>> = {}

  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  keys.forEach((key) => {
    result[key] = mergeArrays(a[key] || [], b[key] || [])
  })

  return result
}

export function addArrayItem<A, B>(a: Array<A>, item: B): Array<A | B> {
  const set = new Set<A | B>(a)
  set.add(item)
  return [...set]
}
