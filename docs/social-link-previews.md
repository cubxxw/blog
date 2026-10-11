# Social link previews

The page head owns preview metadata through `layouts/partials/seo.html`.
Social platforms fetch the HTML and then the image URL; they do not render the
blog's CSS, interactive components, or dark-mode theme to create this card.

`seo/social-image.html` renders an opaque 1200×630 PNG during every Hugo build,
using the bundled Noto Sans SC font. The home page has a bilingual archive
card. Every article and section has its own title card, with a section label,
author and current domain. The light editorial layout keeps text inside a
72-pixel horizontal margin. Long titles wrap to three lines, then truncate on
the image only; the page title and metadata remain unchanged.

Article covers remain independent of social cards. An optional `social.image`
front-matter value can select an existing local PNG, JPEG or WebP from a page
bundle, assets, or static directory. Hugo crops it to an opaque 1200×630 PNG.
Do not use this override for a diagram that cannot tolerate a central crop.

Both Open Graph and `twitter:card=summary_large_image` use the same generated
image. Hugo's transformed-image path changes when its inputs change, avoiding
the old static PNG cache. Platforms can still cache **page metadata** by URL;
deploying does not guarantee that an existing post's preview will refresh.

The production and backup SEO output checks verify unique metadata, consistent
platform image URLs, HTTPS, accessible build files, PNG bytes, actual 1200×630
dimensions, alt text, size below 5 MB and absence of retired static OG images.
The targeted contract tests run in the SEO suite of `scripts/ci-run.mjs`.

Verification:

```sh
node --test scripts/social-card-contracts.test.mjs
hugo --minify
node scripts/check-generated-seo.mjs --public-dir public
git diff --check
```

Inspect the generated Chinese/English home cards, a long Chinese title and a
long English title at mobile size before publishing. A local preview of a
platform card is an approximation; only the platform's composer or a real
post can confirm its current crop and display policy. Reddit layout also
depends on post type, community and client. Do not promise a universal card
layout or automatic updates to already-published posts.

References:

- [Open Graph protocol](https://ogp.me/)
- [Hugo images.Text](https://gohugo.io/functions/images/text/)
