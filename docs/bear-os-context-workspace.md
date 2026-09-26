# BEAR OS: from decorative desktop to contextual workspace

2026-09-26 design and browser iteration on `/projects/`. BEAR OS remains the
default route; Product Lab and its knowledge space remain reachable.

## The honest critique

The earlier screen had a product rail **and** a Dock with the same seven
products. The Dock consumed the final band of the viewport without adding an
answer, action, or piece of evidence. A clock, PID label, and traffic-light
window controls suggested an operating system while the page still behaved
like a static product gallery. The four equally framed regions made it hard
to tell where a first-time reader should begin.

That version met several functional gates, but it did not yet make the product
mechanic visible. Responsive checks and a successful WebGPU mount do not
settle that design judgment.

## Product invariant

- **Visitor:** a blog reader who does not know the seven product names.
- **Tension:** which project matters to me, what is real today, and where can I
  inspect the claim?
- **Five-second outcome:** one chosen project has a clear proposition; its
  current state and limits are visible; the next action is obvious.
- **Product truth:** products, milestones, source links and writing come from
  the existing public content. A missing article or screenshot remains missing.

## Two directions

| Direction | Spatial argument | Signature action | Result |
| --- | --- | --- | --- |
| A. Intent routes | Keep the desktop dashboard; replace the Dock with three broad routes | Pick products, writing, or knowledge relationships | Better than duplicate icons, but adds another navigation layer below an already complete rail |
| B. Contextual workspace | Keep a narrow product rail; let the selected product own the large surface | Pick one product and immediately see its question, current evidence, limit and direct source | Chosen: the information itself reacts to the reader's selection |

The [A route-strip concept](evidence/bear-os-route-concept.png) was a temporary
DOM prototype. Compare it with the [previous Dock screen](evidence/bear-os-after.png)
and the [implemented contextual workspace](evidence/bear-os-context-desktop.png).
The images are at the same 1440×900 viewport; A is a visual concept, while the
final screenshot is working site code.

The chosen branch uses the broad structure of the prior layout but changes its
meaning. Clicking a product now updates the main surface in place. Opening a
full project dossier is a deliberate second step. The bottom Dock, fake clock,
PID and traffic-light controls are gone. A search command still finds a product,
and number keys still work.

## What takes the Dock's place

There is no permanent bottom control. The room goes to one current product:

1. **Claim:** a short, authored thesis tied to that product.
2. **What is known:** a current test, completed milestone, or public stage.
3. **What is limited or next:** an explicit boundary or unfinished milestone.
4. **Where to go:** inspect the complete dossier, open the actual product, and
   read an article only when a real relation exists.

When a product lacks a screenshot, the visual side shows its actual milestone
list instead of a giant initials placeholder. See the
[Agent Diff Guard state](evidence/bear-os-context-roadmap.png). The
[mobile composition](evidence/bear-os-context-mobile.png) moves the current
product before the rail and uses normal page scrolling. The
[dark composition](evidence/bear-os-context-dark.png) uses the same hierarchy.

## What “AI native” means here

This page is an index to real AI products, not an AI chat service. It should
behave like a system that keeps context: selection changes the visible
question and action; evidence, uncertainty and source remain adjacent. It
must not present rule-based navigation as a generated AI answer. A real
question-answering layer would require a retrieval index, source attribution,
failure states and quality evaluation before it belongs on this public page.

The reference mechanisms are [Apple's hierarchy guidance](https://developer.apple.com/design/human-interface-guidelines),
[Raycast's searchable actions](https://manual.raycast.com/quicklinks) and
[Notion's source-oriented search](https://www.notion.com/help/search). This
design borrows the principles of clear hierarchy, immediate action and
inspectable sources; it does not copy their visual identities or imply their
AI capabilities exist here.

## Evaluation

| Gate | Browser observation |
| --- | --- |
| Current context | Clicking IMStage replaced the central Talent Signal content without opening a modal; the URL became `#focus-imstage` |
| Honest proof | IMStage exposed a real related article; Talent Signal displayed its synthetic-data boundary; Agent Diff Guard used four real milestones |
| Return | The full dossier closed back to the same selected product; Product Lab still entered and exited the knowledge space |
| Keyboard | `P`, ArrowDown/Enter, `1`–`7`, Escape and direct hashes were exercised |
| Responsive | 375, 390, 768, 1024 and 1440px checked with zero horizontal overflow; through 1080px the current context leads and the document scrolls normally. 390×844 also used emulated touch and reduced motion |
| Theme | Light and dark captured; the BEAR OS theme control triggers the existing site toggle |
| Failed or late module | Aborting the knowledge-space module exposed linked static entries; pressing Escape before a delayed module loaded kept Product Lab visible and a later reopen succeeded |

Environment: macOS arm64, Chrome 153.0.8010.53 via bundled Playwright 1.62.1,
local Hugo 0.145.0+extended. `hugo --minify`, `npm run products:check`, and a
focused browser probe passed on both language routes. This is not a physical-phone test or a measured
FPS, frame-time, memory or energy claim. The repository E2E suite was updated
for the new selection and return behavior; its local CLI still cannot run
while this host's package policy rejects `npm ci` with `EALLOWREMOTE`.

Design judgment remains separate from the functional gate: the implemented
screen has a stronger hierarchy and fewer decorative controls, while a reader
study would still be needed to learn whether people can name a relevant next
step within five seconds.
