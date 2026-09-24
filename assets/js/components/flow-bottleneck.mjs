/**
 * flow-bottleneck.mjs — <blog-flow-bottleneck> (geometry expansion).
 *
 * Native autonomous custom element, Light DOM. The server-rendered pipeline
 * (default scenario's exact tick-0 state, same spec data) is the fallback;
 * this module swaps the interactive control row into a same-sized
 * visibility:hidden slot row (zero layout shift on upgrade) and repaints the
 * pipeline, queue squares, throughput-vs-WIP chart and numeric tick log with
 * the pure functions in flow-bottleneck-model.mjs. The read-only <details>
 * reference is never touched, and both SVGs are decorative — every value is
 * duplicated in the numeric readout and the tick log beside them.
 *
 * Reader-driven only: the simulation starts still at tick 0 and advances one
 * bounded tick at a time (manual button or manual play/pause; play stops
 * terminally at model.maxTicks and on hidden/offscreen pages, and is disabled
 * under prefers-reduced-motion — manual stepping stays). State is per-instance
 * browser memory — no storage, no network. Enhancement is all-or-nothing and
 * every failure restores the trusted SSR snapshot.
 */

import { validateWith } from './spec-core.mjs';
import { validateFlowBottleneck } from './flow-bottleneck-model.mjs';
import {
  canTick,
  chartScale,
  clampCapacity,
  explainKey,
  initialState,
  step,
} from './flow-bottleneck-model.mjs';
import { findScenario, defaultScenario } from './model.mjs';
import {
  Binder,
  announce,
  loadSpec,
  prefersReducedMotion,
  readConfig,
  show,
  silence,
  uiLang,
} from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

const STAGES = ['generate', 'review', 'delivery'];
const PLAY_TICK_MS = 900;
const SVG_NS = 'http://www.w3.org/2000/svg';
// Chart geometry (viewBox 0 0 320 110), mirrored by the SSR partial.
const CHART = { x0: 30, x1: 312, yBase: 88, yTop: 8 };

