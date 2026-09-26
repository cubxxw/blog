# Homepage and About experience refinement

Baseline: `56dc2879ecc1d7451990a44df94b569c7b5c7639` (26 September 2026).

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
replaces the decorative divider and persists during reading. About keeps the
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
| Long-page navigation | No compact map linking distant sections | Native anchor index with reading-position state, sticky offset, URL history and keyboard destination focus |
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
- CSS scroll-driven animation draws the reading progress line only where
  `animation-timeline` is supported and motion is allowed. The directory remains
  complete without it.
- Four section positions are read in a single requested frame only during scroll;
  the current-link attributes change only when the active section changes. This
  avoids the inaccurate full-section intersection thresholds on very tall pages.
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
