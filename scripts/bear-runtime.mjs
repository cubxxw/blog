#!/usr/bin/env node
// Local-only execution adapter. The public website never has this token or Docker access.
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const exec = promisify(execFile);
const container = 'bear-space-local-v1';
const image = 'alpine@sha256:ce64758a109eb420d874a118f87920e625e12d3634e03b4a5573fd9f6e5d3507';
export function authorized(header, token) {
  if (typeof header !== 'string' || typeof token !== 'string') return false;
  const actual = Buffer.from(header), expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual,expected);
}
export function validateCommand(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4000 || value.includes('\0')) throw new Error('Invalid command');
  return value.trim();
}
async function docker(args, options = {}) {
  return exec('docker',args,{timeout:20000,maxBuffer:150000,...options});
}
async function ensureContainer() {
  let info;
  try { info = JSON.parse((await docker(['inspect',container])).stdout)[0]; } catch { /* No owned runtime yet. */ }
  if (info) {
    if (info.Config?.Labels?.['bear.workspace'] !== 'local-v1') throw new Error('Container name belongs to another runtime');
    if (!info.State.Running) await docker(['start',container]);
    return;
  }
  await docker(['run','-d','--name',container,'--label','bear.workspace=local-v1','--memory','512m','--cpus','1','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--network','none','--mount','type=volume,source=bear-space-local-v1,target=/workspace','--workdir','/workspace',image,'sleep','infinity'],{timeout:60000});
}
export async function startRuntime({ port = 8777, configFile = path.resolve('.netlify/bear-runtime.json') } = {}) {
  await ensureContainer();
  const token = randomBytes(32).toString('hex'); let busy = false;
  const server = createServer(async (req,res) => {
    const send = (code,data) => { res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data)); };
    if (!authorized(req.headers.authorization,token)) { send(401,{error:'Unauthorized'});return; }
    if (req.method==='GET' && req.url==='/status') { send(200,{available:true,kind:'docker',workspace:'/workspace',network:'disabled',busy});return; }
    if(req.method!=='POST'||req.url!=='/run'){send(404,{error:'Not found'});return;}
    if(busy){send(409,{error:'A command is already running'});return;}
    let body='', ownsExecution=false;
    try {
      for await(const part of req){body+=part;if(body.length>8000){send(413,{error:'Request too large'});return;}}
      const command=validateCommand(JSON.parse(body).command);
      if(busy){send(409,{error:'A command is already running'});return;}
      busy=true;
      ownsExecution=true;
      let result;
      try { const r=await docker(['exec',container,'timeout','-s','KILL','15','sh','-lc',command]);result={stdout:r.stdout,stderr:r.stderr,exitCode:0}; }
      catch(error){result={stdout:error.stdout||'',stderr:error.stderr||'Command failed or timed out',exitCode:Number.isInteger(error.code)?error.code:124};}
      send(200,{...result,stdout:result.stdout.slice(0,50000),stderr:result.stderr.slice(0,10000),workspace:'/workspace'});
    } catch {send(400,{error:'Invalid command request'});}
    finally{if(ownsExecution)busy=false;}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  await fs.mkdir(path.dirname(configFile),{recursive:true});
  await fs.writeFile(configFile,JSON.stringify({url:`http://127.0.0.1:${server.address().port}`,token}),{mode:0o600});
  await fs.chmod(configFile,0o600);
  const close=async()=>{await new Promise(resolve=>server.close(resolve));await fs.unlink(configFile).catch(()=>{});await docker(['stop','--time','2',container]).catch(()=>{});};
  return {url:`http://127.0.0.1:${server.address().port}`,token,close};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const runtime=await startRuntime();
  console.log(`BEAR local sandbox ready at ${runtime.url}. Files persist in an owned Docker volume.`);
  let closing=false;
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(closing)return;closing=true;await runtime.close();process.exit(0);});
}
