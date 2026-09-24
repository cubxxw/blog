/**
 * vector-cosine.mjs — <blog-vector-cosine> (geometry expansion).
 *
 * Native autonomous custom element, Light DOM. The server-rendered 2-D plane
 * (default scenario, same spec data) is the fallback; this module swaps the
 * interactive control row into a same-sized visibility:hidden slot row (zero
 * layout shift on upgrade) and repaints the plane with the pure functions in
 * vector-cosine-model.mjs. The read-only <details> reference is never
 * touched, and the SVG is decorative — every value it shows is also in the
 * numeric readout beside it (drag is never required; the wrapping coordinate
 * fields are the keyboard/numeric equivalent).
 *
 * State is per-instance browser memory — no storage, no network. Enhancement
 * is all-or-nothing: `data-enhanced` is set and controls swapped in only
 * after config validation (the same executable schema the build gate uses),
 * event binding and the first render succeed. Any failure — including corrupt
 * embedded config — restores the complete static view from the trusted SSR
 * snapshot; failure is safe at every initialisation point and never affects
 * another instance.
 */

import { validateWith } from './spec-core.mjs';
import { validateVectorCosine } from './vector-cosine-model.mjs';
import {
  angleArcPath,
  arrowHead,
  explainKey,
  formatNum,
  pointerToPlane,
  rotateVector,
  scaleLength,
  setCoord,
  setVector,
  vectorMath,
} from './vector-cosine-model.mjs';
import { findScenario, defaultScenario } from './model.mjs';
import { Binder, announce, loadSpec, readConfig, show, silence, uiLang } from './shared.mjs';
import { uiLabel } from './ui-copy.mjs';

const COORDS = ['ax', 'ay', 'bx', 'by'];

class BlogVectorCosine extends HTMLElement {
  constructor() {
    super();
    this._binder = new Binder();
    this._ready = false;
    this._bound = false;
    this._state = null;
    this._drag = null;
  }

  connectedCallback() {
    if (this._ready) {
      // Reconnect: rebind once (never double-bind) and repaint so no stale
      // control state survives removal; this DOM instance keeps its state.
      // A render failure on RECONNECT must fall back exactly like setup does
      // (restore SSR, hide dead controls) instead of escaping the callback.
      try {
        this._bind();
        this._paint();
      } catch (err) {
        this._fallback(err);
      }
      return;
    }
    try {
      this._setup();
    } catch (err) {
      this._fallback(err);
    }
  }

  disconnectedCallback() {
    // Release listeners (pointer capture handlers included) and pending
    // announcement timers; keep this instance's state so reconnecting works.
    this._binder.abort();
    this._bound = false;
    this._drag = null;
  }

  /* ── init (throws on any problem → static fallback) ─────────────────── */

