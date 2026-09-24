// Append-only, atomic observation persistence for PSI (and any collector that
// supplies a unique --out path, e.g. CrUX via B2).
//
// Observation files are evidence: never rewritten in place. The conventional
// first daily name is `<prefix>-YYYY-MM-DD.json`; a same-day rerun appends
// `<prefix>-YYYY-MM-DD-<UTC HHMMSSmmmZ>-<random>.json`. An explicit --out that
// exists is never overwritten. Writes are atomic and no-clobber (exclusive
// temp + hard-link publication via gsc-persist's atomicWriteJson), so repeated
// persistence can never replace the first observation of the day.

import { randomBytes } from 'node:crypto';
import * as nodeFs from 'node:fs';

import { GscError } from './gsc-errors.mjs';

export const DEFAULT_OUT_DIR = 'data/seo';

export function dailyObservationName(prefix, runDate) {
  return `${prefix}-${runDate}.json`;
}

// Filename shape (frozen at the B1 handoff; discovery in seo-observations.mjs
// matches exactly this): prefix-YYYY-MM-DD.json or
// prefix-YYYY-MM-DD-HHMMSSmmmZ-<hex>.json.
export function pickObservationPath({
  prefix = 'psi',
  runDate,
  out = null,
  dir = DEFAULT_OUT_DIR,
  now = new Date(),
  exists = nodeFs.existsSync,
  random = () => randomBytes(3).toString('hex'),
} = {}) {
  if (!/^(psi|crux)$/.test(prefix)) {
    throw new GscError(`pickObservationPath: unsupported prefix ${JSON.stringify(prefix)} (expected 'psi' or 'crux').`, { kind: 'config' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(runDate))) {
    throw new GscError(`pickObservationPath: invalid runDate ${JSON.stringify(runDate)} (expected YYYY-MM-DD).`, { kind: 'config' });
  }
  if (out) {
    if (exists(out)) {
      throw new GscError(
        `Refusing to overwrite existing --out ${out}. Observation writes are append-only; pick a new path or remove the old file deliberately.`,
        { kind: 'cli' },
      );
    }
    return out;
  }
  const base = `${dir}/${dailyObservationName(prefix, runDate)}`;
  if (!exists(base)) return base; // keep the conventional first daily filename
  const utcTime = `${now.toISOString().slice(11, 23).replace(/[:.]/g, '')}Z`; // HHMMSSmmmZ
  for (let i = 0; i < 1000; i++) {
    const candidate = `${dir}/${prefix}-${runDate}-${utcTime}-${random()}.json`;
    if (!exists(candidate)) return candidate;
  }
  throw new GscError(`Could not find a collision-free observation filename in ${dir} for ${runDate}.`, { kind: 'io' });
}

export { atomicWriteJson } from './gsc-persist.mjs';
