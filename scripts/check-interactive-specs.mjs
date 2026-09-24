#!/usr/bin/env node
/**
 * check-interactive-specs.mjs — build-time gate for data/interactive/*.json.
 *
 * Validates every scenario spec against the executable data contract
 * (assets/js/components/spec-schema.mjs — the build registry uses the same
 * per-kind pure validators as the corresponding browser entries),
 * plus the repository rules that are file-level concerns:
 *
 *   - filename stem matches ^[a-z0-9]+(-[a-z0-9]+)*$ and equals the spec `id`
 *     (this is what makes the shortcode `spec` parameter path-safe: the stem is
 *     a local identifier, never a URL or path);
 *   - the spec JSON stays within the per-instance embedded-config budget.
 *
 * Usage:
 *   node scripts/check-interactive-specs.mjs            # check data/interactive/
 *   node scripts/check-interactive-specs.mjs <file...>   # check explicit files
 *
 * Runs before Hugo in every CI / Netlify production and preview build.
 * Exit code 0 = all specs valid; 1 = at least one error (printed as
 * `file: field: message`).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateSpec,
  formatErrors,
  LIMITS,
} from '../assets/js/components/spec-schema.mjs';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DATA_DIR = join(REPO_ROOT, 'data', 'interactive');

/** Per-instance embedded config budget from the acceptance contract (bytes
 * of the final HTML-safe serialized {id, lang, spec} string — the same string
 * the shortcode measures and emits; see layouts/shortcodes/interactive.html).
 * The source-file bound below is only an EARLY bound: HTML escaping can
 * expand raw JSON several-fold (each of `<`, `>`, `&` becomes six bytes),
 * which is why the authoritative serialized-byte gate lives in the template. */
export const MAX_SPEC_BYTES = 30 * 1024;

/**
 * Byte length of Hugo's HTML-safe JSON serialization (Go encoding/json with
 * HTML escaping on — the jsonify default): `<`, `>`, `&`, U+2028 and U+2029
 * become \uXXXX escapes. Used to early-bound source specs the way the build
 * gate measures them; the Hugo template still measures the exact emitted
 * string authoritatively.
 */
export function serializedConfigBytes(raw) {
  const payload = { id: raw.id, lang: 'zh', spec: raw };
  const json = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return Buffer.byteLength(json, 'utf8');
}

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Resolve the files to check (explicit args, or the whole data directory). */
export function listSpecFiles(args = []) {
  if (args.length > 0) return args.map((a) => resolve(a));
  let entries;
  try {
    entries = readdirSync(DATA_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(DATA_DIR, name));
}

/**
 * Validate a single spec file. Returns an array of error strings.
 * Exported for tests.
 */
export function checkSpecFile(file) {
  const errors = [];
  const label = file.replace(`${REPO_ROOT}/`, '');
  const stem = basename(file).replace(/\.json$/, '');

  if (!ID_RE.test(stem)) {
    errors.push(
      `${label}: $.id: filename stem "${stem}" must match ${ID_RE} (it is the shortcode "spec" identifier, not a path or URL)`
    );
  }

  let raw;
  let bytes = 0;
  try {
    const buf = readFileSync(file);
    bytes = buf.length;
    raw = JSON.parse(buf.toString('utf8'));
  } catch (err) {
    errors.push(`${label}: $: cannot parse JSON (${err.message})`);
    return errors;
  }

  if (bytes > MAX_SPEC_BYTES) {
    errors.push(
      `${label}: $: spec is ${bytes} bytes; embedded per-instance config must stay within ${MAX_SPEC_BYTES} bytes`
    );
  }

  const { ok, errors: specErrors } = validateSpec(raw, { file: label });
  for (const e of specErrors) errors.push(formatErrors([e]));

  if (ok) {
    const serialized = serializedConfigBytes(raw);
    if (serialized > MAX_SPEC_BYTES) {
      errors.push(
        `${label}: $: serialized config would be ~${serialized} bytes (HTML-safe {id,lang,spec}); embedded per-instance config must stay within ${MAX_SPEC_BYTES} bytes`
      );
    }
    if (raw.id !== stem) {
      errors.push(`${label}: $.id: id "${raw.id}" must equal the filename stem "${stem}"`);
    }
  }
  return errors;
}

export function run(args = []) {
  const files = listSpecFiles(args);
  const allErrors = [];
  if (files.length === 0) {
    console.log('check-interactive-specs: no spec files found (nothing to validate).');
    return 0;
  }
  for (const file of files) {
    allErrors.push(...checkSpecFile(file));
  }
  if (allErrors.length > 0) {
    console.error(`check-interactive-specs: ${allErrors.length} error(s):`);
    for (const e of allErrors) console.error(`  ${e}`);
    return 1;
  }
  const bytes = files.map((f) => statSync(f).size);
  console.log(
    `check-interactive-specs: ${files.length} spec(s) valid ` +
      `(${bytes.reduce((a, b) => a + b, 0)} bytes total, max ${Math.max(...bytes)} bytes; ` +
      `limit ${MAX_SPEC_BYTES} bytes/instance).`
  );
  return 0;
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  process.exit(run(process.argv.slice(2)));
}

// Referenced so linting tools see the schema constants as used by this gate.
void LIMITS;
