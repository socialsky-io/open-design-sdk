export function enumerablizeWithPrototypeGetters(
  instance: Object,
  options: {
    enumerableOwnKeys?: Array<string>
    omittedPrototypeKeys?: Array<string>
  } = {}
) {
  const { enumerableOwnKeys = [], omittedPrototypeKeys = [] } = options

  const ownKeys = Object.getOwnPropertyNames(instance)
  ownKeys.forEach((key) => {
    const desc = Object.getOwnPropertyDescriptor(instance, key)
    if (!desc || desc.configurable === false) {
      return
    }

    Object.defineProperty(instance, key, {
      ...desc,
      enumerable: enumerableOwnKeys.indexOf(key) !== -1,
    })
  })

  const proto = Object.getPrototypeOf(instance)
  if (!proto) {
    return
  }

  const protoKeys = Object.getOwnPropertyNames(proto)
  protoKeys.forEach((key) => {
    const desc = Object.getOwnPropertyDescriptor(proto, key)
    if (!desc || desc.configurable === false) {
      return
    }

    const enumerable =
      Boolean(desc.get) && omittedPrototypeKeys.indexOf(key) === -1

    Object.defineProperty(instance, key, {
      ...desc,
      enumerable,
    })
  })
}
