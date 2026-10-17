# Homepage hierarchy refinement — 17 October 2026

The author reported that PR #458 made the homepage feel cluttered. Comparison
against its first parent and actual desktop/mobile rendering identified a
structural change: an article replaced Bear in the hero, the conversation moved
below writing, and card surfaces and secondary excerpts disappeared.

## Direction and evidence

A first-time visitor should recognize the person behind this archive, choose
something to read, and optionally talk to the author's AI counterpart. Existing
photography, questions, bilingual writing, travel notebooks and real products
provide the specific material.

Two rendered directions were compared at 1440px and 390px:

- **A: personal archive.** Introduction and Bear share the desktop hero; writing
  follows as a featured card and two recent cards. Phones use a compact Bear
  entrance. The distinguishing interaction stays with the author identity.
- **B: article-led edition (PR #458).** A practice article occupies the second
  hero column, with a separate conversation section below writing. This remains
  a possible editorial direction, but the author rejected its density and loss
  of the previous homepage rhythm.

A was selected. It separates personal introduction from article discovery,
restores a recognizable interaction, and gives articles visible groups. This is
a design judgment based on the author's feedback and rendered comparison;
passing tests does not establish taste.

Reference mechanisms inspected: [Maggie Appleton](https://maggieappleton.com/)
separates writing types; [Josh Comeau](https://www.joshwcomeau.com/) combines a
personal identity with writing; [Lee Robinson](https://leerob.com/) provides
direct reading routes. The existing palette, type and assets were retained.
The UI/UX reference check focused on heading order, content grouping, target
size and long text. The final design-taste check retained the established
editorial identity rather than introducing a new design system.

## Changes

- Move the single existing Bear container into the hero, with named grid areas
  for introduction, social links and Bear. Keep the intent, visibility, device
  and reduced-motion gate and all current chat code.
- Remove the competing practice-article hero and standalone conversation intro.
  Restore the complete Latest collection: its old exclusion only made sense
  while that practice article appeared in the hero.
- Remove conflicting overrides so the existing featured-plus-two card layout,
  themed surfaces, borders, excerpts and restrained hover behavior apply again.
- Keep all ten contact targets at 44px with 8px spacing and wrapped grouping.
  Preserve the Chinese no-break word, compact mobile chat, reserved first-paint
  space, product anchor and all existing chat recovery and focus behavior.
- Size the portrait with its narrow column at 769–1024px, keeping a square
  hit area clear of the side questions without increasing the hero height.
  Check all 36 real prompts in every slot at each desktop/tablet breakpoint,
  rather than relying on six random selections.

## Local validation

Hugo 0.145.0 extended production minification passed (344 EN / 367 ZH pages).
The four affected browser suites passed **86 tests** with two workers in 55.6s.
They include both locales and themes at 320, 390, 768, 769, 900, 901, 1024 and 1440px,
real no-script featured article navigation, ten reachable contact targets,
contact-dialog focus, deferred chat reservation, chat reply/reopening and
reading navigation. AI responses were mocked; no paid model request was used.

The final responsive-reading contract rerun passed 22 tests, including exhaustive
question/portrait collision checks. An intermediate run exposed long English
question overlap at 769px; the column-relative portrait sizing closes it. The
Activity assertion respects the existing column folding.

Ten chat helper tests passed. Both TypeScript checks passed with the lockfile's
TypeScript 7.0.2. The shared dependency directory had an older 5.9.3 compiler;
its initial diagnostics were resolved by using the pinned compiler, with no
source/configuration relaxation.

Independent source review and actual browser inspection found no confirmed
P0/P1/P2 functional issues. The independent check exercised both locales at
769, 900, 901, 1024 and 1025px, including mocked long chat replies, control hit testing
and zero page errors. No-script and backup capability fallbacks were also
inspected in source; the production test pass does not certify every deployment.

## Captures

[Evidence directory](homepage-elegance-2026-10-17/) contains matching before and
prototype A screenshots, final desktop/mobile light/dark captures, the writing
section and measurements. Screenshots use reduced motion and frozen local
responses; they are local evidence, not a production deployment receipt.

Production delivery still requires the final commit's full CI, merge readback
and confirmation of the deployed bilingual HTML and hashed stylesheet.
