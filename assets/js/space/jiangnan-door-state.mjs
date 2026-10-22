import { jiangnanLook } from './jiangnan-state.mjs';

// The rear-door architecture, in metres. The opening sits offset to the right
// of the south wall so the ordinary room keeps its calm, uninterrupted panes.
export const JIANGNAN_DOOR = Object.freeze({
  wall: Object.freeze({ minX: -3.325, maxX: 3.325, height: 2.85, z: 2.09, depth: .18 }),
  opening: Object.freeze({ centerX: 1.8, minX: 1.34, maxX: 2.26, top: 2.12 }),
  skirting: Object.freeze({ minX: -3.16, maxX: 3.16, height: .17, z: 1.96, depth: .07 }),
  landing: Object.freeze({ minX: 1.18, maxX: 2.42, z: 2.18, depth: .46, topY: .012 }),
  waterY: -.55
});

// A complete excursion walks this ring exactly once. Escape recovery enters
// 'returning' from anywhere; a scene switch aborts straight back to 'indoor'.
export const JIANGNAN_DOOR_PHASES = Object.freeze(['indoor', 'approaching', 'opening', 'threshold', 'falling', 'submerged', 'returning', 'indoor']);
export const JIANGNAN_DOOR_TRANSITIONS = Object.freeze({
  indoor: Object.freeze(['approaching']),
  approaching: Object.freeze(['opening']),
  opening: Object.freeze(['threshold']),
  threshold: Object.freeze(['falling', 'returning']),
  falling: Object.freeze(['submerged', 'returning']),
  submerged: Object.freeze(['returning']),
  returning: Object.freeze(['indoor'])
});

// Deliberate camera targets for the excursion. The water pose sits just above
// the quiet surface so the warm doorway and the splash rings share the frame.
const DOOR_POSE_ANCHORS = Object.freeze({
  rear: Object.freeze([[1.06, 1.42, .78], [1.8, 1.24, 2.09], 52]),
  threshold: Object.freeze([[1.58, 1.34, 1.66], [1.82, 1.02, 3.4], 56]),
  water: Object.freeze([[1.84, -.30, 2.92], [1.78, .98, 2.16], 60])
});
export function jiangnanDoorPoses(aspect = 1.6) {
  const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.6;
  const widen = fov => Math.min(74, +(fov + Math.max(0, 1.2 - Math.min(safe, 1.2)) * 22).toFixed(3));
  return Object.fromEntries(Object.entries(DOOR_POSE_ANCHORS).map(([key, [position, target, fov]]) => [key, jiangnanLook(position, target, widen(fov))]));
}

// The tokenized excursion controller. Every awaited step holds a run token and
// re-checks it before touching the room, so a recovery, abort or dispose can
// interrupt any transition — including one already in flight — without leaving
// a stale callback, timer or promise behind.
export function createJiangnanDoorExcursion({ onPhase = () => {}, still: isStill = () => false,
  now = () => performance.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  // Generation is never reused. Idle is a separate active-run value: an old
  // camera promise must not become current when the door opens a second time.
  let phase = 'indoor', generation = 0, activeRun = 0, disposed = false, still = Boolean(isStill()), paused = false;
  const waits = new Set();
  const valid = run => !disposed && run !== 0 && run === activeRun;
  const finishWait = (wait, result) => {
    if (!waits.delete(wait)) return;
    if (wait.timer !== null) clearTimer(wait.timer);
    wait.resolve(result);
  };
  const settleWaits = () => {
    for (const wait of [...waits]) finishWait(wait, false);
  };
  const schedule = wait => {
    if (paused) return;
    wait.started = now();
    wait.timer = setTimer(() => finishWait(wait, valid(wait.run)), still ? 0 : wait.remaining);
  };
  const publish = (next, run) => {
    phase = next;
    if (!disposed) onPhase(next, { token: run, still });
  };
  return {
    get phase() { return phase; },
    get token() { return generation; },
    get activeRun() { return activeRun; },
    get still() { return still; },
    get paused() { return paused; },
    get disposed() { return disposed; },
    // Quiet or reduced-motion can change at any moment. It only changes how the
    // room moves; it must never strand a run or invalidate its token.
    setStill(value) {
      still = Boolean(value);
      // Changing this preference mid-beat completes it immediately, except
      // while hidden. A hidden room stays on exactly the same story beat.
      if (still && !paused) for (const wait of [...waits]) finishWait(wait, valid(wait.run));
      return still;
    },
    setPaused(value) {
      const next = Boolean(value);
      if (next === paused || disposed) return paused;
      paused = next;
      for (const wait of waits) {
        if (paused) {
          if (wait.timer !== null) {
            clearTimer(wait.timer);
            wait.remaining = Math.max(0, wait.remaining - Math.max(0, now() - wait.started));
            wait.timer = null;
          }
        } else schedule(wait);
      }
      return paused;
    },
    snapshot() { return { phase, token: generation, activeRun, still, paused, disposed }; },
    begin() {
      if (disposed || phase !== 'indoor') return 0;
      const run = activeRun = ++generation;
      publish('approaching', run);
      return run;
    },
    advance(run, next) {
      if (!valid(run)) return false;
      if (!JIANGNAN_DOOR_TRANSITIONS[phase]?.includes(next)) return false;
      if (next === 'indoor') { activeRun = 0; settleWaits(); publish('indoor', run); return true; }
      publish(next, run);
      return true;
    },
    check: valid,
    // A beat of the narrative. Reduced/quiet keeps the story but skips the wait.
    wait(run, ms = 0) {
      if (!valid(run)) return Promise.resolve(false);
      const delay = still ? 0 : Math.max(0, Number.isFinite(ms) ? ms : 0);
      return new Promise(resolve => {
        const wait = { resolve, run, timer: null, remaining: delay, started: 0 };
        waits.add(wait);
        schedule(wait);
      });
    },
    // Escape (or any safe recovery) always wins: it invalidates the current run,
    // settles its pending beats and re-enters 'returning' with a fresh token.
    recover() {
      if (disposed || phase === 'indoor') return 0;
      settleWaits();
      const run = activeRun = ++generation;
      publish('returning', run);
      return run;
    },
    // A scene switch leaves immediately: no beats, no return travel.
    abort() {
      if (disposed || phase === 'indoor') return false;
      settleWaits();
      ++generation; activeRun = 0;
      publish('indoor', generation);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      settleWaits();
      ++generation; activeRun = 0;
      phase = 'indoor';
    }
  };
}
