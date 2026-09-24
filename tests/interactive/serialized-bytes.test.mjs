import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  MAX_SPEC_BYTES,
  serializedConfigBytes,
} from '../../scripts/check-interactive-specs.mjs';
import { validateSpec, formatErrors } from '../../assets/js/components/spec-schema.mjs';

const fixture = (name) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../fixtures/interactive/data/${name}`, import.meta.url)),
      'utf8'
    )
  );

test('serializedConfigBytes matches HTML-safe JSON escaping (each of < > & is six bytes)', () => {
  const spec = fixture('safety-strings-loop-v1.json');
  const rawJson = JSON.stringify({ id: spec.id, lang: 'zh', spec });
  const measured = serializedConfigBytes(spec);
  // Go's encoding/json (Hugo jsonify default) escapes <, >, & to \uXXXX.
  const escapes = (rawJson.match(/[<>&]/g) || []).length;
  assert.equal(measured, Buffer.byteLength(rawJson, 'utf8') + escapes * 5);
});

test('boundary-size-v1 is schema-valid and just under the serialized budget', () => {
  const spec = fixture('boundary-size-v1.json');
  const { ok, errors } = validateSpec(spec, { file: 'boundary-size-v1.json' });
  assert.equal(ok, true, formatErrors(errors));
  const bytes = serializedConfigBytes(spec);
  assert.ok(bytes <= MAX_SPEC_BYTES, `${bytes} must fit the budget`);
  assert.ok(bytes >= 29000, `${bytes} must be a meaningful near-boundary case`);
});

test('oversize-escaped-v1 passes the schema but blows the serialized budget', () => {
  // The exact bypass the template-level gate closes: raw JSON is small and
  // schema-valid, but HTML-safe serialization expands past 30 KiB.
  const spec = fixture('oversize-escaped-v1.json');
  const { ok, errors } = validateSpec(spec, { file: 'oversize-escaped-v1.json' });
  assert.equal(ok, true, formatErrors(errors));
  assert.ok(
    Buffer.byteLength(JSON.stringify(spec), 'utf8') < MAX_SPEC_BYTES,
    'raw source stays under the early bound'
  );
  assert.ok(
    serializedConfigBytes(spec) > MAX_SPEC_BYTES,
    'serialized payload must exceed the budget so the build gate rejects it'
  );
});
