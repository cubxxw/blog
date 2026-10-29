# GET-290 verification

The scene now opens capri or Leafhour in one action. The project window uses one featured work and a vertical index, with a single detail toolbar. Product Lab puts real work before its knowledge-map entry and displays the remaining products as editorial rows. Companion remains available from the menu, keyboard and contextual actions; it has no permanent Dock item.

The homepage, product data, account boundaries, notes and error recovery are preserved. Default entry remains CUBXXW OS, with reversible Product Lab navigation.

## Tool installation

The requested `npx impeccable install --providers=cursor --scope=project` failed when the remote TLS connection ended. The official `skill-v4.8.0/universal.zip` bundle was then obtained through the GitHub Release Asset API and verified against its published SHA-256. Only its Cursor payload was installed. See `impeccable-install.json` for the original bundle digest and `impeccable-local-patches.md` for subsequent local corrections. The digest proves the download's provenance; the patched files differ from that bundle. The installed tool made no external model API or Token Plan calls. `PRODUCT.md` records the confirmed issue and repository context; `.impeccable/surfaces/projects.md` records this surface's constraints.

The distill pass removes Finder nesting and repeated navigation. The quieter pass removes the permanent Companion Dock item and reduces Quiet-mode chrome. The layout pass establishes a featured work, vertical index and window-container reflow. The polish pass covers focus restoration, native product selection, responsive layout and scene/footer separation.

## Local validation

- Production Hugo 0.145.0 extended build passed; `build.log` records the pre-main-sync build. A subsequent two-thread Hugo server rebuilt the current workspace after main was merged.
- Post-main-sync targeted Node tests: **43 passed, 0 failed**, in `unit-post-main.log`.
- TypeScript check passed. The local donor dependency tree has the same lockfile; no dependency changes were made.
- Final explicit-key-surface `npx impeccable detect --json` returned `[]`, with no ignores added. The scanner cannot resolve Hugo's dynamic stylesheet link in source templates; that limitation is retained in stderr. This is a source scan, not a complete rendered-page audit.
- Independent review at `3591f12d9f0ab00aad1b0be835afdfc1e212de6e`: no P0/P1. The original E2E structure mismatch and footer overlap were fixed. A later review of the zen screenshot found that a roaming control also overlapped the work strip; the strip was moved above both regions and an actual hit-target E2E regression was added. Latest-head CI must verify that regression.

## Browser evidence

The in-app browser checked the actual local Hugo server at `127.0.0.1:4290`. It rendered Jiangnan successfully, opened Leafhour from the scene in one click, restored focus to Leafhour on return, switched Product Lab both ways, and opened Companion from the menu without sending a question.

Chinese project and Lab views passed desktop and 390px checks. English dark Lab passed 390, 768, 1024 and 1280px overflow checks, with no relevant console errors. Quiet mode reported `environmentPaused=true` while the work entry stayed visible. At 390x844, non-quiet zen entry bounds were `[16,597,374,684]` and footer bounds `[20,766.5,370,820]`: no overlap. Screenshots live in `images/`.

The existing room's rain, materials and world geometry are preserved; this task adds navigation rather than replacing the scene. Ambi is a clarity reference named by the brief. There is no measured claim that the result outperforms Ambi.

## CI-derived corrections

Run [40800619371](https://github.com/cubxxw/blog/actions/runs/40800619371) caught a genuine reading regression: replacing the Finder container also removed its primary-action font and touch-target compensation in the projected desktop. The button rendered at about 9.87px instead of the existing minimum 13px. The new product sheet now retains 14px native / 17px projected primary-action type and 54px projected button targets. The original projected-font and hit-target assertions are retained unchanged.

Two older P1/P2 UI assertions still referenced the removed permanent Companion Dock destination and Finder sidebar. They now assert the four named mobile destinations, Companion menu availability, and the native project picker's selected value, including after minimize/reopen. Product title and persisted payload checks are retained.

The initial review found no shipped Hugo P0/P1 in the vendored guidance comments. The follow-up now corrects the valid guidance issues and makes write hooks skip bootstrap when an engine is unavailable; explicit launcher commands retain installation behavior. See `impeccable-local-patches.md` for scope and checks. Optional live-session journal/root files are ignored; shared config stays tracked.

Follow-up independent review also found that related-writing text and secondary navigation lost their readable typography when the Finder container was removed. Their existing native and projected font sizes are restored on the new product sheet and toolbar. The reading-contract E2E now measures related titles at ≥16 projected CSS pixels, related summaries/dates at ≥13px, and back/explore navigation at ≥13px. Measurements share one DOM read per product. Current-head CI and rendered acceptance remain required; the earlier runs do not certify these patches.

## Release status

PR, current-head CI, merge and deployment are tracked in the PR and Linear issue. Local evidence above does not claim those later states. Production acceptance must read back the deployed revision and key paths after merge.
