# Blog CI/CD subtraction

Goal: remove expensive automatic testing and duplicate builds while keeping a usable publication check.

The current production publisher is Netlify Git builds. Repository and production environment variables contain no active Actions cutover. Keep that publisher; a second Actions build has no publication benefit. Keep the existing test suites available for explicit diagnostics rather than running them on every article or CSS change.

- [ ] Replace automatic prepare/preflight/20-partition browser/finalize graph with one `Required blog quality` job: changed content structure, authored Chinese prose, changed JavaScript syntax, workflow YAML and diff checks. Use four content-tool dependencies, without installing the Netlify/browser toolchain.
- [ ] Keep the full graph as a manual diagnostic, with no release or notification jobs. Make Lighthouse, search previews and exhaustive audits manual. Remove copied Go packaging/release-PR robots and redundant README push runs. Keep newsletter/search delivery and SEO observations; stop daily SEO analysis/proposal scans.
- [ ] Skip Netlify builds for known documentation/test/workflow/state-only changes; missing comparison history and unknown paths must still build. Preserve the production Hugo/function/render/SEO build.
- [ ] Run targeted host tests and actionlint, get one independent review, create the linked GET-309 PR, verify CI, merge through normal rules, and read back the production deploy. Record measured counts rather than predicting elapsed-time savings.

Tradeoff: automatic broad browser, visual and performance coverage is deliberately removed. Template changes still receive a real Netlify build; browser investigations are requested explicitly. No UI or article changes belong to this task.
