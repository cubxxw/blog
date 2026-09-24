/**
 * task-cost.mjs — <blog-task-cost> (numerical explainer: cost per accepted
 * task across two fixed-size task batches/routes).
 *
 * Native autonomous custom element, Light DOM. Both routes of the selected
 * preset stay visible at once — the comparison IS the learning question —
 * while exactly one scenario is current. The server-rendered stage (default
 * scenario, same spec data) is the trusted fallback; number controls swap
 * into same-sized static slots and every amount is repainted from the pure
 * functions in task-cost-model.mjs. The read-only <details> reference is
 * never touched.
 *
 * State is per-instance browser memory — no storage, no network. Enhancement
 * is all-or-nothing after config validation, binding and the first render;
 * ANY failure restores the exact SSR DOM from a pre-enhancement clone
 * (never NaN, never dead controls, siblings untouched).
 */

import { validateWith } from './spec-core.mjs';
import { validateTaskCost } from './task-cost-model.mjs';
import {
  ROUTES,
  ROUTE_FIELDS,
  barScale,
  barWidths,
  compareRoutes,
  computeRoute,
  formatAmount,
  formatPerAccepted,
} from './task-cost-model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

const COST_SEGMENTS = ['modelTool', 'retry', 'review'];

class BlogTaskCost extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
    this._panels = null;
    this._ssrClones = null;
    this._values = null;
    this._activeId = null;
  }

  connectedCallback() {
    try {
      if (this._ready) {
        // Reconnect: rebind once (never double-bind) and repaint. Any
        // failure here — including a render failure — falls back to the
        // trusted SSR instead of throwing into the page.
        this._bind();
        this._renderAll();
        return;
      }
      this._setup();
    } catch (err) {
      this._fallback(err);
    }
  }

  disconnectedCallback() {
    this._binder.abort();
    this._bound = false;
  }

  /* ── init (throws on any problem → exact SSR restore) ───────────────── */

  _setup() {
    this._config = readConfig(this);
    this._spec = loadSpec(this._config, 'task-cost',
      (raw, options) => validateWith(raw, ['task-cost'], validateTaskCost, options));
    this._copy = this._spec.copy[uiLang(this._config)];
    this._panels = new Map();
    this._ssrClones = new Map();

    for (const panelEl of this.querySelectorAll('[data-ib-panel]')) {
      const id = panelEl.getAttribute('data-ib-panel');
      if (this._panels.has(id)) throw new Error(`interactive: duplicate panel ${id}`);
      const panel = { el: panelEl, explain: panelEl.querySelector('[data-ib-explain]'), inputs: new Map(), segVals: new Map(), segs: new Map(), totals: new Map(), pers: new Map(), live: panelEl.querySelector('[data-ib-live]') };
      if (!panel.explain) throw new Error(`interactive: incomplete panel ${id}`);
      for (const input of panelEl.querySelectorAll('[data-ib-num]')) {
        panel.inputs.set(input.getAttribute('data-ib-num'), input);
      }
      for (const el of panelEl.querySelectorAll('[data-ib-seg]')) {
        panel.segs.set(el.getAttribute('data-ib-seg'), el);
      }
      for (const el of panelEl.querySelectorAll('[data-ib-seg-val]')) {
        panel.segVals.set(el.getAttribute('data-ib-seg-val'), el);
      }
      for (const route of ROUTES) {
        panel.totals.set(route, panelEl.querySelector(`[data-ib-total="${route}"]`));
        panel.pers.set(route, panelEl.querySelector(`[data-ib-per="${route}"]`));
      }
      for (const key of [...ROUTES.flatMap((r) => ROUTE_FIELDS.map((f) => `${r}-${f}`))]) {
        if (!panel.inputs.has(key)) throw new Error(`interactive: missing input ${key} in ${id}`);
      }
      for (const key of [...ROUTES.flatMap((r) => COST_SEGMENTS.map((s) => `${r}-${s}`))]) {
        if (!panel.segs.has(key) || !panel.segVals.has(key)) {
          throw new Error(`interactive: missing segment ${key} in ${id}`);
        }
      }
      if (!panel.totals.get('a') || !panel.totals.get('b') || !panel.pers.get('a') || !panel.pers.get('b')) {
        throw new Error(`interactive: incomplete readout ${id}`);
      }
      this._panels.set(id, panel);
      this._ssrClones.set(id, panelEl.cloneNode(true));
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

    this._values = new Map(
      this._spec.scenarios.map((s) => [s.id, { a: { ...s.a }, b: { ...s.b } }])
    );
    this._activeId = this._spec.defaultScenario;

    this._bind();
    this._labelChrome();
    this._renderAll();

    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    for (const [, panel] of this._panels) {
      for (const [key, input] of panel.inputs) {
        show(panel.el.querySelector(`[data-ib-num-slot="${key}"]`), false);
        show(input, true);
      }
    }
    this.setAttribute('data-enhanced', 'task-cost');
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
          announce(this._binder, this._panels.get(this._activeId).live, this._summary(this._activeId), 300);
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
      for (const [key, input] of panel.inputs) {
        const [route, field] = key.split('-');
        this._binder.listen(input, 'input', () => {
          try {
            // Number(), not parseInt(): "1e3" is 1000, not 1. An empty or
            // half-typed field never clobbers state (editing stays usable);
            // derived results repaint without rewriting the input.
            const text = input.value.trim();
            if (text === '') return;
            const value = Number(text);
            if (Number.isFinite(value)) {
              this._values.get(id)[route][field] = value;
              this._paintResults(id);
              announce(this._binder, panel.live, this._summary(id), 300);
            }
          } catch (err) {
            this._fallback(err);
          }
        });
        // Committed change (blur/Enter): canonicalize the model fields to
        // the clamped values computeRoute actually used, then snap the
        // visible field (e.g. accepted 999999 → "50") so display, state and
        // denominator can never disagree.
        this._binder.listen(input, 'change', () => {
          try {
            const text = input.value.trim();
            if (text !== '') {
              const value = Number(text);
              if (Number.isFinite(value)) this._values.get(id)[route][field] = value;
            }
            this._canonicalize(id);
            this._paintPanel(id);
            announce(this._binder, panel.live, this._summary(id), 300);
          } catch (err) {
            this._fallback(err);
          }
        });
      }
    }
    this._bound = true;
  }

  _labelChrome() {
    const lang = uiLang(this._config);
    this._resetBtn.textContent = uiLabel(lang, 'reset');
    this._resetBtn.setAttribute('aria-label', uiLabel(lang, 'resetAria'));
  }

  /* ── state → view (pure computation from the model) ─────────────────── */

  _results(id) {
    const state = this._values.get(id);
    const a = computeRoute(this._spec.model.batchSize, state.a);
    const b = computeRoute(this._spec.model.batchSize, state.b);
    return { a, b };
  }

  _renderAll() {
    for (const id of this._panels.keys()) this._paintPanel(id);
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-ib-scenario') === this._activeId));
    }
  }

  _paintPanel(id) {
    this._paintResults(id);
    this._syncInputs(id);
  }

  /**
   * Write the clamped model fields computeRoute used back into state, so
   * the denominator, the results and the visible inputs always agree.
   */
  _canonicalize(id) {
    const state = this._values.get(id);
    for (const route of ROUTES) {
      const result = computeRoute(this._spec.model.batchSize, state[route]);
      for (const field of ROUTE_FIELDS) {
        state[route][field] = result[field];
      }
    }
  }

  /** Number fields mirror the canonical clamped state (snap after commit). */
  _syncInputs(id) {
    const panel = this._panels.get(id);
    const state = this._values.get(id);
    for (const [key, input] of panel.inputs) {
      const [route, field] = key.split('-');
      const shown = String(state[route][field]);
      if (input.value !== shown) input.value = shown;
    }
  }

  /** Derived readouts only — safe to call mid-edit without touching inputs. */
  _paintResults(id) {
    const panel = this._panels.get(id);
    const { a, b } = this._results(id);
    const scale = barScale(a, b);
    for (const route of ROUTES) {
      const result = route === 'a' ? a : b;
      const widths = barWidths(result, scale);
      const amounts = {
        modelTool: result.modelToolCost,
        retry: result.retryCost,
        review: result.reviewCost,
      };
      for (const seg of COST_SEGMENTS) {
        panel.segs.get(`${route}-${seg}`).style.width = `${widths[seg]}%`;
        panel.segVals.get(`${route}-${seg}`).textContent = formatAmount(amounts[seg]);
      }
      panel.totals.get(route).textContent = formatAmount(result.total);
      const per = formatPerAccepted(result);
      panel.pers.get(route).textContent = per === null ? '—' : per;
    }
    panel.explain.textContent = this._copy.explanations[compareRoutes(a, b)];
  }

  _summary(id) {
    const { a, b } = this._results(id);
    const c = this._copy.costLabels;
    const line = (route, result) => {
      const per = formatPerAccepted(result);
      return `${this._copy.routes[route]} ${c.total} ${formatAmount(result.total)} · ${c.perAccepted} ${per === null ? '—' : per}`;
    };
    return `${line('a', a)} · ${line('b', b)}`;
  }

  _activate(id) {
    const scenario = this._spec.scenarios.find((s) => s.id === id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    // Switching restores the selected scenario's initial values.
    this._values.set(id, { a: { ...scenario.a }, b: { ...scenario.b } });
    this._activeId = id;
    for (const [panelId, panel] of this._panels) {
      show(panel.el, panelId === id);
      silence(this._binder, panel.live);
    }
    this._paintPanel(id);
    this._renderAll();
  }

  _reset() {
    for (const scenario of this._spec.scenarios) {
      this._values.set(scenario.id, { a: { ...scenario.a }, b: { ...scenario.b } });
    }
    this._activeId = this._spec.defaultScenario;
    for (const [panelId, panel] of this._panels) {
      show(panel.el, panelId === this._activeId);
      silence(this._binder, panel.live);
    }
    this._renderAll();
  }

  /* ── failure handling: restore the exact SSR DOM ────────────────────── */

  _fallback(err) {
    try {
      console.warn('blog-task-cost: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    this._binder.abort();
    this._bound = false;
    this._ready = false;
    this.removeAttribute('data-enhanced');

    try {
      const defId = this._spec ? this._spec.defaultScenario : null;
      for (const [id, panel] of this._panels || []) {
        const clone = this._ssrClones && this._ssrClones.get(id);
        if (clone) {
          panel.el.replaceChildren(
            ...Array.from(clone.childNodes, (node) => node.cloneNode(true))
          );
        }
        show(panel.el, id === defId);
      }
    } catch {
      for (const el of this.querySelectorAll('[data-ib-num]')) el.setAttribute('hidden', '');
      for (const el of this.querySelectorAll('[data-ib-num-slot]')) el.removeAttribute('hidden');
    }
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
  }
}

if (!customElements.get('blog-task-cost')) {
  customElements.define('blog-task-cost', BlogTaskCost);
}