  _setup() {
    this._config = readConfig(this);
    this._spec = loadSpec(this._config, 'vector-cosine',
      (raw, options) => validateWith(raw, ['vector-cosine'], validateVectorCosine, options));
    this._copy = this._spec.copy[uiLang(this._config)];
    this._extent = this._spec.model.bound + 1;

    this._stage = this.querySelector('[data-ib-stage]');
    this._svg = this.querySelector('[data-ib-svg]');
    this._scnStatic = this.querySelector('[data-ib-scn-static]');
    this._scenarioRow = this.querySelector('[data-ib-scenarios]');
    this._headSlot = this.querySelector('[data-ib-head-slot]');
    this._resetBtn = this.querySelector('[data-ib-reset]');
    this._ctrlSlot = this.querySelector('[data-ib-ctrl-slot]');
    this._controls = this.querySelector('[data-ib-controls]');
    this._scale = this.querySelector('[data-ib-scale]');
    this._scaleOut = this.querySelector('[data-ib-scale-out]');
    this._live = this.querySelector('[data-ib-live]');
    this._explain = this.querySelector('[data-ib-explain]');
    if (
      !this._stage || !this._svg || !this._scnStatic || !this._scenarioRow ||
      !this._resetBtn || !this._ctrlSlot || !this._controls ||
      !this._scale || !this._scaleOut || !this._explain
    ) {
      throw new Error('interactive: missing vector chrome');
    }

    this._vals = new Map();
    for (const el of this.querySelectorAll('[data-ib-val]')) {
      this._vals.set(el.getAttribute('data-ib-val'), el);
    }
    this._coords = new Map();
    for (const input of this.querySelectorAll('[data-ib-coord]')) {
      this._coords.set(input.getAttribute('data-ib-coord'), input);
    }
    for (const key of COORDS) {
      if (!this._vals.has(key) || !this._coords.has(key)) {
        throw new Error(`interactive: missing coord binding ${key}`);
      }
    }
    this._geom = {
      line: new Map(),
      head: new Map(),
      tag: new Map(),
      dot: new Map(),
      handle: new Map(),
    };
    for (const kind of ['line', 'head', 'tag', 'dot', 'handle']) {
      for (const el of this.querySelectorAll(`[data-ib-${kind}]`)) {
        this._geom[kind].set(el.getAttribute(`data-ib-${kind}`), el);
      }
    }
    this._arc = this.querySelector('[data-ib-arc]');
    if (!this._arc || this._geom.handle.size < 2 || this._geom.dot.size < 2 || this._geom.line.size < 2) {
      throw new Error('interactive: incomplete plane');
    }

    const def = defaultScenario(this._spec);
    if (!def) throw new Error('interactive: missing default scenario');
    this._activeId = def.id;
    this._state = { ax: def.ax, ay: def.ay, bx: def.bx, by: def.by };

    // Trusted SSR snapshot of the stage — captured ONCE before the first
    // runtime mutation. Update failures restore exact clones of it (no
    // untrusted innerHTML). The <details> reference is never touched.
    if (!this._ssr) this._ssr = { stage: this._stage.cloneNode(true) };

    this._bind();
    this._labelChrome();
    this._paint();

    // First render succeeded — only now swap the interactive controls into
    // the same-sized static slots (geometry stays identical) and enhance.
    show(this._scnStatic, false);
    show(this._scenarioRow, true);
    show(this._headSlot, false);
    show(this._resetBtn, true);
    show(this._ctrlSlot, false);
    show(this._controls, true);
    this.setAttribute('data-enhanced', 'vector-cosine');
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
    for (const [key, input] of this._coords) {
      this._binder.listen(input, 'input', () => {
        try {
          const raw = input.value.trim();
          if (raw === '') return; // typing; validated on change
          const value = Number.parseFloat(raw);
          if (!Number.isFinite(value)) return;
          this._state = setCoord(this._state, key, value, this._spec.model);
          this._paint(key);
          this._announce();
        } catch (err) {
          this._fallback(err);
        }
      });
      this._binder.listen(input, 'change', () => {
        try {
          const raw = input.value.trim();
          const value = Number.parseFloat(raw);
          this._state = setCoord(
            this._state,
            key,
            Number.isFinite(value) ? value : this._state[key],
            this._spec.model
          );
          this._paint();
          this._announce();
        } catch (err) {
          this._fallback(err);
        }
      });
    }
    this._binder.listen(this._scale, 'input', () => {
      try {
        this._state = scaleLength(
          this._state,
          Number.parseFloat(this._scale.value),
          this._spec.model
        );
        // Free dragging only while the input event stream is live (explicit
        // skip key); the committed state is shown on change below.
        this._paint('scale');
        this._announce();
      } catch (err) {
        this._fallback(err);
      }
    });
    this._binder.listen(this._scale, 'change', () => {
      try {
        this._state = scaleLength(
          this._state,
          Number.parseFloat(this._scale.value),
          this._spec.model
        );
        this._paint();
        this._announce();
      } catch (err) {
        this._fallback(err);
      }
    });
    for (const button of this.querySelectorAll('[data-ib-rot]')) {
      this._binder.listen(button, 'click', () => {
        try {
          const delta = Number.parseInt(button.getAttribute('data-ib-rot'), 10) * this._spec.model.angleStep;
          this._state = rotateVector(this._state, delta, this._spec.model);
          this._paint();
          this._announce();
        } catch (err) {
          this._fallback(err);
        }
      });
    }

    // Pointer drag with capture + cancel handling. The handle is the only
    // drag surface; the coordinate fields are the full keyboard equivalent.
    for (const [which, handle] of this._geom.handle) {
      this._binder.listen(handle, 'pointerdown', (event) => {
        try {
          event.preventDefault();
          this._drag = { which, pointerId: event.pointerId };
          try {
            handle.setPointerCapture(event.pointerId);
          } catch {
            /* capture unsupported — document-level handlers still work */
          }
          this._pointerMove(which, event);
        } catch (err) {
          this._fallback(err);
        }
      });
      this._binder.listen(handle, 'pointermove', (event) => {
        if (!this._drag || this._drag.pointerId !== event.pointerId) return;
        try {
          this._pointerMove(which, event);
        } catch (err) {
          this._fallback(err);
        }
      });
      const end = (event) => {
        if (!this._drag || this._drag.pointerId !== event.pointerId) return;
        try {
          handle.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }
        this._drag = null;
      };
      this._binder.listen(handle, 'pointerup', end);
      this._binder.listen(handle, 'pointercancel', end);
      this._binder.listen(document, 'pointermove', (event) => {
        if (!this._drag || this._drag.which !== which || this._drag.pointerId !== event.pointerId) return;
        try {
          this._pointerMove(which, event);
        } catch (err) {
          this._fallback(err);
        }
      });
      this._binder.listen(document, 'pointerup', end);
      this._binder.listen(document, 'pointercancel', end);
    }
    this._bound = true;
  }

