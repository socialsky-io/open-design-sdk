export async function sequence<Item, Result>(
  items: Array<Item>,
  handleItem: (item: Item) => Promise<Result>
): Promise<Array<Result>> {
  return items.reduce(
    async (prevResultsPromise: Promise<Array<Result>>, item: Item) => {
      return [...(await prevResultsPromise), await handleItem(item)]
    },
    Promise.resolve([])
  )
}

export async function mapFind<Item, Result>(
  items: Iterable<Item>,
  mapItem: (item: Item) => Result | Promise<Result | null> | null
): Promise<Result | null> {
  for (const item of items) {
    const result = await mapItem(item)
    if (result != null) {
      return result
    }
  }

  return null
}
