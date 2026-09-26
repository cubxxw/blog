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
| Page resources | Homepage includes unrelated article/section styles | Explicit homepage shell with shared interaction styles retained |
| Chat | UTF-8/SSE chunk boundaries, unescaped link attributes, stale stream ownership | Incremental parsing, safe links, request cancellation, stable message ownership and accessible feedback |
| Card interaction | Pointer capture includes interactive links | Preserve links, constrain drag handling, keyboard navigation and inactive-card focus isolation |
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
but was not applied to the sticky, animated About decks: reliable anchors and
layout take priority over an unmeasured rendering optimization.

## Validation contract

Use `netlify dev` for the actual rendered flow. Exercise both localized Home and
About routes, 375/768/1440px layouts, light/dark themes, reduced motion, native
history, JavaScript-disabled navigation, live carousel links and mocked AI
responses. AI regression tests must not call a paid provider.

Run `tests/e2e/page-wayfinder.spec.ts` and
`tests/e2e/home-about-experience.spec.ts` outside the visual-regression exclusion.
Run the extracted chat helper tests, typecheck, production Hugo build and the
applicable full CI suites. Keep screenshots and raw test artifacts outside the
repository. Compare resource bytes on the same build type; distinguish raw CSS,
compressed transfer size and field performance. No local measurement proves a
real-user Core Web Vitals improvement.

Preserve unrelated work in the original checkout. Delivery requires independent
review, current-head CI and a readback of the merged revision and deployed assets.
