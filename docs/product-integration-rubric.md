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
