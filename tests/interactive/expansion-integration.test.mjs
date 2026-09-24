import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateSpec, KINDS } from '../../assets/js/components/spec-schema.mjs';

const additions = ['session-tree', 'session-scope', 'memory-lineage', 'effect-recovery',
  'gitops-reconcile', 'reliability-chain', 'task-cost', 'notification-threshold',
  'vector-cosine', 'flow-bottleneck'];
const dir = new URL('../../data/interactive/', import.meta.url);
const specs = readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => ({
  name, spec: JSON.parse(readFileSync(new URL(name, dir), 'utf8')),
})).filter(({ spec }) => additions.includes(spec.kind));

test('every promised new interaction has a registered, valid, bounded spec', () => {
  for (const kind of additions) {
    assert.ok(KINDS.includes(kind), `unregistered kind: ${kind}`);
    assert.ok(specs.some(({ spec }) => spec.kind === kind), `missing teaching data: ${kind}`);
  }
  for (const { name, spec } of specs) {
    assert.equal(spec.id, name.slice(0, -5));
    const result = validateSpec(spec, { file: name });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    // Use the HTML-safe serialization measured by the production gate.
    for (const lang of ['zh', 'en']) {
      const payload = JSON.stringify({ id: spec.id, lang, spec })
        .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
      assert.ok(Buffer.byteLength(payload) <= 30720, `${name}: oversized ${lang} config`);
    }
  }
});

const corruptions = {
  'unknown model fields': (s) => { s.model.undeclared = 1; },
  'missing locale': (s) => { delete s.copy.en; },
  'unknown locale': (s) => { s.copy.fr = s.copy.en; },
  'missing default': (s) => { s.defaultScenario = 'not-a-scenario'; },
  'empty scenarios': (s) => { s.scenarios = []; },
  'duplicate scenario': (s) => { s.scenarios.push(structuredClone(s.scenarios[0])); },
  'null model': (s) => { s.model = null; },
  'null scenario': (s) => { s.scenarios[0] = null; },
  'unsafe source URL': (s) => { s.sourceRefs[0].url = 'javascript:alert(1)'; },
  'unsafe protocol-relative URL': (s) => { s.sourceRefs[0].url = '//example.com'; },
  'missing source': (s) => { s.sourceRefs = []; },
  'unexpected top-level executable expression': (s) => { s.expression = 'alert(1)'; },
};

for (const [label, corrupt] of Object.entries(corruptions)) {
  test(`all expansion schemas reject ${label} without throwing`, () => {
    assert.ok(specs.length > 0, 'expansion specs must be present');
    for (const { name, spec } of specs) {
      const broken = structuredClone(spec);
      corrupt(broken);
      let result;
      assert.doesNotThrow(() => { result = validateSpec(broken, { file: name }); }, name);
      assert.equal(result.ok, false, `${name} accepted ${label}`);
      assert.ok(result.errors.length > 0, `${name} needs actionable field errors`);
    }
  });
}
