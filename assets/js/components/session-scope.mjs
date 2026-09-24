/**
 * session-scope.mjs — <blog-session-scope> (GROUP state / OpenClaw
 * "Session key" explainer).
 *
 * Native autonomous custom element, Light DOM. The server-rendered stage
 * shows the default dmScope mode's EXACT grouping (finite synthetic
 * messages under their computed session keys); this module swaps the
 * scenario selector into its same-sized slot and regroups the SAME
 * messages when the reader picks another mode or the explicit identity-link
 * case. Key shapes are fixed constants in session-scope-model.mjs (the
 * pinned source's formats), grouping is a pure function, and every message's
 * channel/account/peer dimensions are rendered verbatim — a configured
 * identity link only ADDS the canonical id, it never claims verification.
 * The read-only <details> reference is never touched.
 *
 * Per-instance browser memory only (the selected case). No storage, no
 * network. Enhancement is all-or-nothing; any failure restores the trusted
 * SSR grouping and re-hides every control.
 */

import { validateWith } from './spec-core.mjs';
import { validateSessionScope } from './session-scope-model.mjs';
import {
  KEY_TEMPLATES,
  computeGroups,
  defaultScenario,
  effectivePeer,
  findScenario,
} from './session-scope-model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

class BlogSessionScope extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
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
    this._spec = loadSpec(this._config, 'session-scope',
      (raw, options) => validateWith(raw, ['session-scope'], validateSessionScope, options));
    this._copy = this._spec.copy[uiLang(this._config)];
    this._lang = uiLang(this._config);
    this._byId = new Map(this._spec.model.messages.map((m) => [m.id, m]));

    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    this._formatEl = this.querySelector('[data-ib-format]');
    this._groupsEl = this.querySelector('[data-ib-groups]');
    this._identityEl = this.querySelector('[data-ib-identity]');
    this._live = this.querySelector('[data-ib-live]');
    if (
      !this._scnStatic ||
      !this._scenarioRow ||
      !this._headSlot ||
      !this._resetBtn ||
      !this._formatEl ||
      !this._groupsEl ||
      !this._identityEl
    ) {
      throw new Error('interactive: incomplete session-scope chrome');
    }

    // Trusted SSR snapshots BEFORE any mutation (clones stay pristine).
    this._ssr = new Map([
      [this._groupsEl, this._groupsEl.cloneNode(true)],
      [this._formatEl, this._formatEl.cloneNode(true)],
    ]);
    this._identityHidden = this._identityEl.hasAttribute('hidden');

    this._scenarioId = defaultScenario(this._spec).id;

    this._bind();
    this._labelChrome();
    this._render();

    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    this.setAttribute('data-enhanced', 'session-scope');
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

  /* ── state → view (pure derivation from session-scope-model.mjs) ────── */

  _scenario() {
    return findScenario(this._spec, this._scenarioId) || defaultScenario(this._spec);
  }

  _render() {
    const scenario = this._scenario();
    const groups = computeGroups(this._spec.model, scenario);
    this._formatEl.textContent = KEY_TEMPLATES[scenario.mode];
    this._renderGroups(groups, scenario);
    show(this._identityEl, scenario.useIdentityLinks === true);
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._scenarioId)
      );
    }
    this._groups = groups;
  }

  _renderGroups(groups, scenario) {
    const c = this._copy;
    const frag = document.createDocumentFragment();
    for (const group of groups) {
      const section = document.createElement('section');
      section.className = 'ib-scope-group';
      section.setAttribute('data-ib-group', group.id);
      section.setAttribute('data-ib-group-key', group.key);

      const key = document.createElement('p');
      key.className = 'ib-scope-key';
      const gid = document.createElement('span');
      gid.className = 'ib-scope-group-id';
      gid.textContent = group.id;
      const keyLabel = document.createElement('span');
      keyLabel.className = 'ib-meta-label';
      keyLabel.textContent = `${c.keyLabel}：`;
      const keyCode = document.createElement('code');
      keyCode.className = 'ib-scope-key-code';
      keyCode.textContent = group.key;
      const count = document.createElement('span');
      count.className = 'ib-scope-count';
      count.textContent = `${group.stats.messages} ${c.messagesLabel}`;
      key.append(gid, keyLabel, keyCode, count);

      const list = document.createElement('ul');
      list.className = 'ib-scope-msgs';
      for (const id of group.memberIds) {
        list.appendChild(this._renderMessage(this._byId.get(id), scenario));
      }

      const reading = document.createElement('p');
      reading.className = 'ib-scope-reading';
      reading.setAttribute('data-ib-reading', '');
      reading.textContent = c.readings[group.reading];

      section.append(key, list, reading);
      frag.appendChild(section);
    }
    this._groupsEl.replaceChildren(frag);
  }

  /** Mirror of layouts/partials/interactive/session-scope-message.html. */
  _renderMessage(msg, scenario) {
    const c = this._copy;
    const li = document.createElement('li');
    li.className = 'ib-scope-msg';
    li.setAttribute('data-ib-msg', msg.id);

    const meta = document.createElement('p');
    meta.className = 'ib-scope-meta';
    const person = document.createElement('span');
    person.className = 'ib-scope-person';
    person.textContent = c.people[msg.person];
    meta.appendChild(person);
    const dim = (label, value) => {
      const span = document.createElement('span');
      span.className = 'ib-scope-dim';
      span.textContent = `${label}：`;
      const code = document.createElement('code');
      code.textContent = value;
      span.appendChild(code);
      meta.appendChild(span);
    };
    dim(c.dimensions.channel, msg.channel);
    dim(c.dimensions.account, msg.accountId);
    dim(c.dimensions.peer, msg.peerId);
    // A configured link ADDS the canonical id; the raw dimensions stay.
    const peer = effectivePeer(this._spec.model, msg, scenario.useIdentityLinks);
    if (peer !== msg.peerId) {
      const span = document.createElement('span');
      span.className = 'ib-scope-dim';
      span.textContent = '→ ';
      const code = document.createElement('code');
      code.textContent = peer;
      span.appendChild(code);
      meta.appendChild(span);
    }

    const text = document.createElement('p');
    text.className = 'ib-scope-text';
    text.textContent = msg.copy[this._lang].text;

    li.append(meta, text);
    return li;
  }

  _summary() {
    const scenario = this._scenario();
    const groups = this._groups || computeGroups(this._spec.model, scenario);
    return `${this._copy.scenarioLabels[this._scenarioId]} · ${this._copy.groupsLabel} ${groups
      .map((g) => g.key)
      .join(' · ')}`;
  }

  /** One deterministic case (mode + optional configured identity links). */
  _activate(id, notify = true) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._scenarioId = id;
    silence(this._binder, this._live);
    this._render();
    if (notify) announce(this._binder, this._live, this._summary(), 300);
  }

  /* ── failure handling: stop enhancing, restore the trusted SSR ──────── */

  _fallback(err) {
    try {
      console.warn('blog-session-scope: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    this._binder.abort();
    this._bound = false;
    this._ready = false;
    this.removeAttribute('data-enhanced');
    try {
      if (this._ssr) {
        const groupsSnap = this._ssr.get(this._groupsEl);
        const formatSnap = this._ssr.get(this._formatEl);
        if (groupsSnap) {
          this._groupsEl.replaceChildren(
            ...Array.from(groupsSnap.childNodes).map((n) => n.cloneNode(true))
          );
        }
        if (formatSnap) this._formatEl.textContent = formatSnap.textContent;
        if (this._identityHidden) this._identityEl.setAttribute('hidden', '');
        else this._identityEl.removeAttribute('hidden');
      }
    } catch {
      // Last resort: the SSR markup was already trusted; leave it be.
    }
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
    silence(this._binder, this._live);
  }
}

if (!customElements.get('blog-session-scope')) {
  customElements.define('blog-session-scope', BlogSessionScope);
}
