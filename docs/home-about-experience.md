# Homepage and About experience refinement

Baseline: `56dc2879ecc1d7451990a44df94b569c7b5c7639` (26 September 2026).

The central homepage chat entry and its chat header use the author's supplied
forest hiking photograph, cropped to a 400px square WebP at
`static/images/xinwei-hiking-avatar.webp`. Both languages share this asset and
retain the existing circular frame, online badge and chat interaction.
The portrait remains visible when the 3D orb mounts. Local validation passed
the production Hugo build and eight language/theme/viewport combinations
(1440px and 375px), including chat open/close, reduced motion, image loading,
visibility with the orb mounted, no horizontal overflow and no page errors.

The desktop portrait frame is now 84px (previously 100px). With a fine mouse
pointer and motion enabled, the photo moves by up to 4px inside the circular
crop, the frame tilts by up to 3 degrees and a soft glass highlight follows
the pointer. Leaving or blurring the button recenters the photo. Clicking
still opens chat; touch and reduced-motion views keep a static portrait.
The avatar opts out of the delegated click ripple through `data-no-ripple`:
that ripple makes direct children relatively positioned, which moved the
online badge into the flex row and squeezed the photo during a held press.
The avatar's hit area stays stationary when pressed, and its photo disables
native image dragging. Other buttons retain their existing ripple feedback.
The shared feedback script URL includes its content hash so returning visitors
receive the corrected handler. Validation covered 1.1-second held mouse/touch
presses and repeated chat clicks in eight language/theme/viewport combinations;
the photo stayed round, the badge stayed anchored, ordinary ripples remained
available, and the production build and script syntax check passed.

The homepage draws six unique questions from the author's 36-question pool on
each page load. Chinese wording is preserved verbatim and the English pool
follows the same order. Reopening chat retains that page's selection, including
the mobile chat starters. Six fixed percentage-based slots accommodate wrapped
questions around the portrait, with translucent surfaces, thin borders and
soft shadows. Buttons remain stationary on hover and press, and opt out of
the generic ripple so feedback cannot displace the question or its hit area.
At 769–900px the orbit gets extra vertical space and a 72px portrait to keep
long English questions clear of neighboring cards. The empty-chat starters
use two columns and wrap their full text. Validation passed six helper tests,
12 language/theme/viewport combinations, and all 36 questions in every slot
at 769, 900 and 901px in both languages. Chat API responses were mocked.

## Visitor and design decision

A first-time reader needs to understand whose work this is, find a useful article
or product, and move through a long personal archive without losing their place.
The existing Bear identity, travel photography, bilingual writing and real product
links provide the distinctive material. They should remain the foundation.

Two directions were rendered at desktop and mobile widths before implementation:

- **A, personal archive:** retain Bear, reduce the oversized name, introduce direct
  reading/product actions and a numbered reading index. Keep the existing order
  of writing, books, products and activity.
- **B, latest-work edition:** replace the Bear area with a featured recent article.
  This puts a specific article first, but repeats the next section and removes the
  most recognizable homepage interaction. Retained as a possible future direction
  if editorial discovery becomes the sole purpose of the homepage.

A was selected for clearer entry actions with less repeated content. The index
provides native links to the page sections. About keeps the
photographic introduction and provides direct access to writing, products, travel
and the public identity card. This is a design judgment, not a user-study result.

