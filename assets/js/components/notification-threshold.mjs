/**
 * notification-threshold.mjs — <blog-notification-threshold> (numerical
 * explainer: E = p·G − (1−p)·C and the speak-up threshold C/(G+C)).
 *
 * Native autonomous custom element, Light DOM. The server-rendered stage
 * (default scenario, same spec data) is the trusted fallback; controls swap
 * into same-sized visibility:hidden slots and every number is repainted from
 * the pure functions in notification-threshold-model.mjs (exact integer
 * milli-unit math for E). The SVG axis is always paired with the numeric
 * readout; the read-only <details> reference is never touched.
 *
 * State is per-instance browser memory — no storage, no network. Enhancement
 * is all-or-nothing after config validation, binding and the first render;
 * ANY failure restores the exact SSR DOM from a pre-enhancement clone
 * (never NaN, never dead controls, siblings untouched).
 */

import { validateWith } from './spec-core.mjs';
import { validateNotificationThreshold } from './notification-threshold-model.mjs';
import {
  computeDecision,
  formatE,
  formatPermille,
  formatThreshold,
  formatThresholdExpression,
} from './notification-threshold-model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

/* Axis geometry (SVG viewBox 0 0 320 96, fixed 0…1 reference scale). */
const AXIS = { x0: 24, x1: 296, y: 48, labelMin: 52, labelMax: 268 };

class BlogNotificationThreshold extends HTMLElement {
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
    this._spec = loadSpec(this._config, 'notification-threshold',
      (raw, options) => validateWith(raw, ['notification-threshold'], validateNotificationThreshold, options));
    this._copy = this._spec.copy[uiLang(this._config)];
    this._panels = new Map();
    this._ssrClones = new Map();

    for (const panelEl of this.querySelectorAll('[data-ib-panel]')) {
      const id = panelEl.getAttribute('data-ib-panel');
      if (this._panels.has(id)) throw new Error(`interactive: duplicate panel ${id}`);
      const panel = {
        el: panelEl,
        threshold: panelEl.querySelector('[data-ib-threshold]'),
        expected: panelEl.querySelector('[data-ib-expected]'),
        verdict: panelEl.querySelector('[data-ib-verdict]'),
        explain: panelEl.querySelector('[data-ib-explain]'),
        thrMark: panelEl.querySelector('[data-ib-thr-mark]'),
        thrLabel: panelEl.querySelector('[data-ib-thr-label]'),
        pMark: panelEl.querySelector('[data-ib-p-mark]'),
        pLabel: panelEl.querySelector('[data-ib-p-label]'),
        gain: panelEl.querySelector('[data-ib-gain-range]'),
        cost: panelEl.querySelector('[data-ib-cost-range]'),
        prob: panelEl.querySelector('[data-ib-prob-range]'),
        gainOut: panelEl.querySelector('[data-ib-gain-out]'),
        costOut: panelEl.querySelector('[data-ib-cost-out]'),
        probOut: panelEl.querySelector('[data-ib-prob-out]'),
        live: panelEl.querySelector('[data-ib-live]'),
      };
      for (const key of ['threshold', 'expected', 'verdict', 'explain', 'thrMark', 'thrLabel', 'pMark', 'pLabel', 'gain', 'cost', 'prob', 'gainOut', 'costOut', 'probOut']) {
        if (!panel[key]) throw new Error(`interactive: incomplete panel ${id} (${key})`);
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
      this._spec.scenarios.map((s) => [s.id, { gain: s.gain, cost: s.cost, probPermille: s.probPermille }])
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
      for (const key of ['gain', 'cost', 'prob']) {
        show(panel.el.querySelector(`[data-ib-${key}-slot]`), false);
        show(panel[key], true);
      }
    }
    this.setAttribute('data-enhanced', 'notification-threshold');
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
      // Sliders work in DISPLAY units (percent for p); state stays integer
      // per-mille so every computation is finite and exact.
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
      bind(panel.gain, (state, v) => {
        state.gain = v;
      });
      bind(panel.cost, (state, v) => {
        state.cost = v;
      });
      bind(panel.prob, (state, v) => {
        state.probPermille = Math.round(v * 10);
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

  _decision(id) {
    return computeDecision(this._spec.model, this._values.get(id));
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
    const d = this._decision(id);

    const expr = formatThresholdExpression(d.gain, d.cost);
    panel.threshold.textContent = expr === null ? this._copy.resultLabels.undefined : expr;
    panel.expected.textContent = formatE(d.eMilli);
    panel.verdict.textContent = this._copy.verdicts[d.verdict];
    panel.explain.textContent = this._copy.explanations[d.verdict];

    // Axis: threshold marker + current p marker on the fixed 0…1 scale.
    const xOf = (fraction) => AXIS.x0 + Math.min(1, Math.max(0, fraction)) * (AXIS.x1 - AXIS.x0);
    const pX = xOf(d.probPermille / 1000);
    panel.pMark.setAttribute('transform', `translate(${pX.toFixed(2)} ${AXIS.y})`);
    panel.pLabel.setAttribute('x', Math.min(AXIS.labelMax, Math.max(AXIS.labelMin, pX)).toFixed(2));
    panel.pLabel.textContent = `${this._copy.axisLabels.current} ${formatPermille(d.probPermille)}`;
    if (d.threshold === null) {
      show(panel.thrMark, false);
      panel.thrLabel.textContent = this._copy.resultLabels.undefined;
    } else {
      show(panel.thrMark, true);
      const tX = xOf(d.threshold);
      panel.thrMark.setAttribute('transform', `translate(${tX.toFixed(2)} ${AXIS.y})`);
      panel.thrLabel.setAttribute('x', Math.min(AXIS.labelMax, Math.max(AXIS.labelMin, tX)).toFixed(2));
      panel.thrLabel.textContent = `${this._copy.axisLabels.threshold} ${formatThreshold(d.threshold)}`;
    }

    const sync = (input, out, displayValue, text) => {
      const asText = String(displayValue);
      if (input.value !== asText) input.value = asText;
      out.textContent = text;
    };
    sync(panel.gain, panel.gainOut, d.gain, String(d.gain));
    sync(panel.cost, panel.costOut, d.cost, String(d.cost));
    sync(panel.prob, panel.probOut, d.probPermille / 10, formatPermille(d.probPermille));
    // The probability slider announces the formatted percent (its internal
    // state is per-mille; raw "950" would be meaningless to a reader).
    panel.prob.setAttribute('aria-valuetext', formatPermille(d.probPermille));
  }

  _summary(id) {
    const d = this._decision(id);
    const c = this._copy.resultLabels;
    return `${c.expected} ${formatE(d.eMilli)} · ${c.verdict} ${this._copy.verdicts[d.verdict]}`;
  }

  _activate(id) {
    const scenario = this._spec.scenarios.find((s) => s.id === id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._values.set(id, {
      gain: scenario.gain,
      cost: scenario.cost,
      probPermille: scenario.probPermille,
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
        gain: scenario.gain,
        cost: scenario.cost,
        probPermille: scenario.probPermille,
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
      console.warn('blog-notification-threshold: enhancement disabled', err);
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
      for (const el of this.querySelectorAll('[data-ib-gain-range],[data-ib-cost-range],[data-ib-prob-range]')) {
        el.setAttribute('hidden', '');
      }
      for (const el of this.querySelectorAll('[data-ib-gain-slot],[data-ib-cost-slot],[data-ib-prob-slot]')) {
        el.removeAttribute('hidden');
      }
    }
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
  }
}

if (!customElements.get('blog-notification-threshold')) {
  customElements.define('blog-notification-threshold', BlogNotificationThreshold);
}
