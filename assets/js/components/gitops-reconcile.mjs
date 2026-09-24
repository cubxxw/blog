/**
 * gitops-reconcile.mjs — <blog-gitops-reconcile> (group: effects).
 *
 * Native autonomous custom element, Light DOM. The server-rendered stage
 * (default scenario, Argo-CD defaults: no automated sync / no self-heal / no
 * prune, action "none"; same spec data) is the fallback; this module swaps
 * the three native checkboxes and the two action buttons into same-sized
 * visibility:hidden slots (zero layout shift) and repaints the state
 * comparison, the separate Sync/Health readouts, the before/after delta, the
 * explicit deletion outcome and the rule-based explanation with the pure
 * functions in gitops-reconcile-model.mjs. The read-only <details> reference
 * is never touched.
 *
 * State is per-instance browser memory — no storage, no network. Enhancement
 * is all-or-nothing: `data-enhanced` is set and controls swapped in only
 * after config validation (the same executable schema the build gate uses),
 * event binding and the first render succeed. Any failure restores the
 * complete static view and never affects another instance.
 */

import { validateWith } from './spec-core.mjs';
import { validateGitopsReconcile } from './gitops-reconcile-model.mjs';
import { canRollback, computeReconcile, findScenario } from './gitops-reconcile-model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

const STATE_FIELDS = ['replicas', 'version', 'resource'];

/** data-ib-toggle attribute values → policy keys (kept separate so the
 * markup stays kebab-case and the model stays camelCase). */
const TOGGLE_KEYS = {
  'auto-sync': 'autoSync',
  'self-heal': 'selfHeal',
  prune: 'prune',
};

