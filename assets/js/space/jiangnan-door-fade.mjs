export const JIANGNAN_DOOR_FADE_SECONDS = .48;

// Match the former CSS `ease`: cubic-bezier(.25, .1, .25, 1). Its x
// coordinate is time, so solve x before reading y rather than treating the
// bezier parameter as elapsed time. Exact endpoints also remove residual mist.
function ease(progress) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const bezier = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  let low = 0, high = 1;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2;
    if (bezier(middle, .25, .25) < progress) low = middle; else high = middle;
  }
  return bezier((low + high) / 2, .1, 1);
}

// The world owns the only frame loop. Ordinary frames present the ease curve.
// An optional DOM-only deadline also completes it if GPU backpressure stalls
// rAF; it never advances the world. Paused time belongs to neither clock.
export function createJiangnanDoorFade({ duration = JIANGNAN_DOOR_FADE_SECONDS, still = () => false, onChange = () => {},
  now = () => performance.now() / 1000, setTimer = null, clearTimer = clearTimeout } = {}) {
  const span = Number.isFinite(duration) && duration > 0 ? duration : JIANGNAN_DOOR_FADE_SECONDS;
  let value = 0, from = 0, target = 0, elapsed = 0, changedAt = null, active = true, disposed = false;
  let timer = null, deadlineStarted = null, remaining = span, generation = 0;
  const clearDeadline = (preserve = false) => {
    if (preserve && deadlineStarted !== null) remaining = Math.max(0, remaining - Math.max(0, now() - deadlineStarted));
    if (timer !== null) clearTimer(timer);
    timer = null; deadlineStarted = null; generation++;
  };
  const present = next => {
    if (next === value) return false;
    value = next; onChange(value); return true;
  };
  const settle = () => {
    clearDeadline();
    from = target; elapsed = 0; changedAt = null;
    return present(target);
  };
  const armDeadline = () => {
    clearDeadline();
    if (!setTimer || disposed || !active || value === target) return;
    const run = generation, expected = target;
    deadlineStarted = now();
    timer = setTimer(() => {
      if (run !== generation || disposed || !active || target !== expected) return;
      remaining = Math.max(0, remaining - Math.max(0, now() - deadlineStarted));
      timer = null; deadlineStarted = null;
      if (remaining > 1e-9) armDeadline(); else settle();
    }, remaining * 1000);
  };
  return {
    get value() { return value; },
    get target() { return target; },
    get pending() { return !disposed && value !== target; },
    setActive(value, { at } = {}) {
      const next = Boolean(value);
      if (disposed || next === active) return active;
      active = next;
      if (active) armDeadline(); else clearDeadline(true);
      // The world may keep rendering a camera flight behind a dialog. Resume
      // this fade's clock at the actual unblock event, without resetting the
      // camera, resident or shared frame clock.
      if (active) changedAt = Number.isFinite(at) ? at : null;
      return active;
    },
    setPhase(phase, { instant = false, at } = {}) {
      if (disposed) return value;
      const next = phase === 'submerged' ? 1 : 0;
      if (instant || still()) { target = next; settle(); return value; }
      if (next === target) return value;
      from = value; target = next; elapsed = 0;
      changedAt = Number.isFinite(at) ? at : null;
      remaining = span; armDeadline();
      return value;
    },
    update(seconds, { active: frameActive = true, at } = {}) {
      if (disposed) return false;
      if (still()) return settle();
      if (!active || !frameActive || !Number.isFinite(seconds) || seconds <= 0 || value === target) return false;
      // A phase can change between two world frames. Do not charge it for the
      // earlier part of that frame, before its target was actually requested.
      const timed = changedAt !== null && Number.isFinite(at);
      const step = timed ? Math.min(seconds, Math.max(0, at - changedAt)) : seconds;
      if (!timed || at >= changedAt) changedAt = null;
      elapsed = Math.min(span, elapsed + step);
      if (elapsed >= span) return settle();
      return present(from + (target - from) * ease(elapsed / span));
    },
    dispose() {
      if (disposed) return;
      target = 0; settle(); active = false; disposed = true;
    }
  };
}
