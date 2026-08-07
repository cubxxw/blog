# Excalidraw architecture visual system

Use this as the default. Adapt to an existing project design system when one is
already authoritative.

## Palette

| Role | Color |
| --- | --- |
| Canvas | `#faf9f7` |
| Primary text and route | `#1f1f1d` |
| Secondary text | `#66625c` |
| Neutral border | `#bdb8ae` |
| Future border and text | `#747068` |
| Critical/action accent | `#c43d2b` |
| Blue information fill | `#dcebf4` |
| Sage memory/outcome fill | `#dfece4` |
| Vermilion approval fill | `#f5d8d2` |
| Amber attention fill | `#f7e8bd` |
| Violet model/adapter fill | `#e7e0ef` |

Use light fills and dark text. Limit a diagram to four semantic hues plus
neutrals.

## Type

Use Excalifont (`fontFamily: 5`) by default. Current Excalidraw maps CJK
hand-drawn fallback to Xiaolai. Use Nunito (`6`) for dense system detail and
Cascadia (`3`) only for code, schemas, or identifiers.

| Level | Size | Use |
| --- | ---: | --- |
| Title | 36 | Diagram name |
| Subtitle | 20 | Literal promise or scope |
| Section | 20-28 | Numbered band or phase |
| Node title | 18-20 | Concrete component |
| Body | 16 | Two or three short lines |
| Metadata | 14 | Legend, protocol, status |

Use `lineHeight: 1.2`. Do not simulate hierarchy with excessive bold text.

## Geometry

- Canvas: use a stable 16:9, 3:2, or deliberately tall system frame.
- Outer margin: 64-96.
- Section gap: 48-72.
- Node gap: 24-40.
- Internal padding: 20-28.
- Node radius: restrained; Excalidraw `roundness: { "type": 3 }`.
- Primary stroke: width 2.
- Secondary stroke: width 1.
- Current/V1: `strokeStyle: "solid"`.
- Later: `strokeStyle: "dashed"` with lower visual weight.
- Default: `roughness: 1`, `fillStyle: "solid"`.

## Route Semantics

Use at most four connector meanings:

- graphite: primary data or task flow;
- vermilion: approval, mutation, or consequential write;
- sage: verified result, memory, or feedback;
- violet: model or external inference adapter.

Keep arrows orthogonal or gently elbowed. Give feedback loops their own lower
lane. When two routes cross, reroute one; do not add a crossing decoration.

## Composition Patterns

### Product architecture

Use four stages when possible:

`capture → interpret/draft → human decision → continuity/outcome`

Put the verified outcome and memory loop below. Explain the product boundary in
one quiet footer sentence.

### System architecture

Use:

`client surfaces → trust/API boundary → deterministic runtime → data/memory +
external adapters`

Keep canonical data visually separate from derived Wiki/search projections.
Show the execution guard immediately before write-capable connectors.

## Research Basis

This system consolidates:

- Excalidraw's open JSON, PNG/SVG export, hand-drawn rendering, font, and CJK
  support from the [official repository](https://github.com/excalidraw/excalidraw);
- the visual-argument, multi-zoom, palette-separation, and render-review loop
  from [coleam00/excalidraw-diagram-skill](https://github.com/coleam00/excalidraw-diagram-skill);
- deterministic helper and validation ideas from
  [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/main/skills/excalidraw-diagram-generator);
- live import, export, snapshot, and refinement practices from
  [yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw).
