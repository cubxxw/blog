# Café resident asset

Cat by **J-Toastie**, via [Poly Pizza](https://poly.pizza/m/DJ9rpAhrh3), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Retrieved 2026-10-15 from the public MORI TOGETHER mirror:
https://raw.githubusercontent.com/wehrleymullanag18-design/mori-together/main/public/assets/pets/cat.glb
Mirror attribution record: https://github.com/wehrleymullanag18-design/mori-together/blob/main/public/ASSET-LICENSES.md

Original SHA-256: `2ed030946f552f2b46433294391628a37583ae74a496d3164c003e1f95b24e4e`.
280,840 bytes; one skin, one mesh, embedded texture, one supplied animation: `Cat.001|IdleCat`.
The original GLB is unmodified. The café picker includes visible author and license links.

Runtime adaptations in `assets/js/space/world-cat.js`:

- Evaluate the supplied idle pose, normalize the bounds to the room's metre scale, ground the paws and rotate the original +X facing to +Z.
- Preserve the texture; use nonmetallic, rough fur shading.
- Add small amber eyes, attached to the head bone and placed on the skinned surface.
- Retain the supplied idle animation; blend an original distance-driven diagonal leg gait during walking. No supplied walk or sleeping clip is claimed.
- Use an original soft contact shadow and release all owned geometry, materials, textures, skeleton and animation resources when the room is disposed.

Floor navigation is original code in `cat-state.mjs`. It uses safe connected waypoints, bounded speed/turning, arrival easing, variable dwell and collision checks. Quiet mode, reading, dialogs, reduced motion and hidden views pause the resident without advancing its route clock.
