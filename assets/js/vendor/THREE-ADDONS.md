# Three.js addons

Vendored from the official **r160** tag to match `three.module.min.js` and `CSS3DRenderer.js` already used by Space:

- https://github.com/mrdoob/three.js/blob/r160/examples/jsm/loaders/GLTFLoader.js
- https://github.com/mrdoob/three.js/blob/r160/examples/jsm/utils/BufferGeometryUtils.js

`GLTFLoader.js` changes only its utility import path to `./BufferGeometryUtils.js` for this flat vendor directory. The runtime `three` import resolves through the existing Hugo-generated import map. See `three-LICENSE.txt` for the MIT license.
