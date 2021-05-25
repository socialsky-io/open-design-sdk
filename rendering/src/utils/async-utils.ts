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
