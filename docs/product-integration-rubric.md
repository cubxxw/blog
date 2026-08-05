# Product integration rubric

This rubric evaluates whether a real, evolving product belongs on the blog and
whether its presentation earns trust. A product passes only when every
dimension reaches 95/100 and the weighted total reaches 98/100.

## Dimensions

| Dimension | Weight | What earns the score |
| --- | ---: | --- |
| Product truth and evidence | 20 | Current state is explicit; claims match the live product and repository; a real interface is shown; limits are visible. |
| Author and product coherence | 20 | The product connects to a recurring problem in Xinwei's work; the page explains why this product belongs here without turning into a launch announcement. |
| Information architecture | 15 | The current test is discoverable from the first screen; product, demo, and source each have one clear path; the remaining portfolio stays scannable. |
| Visual craft | 20 | Typography, spacing, imagery, color, and hierarchy form one system in light and dark modes; decoration never outranks meaning. |
| Interaction and accessibility | 15 | Keyboard focus is visible; touch targets are at least 44px; mobile layouts are explicit; reduced motion is respected; status is not color-only. |
| Performance and operational integrity | 10 | Images reserve space and stay lightweight; metadata is accurate; deterministic builds pass; live links and deployment are healthy. |

## Hard gates

A numeric score is invalid if any of these fail:

- a test-stage product is presented as complete;
- the screenshot is generated or mocked instead of captured from the product;
- the live product, evidence demo, or source link is broken;
- either language loses the product's state or boundary;
- keyboard, mobile, reduced-motion, or dark-mode use is materially broken;
- the production build or deployment fails.

## Evaluation method

1. Compare the product copy with the live site and repository.
2. Build both language routes and run `npm run products:check`.
3. Inspect desktop and mobile layouts in light and dark modes.
4. Traverse the page by keyboard and verify focus, link purpose, and headings.
5. Check the deployed routes and CI after pushing.
6. Record evidence for every deduction. Never award points for intent alone.

## BEAR OS dual-view acceptance

The Products landing page keeps **BEAR OS as its default experience**. Product
Lab remains available as a secondary view, and the same persistent switch
returns the reader to BEAR OS without reloading the page.

Acceptance evidence recorded on 2026-08-05:

| Requirement | Result | Evidence |
| --- | --- | --- |
| BEAR OS is the default | Passed | Both language routes render `data-product-view="bear"` server-side; BEAR OS is visible and its switch exposes `aria-pressed="true"` before interaction. |
| Product Lab is still available | Passed | Activating Product Lab lazily mounts the existing lab, updates the URL to `#product-lab`, and preserves its product evidence and links. |
| Switching is reversible | Passed | The shared switch returns to BEAR OS without navigation; the Lab panel becomes hidden and BEAR OS regains the active state. |
| Browser and device coverage | Passed | English and Chinese routes were checked on desktop and mobile, in light and dark modes; keyboard open/close and 44px mobile targets were verified. |
| Deterministic integration checks | Passed | `npm run products:check` covers both language outputs; Playwright covers the default state and the complete Lab-to-BEAR round trip. |

Production Lighthouse mobile audit for `/zh/projects/`:

| Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **99** | **100** | **100** | **100** | 1.7s | 1.7s | 0ms | 0 |

The four-category floor is **99/100**, above the required 96/100 display
quality gate. The audit used the minified production output, without Hugo
LiveReload or development scripts.

## Talent Signal scorecard

Final score: **98.5/100**. The production deployment and live-route checks
cleared the final hard gate.

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Product truth and evidence | 20/20 | Copy matches the live product, repository, deterministic demo, and synthetic-data boundary; the screenshot is captured from production. |
| Author and product coherence | 19.5/20 | The product-lab thesis connects Talent Signal to the recurring context-continuity problem and names the current experiment. |
| Information architecture | 15/15 | Talent Signal is the current test on the first screen and the first homepage product; product, demo, and source have distinct paths. |
| Visual craft | 19.5/20 | One accent, real imagery, consistent radii, editorial hierarchy, responsive layouts, and tested light/dark themes. |
| Interaction and accessibility | 14.5/15 | Semantic headings and regions, visible keyboard focus, 44-48px targets, AA contrast, explicit mobile collapse, and reduced-motion fallback. |
| Performance and operational integrity | 10/10 | The production screenshot is 80KB; dimensions are reserved; full Hugo, metadata, tag, SEO, and product checks pass. |

Normalized dimension floor: **96.7/100**. Production gate: **passed** on
2026-08-05 for commit `6ca4ce3`; the Pages deployment, blog build, and
Lighthouse CI completed successfully, and both live language routes exposed
the product state, boundary, demo, and source.
