// Append-only, atomic snapshot persistence for the GSC collector.
//
// Snapshot files are evidence: never rewritten in place. A conventional daily
// filename `gsc-YYYY-MM-DD.json` is kept for workflow compatibility; a same-day
// rerun gets a unique `gsc-YYYY-MM-DD-<UTCtime-and-collision-safe-suffix>.json`.
// An explicit --out that already exists is never overwritten — the run fails
// with a clear message. Writes use an exclusive temp file and no-clobber link, so an
// interrupted write can never leave a partial snapshot at the destination.

import { randomBytes } from 'node:crypto';
import * as nodeFs from 'node:fs';
import { dirname } from 'node:path';

import { GscError } from './gsc-errors.mjs';

export const DEFAULT_OUT_DIR = 'data/seo';

const IO_CODES = new Set(['EACCES', 'ENOENT', 'ENOSPC', 'EEXIST', 'EISDIR', 'ENOTDIR', 'EMFILE', 'EROFS', 'EXDEV']);
function ioCode(err) {
  return IO_CODES.has(err?.code) ? err.code : 'unspecified';
}

export function dailySnapshotName(runDate) {
  return `gsc-${runDate}.json`;
}

export function pickSnapshotPath({
  runDate,
  out = null,
  dir = DEFAULT_OUT_DIR,
  now = new Date(),
  exists = nodeFs.existsSync,
  random = () => randomBytes(3).toString('hex'),
} = {}) {
  if (out) {
    if (exists(out)) {
      throw new GscError(
        `Refusing to overwrite existing --out ${out}. Snapshot writes are append-only; pick a new path or remove the old file deliberately.`,
        { kind: 'cli' },
      );
    }
    return out;
  }
  const base = `${dir}/${dailySnapshotName(runDate)}`;
  if (!exists(base)) return base; // keep the conventional first daily filename
  const utcTime = `${now.toISOString().slice(11, 23).replace(/[:.]/g, '')}Z`; // HHMMSSmmmZ
  for (let i = 0; i < 1000; i++) {
    const candidate = `${dir}/gsc-${runDate}-${utcTime}-${random()}.json`;
    if (!exists(candidate)) return candidate;
  }
  throw new GscError(`Could not find a collision-free snapshot filename in ${dir} for ${runDate}.`, { kind: 'io' });
}

// Atomic, no-clobber publication: exclusive temp creation plus same-directory
// hard-link of the destination, then unlink of the temp file. link() fails
// with EEXIST if the destination appeared in the meantime, so concurrent
// writers can never replace each other's evidence. Interrupted writes leave
// nothing visible at the destination. A temp path this invocation failed to
// create exclusively is never cleaned up (it is not ours).
export function atomicWriteJson(path, value, { fs = nodeFs, random = () => randomBytes(4).toString('hex') } = {}) {
  const data = `${JSON.stringify(value, null, 2)}\n`;
  fs.mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${random()}`;
  let created = false;
  try {
    fs.writeFileSync(tmp, data, { flag: 'wx' }); // exclusive: EEXIST if tmp is taken
    created = true;
  } catch (err) {
    if (err?.code === 'EEXIST') {
      throw new GscError(`Temp path ${tmp} already exists and is left untouched (exclusive create failed).`, {
        kind: 'io',
        code: 'EEXIST',
      });
    }
    // We did not create the temp file — never unlink a path we do not own.
    throw new GscError(
      `Failed to write ${path}: category io (code ${ioCode(err)}); destination left untouched`,
      { kind: 'io' },
    );
  }
  try {
    fs.linkSync(tmp, path); // no-clobber: EEXIST if the destination exists
  } catch (err) {
    if (created) {
      try {
        fs.unlinkSync(tmp);
      } catch {
        // best-effort cleanup of our own temp file
      }
    }
    if (err?.code === 'EEXIST') {
      throw new GscError(`Refusing to overwrite existing ${path} (no-clobber publication; prior evidence left untouched).`, {
        kind: 'io',
        code: 'EEXIST',
      });
    }
    throw new GscError(
      `Failed to publish ${path}: category io (code ${ioCode(err)}); destination left untouched`,
      { kind: 'io' },
    );
  }
  try {
    fs.unlinkSync(tmp);
  } catch {
    // the link succeeded; a stale temp file is cosmetic and not ours to force
  }
  return path;
}
