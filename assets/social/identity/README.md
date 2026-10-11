# Personal social identity assets

Approved direction: H author calling card + G bear/surname mark, confirmed by
the author on 2026-10-12. These files are build assets, not runtime model output.

- `home-zh.png`: approved H artwork, ImageGen.
- `home-en.png`: localized H artwork, ImageGen; identity/name remain unchanged.
- `signature.png`: transparent extracted `cubxxw` wordmark, ImageGen.
- `author-mark.png`: transparent G bear-shaped surname mark with 鑫 seal, ImageGen.
- `portrait.webp`: unmodified copy of the existing `static/images/xinwei-hiking-avatar.webp`.

Home/about rendering fills the artwork to 1200×630, then replaces its generated
photo region with the original portrait (280×300 top-right crop), grayscale, at x=706, y=38, w=494,
h=478. Those coordinates match the approved artwork; recheck them when changing
the composition. This preserves the real identity while retaining the chosen
lettering and material. Article/section cards use the extracted signature and
mark with the existing bundled-font title renderer.

The originating exploration is preserved under
`output/social-brand-lab-2026-10-12/`; only approved production assets live here.
