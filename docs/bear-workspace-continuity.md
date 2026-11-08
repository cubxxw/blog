# BEAR workspace continuity

The workspace belongs to the current browser. Notes, message drafts, bookmarks,
excerpts, windows, appearance, and up to three preserved text copies are stored
locally; these features do not call a model or upload workspace backups.

- In Settings, export a JSON backup. Import first shows counts and a note preview;
  only **Confirm restore** changes the workspace. A previous-workspace download
  is prepared first. Changes made during preview require a fresh preview. Cancel
  discards a pending preview; a failed browser write leaves the old workspace in
  place. Exports contain private visitor text: share them deliberately.
- Existing unreadable storage is kept intact. Settings can export the original
  data and the current session separately. A full/quota-denied browser cannot
  promise persistence. Export before reloading when the storage notice appears.
- Concurrent-tab changes are merged where possible. Conflicting note/draft text
  remains in bounded preserved copies in Settings for comparison and export.
  This is best-effort localStorage coordination, not an atomic multi-tab database.
- Select current article body text, then **Save excerpt**. Generated playback
  controls are excluded. **Your notes** keeps excerpts separately from the original
  note, with source return links and Markdown export. A changed/unavailable source
  cannot be silently substituted. Clipboard refusal offers selectable Markdown.
- Open **Video** from All apps or the workspace menu, or use an article's video
  facade. Exact HTTPS YouTube links are accepted. Referenced chapter labels come
  only from the public catalog. Nothing loads the YouTube player until an explicit
  playback action; playback stops when the player is hidden or disposed. Observed
  progress offers an explicit **Continue** action in this browser and never starts
  playback merely because the workspace was restored. Provider playback, script
  blocking, and cross-origin media policies may still require opening YouTube.
- A photo's **See travel region** link carries its verified public photo identity
  and original gallery region. **Back to this photo** returns to that context;
  selecting another place clears that return origin. Unavailable public photos
  are identified as unavailable instead of replaced with a different photo.

The author homepage, default Dock, Companion, DeepSeek Harness, and remote runtime
remain separate. Hosted CI and rendered desktop/narrow-window acceptance are
required before release; Node DOM checks do not prove provider/device behavior.