  _pointerMove(which, event) {
    const point = pointerToPlane(
      event.clientX,
      event.clientY,
      this._svg.getBoundingClientRect(),
      this._spec.model,
      this._extent
    );
    this._state = setVector(this._state, which, point.x, point.y, this._spec.model);
    this._paint();
    this._announce();
  }

  _labelChrome() {
    // Fixed button copy comes from the component's bilingual dictionary and
    // is applied before anything is unhidden.
    const lang = uiLang(this._config);
    this._resetBtn.textContent = uiLabel(lang, 'reset');
    this._resetBtn.setAttribute('aria-label', uiLabel(lang, 'resetAria'));
  }

  /* ── state → view (pure computation from vector-cosine-model) ───────── */

  _paint(skipKey) {
    const result = vectorMath(this._state);
    const model = this._spec.model;

    // Plane geometry (math → SVG: y flipped).
    for (const which of ['a', 'b']) {
      const x = which === 'a' ? result.ax : result.bx;
      const y = which === 'a' ? result.ay : result.by;
      const line = this._geom.line.get(which);
      line.setAttribute('x2', String(x));
      line.setAttribute('y2', String(-y));
      const head = arrowHead(x, y);
      this._geom.head
        .get(which)
        .setAttribute('points', head ? this._headPoints(head) : '');
      const tag = this._geom.tag.get(which);
      tag.setAttribute('x', String(x + 0.4));
      tag.setAttribute('y', String(-y - 0.35));
      const dot = this._geom.dot.get(which);
      dot.setAttribute('cx', String(x));
      dot.setAttribute('cy', String(-y));
      const handle = this._geom.handle.get(which);
      handle.setAttribute('cx', String(x));
      handle.setAttribute('cy', String(-y));
    }
    this._arc.setAttribute('d', angleArcPath(result.ax, result.ay, result.bx, result.by) || '');

    // Numeric readout (the accessible equivalent of the plane).
    const c = this._copy;
    this._vals.get('ax').textContent = formatNum(result.ax, 2);
    this._vals.get('ay').textContent = formatNum(result.ay, 2);
    this._vals.get('bx').textContent = formatNum(result.bx, 2);
    this._vals.get('by').textContent = formatNum(result.by, 2);
    this._vals.get('dot').textContent = formatNum(result.dot, 2);
    this._vals.get('magA').textContent = formatNum(result.magA, 2);
    this._vals.get('magB').textContent = formatNum(result.magB, 2);
    this._vals.get('angle').textContent =
      result.angleDeg === null ? c.undefinedText : `${formatNum(result.angleDeg, 1)}°`;
    this._vals.get('cosine').textContent =
      result.cos === null ? c.undefinedText : formatNum(result.cos, 3);
    this._explain.textContent = c.explanations[explainKey(result)];

    // Controls track the committed state. Free typing/dragging is preserved
    // only for the control named by `skipKey` (the live input event stream);
    // every other paint — including 'change' — shows the bounded state.
    for (const key of COORDS) {
      if (key === skipKey) continue;
      const input = this._coords.get(key);
      const shown = formatNum(this._state[key], 2);
      if (input.value !== shown) input.value = shown;
    }
    if (skipKey !== 'scale') {
      const shown = String(result.magB);
      if (this._scale.value !== shown) this._scale.value = shown;
    }
    this._scaleOut.textContent = formatNum(result.magB, 2);
    const thumb = this._ctrlSlot.querySelector('.ib-range-thumb');
    if (thumb) {
      const pct = model.bound > 0 ? Math.min(100, (result.magB / model.bound) * 100) : 0;
      thumb.style.left = `${pct}%`;
    }

    for (const button of this.querySelectorAll('[data-ib-scenario]')) {
      button.setAttribute(
        'aria-pressed',
        String(button.getAttribute('data-ib-scenario') === this._activeId)
      );
    }
  }

