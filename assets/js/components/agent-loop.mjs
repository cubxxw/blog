/**
 * agent-loop.mjs — <blog-agent-loop> (issue #389).
 *
 * Native autonomous custom element, Light DOM. The working stage shows ONE
 * current event of the selected finite, author-written preset trace (never
 * live model output, never executed tools). The complete authored traces live
 * in a native <details> reference rendered from the same spec data; the
 * upgrade never touches that element or its open state.
 *
 * One current scenario and one current event: initial state and Reset focus
 * defaultScenario's first event. Controls swap into same-sized
 * visibility:hidden slots (zero layout shift on upgrade).
 *
 * Playback is manual-only and finite: never starts on scroll-into-view,
 * pauses when the page is hidden or the component leaves the viewport (no
 * auto-resume), stops IN the render cycle that reaches the last event (no
 * pending playback timer), and is disabled under prefers-reduced-motion
 * (manual stepping stays). The preference is observed live — including after
 * a remove/re-insert cycle, where the MediaQueryList listener is re-created.
 *
 * Failing is safe at every partial-initialisation point (including corrupt
 * JSON before any state exists) and always restores the complete static view.
 */

import {
  canStepNext,
  canStepPrev,
  clampIndex,
  findScenario,
  isFinished,
  nodeForKind,
  stepCount,
} from './model.mjs';
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

const PLAY_STEP_MS = 900;

