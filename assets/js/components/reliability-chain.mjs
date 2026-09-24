/**
 * reliability-chain.mjs — <blog-reliability-chain> (numerical explainer:
 * compounding error over independent mandatory steps, with an optional
 * checkpoint mode of one retry per detected segment failure).
 *
 * Native autonomous custom element, Light DOM. The server-rendered stage
 * (default scenario, same spec data) is the trusted fallback; controls swap
 * into same-sized visibility:hidden slots and every number is repainted from
 * the pure functions in reliability-chain-model.mjs. The read-only
 * <details> reference and the checkpoint <details> disclosure are never
 * toggled by the runtime.
 *
 * State is per-instance browser memory — no storage, no network. Enhancement
 * is all-or-nothing after config validation, binding and the first render;
 * ANY failure restores the exact SSR DOM from a pre-enhancement clone and
 * hides every control (never NaN, never dead controls, siblings untouched).
 */

import { validateWith } from './spec-core.mjs';
import { validateReliabilityChain } from './reliability-chain-model.mjs';
import {
  computeChain,
  curvePoints,
  explainKey,
  formatExpression,
  formatNumber,
  formatPermille,
  formatPlan,
  formatRate,
} from './reliability-chain-model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

/* Curve geometry (SVG viewBox 0 0 320 150, fixed reference scale). */
const CURVE = { x0: 36, x1: 310, y0: 10, y1: 124 };

class BlogReliabilityChain extends HTMLElement {
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
    this._spec = loadSpec(this._config, 'reliability-chain',
      (raw, options) => validateWith(raw, ['reliability-chain'], validateReliabilityChain, options));
    this._copy = this._spec.copy[uiLang(this._config)];
    this._panels = new Map();
    this._ssrClones = new Map();

    for (const panelEl of this.querySelectorAll('[data-ib-panel]')) {
      const id = panelEl.getAttribute('data-ib-panel');
      if (this._panels.has(id)) throw new Error(`interactive: duplicate panel ${id}`);
      const panel = {
        el: panelEl,
        expr: panelEl.querySelector('[data-ib-expr]'),
        plain: panelEl.querySelector('[data-ib-plain]'),
        explain: panelEl.querySelector('[data-ib-explain]'),
        curveLine: panelEl.querySelector('[data-ib-curve-line]'),
        curveDot: panelEl.querySelector('[data-ib-curve-dot]'),
        cp: panelEl.querySelector('[data-ib-cp]'),
        cseg: panelEl.querySelector('[data-ib-cseg]'),
        att: panelEl.querySelector('[data-ib-att]'),
        segs: panelEl.querySelector('[data-ib-segs]'),
        step: panelEl.querySelector('[data-ib-step-range]'),
        steps: panelEl.querySelector('[data-ib-steps-range]'),
        recall: panelEl.querySelector('[data-ib-recall-range]'),
        stepOut: panelEl.querySelector('[data-ib-step-out]'),
        stepsOut: panelEl.querySelector('[data-ib-steps-out]'),
        recallOut: panelEl.querySelector('[data-ib-recall-out]'),
        live: panelEl.querySelector('[data-ib-live]'),
      };
      if (
        !panel.expr ||
        !panel.plain ||
        !panel.explain ||
        !panel.curveLine ||
        !panel.curveDot ||
        !panel.cp ||
        !panel.cseg ||
        !panel.att ||
        !panel.segs ||
        !panel.step ||
        !panel.steps ||
        !panel.recall ||
        !panel.stepOut ||
        !panel.stepsOut ||
        !panel.recallOut
      ) {
        throw new Error(`interactive: incomplete panel ${id}`);
      }
      this._panels.set(id, panel);
      // Pre-enhancement snapshot: the exact SSR DOM of this panel, restored
      // verbatim on any later failure.
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
      this._spec.scenarios.map((s) => [
        s.id,
        { stepPermille: s.stepPermille, steps: s.steps, recallPermille: s.recallPermille },
      ])
    );
    this._activeId = this._spec.defaultScenario;

    this._bind();
    this._labelChrome();
    this._renderAll();