  _headPoints(head) {
    return [
      `${head.tip.x},${-head.tip.y}`,
      `${head.left.x},${-head.left.y}`,
      `${head.right.x},${-head.right.y}`,
    ].join(' ');
  }

  _summary(result) {
    const c = this._copy;
    const cos = result.cos === null ? c.undefinedText : formatNum(result.cos, 3);
    const angle = result.angleDeg === null ? c.undefinedText : `${formatNum(result.angleDeg, 1)}°`;
    return (
      `${c.metrics.dot} ${formatNum(result.dot, 2)} · ${c.metrics.cosine} ${cos} · ` +
      `${c.metrics.angle} ${angle}`
    );
  }

  _announce() {
    announce(this._binder, this._live, this._summary(vectorMath(this._state)), 300);
  }

  /** Load a preset scenario's vectors (restores its authored values). */
  _activate(id) {
    const scenario = findScenario(this._spec, id);
    if (!scenario) throw new Error(`interactive: unknown scenario ${id}`);
    this._activeId = id;
    this._state = { ax: scenario.ax, ay: scenario.ay, bx: scenario.bx, by: scenario.by };
    silence(this._binder, this._live);
    this._paint();
  }

  /** Reset: the default scenario's authored vectors (no reader memory). */
  _reset() {
    this._activate(this._spec.defaultScenario);
  }

  /* ── failure handling: stop enhancing, restore the static view ──────── */

  _fallback(err) {
    try {
      console.warn('blog-vector-cosine: enhancement disabled', err);
    } catch {
      /* console unavailable */
    }
    this._binder.abort();
    this._bound = false;
    this._ready = false;
    this._drag = null;
    this.removeAttribute('data-enhanced');
    show(this._scnStatic, true);
    show(this._scenarioRow, false);
    show(this._headSlot, true);
    show(this._resetBtn, false);
    show(this._ctrlSlot, true);
    show(this._controls, false);
    if (this._live) this._live.textContent = '';
    // Restore the trusted server-rendered stage from the untouched SSR
    // snapshot (a partially repainted plane would mix two states).
    // cloneNode only — never untrusted innerHTML. The <details> reference is
    // left exactly as the reader has it.
    try {
      if (this._ssr && this._stage) {
        this._stage.replaceWith(this._ssr.stage.cloneNode(true));
        this._stage = this.querySelector('[data-ib-stage]');
        this._svg = this.querySelector('[data-ib-svg]');
        this._arc = this.querySelector('[data-ib-arc]');
        this._explain = this.querySelector('[data-ib-explain]');
        this._vals = new Map();
        for (const el of this.querySelectorAll('[data-ib-val]')) {
          this._vals.set(el.getAttribute('data-ib-val'), el);
        }
        this._geom = { line: new Map(), head: new Map(), tag: new Map(), dot: new Map(), handle: new Map() };
        for (const kind of ['line', 'head', 'tag', 'dot', 'handle']) {
          for (const el of this.querySelectorAll(`[data-ib-${kind}]`)) {
            this._geom[kind].set(el.getAttribute(`data-ib-${kind}`), el);
          }
        }
      }
      const def = this._spec ? defaultScenario(this._spec) : null;
      if (def) {
        this._activeId = def.id;
        this._state = { ax: def.ax, ay: def.ay, bx: def.bx, by: def.by };
      }
    } catch {
      // Leave whatever static DOM exists readable; never blank the figure.
    }
  }
}

if (!customElements.get('blog-vector-cosine')) {
  customElements.define('blog-vector-cosine', BlogVectorCosine);
}
