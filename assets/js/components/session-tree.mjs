/**
 * session-tree.mjs — <blog-session-tree> (GROUP state / Pi "Session tree").
 *
 * Native autonomous custom element, Light DOM. The server-rendered stage
 * (default case: full ancestor path, model-context projection, independent
 * workspace snapshot) is the fallback; this module swaps interactive
 * controls into same-sized visibility:hidden slots and repaints derived
 * views with the pure functions in session-tree-model.mjs. Clicking a tree
 * branch (or the native select) moves the active entry; the compaction
 * toggle folds the authored compaction projection into the model context.
 * Neither ever touches the complete tree or the workspace snapshot — the
 * read-only <details> reference is never touched either.
 *
 * State is per-instance browser memory only: active entry + compaction
 * fold. No storage, no network. Enhancement is all-or-nothing:
 * `data-enhanced` is set and controls swapped in only after config
 * validation (same executable schema as the build gate), event binding and
 * the first render succeed. Any failure restores the trusted SSR stage via
 * saved clones and re-hides every control — safe at every init point.
 */

import { validateWith } from './spec-core.mjs';
import { validateSessionTree } from './session-tree-model.mjs';
import { computeView, defaultScenario, findScenario, nodeMap } from './session-tree-model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

class BlogSessionTree extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
    this._svgNodes = null;
    this._ssr = null;
  }

  connectedCallback() {
    try {
      if (this._ready) {
        // Reconnect: rebind once (never double-bind), keep this instance's
        // valid state, and repaint so no stale control state survives.
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
    this._spec = loadSpec(this._config, 'session-tree',
      (raw, options) => validateWith(raw, ['session-tree'], validateSessionTree, options));
    this._copy = this._spec.copy[uiLang(this._config)];
    this._lang = uiLang(this._config);
    this._byId = nodeMap(this._spec.model);
    this._replaces = this._spec.model.compaction.replaces;

    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    this._selectSlot = this.querySelector('[data-ib-select-slot]');
    this._select = this.querySelector('[data-ib-select]');
    this._toggleSlot = this.querySelector('[data-ib-toggle-slot]');
    this._toggle = this.querySelector('[data-ib-compaction]');
    this._pathEl = this.querySelector('[data-ib-path]');
    this._activeEl = this.querySelector('[data-ib-active-label]');
    this._projectionEl = this.querySelector('[data-ib-projection]');
    this._noteEl = this.querySelector('[data-ib-projection-note]');
    this._live = this.querySelector('[data-ib-live]');
    if (
      !this._scnStatic ||
      !this._scenarioRow ||
      !this._headSlot ||
      !this._resetBtn ||
      !this._selectSlot ||
      !this._select ||
      !this._toggleSlot ||
      !this._toggle ||
      !this._pathEl ||
      !this._activeEl ||
      !this._projectionEl ||
      !this._noteEl
    ) {
      throw new Error('interactive: incomplete session-tree chrome');
    }
    this._svgNodes = new Map();
    for (const g of this.querySelectorAll('[data-ib-node]')) {
      const id = g.getAttribute('data-ib-node');
      if (!this._byId.has(id) || this._svgNodes.has(id)) {
        throw new Error(`interactive: bad tree node ${id}`);
      }
      this._svgNodes.set(id, g);
    }
    if (this._svgNodes.size !== this._spec.model.nodes.length) {
      throw new Error('interactive: tree node/scenario mismatch');
    }

    // Trusted SSR snapshots BEFORE any mutation: a failed render restores
    // them verbatim (cloneNode keeps the snapshots pristine).
    this._ssr = new Map(
      [this._pathEl, this._activeEl, this._projectionEl, this._noteEl].map((el) => [
        el,
        el.cloneNode(true),
      ])
    );
    this._ssrClass = new Map();
    for (const [id, g] of this._svgNodes) this._ssrClass.set(id, g.getAttribute('class'));

    const scenario = defaultScenario(this._spec);
    this._scenarioId = scenario.id;
    this._activeId = scenario.activeLeaf;
    this._fold = scenario.compaction;

    this._bind();
    this._labelChrome();
    this._render();

    // First render succeeded — now swap the controls into the same-sized
    // static slots (geometry identical) and enhance. SVG branches become
    // pointer targets only (96×44 px hit boxes); keyboard/AT users drive the
    // native select above, so nothing focusable is added inside the
    // aria-hidden SVG.
    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    show(this._selectSlot, false);
    show(this._select, true);
    show(this._toggleSlot, false);
    show(this._toggle, true);
    for (const [, g] of this._svgNodes) g.classList.add('is-clickable');
    this.setAttribute('data-enhanced', 'session-tree');
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
        this._activate(this._spec.defaultScenario, false);
      } catch (err) {
        this._fallback(err);
      }
    });
    this._binder.listen(this._select, 'change', () => {
      try {
        this._setActive(this._select.value);
      } catch (err) {
        this._fallback(err);
      }
    });
    this._binder.listen(this._toggle, 'click', () => {
      try {
        this._fold = !this._fold;
        this._render();
        announce(this._binder, this._live, this._summary(), 300);
      } catch (err) {
        this._fallback(err);
      }
    });
    for (const [id, g] of this._svgNodes) {
      this._binder.listen(g, 'click', () => {
        try {
          this._setActive(id);
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
    this._toggle.textContent = this._copy.compactionLabel;
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      const id = button.getAttribute('data-ib-scenario');
      button.textContent = this._copy.scenarioLabels[id];
    }
  }

  /* ── state → view (pure derivation from session-tree-model.mjs) ─────── */

  _view() {
    return computeView(
      this._spec.model,
      { activeLeaf: this._activeId, compaction: this._fold },
      {}
    );
  }

  _render() {
    const view = this._view();
    this._pathEl.textContent = view.path.join(' → ');
    this._activeEl.textContent = this._activeId;

    const frag = document.createDocumentFragment();
    for (const entry of view.projection.entries) {
      const li = document.createElement('li');
      const kind = document.createElement('span');
      kind.className = 'ib-tree-entry-kind';
      const text = document.createElement('span');
      text.className = 'ib-tree-entry-text';
      if (entry.type === 'compaction') {
        li.className = 'ib-tree-entry ib-tree-entry--compaction';
        kind.textContent = this._copy.projectionSummaryLabel;
        text.textContent = this._spec.model.compaction.copy[this._lang].text;
      } else {
        const node = this._byId.get(entry.id);
        li.className = 'ib-tree-entry';
        kind.textContent = `${this._copy.nodeRoles[node.role]} · ${node.id}`;
        text.textContent = node.copy[this._lang].text;
      }
      li.appendChild(kind);
      li.appendChild(text);
      frag.appendChild(li);
    }
    this._projectionEl.replaceChildren(frag);
    this._noteEl.textContent = view.projection.applies
      ? this._copy.projectionNotes.compacted
      : this._copy.projectionNotes.full;

    for (const [id, g] of this._svgNodes) {
      const cls = ['ib-tree-node'];
      if (view.path.includes(id)) cls.push('is-path');
      if (id === this._activeId) cls.push('is-active');
      if (view.projection.applies && this._replaces.includes(id)) cls.push('is-folded');
      if (g.classList.contains('is-clickable')) cls.push('is-clickable');
      g.setAttribute('class', cls.join(' '));
    }

    if (this._select.value !== this._activeId) this._select.value = this._activeId;
    this._selectSlot.textContent = this._activeId;
    this._toggle.setAttribute('aria-pressed', String(this._fold));
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._scenarioId)
      );
    }
  }

  _summary() {
    const view = this._view();
    return (
      `${this._copy.activeLabel} ${this._activeId} · ${this._copy.pathLabel} ${view.path.join(' → ')} · ` +
      (view.projection.applies
        ? this._copy.projectionNotes.compacted
        : this._copy.projectionNotes.full)
    );
  }

  /** One deterministic case: restore its active entry + compaction state. */
  _activate(id, notify = true) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._scenarioId = id;
    this._activeId = scenario.activeLeaf;
    this._fold = scenario.compaction;
    silence(this._binder, this._live);
    this._render();
    if (notify) announce(this._binder, this._live, this._summary(), 300);
  }

  /** Move the active entry (branch click / select): path + projection only. */
  _setActive(id) {
    if (!this._byId.has(id)) throw new Error(`interactive: unknown tree entry ${id}`);
    this._activeId = id;
    this._render();
    announce(this._binder, this._live, this._summary(), 300);
  }

  /* ── failure handling: stop enhancing, restore the trusted SSR ──────── */

  _fallback(err) {
    try {
      console.warn('blog-session-tree: enhancement disabled', err);
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
          el.replaceChildren(...Array.from(snap.childNodes).map((n) => n.cloneNode(true)));
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
    show(this._selectSlot, true);
    show(this._select, false);
    show(this._toggleSlot, true);
    show(this._toggle, false);
    silence(this._binder, this._live);
  }
}

if (!customElements.get('blog-session-tree')) {
  customElements.define('blog-session-tree', BlogSessionTree);
}
