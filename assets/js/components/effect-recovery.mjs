/**
 * effect-recovery.mjs — <blog-effect-recovery> (group: effects).
 *
 * Native autonomous custom element, Light DOM. The server-rendered stage
 * (default scenario × its default crash window / recovery discipline, same
 * spec data) is the fallback; this module swaps the two native radio groups
 * into same-sized visibility:hidden slots (zero layout shift) and repaints
 * the swimlane timeline plus the three readouts with the pure functions in
 * effect-recovery-model.mjs. One scenario is current at a time; switching
 * restores that scenario's default crash/strategy (no memory of the reader's
 * last choice). The read-only <details> reference is never touched.
 *
 * State is per-instance browser memory — no storage, no network. Enhancement
 * is all-or-nothing: `data-enhanced` is set and controls swapped in only
 * after config validation (the same executable schema the build gate uses),
 * event binding and the first render succeed. Any failure restores the
 * complete static view and never affects another instance.
 */

import { validateWith } from './spec-core.mjs';
import { validateEffectRecovery } from './effect-recovery-model.mjs';
import {
  computeEffect,
  findScenario,
  timelineStates,
} from './effect-recovery-model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

const STATE_CLASS = {
  done: 'is-done',
  repeated: 'is-repeated',
  recovered: 'is-recovered',
  skipped: 'is-skipped',
};

