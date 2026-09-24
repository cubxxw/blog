/**
 * shared.mjs — small helpers shared by both custom element entries.
 * No global state: everything operates on the instance root passed in.
 */

import { formatErrors, validateSpec } from './spec-schema.mjs';

/** Read and parse the server-embedded config payload (validated after). */
export function readConfig(root) {
  const script = root.querySelector('script[data-ib-config]');
  if (!script) throw new Error('interactive: missing embedded config');
  return JSON.parse(script.textContent);
}

/** Locale tag for the fixed UI dictionary, from the page language. */
export function uiLang(config) {
  return config.lang === 'zh' ? 'zh' : 'en';
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Per-instance listener/timer bookkeeping. `abort()` releases every listener
 * and pending timer; `timeout()` timers are tracked so removal mid-playback
 * leaves nothing running.
 */
export class Binder {
  constructor() {
    this.ac = typeof AbortController === 'function' ? new AbortController() : null;
    this.timers = new Set();
  }

  listen(target, type, handler, options) {
    target.addEventListener(type, handler, {
      ...options,
      signal: this.ac ? this.ac.signal : undefined,
    });
  }

  timeout(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  cancel(id) {
    if (id == null) return;
    clearTimeout(id);
    this.timers.delete(id);
  }

  clearTimers() {
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
  }

  abort() {
    this.clearTimers();
    if (this.ac) this.ac.abort();
    this.ac = new AbortController(); // rebindable after reconnect
  }
}

/**
 * Debounced polite live-region announcement. Each new announcement cancels
 * the pending one on the same element, so rapid slider movement settles into
 * ONE announcement instead of a burst of stale values. Callers also cancel
 * via Binder.abort()/cancel() on switch, reset and detach.
 */
export function announce(binder, element, text, delay = 300) {
  if (!element) return;
  binder.cancel(element._ibAnnounceTimer);
  element._ibAnnounceTimer = binder.timeout(() => {
    element._ibAnnounceTimer = null;
    element.textContent = text;
  }, delay);
}

/** Cancel a pending announcement and clear the live region (switch/reset). */
export function silence(binder, element) {
  if (!element) return;
  binder.cancel(element._ibAnnounceTimer);
  element._ibAnnounceTimer = null;
  element.textContent = '';
}

export function show(element, visible) {
  if (!element) return;
  if (visible) element.removeAttribute('hidden');
  else element.setAttribute('hidden', '');
}

/**
 * Validate an embedded config with the ONE executable schema
 * (spec-schema.mjs — the same module the build-time gate uses; no second
 * divergent validator). Throws with the schema's file/field errors on any
 * problem, including corrupt runtime values (zero step, negative events,
 * unknown version, invalid locales, malformed scenarios…).
 */
export function loadSpec(config, kind) {
  if (!config || typeof config !== 'object' || !config.spec) {
    throw new Error('interactive: missing embedded config payload');
  }
  // Envelope contract: exactly the supported locale identifiers. An
  // unsupported or missing lang would silently mix languages — reject before
  // any DOM mutation so the trusted static view stays intact.
  if (config.lang !== 'zh' && config.lang !== 'en') {
    throw new Error(`interactive: unsupported config.lang ${JSON.stringify(config.lang)}`);
  }
  if (typeof config.id !== 'string' || !config.id) {
    throw new Error('interactive: missing instance id in config');
  }
  const { ok, errors } = validateSpec(config.spec, { file: 'embedded-config' });
  if (!ok) {
    throw new Error(`interactive: invalid config (${formatErrors(errors)})`);
  }
  if (config.spec.kind !== kind) {
    throw new Error(`interactive: kind "${config.spec.kind}" does not match element ${kind}`);
  }
  return config.spec;
}
