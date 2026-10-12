export interface FrozenRouteTracker {
  /** Number of tracked callbacks currently in flight. */
  readonly activeCount: number;
  /**
   * Wrap a handler so its whole invocation (sync throw or async settle) is
   * tracked. Arguments, return value, and errors pass through unchanged, so
   * original handler errors still reach the original caller (the Playwright
   * route machinery and thus the test runner).
   */
  track<T extends (...args: any[]) => any>(fn: T): T;
  /**
   * Wait until no tracked callback is active, looping to include callbacks
   * admitted while draining, then invoke `remove` exactly once. The empty
   * observation and the `remove()` call happen in one synchronous stretch:
   * no await runs between them, so no callback can be admitted in between.
   * Callback errors are not swallowed here (they propagate through `track`);
   * errors from `remove` itself propagate unchanged.
   */
  drainAndRemove<T>(remove: () => T | PromiseLike<T>): Promise<Awaited<T>>;
}

export function createFrozenRouteTracker(): FrozenRouteTracker;
