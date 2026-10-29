# GET-290 verification

The scene now opens capri or Leafhour in one action. The project window uses one featured work and a vertical index, with a single detail toolbar. Product Lab puts real work before its knowledge-map entry and displays the remaining products as editorial rows. Companion remains available from the menu, keyboard and contextual actions; it has no permanent Dock item.

The homepage, product data, account boundaries, notes and error recovery are preserved. Default entry remains CUBXXW OS, with reversible Product Lab navigation.

## Tool installation

The requested `npx impeccable install --providers=cursor --scope=project` failed when the remote TLS connection ended. The official `skill-v4.8.0/universal.zip` bundle was then obtained through the GitHub Release Asset API and verified against its published SHA-256. Only its Cursor payload was installed. See `impeccable-install.json` for the digest and local whitespace normalization. No paid model or API key was used. `PRODUCT.md` records the confirmed issue and repository context; `.impeccable/surfaces/projects.md` records this surface's constraints.

The distill pass removes Finder nesting and repeated navigation. The quieter pass removes the permanent Companion Dock item and reduces Quiet-mode chrome. The layout pass establishes a featured work, vertical index and window-container reflow. The polish pass covers focus restoration, native product selection, responsive layout and scene/footer separation.

## Local validation

- Production Hugo 0.145.0 extended build passed; `build.log` records the pre-main-sync build. A subsequent two-thread Hugo server rebuilt the current workspace after main was merged.
- Post-main-sync targeted Node tests: **43 passed, 0 failed**, in `unit-post-main.log`.
- TypeScript check passed. The local donor dependency tree has the same lockfile; no dependency changes were made.
- Final explicit-key-surface `npx impeccable detect --json` returned `[]`, with no ignores added. The scanner cannot resolve Hugo's dynamic stylesheet link in source templates; that limitation is retained in stderr. This is a source scan, not a complete rendered-page audit.
- Independent review at `3591f12d9f0ab00aad1b0be835afdfc1e212de6e`: no P0/P1 and no open P2. The original E2E structure mismatch and alternate-scene overlap were fixed and reviewed.

## Browser evidence

The in-app browser checked the actual local Hugo server at `127.0.0.1:4290`. It rendered Jiangnan successfully, opened Leafhour from the scene in one click, restored focus to Leafhour on return, switched Product Lab both ways, and opened Companion from the menu without sending a question.

Chinese project and Lab views passed desktop and 390px checks. English dark Lab passed 390, 768, 1024 and 1280px overflow checks, with no relevant console errors. Quiet mode reported `environmentPaused=true` while the work entry stayed visible. At 390x844, non-quiet zen entry bounds were `[16,597,374,684]` and footer bounds `[20,766.5,370,820]`: no overlap. Screenshots live in `images/`.

The existing room's rain, materials and world geometry are preserved; this task adds navigation rather than replacing the scene. Ambi is a clarity reference named by the brief. There is no measured claim that the result outperforms Ambi.

## Release status

PR, current-head CI, merge and deployment are tracked in the PR and Linear issue. Local evidence above does not claim those later states. Production acceptance must read back the deployed revision and key paths after merge.
