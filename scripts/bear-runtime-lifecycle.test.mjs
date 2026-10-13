import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { syncBuiltinESMExports } from 'node:module';

// Real HTTP and real files exercise rollback; only Docker and explicit I/O errors are replaced.
async function fixture(t,{ initial = 'running', failure, dockerFailure } = {}) {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'bear-runtime-lifecycle-'));
  const configFile=path.join(directory,'runtime.json');
  const servers=[];
  const container={ exists:initial!=='missing',running:initial==='running',id:'fixture-container',labels:{'bear.workspace':'local-v1'},stops:0 };
  const createServer=http.createServer;
  t.mock.method(http,'createServer',(...args)=>{const server=createServer(...args);servers.push(server);return server;});
  const docker=async (executable,args)=>{
    assert.equal(executable,'docker');
    const [operation]=args;
    if(operation==='inspect') {
      if(!container.exists)throw Object.assign(new Error('No such container'),{code:1});
      return {stdout:JSON.stringify([{Id:container.id,State:{Running:container.running},Config:{Labels:{...container.labels}}}]),stderr:''};
    }
    if(operation==='start') {
      assert.equal(container.exists,true);
      container.running=true;
      if(dockerFailure==='start')throw new Error('Docker start failed after starting');
      return {stdout:container.id,stderr:''};
    }
    if(operation==='run') {
      assert.equal(container.exists,false);
      container.exists=true;container.running=true;
      for(let i=0;i<args.length;i++)if(args[i]==='--label'){const [key,...value]=args[++i].split('=');container.labels[key]=value.join('=');}
      if(dockerFailure==='run')throw new Error('Docker run failed after creating');
      return {stdout:`${container.id}\n`,stderr:''};
    }
    if(operation==='stop') {
      assert.ok([container.id,'bear-space-local-v1'].includes(args.at(-1)),'stop must target the acquired container');
      container.running=false;container.stops++;
      return {stdout:container.id,stderr:''};
    }
    if(operation==='exec')return {stdout:'fixture output',stderr:''};
    throw new Error(`Unexpected Docker operation: ${operation}`);
  };
  const execFile=()=>{throw new Error('Docker must use its promise boundary');};
  Object.defineProperty(execFile,promisify.custom,{value:docker});
  // A mock-method proxy keeps execFile's original promisify.custom and can bypass the stub.
  const originalExecFile=childProcess.execFile;
  childProcess.execFile=execFile;
  assert.equal(promisify(childProcess.execFile),docker,'fixture must replace the Docker promise boundary before importing runtime');
  if(failure) {
    const writeFile=fs.writeFile;
    t.mock.method(fs,failure,async(...args)=>{
      if(failure==='writeFile')await writeFile(args[0],args[1].slice(0,10));
      throw Object.assign(new Error(`Injected ${failure} failure`),{code:'EACCES'});
    });
  }
  syncBuiltinESMExports();
  t.after(async()=>{
    for(const server of servers)if(server.listening)await new Promise(resolve=>server.close(resolve));
    t.mock.restoreAll();childProcess.execFile=originalExecFile;syncBuiltinESMExports();
    await fs.rm(directory,{recursive:true,force:true});
  });
  const runtime=await import(`./bear-runtime.mjs?lifecycle=${randomUUID()}`);
  return { ...runtime,configFile,container,servers };
}

async function status(runtime) {
  const response=await fetch(`${runtime.url}/status`,{headers:{authorization:`Bearer ${runtime.token}`}});
  assert.equal(response.status,200);
  return response.json();
}

for(const failure of ['writeFile','chmod']) {
  test(`${failure} failure rolls back the listener, owned container, and incomplete configuration`,async t=>{
    const f=await fixture(t,{initial:'missing',failure});
    await assert.rejects(f.startRuntime({port:0,configFile:f.configFile}),new RegExp(`Injected ${failure} failure`));
    assert.equal(f.servers.length,1);
    assert.equal(f.servers[0].listening,false,'failed startup must release its real HTTP listener');
    assert.equal(f.container.running,false,'a container created by failed startup must be stopped');
    assert.equal(f.container.stops,1);
    await assert.rejects(fs.access(f.configFile),{code:'ENOENT'});
    assert.deepEqual(await fs.readdir(path.dirname(f.configFile)),[],'failed startup must leave no partial config');
  });
}

