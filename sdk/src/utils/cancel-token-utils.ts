import cancelTokenSource, { CancelToken } from '@avocode/cancel-token'

/**
 * Creates a cancellation token which can be used for aborting asynchronous operations of the SDK.
 *
 * Most asynchronous methods accept a cancellation token (the returned `token`). The same cancellation token can be used for multiple sequential as well as parallel operations. Finished operations no longer react to cancellations.
 *
 * This mechanism is analogous to the standard `AbortSignal`/`AbortController` API with the difference that a cancellation reason can be specified. The created tokens are also somehow compatible with the standard API by exposing the standard `AbortSignal` as `token.signal`, just as it is possible to create a `CancelToken` from an `AbortSignal` via `createCancelToken.fromSignal()`.
 *
 * @example
 * ```typescript
 * const controller = createCancelToken()
 *
 * sdk.fetchDesignById('<ID>', { cancelToken: controller.token })
 *   .then((design) => {
 *     doStuffWithDesign(design)
 *     controller.dispose()
 *   })
 *   .catch((err) => {
 *     if (err.code !== 'OperationCancelled') { throw err }
 *   })
 *
 * setTimeout(() => {
 *   controller.cancel('Timed out.')
 * }, 2000)
 * ```
 */
export const createCancelToken: {
  (): {
    /** The newly created cancellation token. */
    token: CancelToken

    /**
     * A function which cancels the token and operations listening to the token.
     *
     * When the function is called, the token is marked as cancelled and the operations (with pending promises) observing the token end with a promise rejection. The promise is rejected with the `reason` specified here.
     *
     * The conventional is the error object should have the `code` of `OperationCancelled`. When no reason is specified, the token throws an error with `code` of `OperationCancelled`. The same happens when a string reason is provided; the string is used as the message of the error instead of the default "Operation Cancelled" message. A custom error object should be only used when there is proper error handling aware of such errors set up.
     *
     * @example
     * ```typescript
     * cancel() // Error { code: 'OperationCancelled', message: 'Operation Cancelled' }
     * cancel('<MESSAGE>') // Error { code: 'OperationCancelled', message: '<MESSAGE>' }
     * cancel(new Error('<MESSAGE>')) // Error { message: '<MESSAGE>' }
     * ```
     */
    cancel: (reason?: Error | string) => void

    /**
     * A function which clears listeners of all operations listening to the token. The function should be called when the token is no longer useful to ensure garbage collection.
     *
     * The SDK is clearing all registered cancellation listeners automatically so the `dispose()` function may be used for clear of mind and in situations when the token is also used for cancelling other (custom) logic.
     */
    dispose: () => void
  }

  /**
   * A cancellation token which never gets cancelled.
   *
   * This token can be used for logic simplification in place of actual working tokens as a default (i.e. `cancelToken || null` to avoid the need for `token?.throwIfCancelled()`).
   */
  empty: CancelToken

  /**
   * Wraps an existing standard `AbortSignal` in a new cancellation token which can be used with the SDK.
   *
   * @example
   * ```typescript
   * const abortController = new AbortController()
   * const cancelController = createCancelToken.fromSignal(abortController.signal)
   *
   * sdk.fetchDesignById('<ID>', { cancelToken: cancelController.token })
   *   .then((design) => {
   *     doStuffWithDesign(design)
   *     cancelController.dispose()
   *   })
   *   .catch((err) => {
   *     if (err.code !== 'OperationCancelled') { throw err }
   *   })
   *
   * setTimeout(() => {
   *   abortController.abort()
   * }, 2000)
   * ```
   */
  fromSignal: (
    signal: AbortSignal
  ) => {
    /** The newly created cancellation token. */
    token: CancelToken

    /**
     * A function which clears listeners of all operations listening to the token. The function should be called when the token is no longer useful to ensure garbage collection.
     *
     * The SDK is clearing all registered cancellation listeners automatically so the `dispose()` function may be used for clear of mind and in situations when the token is also used for cancelling other (custom) logic.
     */
    dispose: () => void
  }
} = cancelTokenSource
