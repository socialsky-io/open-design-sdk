export function createQueue<Args extends Array<unknown>, Result>(
  fn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  let prevQueue: Promise<Result> | null = null

  return (...args) => {
    const nextQueue = extendQueue(prevQueue, () => fn(...args))
    prevQueue = nextQueue
    return nextQueue
  }
}

async function extendQueue<Result>(
  prevQueue: Promise<Result> | null,
  fn: () => Promise<Result>
): Promise<Result> {
  try {
    await prevQueue
  } catch (err) {}

  return fn()
}