test('a runtime borrowing an already-running container leaves that container running when closed',async t=>{
  const f=await fixture(t);
  const runtime=await f.startRuntime({port:0,configFile:f.configFile});
  const published=JSON.parse(await fs.readFile(f.configFile,'utf8'));
  assert.equal((await status(published)).available,true,'published configuration must authenticate to the real service');
  assert.equal((await fs.stat(f.configFile)).mode&0o777,0o600,'runtime credentials must stay private after publication');
  assert.equal((await status(runtime)).available,true);
  await runtime.close();
  assert.equal(f.servers[0].listening,false);
  assert.equal(f.container.running,true,'the session that already owned the container must remain available');
  assert.equal(f.container.stops,0);
  await assert.rejects(fs.access(f.configFile),{code:'ENOENT'});
});

for(const initial of ['stopped','missing']) {
  test(`${initial} container is owned by this session and close is idempotent`,async t=>{
    const f=await fixture(t,{initial});
    const runtime=await f.startRuntime({port:0,configFile:f.configFile});
    assert.equal((await status(runtime)).available,true);
    assert.equal(f.container.running,true);
    await Promise.all([runtime.close(),runtime.close()]);
    await runtime.close();
    assert.equal(f.servers[0].listening,false);
    assert.equal(f.container.running,false);
    assert.equal(f.container.stops,1,'concurrent and repeated close must release the container once');
    await assert.rejects(fs.access(f.configFile),{code:'ENOENT'});
  });
}

test('closing a runtime keeps configuration replaced by another session',async t=>{
  const f=await fixture(t);
  const runtime=await f.startRuntime({port:0,configFile:f.configFile});
  const replacement=JSON.stringify({url:'http://127.0.0.1:9999',token:'another-session'});
  await fs.writeFile(f.configFile,replacement);
  await runtime.close();
  assert.equal(await fs.readFile(f.configFile,'utf8').catch(()=>null),replacement);
  assert.equal(f.container.running,true);
});

test('a second runtime cannot overwrite an active runtime configuration',async t=>{
  const f=await fixture(t);
  const first=await f.startRuntime({port:0,configFile:f.configFile});
  const original=await fs.readFile(f.configFile,'utf8');
  await assert.rejects(f.startRuntime({port:0,configFile:f.configFile}),{code:'EEXIST'});
  assert.equal(await fs.readFile(f.configFile,'utf8'),original);
  assert.equal((await status(first)).available,true,'the first real HTTP service must remain reachable');
  assert.equal(f.servers[1].listening,false);
  assert.equal(f.container.running,true);
  await first.close();
});

test('configuration failure does not stop a container running before startup',async t=>{
  const f=await fixture(t,{failure:'chmod'});
  await assert.rejects(f.startRuntime({port:0,configFile:f.configFile}),/Injected chmod failure/);
  assert.equal(f.container.running,true);
  assert.equal(f.container.stops,0);
  assert.equal(f.servers[0].listening,false);
  await assert.rejects(fs.access(f.configFile),{code:'ENOENT'});
});

test('listen failure rolls back a container started here without closing the existing listener',async t=>{
  const owner=http.createServer((req,res)=>res.end('existing service'));
  await new Promise(resolve=>owner.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>owner.close(resolve)));
  const f=await fixture(t,{initial:'stopped'});
  await assert.rejects(f.startRuntime({port:owner.address().port,configFile:f.configFile}),{code:'EADDRINUSE'});
  assert.equal(f.container.running,false);
  assert.equal(f.container.stops,1);
  assert.equal(await (await fetch(`http://127.0.0.1:${owner.address().port}`)).text(),'existing service');
});

for(const [initial,dockerFailure] of [['stopped','start'],['missing','run']]) {
  test(`Docker ${dockerFailure} failure after a side effect rolls back only the acquired container`,async t=>{
    const f=await fixture(t,{initial,dockerFailure});
    await assert.rejects(f.startRuntime({port:0,configFile:f.configFile}),new RegExp(`Docker ${dockerFailure} failed`));
    assert.equal(f.container.running,false);
    assert.equal(f.container.stops,1);
    assert.equal(f.servers.length,0);
    await assert.rejects(fs.access(f.configFile),{code:'ENOENT'});
  });
}
