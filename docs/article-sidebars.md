# Article sidebar visibility

Desktop articles retain the same grid, reading width, and document position when
their sidebars fade. Metadata and tools stay mounted, so the active tool, AI
conversation, input draft, and panel scroll position survive hiding. A separate
control above the tools always remains visible and outside the panel's scrolling
area. There are no backend requests or third-party dependencies.

## Reading and explicit choice

- At 1200px and wider, automatic hiding starts only when the prose intersects the
  upper third of the viewport. The opening and the area after the prose retain
  their ordinary sidebars. Existing breakpoints still determine whether one or
  both sidebars are displayed.
- A continuous 120px downward movement hides the sidebars; a continuous 64px
  upward movement reveals them. Reversing direction resets accumulated distance.
  Only a visibility transition causes DOM writes, rather than every scroll frame.
- “Show sidebars” reveals and pins them. “Pin sidebars” also pins the visible
  sidebars. “Unpin sidebars” resumes automatic behavior from a fresh gesture.
  Only this explicit choice is stored, in `cubxxw.article-sidebars.pinned`.
  Storage errors leave the current page working normally.
- The fade takes 180ms and can reverse immediately. No width, grid, position,
  translation, or article scroll offset is animated.

## Interaction boundaries

Focus or pointer presence inside a sidebar, a nonempty text selection, the active
AI tab, or an ongoing AI answer keeps the sidebars open. Tab reveals the tools
before native keyboard focus moves. Hidden sidebar contents become `inert`,
removing invisible controls from interaction and the accessibility tree; the
restore button remains available.

Same-page anchors, history navigation, page restoration, visibility changes, and
resizes reveal and reset the accumulated gesture. Navigation scrolling is ignored
until `scrollend` or 220ms of quiet; an explicit wheel, touch, or scrolling key can
resume reading earlier. Passage analysis reveals synchronously during event
capture, before the existing chat controller focuses its input.

Below 1200px or with reduced motion enabled, automatic hiding is disabled, the
control is hidden, and inertness is cleared. The existing compact tool sheet
continues to own mobile interaction. Changing width or motion preference starts
expanded, while preserving a stored pin. Without JavaScript, IntersectionObserver,
or native inert support, the ordinary visible sidebars remain usable. Print hides
the control and clears the fade styling.

## Validation

`node --test scripts/article-sidebars.test.mjs` exercises reading thresholds,
direction reversal, entry/exit, interaction locks, explicit pinning, restored
preferences, layout changes, navigation reset, overscroll, and render frequency.
It is also included in `npm run ux:test`.

Use `netlify dev` for browser acceptance on real Chinese and English article
pages. Check main-column geometry before/after hiding; restore and pin persistence;
focus, selection and AI draft retention; an internal heading jump; 1199/1200px
and 1535/1536px boundaries; mobile tools; reduced motion; dark mode; print; and a
storage-denied context. Build template changes with `hugo --minify`.
