Start your response with:

```
──────────── ⚡ OVERDRIVE ─────────────
》》》 Entering overdrive mode...
```

Push an interface past conventional limits. This isn't just about visual effects. It's about using the full power of the browser to make any part of an interface feel extraordinary: a table that handles a million rows, a dialog that morphs from its trigger, a form that validates in real-time with streaming feedback, a page transition that feels cinematic.

Context decides what "extraordinary" means. A particle system on a creative portfolio is impressive. The same particle system on a settings page is embarrassing. But a settings page with instant optimistic saves and animated state transitions? That's extraordinary too. Understand the project's personality and goals before deciding what's appropriate.

### Propose Before Building

This command has the highest potential to misfire. Do NOT jump straight into implementation. You MUST:

1. **Think through 2-3 different directions**: consider different techniques, levels of ambition, and aesthetic approaches. For each direction, briefly describe what the result would look and feel like.
2. **Get the user's pick before writing any code.** Ask the user directly to clarify what you cannot infer. Carry each direction's description and its trade-offs (browser support, performance cost, complexity) inside the option itself, so the user is choosing between things they can read. A structured question blocks the message it rides in until the user answers, so directions written alongside the question stay invisible while the user is being asked to choose between them.
3. Only proceed with the direction the user confirms.

Skipping this step risks building something embarrassing that needs to be thrown away.

### Verify in the Browser

Ambitious effects rarely work on the first try, so verify them in the browser rather than from code: an effect that technically runs can still stutter, ease wrong, or land on the wrong frame. Aim the checks at timing, easing, and smoothness, batch the fixes between looks, and keep refining until the effect is extraordinary.

---

## Assess What "Extraordinary" Means Here

The right kind of technical ambition depends entirely on what you're working with. Before choosing a technique, ask: **what would make a user of THIS specific interface say "wow, that's nice"?**

### For visual/marketing surfaces
Pages, hero sections, landing pages, portfolios: the "wow" is often sensory: a scroll-driven reveal, a shader background, a cinematic page transition, generative art that responds to the cursor.

### For functional UI
Tables, forms, dialogs, navigation: the "wow" is in how it FEELS: a dialog that morphs from the button that triggered it via View Transitions, a data table that renders 100k rows at 60fps via virtual scrolling, a form with streaming validation that feels instant, drag-and-drop with spring physics.

### For performance-critical UI
The "wow" is invisible but felt: a search that filters 50k items without a flicker, a complex form that never blocks the main thread, an image editor that processes in near-real-time. The interface just never hesitates.

### For data-heavy interfaces
Charts and dashboards: the "wow" is in fluidity: GPU-accelerated rendering via Canvas/WebGL for massive datasets, animated transitions between data states, force-directed graph layouts that settle naturally.

**The common thread**: something about the implementation goes beyond what users expect from a web interface. The technique serves the experience, not the other way around.

## The Toolkit

Organized by what you're trying to achieve, not by technology name.

Record the project's browser and device support floor before choosing an enhancement. Support varies by version, device, and policy: use `@supports` for CSS declarations and runtime capability checks for APIs, verify behavior on the supported targets, and keep a functional baseline when a feature is absent or initialization fails.

### Make transitions feel cinematic
- **View Transitions API**: shared element morphing between states. Check `document.startViewTransition` for same-document transitions and verify cross-document support separately against the project's support floor; retain normal navigation and state updates when unavailable.
- **`@starting-style`**: CSS entry transitions, including elements becoming visible from `display: none`. Verify support on the project's targets and keep the base visible state usable without the entry effect.
- **Spring physics**: natural motion with mass, tension, and damping instead of cubic-bezier. Libraries: motion (formerly Framer Motion), GSAP, or roll your own spring solver.

### Tie animation to scroll position
- **Scroll-driven animations** (`animation-timeline: scroll()`): CSS-only parallax, progress bars, and reveal sequences. Gate with `@supports (animation-timeline: scroll())` and preserve static content and progress information in the baseline.

