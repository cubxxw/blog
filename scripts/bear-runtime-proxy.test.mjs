import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let handler;
try { handler = require('../netlify/functions/bear-runtime.js').handler; } catch {}
test('public deployments cannot call the local sandbox even when request origin is forged', async () => {
  assert.equal(typeof handler,'function');
  const result = await handler({httpMethod:'POST',headers:{host:'cubxxw.com',origin:'http://localhost:8889','content-type':'application/json'},body:'{"command":"id"}'});
  assert.equal(result.statusCode,403);
});
test('local sandbox rejects cross-site browser requests before reading credentials', async () => {
  assert.equal(typeof handler,'function');
  const previous = process.env.NETLIFY_DEV;process.env.NETLIFY_DEV='true';
  try {
    const result=await handler({httpMethod:'POST',headers:{host:'localhost:8889',origin:'https://untrusted.test','content-type':'application/json'},body:'{"command":"id"}'});
    assert.equal(result.statusCode,403);
  } finally {if(previous===undefined)delete process.env.NETLIFY_DEV;else process.env.NETLIFY_DEV=previous;}
});
