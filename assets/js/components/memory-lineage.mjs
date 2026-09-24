/**
 * memory-lineage.mjs — <blog-memory-lineage> (GROUP state / Forgetting
 * article, "一条删除请求会走多远").
 *
 * Native autonomous custom element, Light DOM. The server-rendered stage
 * shows the default deletion case's EXACT before/after result over the
 * authored dependency DAG; this module swaps the scenario selector and the
 * selective source-removal toggles into their same-sized slots and
 * recomputes the traversal with the pure classify() function in
 * memory-lineage-model.mjs. Invalidation is only ever rendered as
 * "invalidated" — never as verified physical deletion — and outside-boundary
 * or untraced nodes always stay "not provably erased". The read-only
 * <details> reference is never touched.
 *
 * Per-instance browser memory only (selected case + removed sources). No
 * storage, no network. Enhancement is all-or-nothing; any failure restores
 * the trusted SSR result and re-hides every control.
 */

import { validateWith } from './spec-core.mjs';
import { validateMemoryLineage } from './memory-lineage-model.mjs';
import {
  RESULT_ORDER,
  classify,
  defaultScenario,
  findScenario,
} from './memory-lineage-model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

class BlogMemoryLineage extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
    this._removed = new Set();
    this._svgNodes = null;
    this._ssr = null;
  }

  connectedCallback() {
    try {
      if (this._ready) {
        this._bind();
        this._render();
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

  /* ── init (throws on any problem → static fallback) ─────────────────── */

  _setup() {
    this._config = readConfig(this);
    this._spec = loadSpec(this._config, 'memory-lineage',
      (raw, options) => validateWith(raw, ['memory-lineage'], validateMemoryLineage, options));
    this._copy = this._spec.copy[uiLang(this._config)];
    this._lang = uiLang(this._config);
    this._byId = new Map(this._spec.model.nodes.map((n) => [n.id, n]));

    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    this._srcStatic = this.querySelector('[data-ib-source-static]');
    this._srcRow = this.querySelector('[data-ib-sources]');
    this._afterEl = this.querySelector('[data-ib-after]');
    this._live = this.querySelector('[data-ib-live]');
    if (
      !this._scnStatic ||
      !this._scenarioRow ||
      !this._headSlot ||
      !this._resetBtn ||
      !this._srcStatic ||
      !this._srcRow ||
      !this._afterEl
    ) {
      throw new Error('interactive: incomplete memory-lineage chrome');
    }

    this._counts = new Map();
    for (const el of this.querySelectorAll('[data-ib-count]')) {
      this._counts.set(el.getAttribute('data-ib-count'), el);
    }
    this._statuses = new Map();
    for (const el of this.querySelectorAll('[data-ib-status]')) {
      this._statuses.set(el.getAttribute('data-ib-status'), el);
    }
    this._svgNodes = new Map();
    for (const g of this.querySelectorAll('[data-ib-node]')) {
      const id = g.getAttribute('data-ib-node');
      if (!this._byId.has(id) || this._svgNodes.has(id)) {
        throw new Error(`interactive: bad lineage node ${id}`);
      }
      this._svgNodes.set(id, g);
    }
    if (
      this._statuses.size !== this._spec.model.nodes.length ||
      this._svgNodes.size !== this._spec.model.nodes.length
    ) {
      throw new Error('interactive: lineage node/row mismatch');
    }

    // Trusted SSR snapshots BEFORE any mutation (clones stay pristine).
    this._ssr = new Map();
    for (const el of [...this._counts.values(), ...this._statuses.values()]) {
      this._ssr.set(el, el.cloneNode(true));
    }
    this._ssrClass = new Map();
    for (const [id, g] of this._svgNodes) this._ssrClass.set(id, g.getAttribute('class'));

    const scenario = defaultScenario(this._spec);
    this._scenarioId = scenario.id;
    this._removed = new Set(scenario.removedSources);

    this._bind();
    this._labelChrome();
    this._render();

    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    show(this._srcStatic, false);
    show(this._srcRow, true);
    this.setAttribute('data-enhanced', 'memory-lineage');
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
    for (const button of this.querySelectorAll('[data-ib-source]')) {
      this._binder.listen(button, 'click', () => {
        try {
          const id = button.getAttribute('data-ib-source');
          if (this._removed.has(id)) this._removed.delete(id);
          else this._removed.add(id);
          this._render();
          announce(this._binder, this._live, this._summary(), 300);
        } catch (err) {
          this._fallback(err);
        }
      });
    }
    this._binder.listen(this._resetBtn, 'click', () => {
      try {
        this._activate(this._spec.defaultScenario, false);
      } catch (err) {
        this._fallback(err);
      }
    });
    this._bound = true;
  }

  _labelChrome() {
    const lang = uiLang(this._config);
    this._resetBtn.textContent = uiLabel(lang, 'reset');
    this._resetBtn.setAttribute('aria-label', uiLabel(lang, 'resetAria'));
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      const id = button.getAttribute('data-ib-scenario');
      button.textContent = this._copy.scenarioLabels[id];
    }
  }

  /* ── state → view (pure derivation from memory-lineage-model.mjs) ───── */

  _classification() {
    return classify(this._spec.model, [...this._removed]);
  }

  _render() {
    const classification = this._classification();
    const counts = Object.fromEntries(RESULT_ORDER.map((s) => [s, 0]));
    for (const status of classification.values()) counts[status] += 1;

    for (const [id, el] of this._counts) el.textContent = String(counts[id] ?? 0);
    for (const [id, el] of this._statuses) {
      const status = classification.get(id) || 'kept';
      el.textContent = this._copy.statuses[status];
      el.setAttribute('class', `ib-ml-status is-${status}`);
    }
    for (const [id, g] of this._svgNodes) {
      const status = classification.get(id) || 'kept';
      g.setAttribute('class', `ib-ml-node is-${status}`);
    }
    for (const button of this.querySelectorAll('[data-ib-source]')) {
      button.setAttribute(
        'aria-pressed',
        String(this._removed.has(button.getAttribute('data-ib-source')))
      );
    }
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._scenarioId)
      );
    }
    this._countsNow = counts;
  }

  _summary() {
    const counts = this._countsNow || {};
    return `${this._copy.afterLabel}：${RESULT_ORDER.map(
      (s) => `${this._copy.statuses[s]} ${counts[s] ?? 0}`
    ).join(' · ')}`;
  }

  /** One deterministic deletion case: restore its covered sources. */
  _activate(id, notify = true) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._scenarioId = id;
    this._removed = new Set(scenario.removedSources);
    silence(this._binder, this._live);
    this._render();
    if (notify) announce(this._binder, this._live, this._summary(), 300);
  }

  /* ── failure handling: stop enhancing, restore the trusted SSR ──────── */

  _fallback(err) {
    try {
      console.warn('blog-memory-lineage: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    this._binder.abort();
    this._bound = false;
    this._ready = false;
    this.removeAttribute('data-enhanced');
    try {
      if (this._ssr) {
        for (const [el, snap] of this._ssr) {
          el.textContent = snap.textContent;
          const cls = snap.getAttribute('class');
          if (cls !== null) el.setAttribute('class', cls);
        }
      }
      if (this._ssrClass && this._svgNodes) {
        for (const [id, g] of this._svgNodes) {
          const cls = this._ssrClass.get(id);
          if (cls !== undefined && cls !== null) g.setAttribute('class', cls);
        }
      }
    } catch {
      // Last resort: the SSR markup was already trusted; leave it be.
    }
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
    show(this._srcStatic, true);
    show(this._srcRow, false);
    silence(this._binder, this._live);
  }
}

if (!customElements.get('blog-memory-lineage')) {
  customElements.define('blog-memory-lineage', BlogMemoryLineage);
}
