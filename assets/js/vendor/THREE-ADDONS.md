# Three.js addons

Vendored from the official **r160** tag to match `three.module.min.js` and `CSS3DRenderer.js` already used by Space:

- https://github.com/mrdoob/three.js/blob/r160/examples/jsm/loaders/GLTFLoader.js
- https://github.com/mrdoob/three.js/blob/r160/examples/jsm/utils/BufferGeometryUtils.js

`GLTFLoader.js` changes only its utility import path to `./BufferGeometryUtils.js` for this flat vendor directory. The runtime `three` import resolves through the existing Hugo-generated import map. See `three-LICENSE.txt` for the MIT license.

`RGBELoader.js` is the unmodified official r160 HDR loader, served locally for the café sky:

- https://github.com/mrdoob/three.js/blob/r160/examples/jsm/loaders/RGBELoader.js

The recorded source hash is in `docs/design/cafe-lived-world-2026-10-16/rgbe-provenance.json`. It uses the same existing `three` import map and MIT license; it adds no external runtime request.