class BlogEffectRecovery extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
    this._activeId = null;
    this._selection = { crash: null, strategy: null };
  }

  connectedCallback() {
    try {
      if (this._ready) {
        this._bind();
        this._paint();
        return;
      }
      this._setup();
    } catch (err) {
      this._fallback(err);
    }
  }

  disconnectedCallback() {
    // Release listeners and pending timers (announcements included); keep
    // this instance's state so reconnecting works.
    this._binder.abort();
    this._bound = false;
  }

  /* ── init (throws on any problem → static fallback) ─────────────────── */

  _setup() {
    this._config = readConfig(this);
    this._spec = loadSpec(this._config, 'effect-recovery',
      (raw, options) => validateWith(raw, ['effect-recovery'], validateEffectRecovery, options));
    this._copy = this._spec.copy[uiLang(this._config)];

    this._stage = this.querySelector('[data-ib-stage]');
    this._selectionText = this.querySelector('[data-ib-selection]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._ctrlSlot = this.querySelector('[data-ib-ctrl-slot]');
    this._crashGroup = this.querySelector('[data-ib-crash-group]');
    this._strategyGroup = this.querySelector('[data-ib-strategy-group]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    this._live = this.querySelector('[data-ib-live]');
    this._actions = this.querySelector('[data-ib-actions]');
    this._knowledge = this.querySelector('[data-ib-knowledge]');
    this._next = this.querySelector('[data-ib-next]');
    this._explain = this.querySelector('[data-ib-explain]');
    this._count = this.querySelector('[data-ib-count]');
    this._steps = new Map();
    for (const el of this.querySelectorAll('[data-ib-step]')) {
      const key = el.getAttribute('data-ib-step');
      if (this._steps.has(key)) throw new Error(`interactive: duplicate step ${key}`);
      this._steps.set(key, el);
    }
    if (
      !this._stage ||
      !this._selectionText ||
      !this._scenarioRow ||
      !this._scnStatic ||
      !this._ctrlSlot ||
      !this._crashGroup ||
      !this._strategyGroup ||
      !this._headSlot ||
      !this._resetBtn ||
      !this._actions ||
      !this._knowledge ||
      !this._next ||
      !this._explain ||
      !this._count ||
      this._steps.size < 7
    ) {
      throw new Error('interactive: incomplete effect-recovery chrome');
    }
    this._crashInputs = [...this.querySelectorAll('[data-ib-crash]')];
    this._strategyInputs = [...this.querySelectorAll('[data-ib-strategy]')];
    if (this._crashInputs.length !== 3 || this._strategyInputs.length !== 3) {
      throw new Error('interactive: incomplete control set');
    }

    // Trusted SSR snapshot for the failure path (stage only — the reference
    // details is never touched at all).
    this._ssrStage = this._stage.cloneNode(true);

    // One current scenario (defaultScenario — what SSR shows); switching
    // restores that scenario's default crash/strategy values.
    const def = findScenario(this._spec, this._spec.defaultScenario);
    this._activeId = def.id;
    this._selection = { crash: def.defaultCrash, strategy: def.defaultStrategy };

    this._bind();
    this._labelChrome();
    this._paint();

    // First render succeeded — only now swap the interactive controls into
    // the same-sized static slots (geometry stays identical) and enhance.
    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._ctrlSlot, false);
    show(this._crashGroup, true);
    show(this._strategyGroup, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    this.setAttribute('data-enhanced', 'effect-recovery');
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
          this._announce();
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
    for (const input of this._crashInputs) {
      this._binder.listen(input, 'change', () => {
        try {
          if (!input.checked) return;
          this._selection.crash = input.value;
          this._paint();
          this._announce();
        } catch (err) {
          this._fallback(err);
        }
      });
    }
    for (const input of this._strategyInputs) {
      this._binder.listen(input, 'change', () => {
        try {
          if (!input.checked) return;
          this._selection.strategy = input.value;
          this._paint();
          this._announce();
        } catch (err) {
          this._fallback(err);
        }
      });
    }
    this._bound = true;
  }

  _labelChrome() {
    const lang = uiLang(this._config);
    this._resetBtn.textContent = uiLabel(lang, 'reset');
    this._resetBtn.setAttribute('aria-label', uiLabel(lang, 'resetAria'));
  }

  /* ── state → view (pure computation from effect-recovery-model.mjs) ─── */

  _scenario() {
    const scenario = findScenario(this._spec, this._activeId);
    if (!scenario) throw new Error(`interactive: unknown scenario ${this._activeId}`);
    return scenario;
  }

  _paint() {
    const scenario = this._scenario();
    const { model } = this._spec;
    const result = computeEffect(model, scenario, this._selection.crash, this._selection.strategy);
    const states = timelineStates(model, scenario, this._selection.crash, this._selection.strategy);
    for (const [index, step] of states.entries()) {
      const el = this._steps.get(step.key);
      if (!el) throw new Error(`interactive: missing step chip ${step.key}`);
      for (const cls of [...Object.values(STATE_CLASS), 'is-crash']) el.classList.remove(cls);
      el.classList.add(STATE_CLASS[step.state] || STATE_CLASS.skipped);
      // The crash window is a separate visual axis: it stays identifiable on
      // top of the execution state and moves with the crash-point control.
      el.classList.toggle('is-crash', Boolean(step.crash));
      el.classList.toggle('is-hazard', Boolean(step.hazard));
      el.style.gridRow = String(index + 1);
      el.parentElement.append(el); // Keep reading order aligned with the visible timeline.
    }
    this._selectionText.textContent = this._selectionSummary();
    this._count.textContent = `×${result.actions}`;
    this._actions.textContent = String(result.actions);
    this._knowledge.textContent = this._copy.knowledge[result.knowledge];
    this._next.textContent = this._copy.next[result.next];
    this._explain.textContent = this._copy.explanations[result.explain];
    for (const input of this._crashInputs) input.checked = input.value === this._selection.crash;
    for (const input of this._strategyInputs) input.checked = input.value === this._selection.strategy;
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._activeId)
      );
    }
  }

  _selectionSummary() {
    const c = this._copy;
    return `${c.table.scenario}: ${c.scenarioLabels[this._activeId]} · ${c.crashLabel}: ${c.crashOptions[this._selection.crash]} · ${c.strategyLabel}: ${c.strategyOptions[this._selection.strategy]}`;
  }

  _summary() {
    const c = this._copy.readout;
    return (
      `${c.actions} ${this._actions.textContent} · ${c.knowledge} ${this._knowledge.textContent} · ` +
      `${c.next} ${this._next.textContent}`
    );
  }

  _announce() {
    announce(this._binder, this._live, this._summary(), 300);
  }

  /** Exactly one current scenario: switching restores ITS default selection. */
  _activate(id) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._activeId = id;
    this._selection = { crash: scenario.defaultCrash, strategy: scenario.defaultStrategy };
    silence(this._binder, this._live);
    this._paint();
  }

  /** Reset: defaultScenario and its defaults; no memory of the last choice. */
  _reset() {
    const def = findScenario(this._spec, this._spec.defaultScenario);
    this._activeId = def.id;
    this._selection = { crash: def.defaultCrash, strategy: def.defaultStrategy };
    silence(this._binder, this._live);
    this._paint();
  }

  /* ── failure handling: stop enhancing, restore the static view ──────── */

  _fallback(err) {
    try {
      console.warn('blog-effect-recovery: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    this._binder.abort();
    this._bound = false;
    this._ready = false;
    this.removeAttribute('data-enhanced');
    // Safe at every partial-initialisation point: guards on all handles.
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._ctrlSlot, true);
    show(this._crashGroup, false);
    show(this._strategyGroup, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
    silence(this._binder, this._live);
    try {
      if (this._stage && this._ssrStage) {
        // Fully restore the trusted SSR stage (readout, timeline, explanation).
        this._stage.replaceChildren(...[...this._ssrStage.cloneNode(true).childNodes]);
      }
    } catch {
      for (const el of this.querySelectorAll('[data-ib-crash],[data-ib-strategy]')) {
        el.setAttribute('hidden', '');
      }
    }
  }
}

if (!customElements.get('blog-effect-recovery')) {
  customElements.define('blog-effect-recovery', BlogEffectRecovery);
}
