/**
 * context-budget.mjs — <blog-context-budget> (issue #389).
 *
 * Native autonomous custom element, Light DOM. The server-rendered current
 * result stage (default scenario, same spec data) is the fallback; this
 * module swaps interactive controls into same-sized visibility:hidden slots
 * (zero layout shift on upgrade) and repaints numbers with the pure functions
 * in model.mjs. One scenario is current at a time: initial state and Reset
 * focus defaultScenario; switching restores the selected scenario's initial
 * values. The read-only <details> reference is never touched.
 *
 * State is per-instance browser memory — no storage, no network. Enhancement
 * is all-or-nothing: `data-enhanced` is set and controls swapped in only
 * after config validation (the same executable schema the build gate uses),
 * event binding and the first render succeed. Any failure — including corrupt
 * embedded config — restores the complete static view; failure is safe at
 * every initialisation point and never affects another instance.
 */

import {
  clampToolValue,
  computeBudget,
  defaultScenario,
  explainKey,
  findScenario,
} from './model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

class BlogContextBudget extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
    this._panels = null;
    this._values = null;
    this._activeId = null;
  }

  connectedCallback() {
    if (this._ready) {
      // Reconnect: rebind once (never double-bind), keep this DOM instance's
      // valid data, and repaint so no stale control state survives removal.
      this._bind();
      this._renderAll();
      return;
    }
    try {
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
    this._spec = loadSpec(this._config, 'context-budget');
    this._copy = this._spec.copy[uiLang(this._config)];
    this._panels = new Map();

    for (const panelEl of this.querySelectorAll('[data-ib-panel]')) {
      const id = panelEl.getAttribute('data-ib-panel');
      const scenario = findScenario(this._spec, id);
      if (!scenario || this._panels.has(id)) throw new Error(`interactive: bad panel ${id}`);
      const panel = {
        el: panelEl,
        scenario,
        barSegs: new Map(),
        overbar: panelEl.querySelector('[data-ib-overbar]'),
        overflowItem: panelEl.querySelector('[data-ib-overflow-item]'),
        segValues: panelEl.querySelectorAll('[data-ib-seg-value]'),
        metrics: panelEl.querySelectorAll('[data-ib-metric]'),
        explain: panelEl.querySelector('[data-ib-explain]'),
        range: panelEl.querySelector('[data-ib-range]'),
        rangeSlot: panelEl.querySelector('[data-ib-range-slot]'),
        rangeOut: panelEl.querySelector('[data-ib-range-out]'),
        live: panelEl.querySelector('[data-ib-live]'),
      };
      for (const seg of panelEl.querySelectorAll('[data-ib-seg]')) {
        panel.barSegs.set(seg.getAttribute('data-ib-seg'), seg);
      }
      if (
        !panel.overbar ||
        !panel.explain ||
        !panel.range ||
        !panel.rangeSlot ||
        !panel.rangeOut ||
        panel.barSegs.size < 4
      ) {
        throw new Error(`interactive: incomplete panel ${id}`);
      }
      this._panels.set(id, panel);
    }
    if (this._panels.size !== this._spec.scenarios.length) {
      throw new Error('interactive: panel/scenario mismatch');
    }

    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    if (!this._scenarioRow || !this._resetBtn || !this._scnStatic) {
      throw new Error('interactive: missing chrome');
    }

    // One current scenario (defaultScenario — what SSR shows); switching
    // restores that scenario's initial values (no memory of the last visit).
    this._values = new Map(this._spec.scenarios.map((s) => [s.id, s.tools]));
    this._activeId = defaultScenario(this._spec).id;

    this._bind();
    this._labelChrome();
    this._renderAll();

    // First render succeeded — only now swap the interactive controls into
    // the same-sized static slots (geometry stays identical) and enhance.
    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    for (const [, panel] of this._panels) {
      show(panel.rangeSlot, false);
      show(panel.range, true);
    }
    this.setAttribute('data-enhanced', 'context-budget');
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
    for (const [id, panel] of this._panels) {
      this._binder.listen(panel.range, 'input', () => {
        try {
          const value = clampToolValue(Number.parseFloat(panel.range.value), this._spec.model);
          panel.range.value = String(value);
          this._values.set(id, value);
          this._paintPanel(id);
          announce(this._binder, panel.live, this._summary(this._budget(id)), 300);
        } catch (err) {
          this._fallback(err);
        }
      });
    }
    this._bound = true;
  }

  _labelChrome() {
    // Fixed button copy comes from the component's bilingual dictionary and is
    // applied before anything is unhidden.
    const lang = uiLang(this._config);
    this._resetBtn.textContent = uiLabel(lang, 'reset');
    this._resetBtn.setAttribute('aria-label', uiLabel(lang, 'resetAria'));
  }

  /* ── state → view (pure computation from model.mjs) ─────────────────── */

  _budget(id) {
    const scenario = findScenario(this._spec, id);
    return computeBudget(this._spec.model, {
      history: scenario.history,
      tools: this._values.get(id),
    });
  }

  _renderAll() {
    for (const id of this._panels.keys()) this._paintPanel(id);
    this._paintScenarioButtons();
  }

  _paintPanel(id) {
    const panel = this._panels.get(id);
    const budget = this._budget(id);
    const cap = this._spec.model.capacity;
    const pct = (value) => `${Math.min(100, (value / cap) * 100)}%`;
    panel.barSegs.get('system').style.width = pct(budget.system);
    panel.barSegs.get('history').style.width = pct(budget.history);
    panel.barSegs.get('tools').style.width = pct(budget.tools);
    panel.barSegs.get('remaining').style.width = pct(budget.remaining);
    panel.overbar.style.width = pct(budget.overflow);
    show(panel.overbar, budget.overflow > 0);
    show(panel.overflowItem, budget.overflow > 0);
    for (const el of panel.segValues) {
      el.textContent = String(budget[el.getAttribute('data-ib-seg-value')]);
    }
    for (const el of panel.metrics) {
      el.textContent = String(budget[el.getAttribute('data-ib-metric')]);
    }
    panel.explain.textContent = this._copy.explanations[explainKey(budget)];
    panel.rangeOut.textContent = String(budget.tools);
    if (panel.range.value !== String(budget.tools)) panel.range.value = String(budget.tools);
    // Static-slot mirror (used when the fallback re-shows the slot).
    const thumb = panel.rangeSlot.querySelector('.ib-range-slot-thumb');
    if (thumb) {
      const m = this._spec.model;
      const span = m.toolMax - m.toolMin;
      thumb.style.left = span > 0 ? `${((budget.tools - m.toolMin) / span) * 100}%` : '0%';
    }
  }

  _paintScenarioButtons() {
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._activeId)
      );
    }
  }

  _summary(budget) {
    const c = this._copy.metrics;
    const unit = this._copy.unitLabel;
    return (
      `${c.used} ${budget.used} ${unit} · ${c.remaining} ${budget.remaining} ${unit} · ` +
      `${c.overflow} ${budget.overflow} ${unit}`
    );
  }

  /** Exactly one current scenario: show its stage, hide the others. */
  _activate(id) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    // Switching restores the selected scenario's initial values.
    this._values.set(id, scenario.tools);
    this._activeId = id;
    for (const [panelId, panel] of this._panels) {
      show(panel.el, panelId === id);
      silence(this._binder, panel.live);
    }
    this._paintPanel(id);
    this._paintScenarioButtons();
  }

  /** Reset: defaultScenario and its values; no memory of the last choice. */
  _reset() {
    for (const scenario of this._spec.scenarios) {
      this._values.set(scenario.id, scenario.tools);
    }
    this._activeId = this._spec.defaultScenario;
    for (const [panelId, panel] of this._panels) {
      show(panel.el, panelId === this._activeId);
      silence(this._binder, panel.live);
    }
    this._renderAll();
  }

  /* ── failure handling: stop enhancing, restore the static view ──────── */

  _fallback(err) {
    try {
      console.warn('blog-context-budget: enhancement disabled', err);
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
    show(this._headSlot, true);
    show(this._resetBtn, false);
    try {
      const defId = this._spec ? this._spec.defaultScenario : null;
      let first = true;
      for (const [id, panel] of this._panels || []) {
        // SSR semantics: the default scenario's stage stays visible, the
        // others stay hidden; the details reference is always complete.
        show(panel.el, id === defId || (defId === null && first));
        first = false;
        show(panel.rangeSlot, true);
        show(panel.range, false);
        silence(this._binder, panel.live);
        this._values.set(id, panel.scenario.tools);
        this._paintPanel(id);
      }
    } catch {
      // Last resort: leave no focusable-but-dead control behind; the SSR
      // stage and the read-only reference stay fully readable.
      for (const el of this.querySelectorAll('[data-ib-range]')) el.setAttribute('hidden', '');
      for (const el of this.querySelectorAll('[data-ib-scenarios]')) el.setAttribute('hidden', '');
      for (const el of this.querySelectorAll('[data-ib-range-slot]')) el.removeAttribute('hidden');
    }
  }
}

if (!customElements.get('blog-context-budget')) {
  customElements.define('blog-context-budget', BlogContextBudget);
}