    // First render succeeded — swap controls into the same-sized slots.
    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    for (const [, panel] of this._panels) {
      for (const key of ['step', 'steps', 'recall']) {
        show(panel.el.querySelector(`[data-ib-${key}-slot]`), false);
        show(panel[key], true);
      }
    }
    this.setAttribute('data-enhanced', 'reliability-chain');
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
      // Sliders work in DISPLAY units (percent for probabilities); state
      // stays integer per-mille so every computation is finite and exact.
      const bind = (input, fn) => {
        this._binder.listen(input, 'input', () => {
          try {
            const state = this._values.get(id);
            fn(state, Number.parseFloat(input.value));
            this._paintPanel(id);
            announce(this._binder, panel.live, this._summary(id), 300);
          } catch (err) {
            this._fallback(err);
          }
        });
      };
      bind(panel.step, (state, v) => {
        state.stepPermille = Math.round(v * 10);
      });
      bind(panel.steps, (state, v) => {
        state.steps = v;
      });
      bind(panel.recall, (state, v) => {
        state.recallPermille = Math.round(v * 10);
      });
    }
    this._bound = true;
  }

  _labelChrome() {
    const lang = uiLang(this._config);
    this._resetBtn.textContent = uiLabel(lang, 'reset');
    this._resetBtn.setAttribute('aria-label', uiLabel(lang, 'resetAria'));
  }

  /* ── state → view (pure computation from the model) ─────────────────── */

  _chain(id) {
    const model = this._spec.model;
    return computeChain(model, this._values.get(id));
  }

  _renderAll() {
    for (const id of this._panels.keys()) this._paintPanel(id);
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-ib-scenario') === this._activeId));
    }
  }

  _paintPanel(id) {
    const panel = this._panels.get(id);
    const model = this._spec.model;
    const chain = this._chain(id);

    panel.expr.textContent = formatExpression(chain.stepPermille, chain.steps, chain.plain);
    panel.plain.textContent = formatRate(chain.plain);
    panel.cp.textContent = formatRate(chain.checkpoint);
    panel.cseg.textContent = formatRate(chain.segments.length ? chain.segments[0].success : 1);
    panel.att.textContent = formatNumber(chain.attempts, 2);
    panel.segs.textContent = formatPlan(chain.plan);
    panel.explain.textContent = this._copy.explanations[explainKey(chain.plain)];

    // Curve: polyline of p^n over the slider range + the exact current point.
    const points = curvePoints(chain.stepPermille, model.stepsMin, model.stepsMax, 48);
    const span = model.stepsMax - model.stepsMin;
    const xOf = (n) => CURVE.x0 + ((n - model.stepsMin) / span) * (CURVE.x1 - CURVE.x0);
    const yOf = (v) => CURVE.y0 + (1 - Math.min(1, Math.max(0, v))) * (CURVE.y1 - CURVE.y0);
    panel.curveLine.setAttribute(
      'points',
      points.map((pt) => `${xOf(pt.steps).toFixed(2)},${yOf(pt.value).toFixed(2)}`).join(' ')
    );
    panel.curveDot.setAttribute('cx', xOf(chain.steps).toFixed(2));
    panel.curveDot.setAttribute('cy', yOf(chain.plain).toFixed(2));

    // Slider readouts mirror the snapped state (native ranges stay canonical).
    const sync = (input, out, displayValue, text) => {
      const asText = String(displayValue);
      if (input.value !== asText) input.value = asText;
      out.textContent = text;
    };
    sync(panel.step, panel.stepOut, chain.stepPermille / 10, formatPermille(chain.stepPermille));
    sync(panel.steps, panel.stepsOut, chain.steps, String(chain.steps));
    sync(panel.recall, panel.recallOut, chain.recallPermille / 10, formatPermille(chain.recallPermille));
    // Probability sliders announce the formatted percent (internal values
    // are per-mille; raw "950" would be meaningless to a reader).
    panel.step.setAttribute('aria-valuetext', formatPermille(chain.stepPermille));
    panel.recall.setAttribute('aria-valuetext', formatPermille(chain.recallPermille));
  }

  _summary(id) {
    const chain = this._chain(id);
    const c = this._copy.resultLabels;
    return `${c.plain} ${formatRate(chain.plain)} · ${c.checkpoint} ${formatRate(chain.checkpoint)}`;
  }

  _activate(id) {
    if (!this._panels.has(id)) throw new Error(`interactive: unknown scenario ${id}`);
    const scenario = this._spec.scenarios.find((s) => s.id === id);
    // Switching restores the selected scenario's initial values.
    this._values.set(id, {
      stepPermille: scenario.stepPermille,
      steps: scenario.steps,
      recallPermille: scenario.recallPermille,
    });
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
      this._values.set(scenario.id, {
        stepPermille: scenario.stepPermille,
        steps: scenario.steps,
        recallPermille: scenario.recallPermille,
      });
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
      console.warn('blog-reliability-chain: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    this._binder.abort();
    this._bound = false;
    this._ready = false;
    this.removeAttribute('data-enhanced');

    // Verbatim SSR restore of every panel (pre-enhancement clone), so a
    // render failure can never leave mixed or partial state behind. The
    // read-only reference was never touched and keeps its open state, and
    // the reader's checkpoint disclosure state is re-applied after the
    // restore (replaceChildren would otherwise close it).
    try {
      for (const [id, panel] of this._panels || []) {
        const clone = this._ssrClones && this._ssrClones.get(id);
        if (clone) {
          const ckpt = panel.el.querySelector('details.ib-checkpoint');
          const ckptOpen = Boolean(ckpt && ckpt.open);
          panel.el.replaceChildren(
            ...Array.from(clone.childNodes, (node) => node.cloneNode(true))
          );
          if (ckptOpen) {
            const restored = panel.el.querySelector('details.ib-checkpoint');
            if (restored) restored.open = true;
          }
        }
        const defId = this._spec ? this._spec.defaultScenario : null;
        show(panel.el, id === defId);
      }
    } catch {
      for (const el of this.querySelectorAll('[data-ib-step-range],[data-ib-steps-range],[data-ib-recall-range]')) {
        el.setAttribute('hidden', '');
      }
      for (const el of this.querySelectorAll('[data-ib-step-slot],[data-ib-steps-slot],[data-ib-recall-slot]')) {
        el.removeAttribute('hidden');
      }
    }
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
  }
}

if (!customElements.get('blog-reliability-chain')) {
  customElements.define('blog-reliability-chain', BlogReliabilityChain);
}
