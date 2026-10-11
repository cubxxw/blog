# Social card source assets

`paper.png` is the opaque 1200×630 editorial background. All text is rendered
by Hugo's `images.Text` in `layouts/partials/seo/social-image.html`.

The bundled **Noto Sans SC SemiBold** font prevents missing Chinese glyphs on
Linux builders. It is a static weight-600 instance of Google Fonts' variable
Noto Sans SC at commit `a85815a42757630ce188fdad368c2dfc444d4773`:

https://github.com/google/fonts/tree/a85815a42757630ce188fdad368c2dfc444d4773/ofl/notosanssc

Generated with fontTools 4.57.0: instantiate `wght=600`, retain all Unicode
glyphs from the font's cmap, and remove hinting. Font license: `OFL.txt`.
The font is a build input; it is not downloaded by visitors or social crawlers.
`data/social/font_widths.json` records the font's ASCII advance widths in ems
(`hmtx` advance divided by `head.unitsPerEm`), so wide letters such as W/M wrap
without being clipped. Other characters conservatively occupy one em.
