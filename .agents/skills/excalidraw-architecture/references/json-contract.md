# Excalidraw JSON contract

Generate version-2 scene files:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [],
  "appState": {
    "viewBackgroundColor": "#faf9f7",
    "gridSize": 20
  },
  "files": {}
}
```

Use unique, readable IDs. Keep `seed`, `versionNonce`, and timestamps
deterministic within one generation run.

## Phase Metadata

Add phase metadata to scope-bearing shapes and connectors:

```json
{
  "customData": {
    "phase": "v1",
    "role": "node"
  },
  "strokeStyle": "solid"
}
```

```json
{
  "customData": {
    "phase": "later",
    "role": "node"
  },
  "strokeStyle": "dashed"
}
```

Use `role` values such as `canvas`, `section`, `node`, `connector`, `legend`,
or `annotation`. The bundled validator enforces phase/stroke consistency.

## Shape Defaults

```json
{
  "type": "rectangle",
  "strokeColor": "#1f1f1d",
  "backgroundColor": "#faf9f7",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "angle": 0,
  "roundness": { "type": 3 },
  "isDeleted": false,
  "groupIds": [],
  "frameId": null,
  "boundElements": [],
  "link": null,
  "locked": false
}
```

## Text Defaults

```json
{
  "type": "text",
  "strokeColor": "#1f1f1d",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "fontSize": 16,
  "fontFamily": 5,
  "textAlign": "left",
  "verticalAlign": "top",
  "lineHeight": 1.2,
  "containerId": null,
  "originalText": "Readable label",
  "text": "Readable label",
  "autoResize": true,
  "isDeleted": false
}
```

For container-bound text, set `containerId` and add the text ID to the
container's `boundElements`. Keep exact before/after links intact when editing
an existing scene.

## Connector Defaults

```json
{
  "type": "arrow",
  "strokeColor": "#1f1f1d",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "points": [[0, 0], [160, 0]],
  "startArrowhead": null,
  "endArrowhead": "triangle",
  "startBinding": null,
  "endBinding": null,
  "lastCommittedPoint": null,
  "elbowed": false,
  "isDeleted": false
}
```

Bind arrows when stable node IDs exist. Otherwise terminate them 8-16 px from
the destination edge. Never calculate tool or data semantics from prose labels;
encode them in IDs or `customData`.

## Ordering

Order elements back to front:

1. canvas;
2. section bands;
3. connectors;
4. nodes;
5. text;
6. legends and annotations.

Keep the editable `.excalidraw` authoritative. Regenerate SVG and PNG after
every source edit.
