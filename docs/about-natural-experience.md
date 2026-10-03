# About: a personal album

Applies to `/about/` and `/zh/about/`. The first screen names Xinwei, shows an
actual portrait, and offers two routes: his history and writing. Short public
milestones, real product screenshots and travel photographs carry the page.
The existing paper/ink/rust palette and assets are retained.

## Design decision

Two local directions were rendered at desktop and phone sizes. A short
introduction beside a portrait was selected. A panorama before the introduction
made identity appear too late on a phone and cropped the person on desktop.
Evidence is recorded in `output/playwright/about-quiet/` (local delivery evidence,
not shipped assets). No new framework or animation dependency is added.

## Browsing

- Hero photos, writing subjects, products and travel use native horizontal
  overflow with CSS scroll snapping. The adjacent image suggests more content.
  Touch and trackpad scrolling belong to the browser; vertical scrolling stays
  native. There are no playback controls, automatic rotation or duplicate travel
  thumbnail grid.
- Desktop mouse dragging follows the pointer only after horizontal intent is
  clear. Stationary clicks still open native details or real links. A drag cannot
  activate its incidental click. Named text choices remain available for direct
  navigation, with 44px targets and a selected underline.
- ArrowLeft/Right and Home/End navigate a focused rail. Text inputs retain editing
  keys. All cards remain accessible; focusing an offscreen card reveals it.
  Choice/key navigation scrolls the local track without moving the document.
- Native product `details` preserve an opened description while browsing by
  scrolling or focus. Explicitly choosing a different product closes the old
  detail; its external visit link remains a separate real action. No asynchronous
  View Transition callback intercepts native expansion.
- Selection counters are available to assistive technology. Reduced motion makes
  direct navigation immediate and disables the small photograph scale effect.
  It never starts timed movement.
- With JavaScript disabled or the module blocked, every image/card is a readable
  list in normal flow. Native details and links keep working. Sections
  reserve their actual height in every mode, avoiding content-visibility estimates
  that shift the document during touch browsing. Old stacked-deck state styles are explicitly reset on this page.

## Content and stable entry points

`data/about-story.yml` has five concise bilingual summaries, optional full detail
and links to existing posts. Facts remain grounded in `data/identity.json` and
`static/data/personal-timeline-2019-2026.md`; no employers, metrics or current
locations are inferred.

`#identity` retains names, birth year and real public links. The long biography,
timeline and machine-readable snapshot are under native disclosure.
`/data/identity.json`, the public timeline endpoint and Person JSON-LD are retained.
Feedback is optional disclosure; opening it explains that Telepace uses an AI
interviewer. Consent, privacy and campaign configuration remain intact.

## Validation and delivery

`about-natural-experience.spec.ts` covers both languages, scoped keys, focus,
editing, named choices, actual phone touch gestures, vertical scrolling, elapsed
time, preference changes, public story links and static fallbacks.
`about-experience.spec.ts` retains mobile menu and real popup/link-versus-drag
regressions. `pages-about.spec.ts` covers narrative, interview fallback and the
intentional desktop/phone screenshot baselines. Page-wayfinder checks retain
stable section destinations.

Run the affected tests against frozen Hugo production output, plus TypeScript,
JavaScript syntax and diff checks. Inspect light/dark views and expanded products
at phone, tablet and desktop sizes. Record actual results in the PR; screenshot
updates alone are not visual acceptance.

Before merge, require the current PR head's applicable CI and Netlify preview
checks. After merge, verify the public HTML, fingerprinted module and real
browsing on both language routes. A local build is not deployment evidence.
