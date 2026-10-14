# Homepage footer

The homepage closes with the CUBXXW cube and wordmark, the existing bilingual
biography, and a direct entry to Space / CUBXXW OS. Reading links, projects,
books, and contacts use the same warm theme as the rest of the homepage.

The first three projects follow `data/products.yml` order. Remaining projects
and social platforms stay available in native disclosures. Email, GitHub,
WeChat, and RedNote are immediately visible; the existing QR dialogs retain
their configured assets and destinations. Without JavaScript, QR image links
replace the dialog buttons and the disclosures still work.

The homepage owns one copyright row with RSS, JSON Feed, and OPML. Other pages
retain their existing footer. `zz-home-footer.css` belongs to the explicit
homepage shell and is excluded from article and section bundles. This change
adds no production JavaScript or third-party dependencies.

The Space page declares its native navigation transition in the head, before
the body-mounted workspace stylesheet loads. Both endpoints must opt in for a
[cross-document View Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using#basic_mpa_view_transition).
Reduced motion disables that transition.

The output checker recognizes only the published `data-profile-section` values
on the two Space pages. Unknown fragments, unrelated template IDs, and markers
outside those pages remain errors.

To inspect a separate production output while a development server is running:

```sh
hugo --minify --destination /tmp/cubxxw-footer-preview
SITE_PUBLIC_DIR=/tmp/cubxxw-footer-preview node scripts/home-footer.browser.mjs
```

Local acceptance on 14 October 2026 covered both languages at 1440, 1920, 768,
and 390px in light and dark themes: 16 screenshots, no horizontal overflow,
44px mobile controls, text contrast of at least 4.5:1, working QR images,
Escape and focus restoration, keyboard disclosures, feeds, and entry to Space.
Desktop footer height stayed below 430px. No-JavaScript QR links and disclosure
operation passed as well. Evidence is written to `output/playwright/home-footer/`.
External services are stubbed in this browser check; local assets and navigation
use the actual production output.
