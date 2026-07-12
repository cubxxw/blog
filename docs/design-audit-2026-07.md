# Blog Design & Motion Audit — 2026-07

> Produced by an agent-teams audit (7 parallel auditors + adversarial verification + synthesis) against the
> [emilkowalski design-engineering skills](https://github.com/emilkowalski/skills): `apple-design`,
> `improve-animations` (8-category playbook), and `emil-design-eng`. Skills live in `.claude/skills/`.

**Totals:** 49 findings — 8 high · 25 medium · 16 low.

## Verdict

The blog's motion foundations are healthier than the file sprawl suggests: easing hygiene is genuinely good (no ease-in on UI, linear reserved for the progress ring, reversible effects use transitions), the WebGL layer is well-gated (reduced-motion, coarse-pointer, IntersectionObserver pausing), and hero/post-title typography is done right. The rot is in cohesion and duplication — tokens.css defines zero motion tokens while ~107 cubic-bezier literals are hand-typed across 38 files, one press-feedback primitive is copy-pasted across 6+ files (with provably dead selectors), and the entire cascade priority rides on alphabetical zz-/zzz- filename prefixes rather than a declared layer order. The two systemic, high-value bugs are `transition: all` at 48 sites (animates layout off-GPU) and five real reduced-motion gaps in files with actual viewport-scale movement. Recommendation: ship Batch 1 (additive tokens, transition:all, reduced-motion gaps, typography, layout-property transitions) now with low risk; treat the file reorg as a separate, in-browser-verified effort because this is production and the cascade currently depends on load order.

## Top 10 highest-leverage fixes

1. **Add motion tokens to tokens.css (purely additive)** — `assets/css/extended/tokens.css`  
   _Fix:_ Add to :root: --ease-out: cubic-bezier(0.23,1,0.32,1); --ease-in-out: cubic-bezier(0.77,0,0.175,1); --ease-spring: cubic-bezier(0.34,1.56,0.64,1); --ease-drawer: cubic-bezier(0.32,0.72,0,1); --dur-press:140ms; --dur-hover:200ms; --dur-reveal:560ms. Do NOT yet migrate the 107 literals — just define the vocabulary so every subsequent fix references it.  
   _Why:_ Unblocks every other consolidation finding and cannot regress rendering (defining unused vars changes nothing). CONFIRMED across two slices as the root cohesion defect.

2. **Replace `transition: all` with explicit property lists (48 sites)** — `assets/css/extended/custom.css`  
   _Fix:_ Swap each `transition: all …` for the props actually changing, e.g. `transition: transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out), border-color 200ms ease`. Sites: homepage-daypage.css, custom.css (111/220/514/606/676), section-ai-agent.css, section-engineering.css, article-series.css.  
   _Why:_ CONFIRMED, 48 occurrences. `all` animates border/background/border-radius off-GPU every frame; AUDIT calls it 'always a finding.' Preserves visible behavior, drops the jank.

3. **Fill the 5 real prefers-reduced-motion gaps** — `assets/css/extended/article-bottom-sheet.css`  
   _Fix:_ Add reduced-motion blocks to article-bottom-sheet (translateY(100%) full-viewport slide), article-series.css (reveal keyframe + hover translate), columns.css, opensource-grid.css, zz-dark-reading.css (marker rotate). Keep opacity fade, drop the position travel.  
   _Why:_ These files have genuine viewport-scale movement and NO reduced-motion guard at all — a full-height sheet flies up for motion-sensitive users. Highest-value accessibility fix, low risk.

4. **Gate ~30 ungated hover transforms behind @media (hover:hover)** — `assets/css/extended/custom.css`  
   _Fix:_ Wrap card/list hover translate/scale rules (custom.css 121/231/405/525/611/4285/4338, columns.css:211, opensource-grid.css:66) in `@media (hover:hover) and (pointer:fine)`, or add a blanket `@media (hover:none){ …:hover{transform:none} }` reset.  
   _Why:_ On touch these fire on tap and stick as false-hover until the next tap. Broad, low-risk correctness win.

5. **Stop animating layout properties (padding/gap/left/width/top)** — `assets/css/extended/editorial-sections.css`  
   _Fix:_ eig-row hover padding -> transform:translateX on inner content; columns.css:200 drop padding from transition; custom.css:5568 remove gap from transition; marginalia.css:176 animate translateX not left; progress bar width->scaleX (needs JS, defer to Batch 3).  
   _Why:_ Each forces reflow on a hovered/animated element. padding/gap/top fixes are self-contained and low risk; the scaleX progress-bar rewrite is the one that needs JS and can wait.

6. **Split the single -0.01em tracking across all six heading levels** — `assets/css/extended/custom.css`  
   _Fix:_ custom.css:749 — split the shared h1-h6 rule: -0.02em on h1/h2, -0.01em on h3/h4, 0 on h5/h6. Also add -0.02em to .archives-hero__title (3894), .profile_title__name (2951, plus line-height 1.2->1.1), .column-masthead__title (columns.css:49).  
   _Why:_ One fixed tracking spanning ~30px down to ~14px violates size-specific tracking. Pure visual polish, no behavioral risk, aligns display headings with the correctly-done .post-title.

7. **Raise sub-band press scales into 0.95–0.98** — `assets/css/extended/zzz-nav-menu-motion.css`  
   _Fix:_ hamburger scale(0.88)->0.96, heading-anchor 0.88->0.96, lang 0.92->0.96, profile-tag 0.93->0.96, nav-search/copy-code 0.94->0.96, theme/social 0.9->0.96. Only touch the surviving canonical rule per selector (many are already dead code — see Batch 2).  
   _Why:_ 0.88 on a small target reads rubbery. Subtle value change, low risk — but coordinate with the press-dedupe so you edit the rule that actually renders.

8. **Snap Cmd+K palette focus (remove artificial 100ms timer)** — `assets/js/search-palette.js`  
   _Fix:_ Replace `setTimeout(()=>input.focus(),100)` with a synchronous `input.focus()` right after `palette.removeAttribute('hidden')`; if a race appears, use one requestAnimationFrame, not a timer.  
   _Why:_ A 100+/day keyboard action shouldn't have blocking latency; the justifying comment is self-contradictory (100ms < cited 180ms). Tiny, high-perceived-quality fix.

9. **Cache getBoundingClientRect off the per-pointer-event path** — `assets/js/three/hero-field.js`  
   _Fix:_ In hero-field.js:161, bear-orb.js:259, card-tilt.js:44, cover-parallax.js:37 — compute the host/card rect on enter + passive scroll/resize and reuse it in the move handler; short-circuit the handler when the render loop is paused offscreen.  
   _Why:_ Unthrottled synchronous layout on every window mousemove (up to ~120/s), firing even while the rAF loop is paused offscreen. Localized JS change, low risk.

10. **Delete the dead duplicate card + nav press declarations** — `assets/css/extended/micro-interactions.css`  
   _Fix:_ Remove the `.post-entry/.ai-tech-card/.growth-card:active` block from micro-interactions.css:93 (card press is fully re-declared and won by zzz-press-feedback.css); move the two list-item selectors into zzz-press-feedback first. Strip `#menu > li > a:active` from micro-interactions.css:342 group and zzz-press-feedback.css:97; keep one canonical nav press in zzz-nav-tap-feedback.css.  
   _Why:_ CONFIRMED dead code by specificity/load-order across three slices. Removes the maintenance trap where press scale has 2-3 sources of truth; verify in-browser since it depends on cascade order.

## Batch 1 — safe now (shipped ✅)

1. Add motion-token block to tokens.css :root (--ease-out, --ease-in-out, --ease-spring, --ease-drawer, --dur-press/hover/reveal). Additive only, migrate literals later — cannot regress.
2. Replace all 48 `transition: all` with explicit property lists (transform/box-shadow/border-color). Files: custom.css 111/220/514/606/676, homepage-daypage.css:11, section-ai-agent.css, section-engineering.css, article-series.css.
3. Add prefers-reduced-motion blocks to the 5 unguarded files: article-bottom-sheet.css (translateY slide->opacity), article-series.css (reveal+hover), columns.css, opensource-grid.css, zz-dark-reading.css (marker rotate).
4. Gate ~30 ungated hover transforms in custom.css/columns.css/opensource-grid.css behind @media (hover:hover) and (pointer:fine), or add a blanket @media(hover:none) transform:none reset.
5. Split the shared h1-h6 letter-spacing (custom.css:749) into size-specific tracking: -0.02em h1/h2, -0.01em h3/h4, 0 h5/h6.
6. Add negative tracking to display headings: .archives-hero__title -0.02em (custom.css:3894), .profile_title__name -0.02em + line-height 1.1 (custom.css:2951), .column-masthead__title -0.02em (columns.css:49).
7. Add font-optical-sizing:auto to Fraunces display headings (column-masthead, article-series:99, post-footer:101); prefer it over the hard-pinned opsz 96 on .post-title (custom.css:2370).
8. Stop transitioning layout props: eig-row padding->translateX (editorial-sections.css:413), columns.css:200 drop padding, custom.css:5568 drop gap, custom.css:3969/3639 top->translateY.
9. Raise all sub-0.95 press scales to 0.96 (hamburger, heading-anchor, lang, profile-tag, nav-search, copy-code, theme/social) — edit only the canonical rendering rule per selector.
10. Cover motion timing: hover zoom 600ms->240ms var(--ease-out) (zzz-cover-motion.css:55); cover-open 0.9s->0.6s (:46); target-wash/target-bar 2s->~1.1s (interaction-polish.css:28/54).
11. JS: cache getBoundingClientRect on enter+scroll instead of per-event in hero-field.js:161, bear-orb.js:259, card-tilt.js:44, cover-parallax.js:37; short-circuit handlers when loop paused.
12. JS: focus Cmd+K palette synchronously (remove 100ms setTimeout, search-palette.js:32); set will-change:transform dynamically on pointerenter/leave for tilt cards + hero cover instead of statically.

## Batch 2 — medium (materials + dedupe; partly shipped)

1. Delete dead card press block in micro-interactions.css:93 (won by zzz-press-feedback.css); first relocate .ai-tech-list-item/.growth-list-item selectors + their tap-highlight into zzz-press-feedback.css so card press has one source of truth.
2. Consolidate nav-link press to a single file: strip #menu>li>a:active from micro-interactions.css:342 group (keep .nav-search-trigger/.lang-switch) and delete the block in zzz-press-feedback.css:97; keep only zzz-nav-tap-feedback.css.
3. Change press-DOWN curve from the overshoot cubic-bezier(0.34,1.56,0.64,1) to strong ease-out var(--ease-out) at ~120ms; reserve the spring curve for release/entrance/copy-code success pop (make timing asymmetric).
4. Materials: match .posts-filter (custom.css:4533) to its sibling .archives-year-nav — drop bg to ~0.72, soften/remove the 1px full border, add box-shadow 0 1px 12px rgba(0,0,0,0.04) light / 0.20 dark.
5. Materials: delete the dead .header-wrapper + .dark .header-wrapper block in custom.css:2287-2301 so nav-elegant.css is the single owner of the frosted-nav material; confirm blur radius (16 vs 20px) intentionally.
6. Materials: make the sticky header's resting hairline transparent and let separation come only from the .nav-scrolled shadow, or add a scroll-edge mask-image fade (nav-elegant.css:14).
7. Materials: pair the bottom-sheet translateY with a subtle scale-from-0.98 so it materializes, and deepen resting shadow to 0 -6px 28px rgba(0,0,0,0.16) (article-bottom-sheet.css:111).
8. Standardize entrances on the strong ease-out var(--ease-out) and retire the softer 0.22,0.61,0.36,1 (39 sites) — verify each reveal in-browser since it changes felt pace.
9. Rewrite the reading-progress bar from width to transform:scaleX with transform-origin:left, driven by JS (custom.css:2879) — compositor-only, but touches JS so verify.
10. Fix TOC additive transitions: in zzz-toc-tap-feedback.css:27-54 declare only transition-property/duration/timing for transform instead of re-typing the base color/border shorthands that will drift.
11. Shine sweep: animate transform:translateX() combined with the existing rotate(8deg) instead of left, and reconsider 720ms (marginalia.css:176).

## Batch 3 — architectural reorg (roadmap, needs verified pass)

1. Replace the glob concat in head.html:69-70 with an explicit ordered slice of resources.Get calls (or native CSS @layer) representing real layers: tokens -> reset -> layout -> components -> motion/press -> overrides. Removes the fragile filename-alphabetical cascade dependency. Requires full in-browser regression pass.
2. Consolidate the 6-file press/tap system (micro-interactions, zzz-press-feedback, zzz-link-tap-feedback, zzz-nav-tap-feedback, zzz-toc-tap-feedback, interaction-polish) into one press-feedback component: one .is-pressable primitive + per-family selector lists varying only --press-scale, one shared reduced-motion block.
3. Migrate the ~107 hand-typed cubic-bezier literals to the new var() tokens (follow-on to Batch 1); collapse the five near-identical decelerate curves onto --ease-out and the three symmetric onto --ease-in-out.
4. Rename version-suffixed files to their actual feature: zz-interaction-detail/v3/v4 are disjoint slices, not a version lineage (e.g. selection-and-table.css, search-focus-and-blockquote.css, heading-hairline.css). Pure rename, but verify concat order after.
5. Collapse the split `html.motion-reveal .post-content img` reveal (micro-interactions.css:75 + zz-interaction-detail.css:42) into one image-reveal rule in a single file, removing the load-order dependency.
6. Unify scroll-reveal onto one mechanism (transition-based .is-revealed + shared --dur-reveal/--ease-out) instead of the current mix of transition (micro-interactions) and one-shot @keyframes+backwards (homepage-reveal, article-header-entrance).
7. Once press/motion are consolidated, replace the 48 copy-pasted prefers-reduced-motion blocks with one reduced-motion block per layer (or a shared safety-net partial) so a new motion file can't ship without a neutralizer.
8. LONGER-TERM / HIGH RISK: decompose the 131KB custom.css monolith along the component boundaries the rest of the directory already uses (nav, cards, prose, motion). Do this last, incrementally, with verification after each extraction — it is the highest-blast-radius change.

## Recommended reorganization

Root cause (CONFIRMED, head.html:69): the extended bundle is `resources.Match \"css/extended/*.css\" | resources.Concat`, so cascade priority = alphabetical filename order. That is why 24 files carry zz-/zzz- prefixes purely to sort last, and why tokens.css (a base layer) lands mid-bundle at position ~27. Every 'dead by specificity/load-order' finding traces back to this.

Recommended structure — adopt an explicit order, ideally native CSS @layer:
@layer tokens, base, layout, components, prose, motion, press, overrides;
  tokens/      -> tokens.css (colors, space, radius, shadow, AND new motion tokens)
  base/        -> reset, typography base
  layout/      -> nav-elegant.css, header, footer, grid
  components/  -> cards, share-buttons, article-*, columns, opensource-grid, editorial-sections
  prose/       -> post-content headings/img/blockquote/table
  motion/      -> reveals (unified), cover-motion, interaction-polish
  press/       -> ONE press-feedback.css (the 6 merged files)
  overrides/   -> genuinely-last theme/dark tweaks
Build the bundle from an ordered slice of resources.Get calls matching that order (or wrap each file's content in its @layer). Then rename files to their role and drop the zz-/zzz- prefixes.

Safe MERGE candidates (evidence-backed, do with in-browser verify):
- micro-interactions.css card/nav :active blocks -> fold into press-feedback.css (dead by load order today).
- zzz-press-feedback + zzz-nav-tap-feedback + zzz-link-tap-feedback + zzz-toc-tap-feedback + interaction-polish press bits -> one press-feedback.css.
- micro-interactions img-reveal + zz-interaction-detail img transform -> one image-reveal rule.
- homepage-reveal + article-header-entrance + micro-interactions reveal -> one reveal mechanism.

Safe REMOVE (dead code, confirmed):
- custom.css:2287-2301 .header-wrapper material block (shadowed by nav-elegant.css).
- custom.css:93-100 card :active block (superseded by zzz-press-feedback.css) after relocating its two list-item selectors.
- #menu>li>a:active in both micro-interactions.css:342 (selector only) and zzz-press-feedback.css:97 (dead by specificity vs nav-tap-feedback).

RENAME-only (no behavior change): zz-interaction-detail / v3 / v4 -> feature names.

Defer to last / highest risk: decomposing the 131KB custom.css monolith. Do it incrementally after the @layer order exists, not before — extracting rules out of 'c'-slot alphabetical position will change their cascade unless the layer order is already explicit.

## Risk notes

This is production and the entire cascade currently depends on alphabetical load order, so risk is dominated by cascade side-effects, not by any single rule change.

Cannot break rendering (ship freely): the tokens.css additive block, typography tracking, font-optical-sizing, reduced-motion blocks, and layout-property->transform swaps that keep the same end state. transition:all replacement is safe IF you enumerate every property that changes in each :hover/:active (miss one and that property snaps instead of animating) — grep each affected rule's hover/active state before replacing.

Needs in-browser verification (the risk lives here): (1) Any deletion of a 'dead' rule — dead-by-specificity was verified statically, but Hugo concat order is the only thing guaranteeing it; verify with the actual built bundle (netlify dev), in both light and dark, on a touch/coarse-pointer device and a fine-pointer one. (2) Raising press scales requires editing the rule that actually renders — if you edit a dead copy nothing changes and you'll think it's applied. (3) Standardizing the entrance curve (39 sites) changes felt pace on visible load animations — get a human eyes-on pass. (4) The progress-bar width->scaleX and shine-sweep left->translateX rewrites touch JS/geometry and can mis-position; verify visually.

Highest blast radius: the head.html @layer/ordered-slice change re-defines the whole cascade in one commit — do it on a branch, diff the built CSS, and click through nav, cards, prose, TOC, bottom sheet, search palette, dark mode, and touch before merge. The custom.css decomposition is the single riskiest item (rules move out of their alphabetical slot) — only attempt after the layer order is explicit, one extraction per commit with verification. Per CLAUDE.md: pull latest first, build with netlify dev (not make), verify pages, then commit.

## Full findings

| Sev | Category | File | Line | Finding | Fix |
| --- | --- | --- | --- | --- | --- |
| high | architecture | `layouts/partials/head.html` | 69 | Cascade order of ~60 extended CSS files is controlled entirely by alphabetical filename prefixes (zz-/zzz-/zzzz-), not a | Replace the single glob concat with an explicit ordered slice representing real layers (tokens -> base/reset -> layout -> components -> motion/press -> override |
| high | architecture | `assets/css/extended/micro-interactions.css` | 93 | Card press-feedback is defined twice: micro-interactions.css and zzz-press-feedback.css both target .post-entry/.ai-tech | Move .ai-tech-list-item/.growth-list-item (and their tap-highlight-color declaration) into zzz-press-feedback.css's selector lists, then delete the duplicated : |
| high | cohesion-tokens | `assets/css/extended/tokens.css` | 0 | No motion tokens exist despite a real token layer; 100+ cubic-bezier curves are hand-typed with near-duplicate variants | Add motion tokens to tokens.css (--ease-out: cubic-bezier(0.23,1,0.32,1); --ease-in-out: cubic-bezier(0.77,0,0.175,1); --ease-drawer: cubic-bezier(0.32,0.72,0,1 |
| high | cohesion-tokens | `assets/css/extended/tokens.css` | 64 | tokens.css defines no motion tokens; every curve/duration is hand-typed at ~100 call sites | Add a motion-token block to tokens.css :root — e.g. `--ease-out: cubic-bezier(0.23,1,0.32,1); --ease-in-out: cubic-bezier(0.77,0,0.175,1); --ease-spring: cubic- |
| high | performance | `assets/css/extended/custom.css` | 111 | `transition: all` is used pervasively (48 occurrences) — animates unintended, off-GPU properties | Replace every `transition: all` with an explicit property list — for hover cards use `transition: transform 200ms var(--ease-out), box-shadow 200ms var(--ease-o |
| high | accessibility | `assets/css/extended/article-bottom-sheet.css` | 119 | Bottom sheet slides translateY(100%) with no prefers-reduced-motion guard | Add `@media (prefers-reduced-motion: reduce){ .article-bottom-sheet{ transition: opacity 200ms ease; transform: none; } .abs--open{ opacity:1 } }` — keep an opa |
| high | architecture | `assets/css/extended/zzz-nav-tap-feedback.css` | 39 | Nav-link press feedback is declared in THREE files with three different scale values; two are dead code | Delete only the `#menu > li > a:active` selector from the grouped rule in micro-interactions.css (342) and the `#menu > li > a:active` block in zzz-press-feedba |
| high | cohesion-tokens | `assets/css/extended/zzz-press-feedback.css` | 0 | The 8 zzz- files + micro-interactions.css re-implement one press primitive with 24 copies of the same curve and no share | Introduce shared tokens (`--press-scale`, `--press-scale-small`, `--ease-press`, `--ease-spring`) in a single :root, and one `.is-pressable { -webkit-tap-highli |
| medium | performance | `assets/js/three/hero-field.js` | 161 | hero-field mousemove handler forces synchronous layout (getBoundingClientRect) on every window pointer move, unthrottled | Cache the host rect and only refresh it on resize/scroll instead of reading it per event: compute `rect = host.getBoundingClientRect()` in onResize (and a passi |
| medium | performance | `assets/js/three/bear-orb.js` | 259 | bear-orb pointermove handler forces synchronous layout (getBoundingClientRect) on every window pointer move, unthrottled | Cache the rect (update on resize + passive scroll) and reuse it in onPointerMove; gate the body of onPointerMove on the loop's running/onScreen state so offscre |
| medium | performance | `assets/js/search-palette.js` | 32 | Cmd+K search palette injects a fixed 100ms setTimeout before focusing its input — an artificial latency on a 100+/day ke | Focus synchronously on open — call input.focus() immediately after palette.removeAttribute('hidden') (the element is visible once unhidden; no animation needs t |
| medium | materials-depth | `assets/css/extended/custom.css` | 4533 | Floating .posts-filter uses a solid 1px border on all sides with no shadow — should be a soft-shadow lifted layer like i | Match the archives-year-nav recipe so the two sticky bars read as one material: drop bg to ~rgba(255,255,255,0.72), soften the border to rgba(148,163,184,0.06)  |
| medium | materials-depth | `assets/css/extended/custom.css` | 2287 | Nav material declared twice with conflicting blur/opacity/border — the richer custom.css block is dead code shadowed by  | Delete the .header-wrapper (and .dark .header-wrapper) material block in custom.css:2287-2301 so nav-elegant.css is the single owner of the nav material. Confir |
| medium | typography | `assets/css/extended/custom.css` | 749 | A single fixed letter-spacing (-0.01em) is applied across all six heading levels h1-h6 | Make tracking size-specific per apple-design §15: -0.02em on h1/h2 (~1.55-1.875rem), -0.01em on h3/h4 (~1.05-1.2rem), and 0 (near body) on h5/h6. Split the shar |
| medium | typography | `assets/css/extended/custom.css` | 3894 | Display heading .archives-hero__title (2rem) has no negative tracking | Add letter-spacing: -0.02em. At 2rem (32px) the default 0 tracking reads too loose for a display heading; large text wants negative tracking per §15. |
| medium | typography | `assets/css/extended/custom.css` | 2951 | Homepage hero name (2.8rem) is under-tracked (-0.01em) and over-led (1.2) | Tighten to letter-spacing: -0.02em and line-height: 1.1. At 2.8rem (44.8px) this is the largest hero heading yet is tracked looser and led looser than the sibli |
| medium | architecture | `assets/css/extended/zzz-press-feedback.css` | 97 | Nav menu-link press feedback conflicts across two files; the zzz-press-feedback rule is already dead by specificity | Delete the #menu > li > a:active block from zzz-press-feedback.css and keep nav-link press feedback solely in nav-tap-feedback.css (or vice-versa). Pick one sca |
| medium | architecture | `assets/css/extended/zz-interaction-detail.css` | 42 | `html.motion-reveal .post-content img` fade/settle reveal is split across two files that re-declare the same selector to | Collapse both into a single image-reveal rule in one file (opacity + transform + combined transition together), removing the dependency on alphabetical load ord |
| medium | architecture | `assets/css/extended/zzz-interaction-detail-v4.css` | 0 | interaction-detail 'v2/v3/v4' version naming is misleading — the three files are disjoint feature slices, not supersedin | Rename each to its actual feature (e.g. selection-and-table.css, search-focus-and-blockquote.css, heading-hairline.css) so the files describe what they do inste |
| medium | architecture | `assets/css/extended/zzz-toc-tap-feedback.css` | 0 | Press/tap feedback for the same conceptual system is fragmented across 6 files | Consolidate into a single 'press feedback' component file (one selector inventory, one shared reduced-motion block). Keeps the identical scale/curve values but  |
| medium | architecture | `assets/css/extended/custom.css` | 0 | custom.css is a 131KB monolith undermining the otherwise componentized extended/ structure | Decompose custom.css along the same component boundaries the rest of the directory already uses (extract nav, cards, prose, motion sections into named files) so |
| medium | cohesion-tokens | `assets/css/extended/tokens.css` | 0 | Five near-identical ease-out decelerate curves used interchangeably for entrances | Collapse the five decelerate curves to a single `--ease-out` token and the three symmetric curves to one `--ease-in-out`, then replace all literals. Keep only t |
| medium | easing-duration | `assets/css/extended/micro-interactions.css` | 36 | Dominant reveal curve is a weak decelerate (0.61 y1) where AUDIT specifies a strong ease-out | Standardize entrances on the strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)` (AUDIT cat-2 target value) exposed as `--ease-out`; retire the softer `0.22,0.61,0 |
| medium | easing-duration | `assets/css/extended/zzz-cover-motion.css` | 55 | Cover hover zoom transition is 600ms — sluggish for a pointer reaction, in and out | Split the transform transition: keep a longer duration only for the one-shot open (the @keyframes already owns that) and give the hover its own snappy `transiti |
| medium | performance | `assets/css/extended/marginalia.css` | 176 | Shine sweep animates `left` over 720ms instead of transform — layout thrash + over-budget | Animate `transform: translateX()` instead of `left` (compositor-only), and combine with the existing rotate: `transform: translateX(...) rotate(8deg)`. Reconsid |
| medium | performance | `assets/css/extended/editorial-sections.css` | 413 | List row animates `padding` on hover — layout reflow on a frequently-hovered element | Move the inset to `transform: translateX()` on the row's inner content, or drop the padding transition and keep only color/transform. Never transition padding. |
| medium | performance | `assets/css/extended/columns.css` | 200 | Column entry animates `padding` and has ungated hover transform with no reduced-motion guard | Drop `padding` from the transition (use transform for the inset). Wrap the arrow hover transform in `@media (hover:hover) and (pointer:fine)`, and add a reduced |
| medium | performance | `assets/css/extended/custom.css` | 5568 | Hover button animates `gap` (layout property) alongside transform | Remove `gap` from the transition list; set the final gap without animating it, or animate an inner icon's `transform` instead. |
| medium | accessibility | `assets/css/extended/custom.css` | 121 | ~30+ `:hover` transforms in custom.css are not gated with @media (hover:hover) — false-hover sticks on touch | Wrap hover-motion rules in `@media (hover:hover) and (pointer:fine)` (AUDIT cat 6), or add a blanket `@media (hover:none){ ...:hover{ transform:none } }` reset  |
| medium | accessibility | `assets/css/extended/article-series.css` | 78 | Series reveal keyframe (translateY) has no prefers-reduced-motion guard | Add `@media (prefers-reduced-motion: reduce){ .marginalia-series-*{ animation: none } }` (or fade-only), and gate the hover translate under `@media (hover:hover |
| medium | physicality | `assets/css/extended/zzz-nav-menu-motion.css` | 28 | A cluster of press scales sits below AUDIT cat 3's 0.95–0.98 band; worst offenders shrink to 0.88 | Raise every sub-0.95 press into the band: set hamburger and heading anchor to scale(0.96), lang/search/copy/profile/theme/social to scale(0.96). Small elements  |
| medium | easing-duration | `assets/css/extended/zzz-nav-tap-feedback.css` | 33 | Overshoot (back-out) curve used as the press-DOWN transition where AUDIT prescribes ease-out; applied symmetrically | Use a strong ease-out for the press-down: `transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1)` (AUDIT --ease-out). Reserve the bounce curve for release/ |
| medium | architecture | `assets/css/extended/zzz-press-feedback.css` | 51 | Card press feedback double-declared: ungated micro-interactions rule fully overridden by media-gated zzz-press-feedback  | Remove the `.post-entry/.ai-tech-card/.growth-card:active` block from micro-interactions.css:93-100 (keep its `-webkit-tap-highlight-color`), leaving zzz-press- |
| low | performance | `assets/css/extended/zzz-card-tilt.css` | 87 | Card specular highlight animates an off-GPU radial-gradient background-position every frame during hover; onMove also re | Accept the sheen as a deliberate low-frequency hover polish (Emil: fine), but cache the card rect on pointerenter (refresh on scroll) instead of reading it per  |
| low | performance | `assets/js/cover-parallax.js` | 37 | cover-parallax reads getBoundingClientRect on every pointermove over the hero cover instead of caching the rect | Capture `rect = cover.getBoundingClientRect()` in onEnter and on a passive scroll/resize listener, and reuse it inside onMove so the hot per-event path does zer |
| low | performance | `assets/css/extended/zzz-card-tilt.css` | 33 | Permanent will-change: transform on every tilt card and on the hero cover holds compositor layers for the whole session, | Set will-change dynamically from the JS: add it in onEnter (pointerenter) and remove it in onLeave, so the layer is only promoted during an active tilt. Leaves  |
| low | materials-depth | `assets/css/extended/nav-elegant.css` | 14 | Sticky header uses an always-on hard 1px hairline divider at rest instead of a scroll-edge fade | Make the resting border transparent and let separation come only from the scroll-elevation shadow (already defined on .nav-scrolled), or add a mask-image gradie |
| low | materials-depth | `assets/css/extended/article-bottom-sheet.css` | 111 | Mobile bottom sheet is a flat opaque slab — misses the 'materialize' depth cue on enter | Keep the opaque bg + scrim (correct for a modal task per §12 'dim to focus'), but let the sheet read as a real material arriving: pair the translateY with a sub |
| low | typography | `assets/css/extended/columns.css` | 49 | Column masthead display title (up to 3.6rem) uses only -0.01em tracking | Tighten to letter-spacing: -0.02em. At the 3.6rem (57.6px) top of the clamp, -0.01em is too weak; this is display type at the same scale as .post-title which us |
| low | typography | `assets/css/extended/columns.css` | 42 | Fraunces (variable font with opsz axis) used for display type without font-optical-sizing:auto, inconsistently across fi | Add font-optical-sizing: auto to Fraunces display headings (column-masthead, series, paginav titles) so the opsz axis tracks size automatically, per §15 ('font- |
| low | accessibility | `assets/css/extended/micro-interactions.css` | 0 | prefers-reduced-motion is re-implemented independently in 48 of ~60 extended files | Once press/motion rules are consolidated (findings above), pair each motion layer with a single reduced-motion block at the end of that layer, or add a broad sa |
| low | easing-duration | `assets/css/extended/zzz-cover-motion.css` | 46 | Cover open animation runs 0.9s — long for a single hero element on load | Bring cover-open to ~0.6s to match the shared reveal duration token, so the hero settles in step with the header lines rather than trailing them. |
| low | easing-duration | `assets/css/extended/interaction-polish.css` | 28 | Deep-link landing highlight (wash + accent bar) runs for 2s | Tighten the wash/bar to ~1.0-1.2s (front-load the color at the start, fade by ~60%). Feedback should confirm and get out of the way; 2s over-dwells. |
| low | architecture | `assets/css/extended/zzz-homepage-reveal.css` | 70 | Scroll-reveal is implemented two different ways for the same conceptual effect | Pick one mechanism for on-enter reveals. Both are individually fine (the keyframes are one-shot, so not an interruptibility bug), but unifying on the transition |
| low | accessibility | `assets/css/extended/opensource-grid.css` | 66 | Open-source card hover lift has no reduced-motion guard and is not hover-gated | Add a reduced-motion block dropping the translate (keep box-shadow) and wrap the hover lift in `@media (hover:hover) and (pointer:fine)`. |
| low | accessibility | `assets/css/extended/zz-dark-reading.css` | 216 | Details disclosure marker rotate transition has no reduced-motion guard | Add `@media (prefers-reduced-motion: reduce){ ...summary::before{ transition: none } }` so the marker snaps instead of rotating for motion-sensitive readers. |
| low | performance | `assets/css/extended/custom.css` | 2879 | Reading-progress bar animates `width` instead of transform: scaleX | Set `width:100%; transform-origin:left; transform: scaleX(0)` and drive `scaleX` via JS; `transition: transform 0.1s ease-out`. |
| low | performance | `assets/css/extended/custom.css` | 3969 | Sticky archives nav animates `top` — layout property on a position:sticky element | Prefer `transform: translateY()` for the reveal/offset motion; a sticky element's `top` transition is both janky and rarely observed. |
| low | cohesion-tokens | `assets/css/extended/zzz-toc-tap-feedback.css` | 27 | TOC file re-declares full transition shorthands verbatim to append transform, duplicating base values that will silently | Prefer additive composition: declare only `transition-property: transform; transition-duration: .16s; transition-timing-function: var(--ease-press);` scoped to  |