### Render beyond CSS
- **WebGL**: shader effects, post-processing, particle systems. Libraries: Three.js, OGL (lightweight), regl. Check context creation and keep a CSS baseline when unavailable.
- **WebGPU**: GPU rendering and compute where the project's targets support it. API presence is only the first check: adapter and device creation must succeed; otherwise try WebGL2, then the CSS baseline.
- **Canvas 2D / OffscreenCanvas**: custom rendering, pixel manipulation, or moving heavy rendering off the main thread entirely via Web Workers + OffscreenCanvas.
- **SVG filter chains**: displacement maps, turbulence, morphology for organic distortion effects. CSS-animatable.

### Make data feel alive
- **Virtual scrolling**: render only visible rows for tables/lists with tens of thousands of items. No library required for simple cases; TanStack Virtual for complex ones.
- **GPU-accelerated charts**: Canvas or WebGL-rendered data visualization for datasets too large for SVG/DOM. Libraries: deck.gl, regl-based custom renderers.
- **Animated data transitions**: morph between chart states rather than replacing. D3's `transition()` or View Transitions for DOM-based charts.

### Animate complex properties
- **`@property`**: register typed custom CSS properties for interpolation. Verify support on target browsers (or check `CSS.registerProperty` when registering from JS) and provide valid static custom-property defaults.
- **Web Animations API**: composable, cancellable, reversible JavaScript-driven animations. Check `element.animate` and keep state changes and useful feedback working without it; measure performance on target devices.

### Push performance boundaries
- **Web Workers**: move computation off the main thread. Heavy data processing, image manipulation, search indexing: anything that would cause jank.
- **OffscreenCanvas**: render in a Worker thread. The main thread stays free while complex visuals render in the background.
- **WASM**: near-native performance for computation-heavy features. Image processing, physics simulations, codecs.

### Interact with the device
- **Web Audio API**: spatial audio, audio-reactive visualizations, sonic feedback. Requires user gesture to start.
- **Device APIs**: orientation, ambient light, geolocation. Use sparingly and always with user permission.

**NOTE**: This command is about enhancing how an interface FEELS, not changing what a product DOES. Adding real-time collaboration, offline support, or new backend capabilities are product decisions, not UI enhancements. Focus on making existing features feel extraordinary.

## Implement with Discipline

### Progressive enhancement is non-negotiable

Every technique must degrade gracefully. The experience without the enhancement must still be good.

```css
@supports (animation-timeline: scroll()) {
  .hero { animation-timeline: scroll(); }
}
```

```javascript
async function selectRenderingBackend(canvas) {
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        const device = await adapter.requestDevice();
        return { kind: 'webgpu', adapter, device };
      }
    } catch {
      // A denied or failed device request continues to the fallback.
    }
  }
  try {
    const gl = canvas.getContext('webgl2');
    if (gl) return { kind: 'webgl2', gl };
  } catch {
    // Context creation can also fail despite API presence.
  }
  return { kind: 'css' }; // Keep the baseline visible and usable.
}
```

Initialize only the selected backend. If rendering setup or a later WebGPU `device.lost` / WebGL context loss fails, release its resources and restore the fallback, replacing the canvas when switching context types requires it.

### Performance rules

- Target 60fps. If dropping below 50, simplify.
- Lazy-initialize heavy resources (WebGL contexts, WASM modules) only when near viewport.
- Pause off-screen rendering. Kill what you can't see.
- Test on real mid-range devices, not just your development machine.

### Polish is the difference

The gap between "cool" and "extraordinary" is in the last 20% of refinement: the easing curve on a spring animation, the timing offset in a staggered reveal, the subtle secondary motion that makes a transition feel physical. Don't ship the first version that works; ship the version that feels inevitable.

**NEVER**:
- Ship effects that cause jank on mid-range devices
- Use bleeding-edge APIs without a functional fallback
- Add sound without explicit user opt-in
- Use technical ambition to mask weak design fundamentals; fix those first with other commands
- Layer multiple competing extraordinary moments. Focus creates impact, excess creates noise

## Verify the Result

- **The wow test**: Show it to someone who hasn't seen it. Do they react?
- **The removal test**: Take it away. Does the experience feel diminished, or does nobody notice?
- **The device test**: Run it on a phone, a tablet, a Chromebook. Still smooth?
- **The context test**: Does this make sense for THIS brand and audience?

"Technically extraordinary" isn't about using the newest API. It's about making an interface do something users didn't think a website could do.
