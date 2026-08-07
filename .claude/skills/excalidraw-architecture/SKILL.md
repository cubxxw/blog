---
name: excalidraw-architecture
description: Create, revise, render, and review polished Excalidraw architecture diagrams with editable .excalidraw sources, hand-drawn styling, clear routes, V1 solid versus later dashed semantics, and SVG/PNG screenshot QA. Use for product architecture, system architecture, workflows, data flows, platform maps, roadmaps, technical diagrams, Excalidraw files, or requests to improve diagram layout, fonts, connectors, hierarchy, and visual quality.
---

# Excalidraw Architecture

Create diagrams that explain a decision or route, not decorated inventories.

## Deliverables

Unless the user narrows the request, deliver:

1. editable `.excalidraw`;
2. reviewable `.svg` and `.png`;
3. a one-paragraph reading guide;
4. the final scene opened in Excalidraw when browser delivery is useful.

Use solid strokes for V1/current scope and dashed strokes for later scope. Add a
visible legend. Do not reuse dashed strokes for uncertainty in the same
architecture diagram.

## Workflow

1. **Read before drawing.** Inspect the source notes, repository, existing
   architecture, and audience. Write down the one question the diagram answers.
2. **Freeze semantics.** Separate current, later, external, derived, and
   authoritative components. Identify the main route, feedback route, trust
   boundary, and forbidden shortcuts.
3. **Choose one composition.**
   - Product story: left to right, 3-5 stages, outcome loop below.
   - System architecture: top to bottom layers, primary runtime left to right.
   - Lifecycle: circular only when the final state truly feeds the first.
   - Topology: hub and spoke only when one authority actually coordinates peers.
4. **Sketch hierarchy.** Use 5-9 primary groups. Give the primary route the
   shortest visual path. Put details inside labeled bands, not nested cards.
5. **Build the scene.** Follow
   [visual-system.md](references/visual-system.md) and
   [json-contract.md](references/json-contract.md). Mark scope-bearing elements
   with `customData.phase: "v1"` or `"later"`.
6. **Render and validate.**

   ```bash
   node ~/.codex/skills/excalidraw-architecture/scripts/render-excalidraw.mjs \
     path/to/diagram.excalidraw --png path/to/diagram.png
   node ~/.codex/skills/excalidraw-architecture/scripts/validate-excalidraw.mjs \
     path/to/diagram.excalidraw --png path/to/diagram.png
   ```

7. **View the full-resolution PNG.** Fix clipping, collisions, weak hierarchy,
   bad wrapping, crowded arrows, excess whitespace, and route ambiguity. Render
   again after every meaningful edit.
8. **Audit the meaning.** Trace every important arrow. Confirm that readers
   cannot mistake a derived view for a source of truth or a proposal for an
   executed action.

## Drawing Rules

- Prefer one strong visual argument over a grid of equal boxes.
- Show overview, section boundaries, and concrete nodes at distinct zoom levels.
- Keep connector labels short; put explanations beside the route, not on it.
- Route connectors behind nodes and into edges. Avoid crossing text or entering
  arbitrary box corners.
- Reserve accent color for one decision, write boundary, or critical transition.
- Default to `roughness: 1`; use `0` only for dense technical regions and `2`
  only for a deliberately rough annotation.
- Default text to Excalifont (`fontFamily: 5`), which uses Xiaolai as the
  current Excalidraw CJK hand-drawn fallback. Use Nunito (`6`) when dense
  technical copy needs a quieter voice.
- Use font sizes `36 / 28 / 20 / 16 / 14`; never finish with body text below 14.
- Keep titles to one line and bodies to three short lines where possible.
- Use color plus labels and stroke style; never rely on color alone.
- Add icons only when they identify a real platform or service faster than text.
- Do not use gradients, shadows, decorative blobs, or ornamental arrows.

## Completion Gate

Finish only when:

- the audience and diagram question are obvious on first scan;
- V1 and later scope are distinguishable without color;
- every important route has a direction and valid endpoints;
- no text is clipped, overlapping, or too small at export size;
- contrast is at least 4.5:1 for normal text;
- all nodes, bindings, IDs, and phase styles pass the validator;
- the PNG has been visually inspected, not merely generated;
- the editable source and rendered outputs describe the same frozen scene.
