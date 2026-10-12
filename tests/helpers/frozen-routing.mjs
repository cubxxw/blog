// Active-callback completion tracker for frozen browser route handlers.
//
// Pure JS with no Playwright imports so it can be unit-tested with controlled
// promises (scripts/frozen-routing.test.mjs) and reused by any route handler.
//
// Why this exists (CI4905): Playwright 1.63's `context.unrouteAll({ behavior:
// 'wait' })` clears the client `_routes` array before it waits for in-flight
// handler invocations. Once `_routes` is empty, a sibling route callback that
// completes during the wait re-sends empty interception patterns to the
// server (`_onRoute` tail: `if (!this._routes.length) _updateInterceptionPatterns`),
// and the server auto-continues routes that are still pending. A handler that
// is mid `route.fetch()` then fails at `route.fulfill()` with
// "Route is already handled!".
//
// Fix contract:
// - `track(fn)` covers the ENTIRE handler lifetime (local continue, external
//   fulfill, canonical fetch AND fulfill): the invocation is active from the
//   synchronous call until the wrapped promise settles.
// - `drainAndRemove(remove)` keeps handlers registered until every callback
//   has finished. It loops so callbacks admitted while draining are awaited,
//   and the empty observation and the `remove()` call happen in one
//   synchronous stretch (no await between them), so no callback can be
//   admitted after the observation and before removal.
// - Errors are never caught and ignored: a tracked callback that throws or
//   rejects rethrows/rejects with the original error to its original caller
//   (the Playwright route machinery, which reports it to the test runner).
//   `drainAndRemove` never swallows or duplicates callback errors; errors
//   thrown by `remove` itself propagate unchanged.

/**
 * @typedef {object} FrozenRouteTracker
 * @property {<T extends (...args: any[]) => any>(fn: T) => T} track
 *   Wrap a handler so its whole invocation (sync throw or async settle) is
 *   tracked. Arguments, return value, and errors pass through unchanged.
 * @property {(remove: () => any) => Promise<any>} drainAndRemove
 *   Wait until no tracked callback is active, looping to include callbacks
 *   admitted while draining, then invoke `remove` exactly once with no await
 *   between the empty observation and the invocation. Resolves/rejects with
 *   `remove`'s own result/error.
 * @property {number} activeCount
 *   Number of tracked callbacks currently in flight.
 */

/** @returns {FrozenRouteTracker} */
export function createFrozenRouteTracker() {
  let active = 0;
  /** @type {Set<() => void>} */
  const idleWaiters = new Set();

  const settleIdle = () => {
    if (active !== 0) return;
    const waiters = [...idleWaiters];
    idleWaiters.clear();
    for (const waiter of waiters) waiter();
  };

  const whenIdle = () =>
    new Promise((resolve) => {
      if (active === 0) {
        resolve();
        return;
      }
      idleWaiters.add(resolve);
    });

  const track = (fn) => {
    if (typeof fn !== "function")
      throw new TypeError("frozen-routing: track requires a function");
    return function tracked(...args) {
      active += 1;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        active -= 1;
        settleIdle();
      };
      let result;
      try {
        result = fn.apply(this, args);
      } catch (error) {
        finish();
        throw error;
      }
      if (result && typeof result.then === "function")
        return result.then(
          (value) => {
            finish();
            return value;
          },
          (error) => {
            finish();
            throw error;
          },
        );
      finish();
      return result;
    };
  };

  const drainAndRemove = async (remove) => {
    if (typeof remove !== "function")
      throw new TypeError("frozen-routing: drainAndRemove requires a remove function");
    for (;;) {
      await whenIdle();
      // Re-observe synchronously after waiting: callbacks may have been
      // admitted while we drained. On empty, invoke remove() in the same
      // synchronous stretch (no await between observation and removal) so
      // nothing can start in between and race the removal.
      if (active === 0) return remove();
    }
  };

  return {
    track,
    drainAndRemove,
    get activeCount() {
      return active;
    },
  };
}
