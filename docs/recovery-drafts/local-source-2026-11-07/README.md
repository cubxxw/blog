# Preserved local source drafts

This directory preserves exact source bytes from four local drafts found during
GET-439. The files are reference text under `objects/*.source.txt`; no application,
template, stylesheet, script, or workflow imports or executes them.

The drafts cover BEAR reading/workspace/video continuity, an older frozen-CI
proposal, article selection tools, and reading recovery. They predate later main
changes. Keeping the source does not accept those old implementations or undo the
current companion, author-approved layout, or simplified CI. Feature work needs a
fresh branch and a focused review against current main.

`manifest.json` maps each original branch/head/path to its deduplicated text file,
Git blob ID, and SHA-256. For a listed file, copy the object's bytes to its original
path in a separate experimental checkout; do not restore a whole draft over main.
The public video-reference YAML is retained as text, not as active site data.

This snapshot excludes articles, briefs, browser/CI evidence, generated sites,
machine configuration, and local secrets. It preserves the declared source file
versions, not every intermediate commit or a complete executable workspace.
Original local branches and worktrees remain available.

Validation: every object is byte-identical to its listed Git blob and SHA-256;
only this reference directory changes. Hosted repository checks are tracked in
the linked PR. No browser, deployment, paid provider, or device acceptance is
claimed by this source preservation.
