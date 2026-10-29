#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Netlify's ignore command returns 0 to SKIP, and 1 to BUILD.
// Only known non-site inputs are ignored. Unknown paths/history still build.
export const bookkeepingOnly = files => files.length > 0 && files.every(file =>
  /^(?:docs\/|tests\/|tools\/ci\/|\.github\/|\.claude\/|\.agents\/|_briefs\/)/.test(file) ||
  /^(?:README(?:\.[\w-]+)?\.md|AGENTS\.md|CLAUDE\.md|LICENSE|\.gitignore|playwright(?:\.[\w-]+)?\.config\.ts)$/.test(file) ||
  /^scripts\/.+\.test\.(?:mjs|cjs)$/.test(file) ||
  /^config\/(?:newsletter-state|search-delivery-state)\.json$/.test(file) ||
  /^data\/seo\/(?:gsc|psi|crux)-\d{4}-\d{2}-\d{2}(?:-[A-Za-z0-9-]+)?\.json$/.test(file)
);

export function shouldIgnoreBuild({ base, head, git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }) {
  if (![base, head].every(sha => /^[a-f0-9]{40}$/.test(sha ?? '')) || base === head) return false;
  try {
    git(['merge-base', '--is-ancestor', base, head]);
    // --no-renames includes both sides: moving a runtime file into docs still builds.
    const files = git(['diff', '--name-only', '--no-renames', '-z', base, head, '--']).split('\0').filter(Boolean);
    return bookkeepingOnly(files);
  } catch { return false; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const skip = shouldIgnoreBuild({ base: process.env.CACHED_COMMIT_REF, head: process.env.COMMIT_REF });
  console.log(skip ? 'Skipping non-site changes.' : 'Building site inputs (or comparison history is unavailable).');
  process.exitCode = skip ? 0 : 1;
}