class BlogGitopsReconcile extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
    this._activeId = null;
    this._policy = { autoSync: false, selfHeal: false, prune: false };
    this._action = 'none';
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
    this._binder.abort();
    this._bound = false;
  }

  /* ── init (throws on any problem → static fallback) ─────────────────── */

  _setup() {
    this._config = readConfig(this);
    this._spec = loadSpec(this._config, 'gitops-reconcile',
      (raw, options) => validateWith(raw, ['gitops-reconcile'], validateGitopsReconcile, options));
    this._copy = this._spec.copy[uiLang(this._config)];

    this._stage = this.querySelector('[data-ib-stage]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._ctrlSlot = this.querySelector('[data-ib-ctrl-slot]');
    this._toggleGroup = this.querySelector('[data-ib-toggles]');
    this._actionGroup = this.querySelector('[data-ib-actions-group]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    this._live = this.querySelector('[data-ib-live]');
    this._syncBtn = this.querySelector('[data-ib-sync]');
    this._rollbackBtn = this.querySelector('[data-ib-rollback]');
    this._syncStatus = this.querySelector('[data-ib-sync-status]');
    this._health = this.querySelector('[data-ib-health]');
    this._deletion = this.querySelector('[data-ib-deletion]');
    this._explain = this.querySelector('[data-ib-explain]');
    this._desired = new Map();
    this._cluster = new Map();
    for (const field of STATE_FIELDS) {
      const desired = this.querySelector(`[data-ib-desired="${field}"]`);
      const cluster = this.querySelector(`[data-ib-cluster="${field}"]`);
      if (!desired || !cluster) throw new Error(`interactive: missing state row ${field}`);
      this._desired.set(field, desired);
      this._cluster.set(field, cluster);
    }
    this._deltas = new Map();
    for (const phase of ['before', 'after']) {
      const el = this.querySelector(`[data-ib-delta="${phase}"]`);
      if (!el) throw new Error(`interactive: missing delta list ${phase}`);
      this._deltas.set(phase, el);
    }
    this._toggles = [...this.querySelectorAll('[data-ib-toggle]')];
    if (
      !this._stage ||
      !this._scenarioRow ||
      !this._scnStatic ||
      !this._ctrlSlot ||
      !this._toggleGroup ||
      !this._actionGroup ||
      !this._headSlot ||
      !this._resetBtn ||
      !this._syncBtn ||
      !this._rollbackBtn ||
      !this._syncStatus ||
      !this._health ||
      !this._deletion ||
      !this._explain ||
      this._toggles.length !== 3
    ) {
      throw new Error('interactive: incomplete gitops-reconcile chrome');
    }

    // Trusted SSR snapshot for the failure path (stage only — the reference
    // details is never touched at all).
    this._ssrStage = this._stage.cloneNode(true);

    // One current scenario (defaultScenario — what SSR shows); switching
    // restores Argo-CD defaults (no memory of the reader's last choices).
    const def = findScenario(this._spec, this._spec.defaultScenario);
    this._activeId = def.id;

    this._bind();
    this._labelChrome();
    this._paint();

    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._ctrlSlot, false);
    show(this._toggleGroup, true);
    show(this._actionGroup, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    this.setAttribute('data-enhanced', 'gitops-reconcile');
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
    for (const input of this._toggles) {
      this._binder.listen(input, 'change', () => {
        try {
          this._policy[TOGGLE_KEYS[input.getAttribute('data-ib-toggle')]] = input.checked;
          this._paint();
          this._announce();
        } catch (err) {
          this._fallback(err);
        }
      });
    }
    this._binder.listen(this._syncBtn, 'click', () => {
      try {
        this._action = 'sync';
        this._paint();
        this._announce();
      } catch (err) {
        this._fallback(err);
      }
    });
    this._binder.listen(this._rollbackBtn, 'click', () => {
      try {
        // The guard is enforced in the pure model too: a refused rollback is
        // never applied (enabled auto sync prevents history rollback).
        if (!canRollback(this._scenario(), this._policy).allowed) {
          this._paint();
          this._announce();
          return;
        }
        this._action = 'rollback';
        this._paint();
        this._announce();
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
  }

  /* ── state → view (pure computation from gitops-reconcile-model.mjs) ── */

  _scenario() {
    const scenario = findScenario(this._spec, this._activeId);
    if (!scenario) throw new Error(`interactive: unknown scenario ${this._activeId}`);
    return scenario;
  }

  /** Absence semantics: replicas/version describe a live workload; an absent
   * side shows the placeholder dash instead of fictitious workload state. */
  _value(field, value, presence) {
    if (field === 'resource') return this._copy.resourceState[value];
    return presence === 'absent' ? '—' : String(value);
  }

  _paintDelta(el, deltas) {
    el.textContent = '';
    if (deltas.length === 0) {
      const li = document.createElement('li');
      li.className = 'ib-gr-delta-none';
      li.textContent = this._copy.noDelta;
      el.appendChild(li);
      return;
    }
    for (const d of deltas) {
      const li = document.createElement('li');
      // Deltas only carry comparable fields: live replicas/version or the
      // resource presence itself.
      li.textContent =
        `${this._copy.states[d.field]}：${this._copy.table.desired} ${this._value(d.field, d.git, 'present')}` +
        ` · ${this._copy.table.cluster} ${this._value(d.field, d.cluster, 'present')}`;
      el.appendChild(li);
    }
  }

  _paint() {
    const scenario = this._scenario();
    const result = computeReconcile(this._spec.model, scenario, this._policy, this._action);
    for (const field of STATE_FIELDS) {
      this._desired
        .get(field)
        .textContent = this._value(field, scenario.git[field], scenario.git.resource);
      this._cluster
        .get(field)
        .textContent = this._value(field, result.after[field], result.after.resource);
    }
    this._syncStatus.textContent = this._copy.statusLabels[result.sync];
    this._health.textContent = this._copy.healthLabels[result.health];
    this._deletion.textContent = this._copy.deletionLabels[result.deletion];
    this._paintDelta(this._deltas.get('before'), result.deltaBefore);
    this._paintDelta(this._deltas.get('after'), result.deltaAfter);
    this._explain.textContent = this._copy.explanations[result.explain];
    // The rollback guard explains its refusal on the disabled control.
    const guard = result.rollback;
    this._rollbackBtn.disabled = !guard.allowed;
    const reason = guard.allowed ? '' : this._copy.guardReasons[guard.reason] || '';
    if (reason) {
      this._rollbackBtn.title = reason;
      this._rollbackBtn.setAttribute(
        'aria-label',
        `${this._copy.actions['rollback']} — ${reason}`
      );
    } else {
      this._rollbackBtn.removeAttribute('title');
      this._rollbackBtn.setAttribute('aria-label', this._copy.actions['rollback']);
    }
    for (const input of this._toggles) {
      input.checked = Boolean(this._policy[TOGGLE_KEYS[input.getAttribute('data-ib-toggle')]]);
    }
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._activeId)
      );
    }
  }

  _summary() {
    const c = this._copy.readout;
    return (
      `${c.sync} ${this._syncStatus.textContent} · ${c.health} ${this._health.textContent} · ` +
      `${c.deletion} ${this._deletion.textContent}`
    );
  }

  _announce() {
    announce(this._binder, this._live, this._summary(), 300);
  }

  /** Exactly one current scenario: switching restores the policy defaults. */
  _activate(id) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._activeId = id;
    this._policy = { autoSync: false, selfHeal: false, prune: false };
    this._action = 'none';
    silence(this._binder, this._live);
    this._paint();
  }

  /** Reset: defaultScenario and Argo-CD defaults; no memory of the choices. */
  _reset() {
    this._activeId = this._spec.defaultScenario;
    this._policy = { autoSync: false, selfHeal: false, prune: false };
    this._action = 'none';
    silence(this._binder, this._live);
    this._paint();
  }

  /* ── failure handling: stop enhancing, restore the static view ──────── */

  _fallback(err) {
    try {
      console.warn('blog-gitops-reconcile: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    this._binder.abort();
    this._bound = false;
    this._ready = false;
    this.removeAttribute('data-enhanced');
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._ctrlSlot, true);
    show(this._toggleGroup, false);
    show(this._actionGroup, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
    silence(this._binder, this._live);
    try {
      if (this._stage && this._ssrStage) {
        // Fully restore the trusted SSR stage (comparison, readout, deltas).
        this._stage.replaceChildren(...[...this._ssrStage.cloneNode(true).childNodes]);
      }
    } catch {
      for (const el of this.querySelectorAll('[data-ib-toggles],[data-ib-actions-group]')) {
        el.setAttribute('hidden', '');
      }
    }
  }
}

if (!customElements.get('blog-gitops-reconcile')) {
  customElements.define('blog-gitops-reconcile', BlogGitopsReconcile);
}