class BlogFlowBottleneck extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
    this._playing = false;
    this._playTimer = null;
    this._io = null;
    this._mql = null;
    this._mqlHandler = null;
  }

  connectedCallback() {
    if (this._ready) {
      // Reconnect: rebind listeners AND the MediaQueryList observer, stay
      // paused, refresh the reduced-motion preference and repaint. A render
      // failure on RECONNECT falls back exactly like setup does (restore SSR,
      // hide dead controls) instead of escaping the callback.
      try {
        this._reduced = prefersReducedMotion();
        this._bind();
        this._observe();
        this._pause();
        this._paintReducedMotion();
        this._paint();
      } catch (err) {
        this._fallback(err);
      }
      return;
    }
    try {
      this._setup();
    } catch (err) {
      this._fallback(err);
    }
  }

  disconnectedCallback() {
    this._binder.abort(); // releases listeners + pending play/announce timers
    this._bound = false;
    this._playing = false;
    this._playTimer = null;
    this._mql = null;
    this._mqlHandler = null;
    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }
  }

  /* ── init (throws on any problem → static fallback) ─────────────────── */

  _setup() {
    this._config = readConfig(this);
    this._spec = loadSpec(this._config, 'flow-bottleneck',
      (raw, options) => validateWith(raw, ['flow-bottleneck'], validateFlowBottleneck, options));
    this._copy = this._spec.copy[uiLang(this._config)];

    this._stage = this.querySelector('[data-ib-stage]');
    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    this._ctrlSlot = this.querySelector('[data-ib-ctrl-slot]');
    this._controls = this.querySelector('[data-ib-controls]');
    this._tickBtn = this.querySelector('[data-ib-tick]');
    this._playBtn = this.querySelector('[data-ib-play]');
    this._live = this.querySelector('[data-ib-live]');
    this._explain = this.querySelector('[data-ib-explain]');
    this._log = this.querySelector('[data-ib-log]');
    this._chart = {
      line: new Map(),
      marks: this.querySelector('[data-ib-chart-marks]'),
      max: this.querySelector('[data-ib-chart-max]'),
    };
    for (const el of this.querySelectorAll('[data-ib-chart-line]')) {
      this._chart.line.set(el.getAttribute('data-ib-chart-line'), el);
    }
    if (
      !this._stage || !this._scnStatic || !this._scenarioRow || !this._resetBtn ||
      !this._ctrlSlot || !this._controls || !this._tickBtn || !this._playBtn ||
      !this._explain || !this._log || !this._chart.marks || !this._chart.max ||
      this._chart.line.size < 2
    ) {
      throw new Error('interactive: missing flow chrome');
    }

    this._vals = new Map();
    for (const el of this.querySelectorAll('[data-ib-val]')) {
      this._vals.set(el.getAttribute('data-ib-val'), el);
    }
    this._caps = new Map();
    for (const input of this.querySelectorAll('[data-ib-cap]')) {
      this._caps.set(input.getAttribute('data-ib-cap'), input);
    }
    this._queues = new Map();
    this._mores = new Map();
    for (const el of this.querySelectorAll('[data-ib-queue]')) {
      this._queues.set(el.getAttribute('data-ib-queue'), el);
    }
    for (const el of this.querySelectorAll('[data-ib-more]')) {
      this._mores.set(el.getAttribute('data-ib-more'), el);
    }
    for (const stage of STAGES) {
      if (!this._queues.has(stage) || !this._caps.has(stage)) {
        throw new Error(`interactive: missing stage binding ${stage}`);
      }
    }

    const def = defaultScenario(this._spec);
    if (!def) throw new Error('interactive: missing default scenario');
    this._activeId = def.id;
    this._capValues = {
      generate: clampCapacity(def.capacity.generate, this._spec.model),
      review: clampCapacity(def.capacity.review, this._spec.model),
      delivery: clampCapacity(def.capacity.delivery, this._spec.model),
    };
    this._sim = initialState(def);
    this._reduced = prefersReducedMotion();

    // Trusted SSR snapshot of the stage — captured ONCE before the first
    // runtime mutation. Update failures restore exact clones of it (no
    // untrusted innerHTML). The <details> reference is never touched.
    if (!this._ssr) this._ssr = { stage: this._stage.cloneNode(true) };

    this._bind();
    this._observe();
    this._labelChrome();
    this._paint();

    // First render succeeded — only now swap the interactive controls into
    // the same-sized static slots (geometry stays identical) and enhance.
    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    show(this._ctrlSlot, false);
    show(this._controls, true);
    this._paintReducedMotion();
    this.setAttribute('data-enhanced', 'flow-bottleneck');
    this._ready = true;
    this._bound = true;
  }

  _bind() {
    if (this._bound) return;
    this._binder.abort();

    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      this._binder.listen(button, 'click', () => {
        try {
          this._activate(button.getAttribute('data-ib-scenario'));
          announce(this._binder, this._live, this._summary(), 300);
        } catch (err) {
          this._fallback(err);
        }
      });
    }
    this._binder.listen(this._resetBtn, 'click', () => {
      try {
        this._reset();
      } catch (err) {
        this._fallback(err);
      }
    });
    this._binder.listen(this._tickBtn, 'click', () => {
      try {
        this._pause();
        this._advance();
      } catch (err) {
        this._fallback(err);
      }
    });
    this._binder.listen(this._playBtn, 'click', () => {
      try {
        if (this._playing) this._pause();
        else this._play();
      } catch (err) {
        this._fallback(err);
      }
    });
    for (const [stage, input] of this._caps) {
      this._binder.listen(input, 'input', () => {
        try {
          const value = Number.parseFloat(input.value);
          this._capValues[stage] = clampCapacity(
            Number.isFinite(value) ? value : this._capValues[stage],
            this._spec.model
          );
          this._paint(stage);
          announce(this._binder, this._live, this._summary(), 300);
        } catch (err) {
          this._fallback(err);
        }
      });
      this._binder.listen(input, 'change', () => {
        try {
          const value = Number.parseFloat(input.value);
          this._capValues[stage] = clampCapacity(
            Number.isFinite(value) ? value : this._capValues[stage],
            this._spec.model
          );
          this._paint();
          announce(this._binder, this._live, this._summary(), 300);
        } catch (err) {
          this._fallback(err);
        }
      });
    }
    this._binder.listen(document, 'visibilitychange', () => {
      if (document.hidden) this._pause();
    });
    this._bound = true;
  }

  _observe() {
    // Offscreen pauses; returning to view does NOT auto-resume.
    if (!this._io && typeof IntersectionObserver === 'function') {
      this._io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) this._pause();
        }
      });
      this._io.observe(this);
    }
    // Observe prefers-reduced-motion live — created on EVERY connect so a
    // remove/re-insert cycle keeps receiving change events. Switching the
    // preference on stops playback immediately and disables play, keeping
    // manual ticking.
    if (!this._mql && typeof window !== 'undefined' && window.matchMedia) {
      this._mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._mqlHandler = () => {
        this._reduced = this._mql.matches;
        if (this._reduced) this._pause();
        this._paintReducedMotion();
      };
      this._binder.listen(this._mql, 'change', this._mqlHandler);
    }
  }

  _labelChrome() {
    const lang = uiLang(this._config);
    this._resetBtn.textContent = uiLabel(lang, 'reset');
    this._resetBtn.setAttribute('aria-label', uiLabel(lang, 'resetAria'));
    this._playBtn.textContent = uiLabel(lang, 'play');
    this._playBtn.setAttribute('aria-label', uiLabel(lang, 'playAria'));
  }

  _paintReducedMotion() {
    // prefers-reduced-motion: no play; manual ticking stays.
    if (this._playBtn) this._playBtn.disabled = Boolean(this._reduced) || !canTick(this._sim, this._spec.model);
  }

  _paintPlayButton() {
    const lang = uiLang(this._config);
    const key = this._playing ? 'pause' : 'play';
    this._playBtn.textContent = uiLabel(lang, key);
    this._playBtn.setAttribute('aria-label', uiLabel(lang, `${key}Aria`));
  }

  /* ── bounded, reader-driven ticks ───────────────────────────────────── */

  _advance() {
    if (!canTick(this._sim, this._spec.model)) return;
    this._sim = step(this._sim, this._capValues, this._spec.model);
    try {
      this._paint();
    } catch (err) {
      this._fallback(err);
      return;
    }
    announce(this._binder, this._live, this._summary(), 0);
  }

  _play() {
    if (this._reduced || !canTick(this._sim, this._spec.model)) return;
    this._playing = true;
    this._paintPlayButton();
    this._schedule();
  }

  _schedule() {
    this._binder.cancel(this._playTimer);
    this._playTimer = this._binder.timeout(() => {
      this._playTimer = null;
      if (!this._playing) return;
      if (!canTick(this._sim, this._spec.model)) {
        this._pause();
        return;
      }
      this._advance();
      if (!canTick(this._sim, this._spec.model)) {
        // Terminal pause in the same cycle as the last allowed tick: no
        // trailing playback timer survives.
        this._pause();
        return;
      }
      this._schedule();
    }, PLAY_TICK_MS);
  }

  _pause() {
    this._playing = false;
    this._binder.cancel(this._playTimer);
    this._playTimer = null;
    if (this._playBtn) this._paintPlayButton();
  }

  /* ── state → view ───────────────────────────────────────────────────── */

  _activate(id) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._pause(); // switching always stops running timers
    this._activeId = id;
    this._capValues = {
      generate: clampCapacity(scenario.capacity.generate, this._spec.model),
      review: clampCapacity(scenario.capacity.review, this._spec.model),
      delivery: clampCapacity(scenario.capacity.delivery, this._spec.model),
    };
    this._sim = initialState(scenario);
    silence(this._binder, this._live);
    this._paint();
  }

  _reset() {
    this._pause(); // reset stops running timers
    this._activate(this._spec.defaultScenario);
  }

  _paint(skipStage) {
    const model = this._spec.model;
    const q = this._sim.queue;
    const last = this._sim.last;

    this._vals.get('tick').textContent = String(this._sim.tick);
    this._vals.get('demand').textContent = String(model.demand);
    for (const stage of STAGES) {
      this._vals.get(`queue-${stage}`).textContent = String(q[stage]);
      this._vals.get(`capacity-${stage}`).textContent = String(this._capValues[stage]);
    }
    this._vals.get('wip').textContent = String(this._sim.history[this._sim.history.length - 1].wip);
    this._vals.get('admitted').textContent = String(this._sim.admitted);
    this._vals.get('delivered').textContent = String(this._sim.delivered);
    this._vals.get('throughput').textContent = String(last.delivery);
    this._explain.textContent = this._copy.explanations[explainKey(this._capValues, model.demand)];

    // Capacity fields track the committed state. Free typing is preserved only
    // for the field named by `skipStage` (the live input event stream); every
    // other paint — including 'change' — shows the bounded state.
    for (const stage of STAGES) {
      if (stage === skipStage) continue;
      const input = this._caps.get(stage);
      const shown = String(this._capValues[stage]);
      if (input.value !== shown) input.value = shown;
    }

    // Queue squares: one square per job (max 8) + "+N" for the rest.
    for (const stage of STAGES) {
      const group = this._queues.get(stage);
      while (group.firstChild) group.removeChild(group.firstChild);
      const visible = Math.min(8, q[stage]);
      for (let i = 0; i < visible; i += 1) {
        const rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('class', 'ib-flow-job');
        rect.setAttribute('x', String(11 + (i % 4) * 18 + STAGES.indexOf(stage) * 107 + 6));
        rect.setAttribute('y', String(54 + Math.floor(i / 4) * 22));
        rect.setAttribute('width', '13');
        rect.setAttribute('height', '13');
        rect.setAttribute('rx', '2.5');
        group.appendChild(rect);
      }
      const more = this._mores.get(stage);
      if (q[stage] > 8) {
        const text = more || document.createElementNS(SVG_NS, 'text');
        text.setAttribute('class', 'ib-flow-more');
        text.setAttribute('x', String(53 + STAGES.indexOf(stage) * 107));
        text.setAttribute('y', '105');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = `+${q[stage] - 8}`;
        if (!more) {
          this._queues.get(stage).parentNode.appendChild(text);
          this._mores.set(stage, text);
        }
      } else if (more) {
        more.remove();
        this._mores.delete(stage);
      }
    }

    // Throughput-vs-WIP chart + its numeric twin (the tick log).
    const yMax = chartScale(this._sim.history);
    this._chart.max.textContent = String(yMax);
    const xOf = (tick) =>
      CHART.x0 + (tick / Math.max(1, model.maxTicks)) * (CHART.x1 - CHART.x0);
    const yOf = (value) =>
      CHART.yBase - (Math.min(value, yMax) / Math.max(1, yMax)) * (CHART.yBase - CHART.yTop);
    this._chart.line
      .get('wip')
      .setAttribute(
        'points',
        this._sim.history.map((row) => `${xOf(row.tick).toFixed(2)},${yOf(row.wip).toFixed(2)}`).join(' ')
      );
    this._chart.line
      .get('throughput')
      .setAttribute(
        'points',
        this._sim.history
          .map((row) => `${xOf(row.tick).toFixed(2)},${yOf(row.throughput).toFixed(2)}`)
          .join(' ')
      );
    const marks = this._chart.marks;
    while (marks.firstChild) marks.removeChild(marks.firstChild);
    for (const row of this._sim.history) {
      for (const [series, value] of [
        ['wip', row.wip],
        ['throughput', row.throughput],
      ]) {
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('class', `ib-flow-mark ib-flow-series--${series}`);
        dot.setAttribute('cx', xOf(row.tick).toFixed(2));
        dot.setAttribute('cy', yOf(value).toFixed(2));
        dot.setAttribute('r', '2.6');
        marks.appendChild(dot);
      }
    }

    while (this._log.firstChild) this._log.removeChild(this._log.firstChild);
    for (const row of this._sim.history) {
      const tr = document.createElement('tr');
      for (const value of [row.tick, row.wip, row.throughput]) {
        const td = document.createElement('td');
        td.textContent = String(value);
        tr.appendChild(td);
      }
      this._log.appendChild(tr);
    }

    const done = !canTick(this._sim, model);
    this._tickBtn.disabled = done;
    this._paintReducedMotion();
    this._paintPlayButton();

    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._activeId)
      );
    }
  }

  _summary() {
    const c = this._copy.metrics;
    const wip = this._sim.history[this._sim.history.length - 1].wip;
    return (
      `${c.tick} ${this._sim.tick} · ${c.wip} ${wip} · ` +
      `${c.delivered} ${this._sim.delivered} · ${c.throughput} ${this._sim.last.delivery}`
    );
  }

  /* ── failure handling: stop enhancing, restore the static view ──────── */

  _fallback(err) {
    try {
      console.warn('blog-flow-bottleneck: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    this._playing = false;
    this._binder.cancel(this._playTimer);
    this._playTimer = null;
    this._binder.abort();
    this._bound = false;
    this._ready = false;
    this._mql = null;
    this._mqlHandler = null;
    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }
    this.removeAttribute('data-enhanced');
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
    show(this._ctrlSlot, true);
    show(this._controls, false);
    if (this._live) this._live.textContent = '';
    // Restore the trusted server-rendered stage from the untouched SSR
    // snapshot (a partially repainted pipeline would mix two states).
    // cloneNode only — never untrusted innerHTML. The <details> reference is
    // left exactly as the reader has it.
    try {
      if (this._ssr && this._stage) {
        this._stage.replaceWith(this._ssr.stage.cloneNode(true));
        this._stage = this.querySelector('[data-ib-stage]');
        this._explain = this.querySelector('[data-ib-explain]');
        this._log = this.querySelector('[data-ib-log]');
        this._vals = new Map();
        for (const el of this.querySelectorAll('[data-ib-val]')) {
          this._vals.set(el.getAttribute('data-ib-val'), el);
        }
        this._queues = new Map();
        this._mores = new Map();
        for (const el of this.querySelectorAll('[data-ib-queue]')) {
          this._queues.set(el.getAttribute('data-ib-queue'), el);
        }
        for (const el of this.querySelectorAll('[data-ib-more]')) {
          this._mores.set(el.getAttribute('data-ib-more'), el);
        }
        this._chart = {
          line: new Map(),
          marks: this.querySelector('[data-ib-chart-marks]'),
      max: this.querySelector('[data-ib-chart-max]'),
        };
        for (const el of this.querySelectorAll('[data-ib-chart-line]')) {
          this._chart.line.set(el.getAttribute('data-ib-chart-line'), el);
        }
      }
      const def = this._spec ? defaultScenario(this._spec) : null;
      if (def) {
        this._activeId = def.id;
        this._capValues = {
          generate: clampCapacity(def.capacity.generate, this._spec.model),
          review: clampCapacity(def.capacity.review, this._spec.model),
          delivery: clampCapacity(def.capacity.delivery, this._spec.model),
        };
        this._sim = initialState(def);
      }
    } catch {
      // Leave whatever static DOM exists readable; never blank the figure.
    }
  }
}

if (!customElements.get('blog-flow-bottleneck')) {
  customElements.define('blog-flow-bottleneck', BlogFlowBottleneck);
}
