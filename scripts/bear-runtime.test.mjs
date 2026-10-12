import test from 'node:test';
import assert from 'node:assert/strict';
const runtime = await import('./bear-runtime.mjs').catch(() => ({}));
test('runtime authorization rejects absent and incorrect tokens', () => {
  assert.equal(typeof runtime.authorized, 'function');
  assert.equal(runtime.authorized(undefined,'abc123'),false);
  assert.equal(runtime.authorized('Bearer wrong','abc123'),false);
  assert.equal(runtime.authorized('Bearer abc123','abc123'),true);
});
test('runtime commands have bounded length and prohibit null bytes', () => {
  assert.equal(typeof runtime.validateCommand, 'function');
  assert.equal(runtime.validateCommand('printf hello'),'printf hello');
  assert.throws(()=>runtime.validateCommand(''),/command/i);
  assert.throws(()=>runtime.validateCommand('a'.repeat(5000)),/command/i);
  assert.throws(()=>runtime.validateCommand('pwd\0id'),/command/i);
});
