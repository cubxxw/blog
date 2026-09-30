# About: personal editorial archive

Applies to `/about/` and `/zh/about/`. This page helps a new reader meet Xinwei,
follow his public history, and inspect an actual product or piece of writing.

## Design decision

We rendered two directions at desktop and phone sizes:

- **A, selected:** a short introduction beside a real portrait in the field,
  followed by life chapters, the writing map, workbench, products, travel,
  interview, canonical archive, and contact.
- **B, alternative:** a full-width photograph with the introduction over it.
  This foregrounded travel, but obscured the person and made text contrast
  dependent on the photograph. Revisit only for a travel-first brief.

A makes identity easier to read and keeps the subject of the photograph visible.
The paper, ink, rust accent, typefaces, Bear avatar, photographs, and product
screenshots remain part of the existing site. No new animation runtime is added.

## Interaction

- Named choices replace previous/next arrows for photos, workbench threads, and
  products. Travel uses location-labelled thumbnails. Targets are at least 44px
  tall; phone choice strips scroll horizontally inside the page.
- ArrowLeft/ArrowRight, Home/End, and horizontal swipes still select cards.
  Vertical scrolling remains native. Inactive cards are inert, and selection
  moves focus out of a card before hiding it. Real clicks and drags are distinct.
- Every deck starts paused. Play is explicit; rotation pauses on hover, keyboard
  focus, offscreen, hidden tabs, pagehide, and an expanded product. Reduced motion
  disables rotation; reverting that preference never silently restarts it.
- Products expand in place with native `details`. The content uses the existing
  description, audience, boundary, and question fields, with a separate real
  external visit link. Supported browsers animate the active card using View
  Transitions. A generation check prevents a delayed callback from reopening an
  old card after fast selection. The collapse control stays reachable.
- Where CSS view timelines are supported, the hero photograph gently scales as
  it exits, the introduction recedes, and story chapters reveal on entry.
  Unsupported browsers show the same content without that motion. There is no
  vertical scroll interception, animation loop, sticky stack, particle scene,
  or 3D runtime.
- Reduced-motion CSS immediately disables these animations and in-flight View
  Transition decoration. Without JavaScript, or when the deck module is blocked,
  photos and cards become a readable static list with native details and links.

Decorative arrows, including the About-only floating back-to-top arrow and header
chevron, are hidden. Labels, focus outlines, selected states, underline, and press
feedback communicate actions. Other page layouts retain their existing controls.

## Facts and stable entry points

`data/about-story.yml` contains bilingual editorial chapters. Its facts are
grounded in `data/identity.json` and
`static/data/personal-timeline-2019-2026.md`: first blog/GitHub in 2021, OpenIM in
2023, graduation and leaving corporate work in 2024, Nepal and monthly reflections
in 2025, and AI products plus the new job in August 2026. Each chapter links to an
existing post in its language. Do not add employers, current locations, or metrics
without a canonical source.

`#identity`, `/data/identity.json`, and
`/data/personal-timeline-2019-2026.md` remain available. The long timeline and YAML
snapshot use disclosure, so they do not overwhelm the human introduction.
Interview configuration, consent, and campaign behavior are unchanged.

## Validation

The behavioral tests in `about-experience.spec.ts` and
`about-natural-experience.spec.ts` cover language routes, selected states,
keyboard/swipe, inert/focus, drag versus real links, opt-in autoplay, preference
changes, native expansion, delayed View Transition callbacks, story links,
canonical endpoints, small-screen overflow, no JavaScript, and a blocked module.

Local validation uses the installed Google Chrome channel against a Hugo build;
CI keeps its pinned browser installation and frozen production output. Manual
visual inspection covers 390px, 768px, and 1440px, both languages, light/dark,
collapsed/expanded products, and normal/reduced motion. Screenshot baselines are
updated only after inspection of the intended redesign.

Recorded local results on 2026-10-01 (Shanghai): 76 behavioral/navigation checks
passed, with two desktop-only mobile-menu skips; the four theme/language contrast
cases passed in both browser projects; eight narrative/interview/visual checks
passed, with four opposite-project visual skips. Production Hugo build,
TypeScript checking, and `git diff --check` passed. The frozen-site test fixture
now drains active canonical-resource handlers before disposing its request
client, fixing the observed teardown race without suppressing request errors.

Before merging, require the current PR head's applicable CI and Netlify preview
checks. After merging, verify the public HTML, fingerprinted script, and actual
interaction on both language routes. A local build is not deployment evidence.