class BlogAgentLoop extends HTMLElement {
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
      // Reconnect: rebind listeners AND the MediaQueryList observer (the old
      // one was released on removal), stay paused, refresh the reduced-motion
      // preference and repaint so no stale control label survives.
      this._reduced = prefersReducedMotion();
      this._bind();
      this._observe();
      this._pause();
      this._paintReducedMotion();
      this._render();
      return;
    }
    try {
      this._setup();
    } catch (err) {
      this._fallback(err);
    }
  }

  disconnectedCallback() {
    this._binder.abort(); // also removes the MediaQueryList change listener
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

  /* ── init ───────────────────────────────────────────────────────────── */

  _setup() {
    this._config = readConfig(this);
    this._spec = loadSpec(this._config, 'agent-loop');
    this._copy = this._spec.copy[uiLang(this._config)];

    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    this._nodesEl = this.querySelector('[data-ib-nodes]');
    this._nodes = this.querySelectorAll('[data-ib-node]');
    this._ctrlSlot = this.querySelector('[data-ib-ctrl-slot]');
    this._prevBtn = this.querySelector('[data-ib-prev]');
    this._nextBtn = this.querySelector('[data-ib-next]');
    this._playBtn = this.querySelector('[data-ib-play]');
    this._counter = this.querySelector('[data-ib-counter]');
    this._live = this.querySelector('[data-ib-live]');
    this._current = {
      el: this.querySelector('[data-ib-current]'),
      kind: this.querySelector('[data-ib-current-kind]'),
      tool: this.querySelector('[data-ib-current-tool]'),
      status: this.querySelector('[data-ib-current-status]'),
      outlabel: this.querySelector('[data-ib-current-outlabel]'),
      text: this.querySelector('[data-ib-current-text]'),
      inlabel: this.querySelector('[data-ib-current-inlabel]'),
      args: this.querySelector('[data-ib-current-args]'),
    };
    if (
      !this._scenarioRow || !this._resetBtn || !this._ctrlSlot ||
      !this._prevBtn || !this._nextBtn || !this._playBtn || !this._counter ||
      !this._current.el || !this._current.kind || !this._current.text
    ) {
      throw new Error('interactive: missing stage chrome');
    }
    for (const scenario of this._spec.scenarios) {
      if (!findScenario(this._spec, scenario.id)) throw new Error('interactive: bad scenarios');
    }

    const def = findScenario(this._spec, this._spec.defaultScenario);
    this._state = { scenarioId: def.id, index: 0 };
    this._reduced = prefersReducedMotion();

    // Trusted SSR snapshots of the server-rendered current card and node
    // strip — captured ONCE (kept across reconnects, never re-captured from
    // already-mutated DOM) before the first runtime mutation. Update
    // failures restore exact clones of them (no untrusted innerHTML), so the
    // static fallback is internally consistent. The read-only <details>
    // reference is never cloned or touched, preserving its open state.
    if (!this._ssr) {
      this._ssr = {
        card: this._current.el.cloneNode(true),
        nodes: this._nodesEl.cloneNode(true),
      };
    }

    this._bind();
    this._observe();
    this._labelChrome();
    this._render();

    // First render succeeded — swap the interactive controls into the
    // same-sized static slots (geometry stays identical) and enhance.
    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    show(this._ctrlSlot, false);
    show(this._prevBtn, true);
    show(this._playBtn, true);
    show(this._nextBtn, true);
    show(this._counter, true);
    this._paintReducedMotion();
    this.setAttribute('data-enhanced', 'agent-loop');
    this._ready = true;
    this._bound = true;
  }

  _bind() {
    if (this._bound) return;
    this._binder.abort();

    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      this._binder.listen(button, 'click', () => {
        try {
          this._selectScenario(button.getAttribute('data-ib-scenario'));
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
    this._binder.listen(this._prevBtn, 'click', () => {
      try {
        this._pause();
        this._state = {
          scenarioId: this._state.scenarioId,
          index: clampIndex(this._state.index - 1, this._scenario()),
        };
        this._render();
      } catch (err) {
        this._fallback(err);
      }
    });
    this._binder.listen(this._nextBtn, 'click', () => {
      try {
        this._pause();
        this._state = {
          scenarioId: this._state.scenarioId,
          index: clampIndex(this._state.index + 1, this._scenario()),
        };
        this._render();
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
    // remove/re-insert cycle keeps receiving change events (regression: the
    // listener used to be released with the old AbortController and never
    // re-created). Switching the preference on stops playback immediately
    // and disables auto-play, keeping manual stepping.
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

  _scenario() {
    return findScenario(this._spec, this._state.scenarioId);
  }

  _labelChrome() {
    // Fixed button copy comes from the component's bilingual dictionary and is
    // applied before anything is unhidden (short visible labels, full
    // accessible names).
    const lang = uiLang(this._config);
    this._resetBtn.textContent = uiLabel(lang, 'reset');
    this._resetBtn.setAttribute('aria-label', uiLabel(lang, 'resetAria'));
    this._prevBtn.textContent = uiLabel(lang, 'prev');
    this._prevBtn.setAttribute('aria-label', uiLabel(lang, 'prevAria'));
    this._nextBtn.textContent = uiLabel(lang, 'next');
    this._nextBtn.setAttribute('aria-label', uiLabel(lang, 'nextAria'));
    this._playBtn.textContent = uiLabel(lang, 'play');
    this._playBtn.setAttribute('aria-label', uiLabel(lang, 'playAria'));
  }

  _paintReducedMotion() {
    // prefers-reduced-motion: no auto-play; manual stepping stays.
    if (this._playBtn) this._playBtn.disabled = Boolean(this._reduced);
  }

  _paintPlayButton() {
    const lang = uiLang(this._config);
    const key = this._playing ? 'pause' : 'play';
    this._playBtn.textContent = uiLabel(lang, key);
    this._playBtn.setAttribute('aria-label', uiLabel(lang, `${key}Aria`));
  }

  _paintScenarioButtons() {
    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._state.scenarioId)
      );
    }
  }

  /* ── playback (finite, manual-only) ─────────────────────────────────── */

  _play() {
    if (this._reduced) return;
    const scenario = this._scenario();
    // Playing at the last step restarts the finite sequence from step 1.
    if (isFinished(this._state.index, scenario)) {
      this._state = { scenarioId: this._state.scenarioId, index: 0 };
      this._render();
    }
    this._playing = true;
    this._paintPlayButton();
    this._schedule();
  }

  _schedule() {
    this._binder.cancel(this._playTimer);
    this._playTimer = this._binder.timeout(() => {
      this._playTimer = null;
      if (!this._playing) return;
      const scenario = this._scenario();
      if (!canStepNext(this._state.index, scenario)) {
        this._pause();
        return;
      }
      this._state = {
        scenarioId: this._state.scenarioId,
        index: clampIndex(this._state.index + 1, scenario),
      };
      try {
        this._render();
      } catch (err) {
        this._fallback(err);
        return;
      }
      if (isFinished(this._state.index, scenario)) {
        // Terminal pause in the same cycle as reaching the final event: no
        // trailing playback timer survives.
        this._pause();
        return;
      }
      this._schedule();
    }, PLAY_STEP_MS);
  }

  _pause() {
    this._playing = false;
    this._binder.cancel(this._playTimer);
    this._playTimer = null;
    if (this._playBtn) this._paintPlayButton();
  }

  /* ── state → view (one current scenario, one current event) ─────────── */

  _selectScenario(id) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._pause(); // switching always stops running timers
    this._state = { scenarioId: id, index: 0 };
    silence(this._binder, this._live);
    this._render();
  }

  _reset() {
    this._pause(); // reset stops running timers
    this._state = { scenarioId: this._spec.defaultScenario, index: 0 };
    silence(this._binder, this._live);
    this._render();
  }

  _render() {
    const scenario = this._scenario();
    const index = clampIndex(this._state.index, scenario);
    this._state = { scenarioId: this._state.scenarioId, index };
    const event = scenario.events[index];
    const lang = uiLang(this._config);

    // Current event card (the stage shows exactly one event at a time).
    this._current.el.setAttribute('data-ib-kind', event.kind);
    this._current.el.setAttribute('aria-label', this._copy.scenarioLabels[scenario.id]);
    this._current.kind.textContent = this._copy.stepKinds[event.kind];
    show(this._current.tool, Boolean(event.tool));
    if (event.tool) this._current.tool.textContent = event.tool;
    const status = event.kind === 'tool_result' ? event.status : event.kind === 'stop' ? event.reason : '';
    show(this._current.status, Boolean(status));
    if (status) this._current.status.textContent = status;
    show(this._current.outlabel, event.kind === 'tool_result');
    this._current.text.textContent = event.copy[lang].text;
    const hasInput = event.kind === 'tool_call' && Boolean(event.args);
    show(this._current.inlabel, hasInput);
    if (hasInput) this._current.args.textContent = event.args;

    this._prevBtn.disabled = !canStepPrev(index, scenario);
    this._nextBtn.disabled = !canStepNext(index, scenario);
    this._counter.textContent = `${index + 1} / ${stepCount(scenario)}`;
    this._paintPlayButton();
    this._paintScenarioButtons();

    for (const node of this._nodes) {
      node.classList.toggle('is-active', node.getAttribute('data-ib-node') === nodeForKind(event.kind));
    }

    const kindLabel = this._copy.stepKinds[event.kind];
    announce(this._binder, this._live, `${kindLabel} · ${event.copy[lang].text}`, 0);
  }

  /* ── failure handling ───────────────────────────────────────────────── */

  _fallback(err) {
    try {
      console.warn('blog-agent-loop: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    // Safe at every partial-initialisation point: stop timers first, guard
    // every handle below (config/stage may not exist yet).
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
    show(this._prevBtn, false);
    show(this._playBtn, false);
    show(this._nextBtn, false);
    show(this._counter, false);
    if (this._live) this._live.textContent = '';
    // Restore the trusted server-rendered current card and decorative node
    // strip from the untouched SSR snapshots (a partially repainted card
    // would mix two events). cloneNode only — never untrusted innerHTML.
    // The <details> reference is left exactly as the reader has it.
    try {
      if (this._ssr && this._current.el && this._nodesEl) {
        this._current.el.replaceWith(this._ssr.card.cloneNode(true));
        this._nodesEl.replaceWith(this._ssr.nodes.cloneNode(true));
      }
      this._current = {
        el: this.querySelector('[data-ib-current]'),
        kind: this.querySelector('[data-ib-current-kind]'),
        tool: this.querySelector('[data-ib-current-tool]'),
        status: this.querySelector('[data-ib-current-status]'),
        outlabel: this.querySelector('[data-ib-current-outlabel]'),
        text: this.querySelector('[data-ib-current-text]'),
        inlabel: this.querySelector('[data-ib-current-inlabel]'),
        args: this.querySelector('[data-ib-current-args]'),
      };
      this._nodesEl = this.querySelector('[data-ib-nodes]');
      this._nodes = this.querySelectorAll('[data-ib-node]');
    } catch {
      // Leave whatever static DOM exists readable; never blank the figure.
    }
    this._state = this._spec
      ? { scenarioId: this._spec.defaultScenario, index: 0 }
      : this._state;
  }
}

if (!customElements.get('blog-agent-loop')) {
  customElements.define('blog-agent-loop', BlogAgentLoop);
}
