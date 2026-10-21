# Classic Mac Space Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Space computer feel like a familiar illustrated early macOS, with a usable Finder and a complete monitor view.
**Architecture:** Keep one durable workspace and native app actions. A small desktop controller owns the menu bar and desktop shortcuts inside the existing window layer; a focused Finder home replaces the welcome gate. The Jiangnan renderer can retain its live screen or expand that same DOM to the native viewport.
**Tech Stack:** Existing Hugo, JavaScript/CSS, Three/CSS3DRenderer and Playwright; no new package or backend.
**Spec:** `docs/design/2026-10-21-classic-mac-space.md`.

## Global Constraints

- Preserve the café and six older scenes, native workspace state, notes/selection, profile deep links, bilingual routes and Product Lab.
- Never use a screenshot instead of the actual interactive desktop, or clone editor/application DOM.
- Stage only task paths; preserve primary output and the untracked node_modules symlink.
- New UI actions must do what their labels say; no pretend network/system features.

## Review Focus

- Menu/desktop chrome must travel with the existing window layer and survive graphics recovery.
- The physical screen must show its complete perimeter, accept exact input, and keep native dialogs within a usable area.
- Native and framed views must retain the same editor, selection, reading scroll and windows.
- Phone and short landscape must preserve readable text and 44px controls, with a reachable way to enlarge the screen.
- No default Finder migration may destroy manually positioned or edited app windows.

### Task 1: Finder home and real product navigation

**Owner/files:** worker owns new `assets/js/space/finder-home.js` and only welcome/product branches in `assets/js/space/apps.js`.
**Interface:** `mountFinderHome({root,host,catalog,execute,getState,escapeHTML,icon,payload}) -> dispose`; `.space-finder-home` renders `.space-finder-toolbar`, `.space-finder-home__sidebar`, `.space-finder-home__files`, `.space-finder-home__item`, `.space-finder-status`. Native `data-open` and exact `data-payload` actions remain.
- [x] Observe the missing Finder home in a failing browser case.
- [x] Implement six real folders, profile/deep-link continuity and a reachable return; keep existing product source truth and exact detail behavior.
- [x] Check syntax and actual native navigation; do not commit shared changes.

### Task 2: Familiar OS chrome and state-aware geometry

**Owner/files:** primary owns `assets/js/space/classic-desktop.js`, `assets/css/space-mac.css`, native partial/label/icon changes, `desktop.js` viewport and menu integration, focused browser tests.
- [x] Add menu/Finder/Dock and exact-destination failing assertions.
- [x] Implement functional File/View/Go/Window/Help controls, desktop folders, illustrated wallpaper and consistent classic chrome.
- [x] Keep geometry below the menu bar and above Dock; retain user-managed windows and mobile scrolling.
- [x] Inspect desktop/mobile/dark/product-detail states and test keyboard/menu/window behavior.

### Task 3: Complete monitor plus native expanded view

**Owner/files:** isolated worker owns `world-jiangnan.js` and `space-jiangnan.css` only.
**Interface:** `root.dataset.computerView='framed'|'expanded'`; `[data-computer-display]` chooses either view; dispatch `space:surfacechange` after the same workspace changes layout. `data-computer-default` supplies the preferred view. The viewport is `workspace.clientWidth/clientHeight` only for active framed mode; otherwise the existing native root dimensions apply.
- [x] Add a real monitor-perimeter/input/preservation test before the mode change.
- [x] Keep a front-facing physical CSS3D screen interactive, with the entire bezel visible; retain the native expanded surface and safe return/disposal.
- [x] Verify both modes, resize, fullscreen, dialog focus and original Notes state without extra render loops.

### Task 4: Integrated review and release

- [x] Independently review actual screen ownership, menus, safe catalog rendering, profile routes, camera/input and accessibility.
- [x] Run targeted runtime/viewport/reading/theme/window cases, TypeScript, product checks, production Hugo output and diff checks.
- [x] Deliver through the repository's direct-main path and read back the published source plus live desktop/mobile journeys.

## Verification record

The author approved the complete retro Mac direction and requested a fixed seated view with a softer real background. The renderer now uses the same live scene, depth-aware defocus and one original interactive screen; the camera position stays fixed across viewport changes. The material refinement retains an actual screen opening and adds no new assets or packages.

Local acceptance: 162 distinct browser cases passed across desktop/mobile projects (46 reading/profile/product/wallpaper cases, 14 classic Mac cases, 14 fullscreen cases, 24 Jiangnan cases, 8 boundary cases and 56 existing onboarding/window/reading/preferences cases). Three additional classic Mac cases passed with forced software WebGL. The existing 259 runtime tests, TypeScript, bilingual product integration, production Hugo build and diff checks passed. Independent final review found no remaining actionable P1/P2 issues. The existing window-menu focus assertion now names its actual system menu because the classic Window menu also offers Show Desktop; all 12 arrangement cases pass with the focused assertion.

The original reload reading-position regression was also reproduced on the previous published source. Restoration now waits for the interactive surface and follows the latest saved position when the original scroller moves; real user input cancels pending restoration. Desktop/mobile reload and minimized-reader cases pass.

Full automatic site checks and deployment readback are recorded separately from local acceptance; local checks alone do not establish the published version.

Production acceptance: source `1c67baa97edada3d33b41f571896528cfdce5fc6` was published by native Netlify deploy `6ad88031a5e4a59deda2fef7` at `2026-10-21T17:07:46+08:00`. At `17:09:11+08:00`, real Chromium journeys on `https://cubxxw.com` passed at 1440×960 Chinese, 390×844 English and 844×390 English dark. The published CSS and world-module fingerprints matched the verified source. Each journey checked real screen/photo hits, complete monitor, fixed seated pose, live depth blur and boat, six Finder folders, eight real products, Leafhour, same Notes node/selection through both views, and explicit audio playback. No page or shader errors were observed. A separate local software-rendered journey also passed and its real pixels were inspected.

The main checkout's 191 pre-existing output files retained their hashes. The automatic full-site quality and Lighthouse jobs were still running when this acceptance record was written; no CI-green claim is made here.
