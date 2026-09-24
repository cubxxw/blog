// Bounded read-only GitHub adapter producing B1's explicit seo-review-state/1
// (issue #392 / batch B2).
//
// Read-only by construction: `gh pr list` + `gh api .../pulls/N/files` only —
// no writes, no issue/PR management, no database. Missing, stale, failed or
// truncated reads stay VISIBLE as incomplete state (B1 turns them into a safe
// skip) — never a zero backlog or an empty changed-file set by default.
// Overlap evidence is ACTUAL changed-file paths only (rename previous_filename
// and filename both counted); PR titles/bodies are never parsed for paths.

import { execFileSync } from 'node:child_process';

import { GscError } from './gsc-errors.mjs';

export const REVIEW_STATE_SCHEMA = 'seo-review-state/1';

export const REVIEW_LIMITS = Object.freeze({
  proposals: 30, // bounded window of open + recently closed proposals
  filesPerPage: 100,
  maxFilePages: 3, // 300 changed files per proposal is plenty; beyond = truncated
});

const STATE_MAP = { OPEN: 'open', CLOSED: 'closed-unmerged', MERGED: 'closed-merged' };

const defaultExecGh = (args) => execFileSync('gh', args, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

// Persisted read errors are FIXED constants: raw gh/HTTP text (which may echo
// arguments or credentials) is never copied into the artifact or logs here —
// the CLI layer reports failures through these constants and bounded problems.
const READ_ERRORS = Object.freeze({
  listFailed: 'gh-pr-list-failed',
  listUnparseable: 'gh-pr-list-unparseable',
});

// One `gh pr list` row -> B1 proposal shape. Inconsistent or unknown
// timestamps are preserved as-is (null/invalid): B1 marks them inconsistent
// and the review state visibly skips — recency is never invented.
export function normalizeReviewRow(raw, changedFiles) {
  const problems = [];
  const number = Number.isInteger(raw?.number) ? raw.number : null;
  if (number === null) {
    problems.push('proposal row has no integer number');
    return { proposal: null, problems };
  }
  const state = STATE_MAP[raw?.state] ?? null;
  if (state === null) problems.push(`proposal #${number} has an unknown API state (constant only; raw values never persist)`);
  const isoOrNull = (v) => (typeof v === 'string' && v !== '' ? v : null);
  const files = Array.isArray(changedFiles) ? [...new Set(changedFiles.filter((f) => typeof f === 'string' && f !== ''))] : null;
  if (files === null) {
    problems.push(`proposal #${number} changed-file read incomplete (overlap is only ever claimed from actual paths)`);
  }
  return {
    proposal: state === null ? null : {
      number,
      state,
      closedAt: isoOrNull(raw.closedAt),
      mergedAt: isoOrNull(raw.mergedAt),
      changedFiles: files ?? [],
      // marker for B2 itself: files === null means incomplete, surfaced via read
      changedFilesComplete: files !== null,
    },
    problems,
  };
}

// Pull request list: bounded page of open + recently closed proposals on the
// seo-auto label (the proposal pipeline's own label). Read-only. The list is
// requested with ONE sentinel row beyond the process bound: a full page is
// never evidence of completeness (gh caps output at --limit), so exactly
// `proposals` rows would otherwise silently hide an older open proposal while
// declaring backlog 0 and complete.
export async function collectReviewState({
  repository,
  execGh = defaultExecGh,
  observedAt,
  limits = REVIEW_LIMITS,
}) {
  if (typeof repository !== 'string' || repository === '') {
    throw new GscError('collectReviewState: repository identity is required.', { kind: 'config' });
  }
  const read = { status: 'ok', completeness: 'complete', error: null };
  const problems = [];
  const proposals = [];
  let backlog = null;

  let listRaw;
  try {
    listRaw = execGh([
      'pr', 'list',
      '--repo', repository,
      '--label', 'seo-auto',
      '--state', 'all',
      '--limit', String(limits.proposals + 1), // sentinel: one row beyond the bound
      '--json', 'number,state,closedAt,mergedAt',
    ]);
  } catch {
    // Fail CLOSED: no proposals, no backlog default — visibly unusable state.
    return {
      schema: REVIEW_STATE_SCHEMA,
      repository,
      observedAt,
      read: { status: 'failed', completeness: 'partial', error: READ_ERRORS.listFailed },
      backlog: null,
      proposals: [],
      problems: ['pr-list-failed: read-only proposal listing failed; review state is unusable and never defaults to zero/empty'],
    };
  }

  let rows;
  try {
    rows = JSON.parse(listRaw || '[]');
    if (!Array.isArray(rows)) throw new Error('not an array');
  } catch {
    return {
      schema: REVIEW_STATE_SCHEMA,
      repository,
      observedAt,
      read: { status: 'failed', completeness: 'partial', error: READ_ERRORS.listUnparseable },
      backlog: null,
      proposals: [],
      problems: ['pr-list-unparseable: proposal listing did not return a JSON array'],
    };
  }

  let openCount = 0;
  for (const raw of rows.slice(0, limits.proposals)) {
    let changedFiles = null;
    try {
      changedFiles = await readChangedFiles({ repository, number: raw.number, execGh, limits });
    } catch (err) {
      // Constant reason (with a validated integer number only): raw gh error
      // text never persists into the artifact.
      problems.push(`proposal #${Number.isInteger(raw?.number) ? raw.number : '?'} files read failed${Number.isInteger(raw?.number) ? '' : ' (unparseable number)'} (raw error text not retained)`);
    }
    const { proposal, problems: rowProblems } = normalizeReviewRow(raw, changedFiles);
    problems.push(...rowProblems);
    if (!proposal) continue;
    if (proposal.state === 'open') openCount += 1;
    if (!proposal.changedFilesComplete) {
      // Incomplete file reads are never "no overlap": mark the whole read
      // incomplete so B1 visibly skips instead of trusting an empty set.
      delete proposal.changedFilesComplete;
      proposal.changedFiles = [];
      read.status = read.status === 'failed' ? 'failed' : 'partial';
      read.completeness = 'partial';
    } else {
      delete proposal.changedFilesComplete;
    }
    proposals.push(proposal);
  }
  if (rows.length > limits.proposals) {
    // The sentinel row proves the bounded list is exhausted: state is visibly
    // truncated and B1 fails closed instead of trusting backlog/overlap.
    read.status = 'truncated';
    read.completeness = 'truncated';
    problems.push(`proposal list truncated at ${limits.proposals} processed rows (bounded read with a sentinel; never silently complete, backlog may hide older open proposals)`);
  }
  if (problems.length > 0 && read.status === 'ok') {
    read.status = 'partial';
    read.completeness = 'partial';
  }
  backlog = { relevantOpenCount: openCount }; // populated ONLY from an actual read
  return {
    schema: REVIEW_STATE_SCHEMA,
    repository,
    observedAt,
    read,
    backlog,
    proposals,
    problems,
  };
}

// Actual changed-file evidence per proposal, bounded pagination. Rename rows
// contribute BOTH previous_filename and filename. An exhausted page bound or a
// malformed row is truncation/incompleteness — never a complete empty set.
export async function readChangedFiles({ repository, number, execGh = defaultExecGh, limits = REVIEW_LIMITS }) {
  const files = [];
  for (let page = 1; page <= limits.maxFilePages; page++) {
    const raw = execGh([
      'api',
      `repos/${repository}/pulls/${number}/files?per_page=${limits.filesPerPage}&page=${page}`,
    ]);
    const rows = JSON.parse(raw || '[]');
    if (!Array.isArray(rows)) throw new GscError(`proposal #${number} files page ${page} is not a JSON array`, { kind: 'parse' });
    for (const f of rows) {
      const name = typeof f?.filename === 'string' && f.filename !== '' ? f.filename : null;
      const previous = typeof f?.previous_filename === 'string' && f.previous_filename !== '' ? f.previous_filename : null;
      if (!f || typeof f !== 'object' || (name === null && previous === null)) {
        // A malformed row is an INCOMPLETE read: it must never be flattened
        // into a trustworthy (possibly empty) changed-file set.
        throw new GscError(`proposal #${number} changed-file row malformed on page ${page}`, { kind: 'parse' });
      }
      if (name !== null) files.push(name);
      // renames: the previous name is real changed-file evidence too
      if (previous !== null) files.push(previous);
    }
    if (rows.length < limits.filesPerPage) return [...new Set(files)];
  }
  throw new GscError(`proposal #${number} changed-file read truncated at ${limits.maxFilePages * limits.filesPerPage} entries`, { kind: 'parse' });
}