Reference mechanisms: [Maggie Appleton](https://maggieappleton.com/) separates
different kinds of writing; [Josh Comeau](https://www.joshwcomeau.com/about-josh/)
ties interactions to personal material; [Lee Robinson](https://leerob.com/)
provides direct routes to work. Their visual identities are not copied.

## Implementation checklist

| Area | Baseline problem | Chosen change |
| --- | --- | --- |
| First viewport | A very large name and secondary About link dominate the reading entrance | Tighter type scale; primary reading and product links; preserve biography and Bear |
| Long-page navigation | A full-width sticky index covers cards while reading | Margin index at 1600px and wider; in-flow links on smaller screens; native history, reading-position state and keyboard destination focus |
| Mobile About | Chinese heading leaves an isolated final character; carousel controls are small | Responsive Chinese line grouping and 44px controls |
| Motion | Decorative engine downloads before checking device eligibility; About carousel starts automatically | Pre-import eligibility checks, static fallback, explicit carousel play |
| Mobile chat | Hiding the decorative orbit also removes the useful chat | Compact full-row entry, in-place chat and 16px input; no mobile 3D download |
| Page resources | Homepage includes unrelated article/section styles | Explicit homepage shell with shared interaction styles retained |
| Chat | UTF-8/SSE chunk boundaries, unescaped link attributes, stale stream ownership | Incremental parsing, safe links, request cancellation, stable message ownership and accessible feedback |
| Card interaction | Pointer capture includes interactive links | Preserve links, constrain drag handling, keyboard navigation and inactive-card focus isolation |
| Mobile navigation | A closed transparent submenu can intercept taps and retain focus | Explicit closed-state visibility overrides hover/focus rules; exercise real submenu navigation |
| Regression coverage | Home/About functional checks sit in excluded visual suites | Dedicated functional suites for navigation, stream boundaries, safety, lifecycle and carousel behavior |

## Technology choices

- Cross-document View Transitions add a short fade between Home and About when
  motion is allowed. Both documents opt in; unsupported browsers keep ordinary
  navigation. No client router or transition library is required.
- The index uses the outer left margin only when there is space beyond the
  unchanged content column (1600px and wider). A zero-height sticky slot keeps
  it beside the sections without occupying their width. At smaller widths it
  stays in normal flow and scrolls away; there is no floating horizontal bar,
  duplicate section numbering or decorative progress line.
- The side index starts hidden, including before the deferred script loads.
  Once the first section reaches the reading line, it fades in over 280ms with
  a 6px vertical offset. After 1.4 seconds at rest, the label and inactive links
  soften to 68% opacity over 500ms; the current section retains full contrast.
  Continued reading, hover and keyboard focus restore clarity. Returning to the
  introduction hides it again. The effect is driven by reading and interaction,
  never a looping animation. Small-screen inline links remain fully available.
- Reduced motion removes movement and idle dimming; increased contrast also
  disables idle dimming. Keyboard focus reveals the index even before reading,
  and a no-script fallback preserves visible native links. The quiet links use
  the primary ink token so dimming still preserves readable contrast.
- IntersectionObserver watches a narrow reading line below the site header.
  It handles tall sections without per-frame scroll reads; `scrollend` reconciles
  native history restoration after consecutive jumps. Anchor clearance
  includes only the site header, never the side index height. Native links work
  without JavaScript; `aria-current` and destination focus are enhancements.
- Keep 3D as an eligible-device enhancement. No new WebGPU scene, dependency,
  generated biography, fake user metric or third-party service is introduced.
- Homepage body typography uses its existing sans/mono families. The masthead
  can use its existing local serif fallbacks rather than loading the article
  serif families and the large Chinese font manifest for a few navigation labels.

The progressive fallback follows [WebKit's cross-document transition guidance](https://webkit.org/blog/16967/two-lines-of-cross-document-view-transitions-code-you-can-use-on-every-website-today/).
Rendering containment was considered against [web.dev's content-visibility guidance](https://web.dev/articles/content-visibility),
but this change adds no further containment to the sticky, animated About decks.
The existing About calibration remains; reliable anchors and layout take priority
over an unmeasured rendering optimization.

## Validation contract

Use `netlify dev` for the actual rendered flow. Exercise both localized Home and
About routes, 375/768/1440px layouts, light/dark themes, reduced motion, native
history, JavaScript-disabled navigation, live carousel links and mocked AI
responses. AI regression tests must not call a paid provider.

Run `tests/e2e/page-wayfinder.spec.ts` and
`tests/e2e/home-about-experience.spec.ts`, plus
`tests/e2e/about-experience.spec.ts`, outside the visual-regression exclusion.
Run the extracted chat helper tests, typecheck, production Hugo build and the
applicable full CI suites. Keep screenshots and raw test artifacts outside the
repository. Compare resource bytes on the same build type; distinguish raw CSS,
compressed transfer size and field performance. No local measurement proves a
real-user Core Web Vitals improvement.

Preserve unrelated work in the original checkout. Delivery requires independent
review, current-head CI and a readback of the merged revision and deployed assets.

### Navigation refinement, 28 September 2026

The full-width sticky bar obscured article cards while scrolling. It now uses
the outer margin on wide screens and stays in document flow on smaller screens.
Local validation: 58 functional checks passed, with two existing mobile-only
cases skipped in the desktop project. The layout check covered Home and About in
both languages and themes at 375, 768, 1024, 1440, 1600 and 1720px (48 combinations),
with no index overlap, horizontal overflow or page script errors. TypeScript
checks and the production Hugo build passed. These are local results, not
confirmation of a production deployment or field performance.

The follow-up motion pass adds initial concealment, reading-triggered entry and
idle softening. All 26 targeted navigation checks passed, including keyboard,
no-script and reduced-motion paths. Eight route/theme combinations kept the
index hidden on entry and retained at least 4.5:1 contrast for quiet links.
TypeScript checks and a fresh production build also passed.

## Measured output and acceptance

Hugo 0.145.0 production minification, Chinese homepage, unique same-origin CSS
resources (the noscript font URL is counted once):

| Resource measure | Baseline | Updated | Reduction |
| --- | ---: | ---: | ---: |
| Main stylesheet, raw bytes | 466,879 | 191,934 | 58.9% |
| All linked same-origin CSS, raw bytes | 718,387 | 250,224 | 65.2% |
| Same resources compressed individually with gzip | 153,436 | 46,639 | 69.6% |

The total includes the unchanged homepage stylesheet and the new 5,533-byte
experience stylesheet. The baseline includes the 198,751-byte Chinese font CSS
manifest. This comparison excludes third-party font CSS, font binaries, HTML,
JavaScript, protocol overhead and CDN compression choices. It measures resource
size, not real-user LCP/INP or a Lighthouse score.

Local acceptance includes 4 helper tests, 26 desktop/mobile chat and decoration
tests, 16 About carousel/menu tests (plus 2 desktop-only skips), TypeScript
checking and a successful production build (340 English and 363 Chinese pages).
Chat requests are mocked. The 3D
lifecycle test uses a mock renderer; eligibility tests check actual module
requests, including wide coarse-pointer devices and missing WebGL.

Independent review caught and closed pinch-zoom suppression, stale disabled
controls after bfcache restore, lost keyboard focus after sending, and missing
pre-import device checks. Shared header/search/contact/subscription, knowledge
space and reading navigation are also exercised; the PR's full CI result is the
release gate. An existing knowledge-space assertion was updated to match the
heading already present on the baseline branch, retaining its identity assertion.

Full CI also exposed an existing Linux WebKit issue in the English Pi article at
320px: its session-tree select's native appearance increased the component's
scroll width from 258px to 275px. A Linux probe isolated the cause: removing the
native appearance restored 258px, and removing that override restored 275px.
The repair keeps the HTML select and its keyboard behavior, supplies a themed
arrow, and retains the original one-pixel overflow tolerance. The mobile menu
regression is exercised with CI's actual Pixel 5 settings (375×812), including
closing while a submenu link holds focus.
