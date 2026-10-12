import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const {handler} = createRequire(import.meta.url)('../netlify/functions/bear-runtime.js');
const enabled=process.env.BEAR_RUNTIME_INTEGRATION==='1';
const headers={host:'localhost:8889',origin:'http://localhost:8889','content-type':'application/json'};
async function run(command){const response=await handler({httpMethod:'POST',headers,body:JSON.stringify({command})});return {status:response.statusCode,...JSON.parse(response.body)};}
test('local Docker execution persists a real file between independent requests',{skip:!enabled},async()=>{
  process.env.NETLIFY_DEV='true';
  const file=`/workspace/bear-test-${randomUUID()}.txt`;
  try{
    const written=await run(`printf 'persistent workspace' > '${file}'`);
    assert.equal(written.status,200);assert.equal(written.exitCode,0);
    const read=await run(`cat '${file}'; printf '\\n'; pwd`);
    assert.equal(read.exitCode,0);assert.equal(read.stdout,'persistent workspace\n/workspace\n');
  }finally{await run(`rm -f '${file}'`);delete process.env.NETLIFY_DEV;}
});
test('local runtime serializes concurrent requests rather than mixing execution',{skip:!enabled},async()=>{
  process.env.NETLIFY_DEV='true';
  try{
    const first=run('sleep 1; printf first');
    await new Promise(resolve=>setTimeout(resolve,150));
    const second=await run('printf second');
    assert.equal(second.status,409);
    const finished=await first;assert.equal(finished.stdout,'first');assert.equal(finished.exitCode,0);
  }finally{delete process.env.NETLIFY_DEV;}
});
