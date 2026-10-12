import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrozenRouteTracker } from '../tests/helpers/frozen-routing.mjs';

// Deterministic teardown-race coverage for the reusable tracker actually used
// by tests/helpers/frozen-site.ts. Every scenario drives the tracker with
// controlled promises: no sleeps, no reruns, no timing guesses.
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
// Flush all pending microtasks deterministically before asserting that a
// teardown did NOT happen early.
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('slow canonical completion blocks teardown', async () => {
  const tracker = createFrozenRouteTracker();
  const canonical = deferred();
  const removals = [];
  const wrapped = tracker.track(async () => {
    await canonical.promise; // canonical route.fetch
    return 'fulfilled'; // canonical route.fulfill
  });
  const invocation = wrapped();
  const drain = tracker.drainAndRemove(async () => {
    removals.push(tracker.activeCount);
    return 'unrouted';
  });
  await tick();
  assert.equal(removals.length, 0, 'teardown must block on the slow canonical fetch->fulfill');
  assert.equal(tracker.activeCount, 1);
  canonical.resolve();
  assert.equal(await invocation, 'fulfilled', 'return values pass through unchanged');
  assert.equal(await drain, 'unrouted', 'drainAndRemove forwards remove() results');
  assert.deepEqual(removals, [0], 'removal runs exactly once, only after quiescence');
});

test('fast sibling cannot tear down early', async () => {
  const tracker = createFrozenRouteTracker();
  const canonical = deferred();
  const sibling = deferred();
  const removals = [];
  const remove = async () => { removals.push(tracker.activeCount); };
  const canonicalRun = tracker.track(async () => { await canonical.promise; })();
  const siblingRun = tracker.track(async () => { await sibling.promise; })();
  const drain = tracker.drainAndRemove(remove);
  sibling.resolve();
  await siblingRun;
  await tick();
  assert.equal(removals.length, 0, 'a fast sibling finishing must not tear down while the canonical callback is mid fetch->fulfill');
  assert.equal(tracker.activeCount, 1);
  canonical.resolve();
  await canonicalRun;
  await drain;
  assert.deepEqual(removals, [0]);
});

test('newcomer during drain is awaited', async () => {
  // Newcomer admitted while the drain is already running on an empty tracker:
  // the drain must re-observe in a loop instead of tearing down early.
  {
    const tracker = createFrozenRouteTracker();
    const newcomer = deferred();
    const removals = [];
    const drain = tracker.drainAndRemove(async () => { removals.push(tracker.activeCount); });
    const run = tracker.track(async () => { await newcomer.promise; })();
    await tick();
    assert.equal(removals.length, 0, 'a newcomer admitted during the drain must keep teardown waiting');
    assert.equal(tracker.activeCount, 1);
    newcomer.resolve();
    await run;
    await drain;
    assert.deepEqual(removals, [0]);
  }
  // Newcomer admitted while another callback is still active: draining must
  // loop and wait for it too.
  {
    const tracker = createFrozenRouteTracker();
    const slow = deferred();
    const newcomer = deferred();
    const removals = [];
    const slowRun = tracker.track(async () => { await slow.promise; })();
    const drain = tracker.drainAndRemove(async () => { removals.push(tracker.activeCount); });
    const newcomerRun = tracker.track(async () => { await newcomer.promise; })();
    slow.resolve();
    await slowRun;
    await tick();
    assert.equal(removals.length, 0, 'teardown must wait for the newcomer admitted during the drain');
    newcomer.resolve();
    await newcomerRun;
    await drain;
    assert.deepEqual(removals, [0]);
  }
});

test('exceptions propagate', async () => {
  const tracker = createFrozenRouteTracker();
  const boom = new Error('route.fulfill: Route is already handled!');
  // Async rejection reaches the original caller with the original error.
  const rejecting = tracker.track(async () => { throw boom; });
  await assert.rejects(rejecting(), (error) => error === boom);
  // Synchronous throws propagate unchanged as well.
  const throwing = tracker.track(() => { throw boom; });
  assert.throws(() => throwing(), (error) => error === boom);
  assert.equal(tracker.activeCount, 0, 'failures still release their tracking slots');
  // A failed callback must not wedge or silence teardown: drain completes and
  // invokes removal exactly once, without swallowing or duplicating the error.
  const removals = [];
  await tracker.drainAndRemove(async () => { removals.push(tracker.activeCount); });
  assert.deepEqual(removals, [0]);
  // Errors from the removal step itself propagate unchanged.
  const removeFailure = new Error('context.unrouteAll failed');
  await assert.rejects(
    tracker.drainAndRemove(() => { throw removeFailure; }),
    (error) => error === removeFailure,
  );
  await assert.rejects(
    tracker.drainAndRemove(async () => { throw removeFailure; }),
    (error) => error === removeFailure,
  );
});

test('empty/quiescence invokes removal exactly once', async () => {
  const tracker = createFrozenRouteTracker();
  const removals = [];
  const remove = async () => { removals.push(tracker.activeCount); };
  await tracker.drainAndRemove(remove);
  assert.deepEqual(removals, [0], 'an empty tracker removes exactly once');
  // Quiescence after settled callbacks still removes exactly once.
  const gate = deferred();
  const run = tracker.track(async () => { await gate.promise; })();
  gate.resolve();
  await run;
  await tracker.drainAndRemove(remove);
  assert.deepEqual(removals, [0, 0], 'each drain invokes removal exactly once and never while active');
});

test('track validates arguments and passes values through untouched', async () => {
  const tracker = createFrozenRouteTracker();
  assert.throws(() => tracker.track(42), TypeError);
  await assert.rejects(tracker.drainAndRemove('nope'), TypeError);
  const wrapped = tracker.track((a, b) => a + b);
  assert.equal(wrapped(2, 3), 5, 'synchronous handlers keep their return values');
  assert.equal(tracker.activeCount, 0);
});
