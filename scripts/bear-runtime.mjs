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
async function inspectContainer() {
  try { return JSON.parse((await docker(['inspect',container])).stdout)[0]; }
  catch { return null; }
}
async function ensureContainer(acquisition) {
  const info=await inspectContainer();
  if (info) {
    if (info.Config?.Labels?.['bear.workspace'] !== 'local-v1') throw new Error('Container name belongs to another runtime');
    if(typeof info.Id!=='string'||!info.Id)throw new Error('Container identity is unavailable');
    acquisition.id=info.Id;
    if (!info.State.Running) {
      // Record ownership before mutation so a CLI failure after starting still rolls back.
      acquisition.owned=true;
      await docker(['start',acquisition.id]);
    }
    return;
  }
  acquisition.created=true;
  const result=await docker(['run','-d','--name',container,'--label','bear.workspace=local-v1','--label',`bear.runtime-session=${acquisition.session}`,'--memory','512m','--cpus','1','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--network','none','--mount','type=volume,source=bear-space-local-v1,target=/workspace','--workdir','/workspace',image,'sleep','infinity'],{timeout:60000});
  acquisition.id=result.stdout.trim();
  acquisition.owned=true;
}
export async function startRuntime({ port = 8777, configFile = path.resolve('.netlify/bear-runtime.json') } = {}) {
  const token = randomBytes(32).toString('hex'); let busy = false;
  const acquisition={session:randomBytes(16).toString('hex'),id:null,owned:false,created:false};
  const temporaryConfig=`${configFile}.${acquisition.session}.tmp`;
  let server,temporaryHandle,temporaryOwned=false,configWritten=false,configText,closePromise;
  const close=()=>closePromise ||= (async()=>{
    const errors=[];
    const cleanup=async operation=>{try{await operation();}catch(error){if(error.code!=='ENOENT')errors.push(error);}};
    await cleanup(async()=>{if(server?.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));});
    await cleanup(async()=>{if(temporaryHandle){await temporaryHandle.close();temporaryHandle=null;}});
    await cleanup(async()=>{
      // Another local runtime may have replaced the configuration after this one started.
      if(configWritten && await fs.readFile(configFile,'utf8')===configText)await fs.unlink(configFile);
    });
    await cleanup(async()=>{if(temporaryOwned){await fs.unlink(temporaryConfig);temporaryOwned=false;}});
    await cleanup(async()=>{
      // A failed Docker run may have created its container before returning an error.
      if(acquisition.created&&!acquisition.id){
        const info=await inspectContainer();
        if(info?.Config?.Labels?.['bear.runtime-session']===acquisition.session){acquisition.id=info.Id;acquisition.owned=true;}
      }
      if(acquisition.owned&&acquisition.id)await docker(['stop','--time','2',acquisition.id]);
    });
    if(errors.length)throw new AggregateError(errors,'Runtime cleanup could not release every owned resource');
  })();
  try {
    await ensureContainer(acquisition);
    server = createServer(async (req,res) => {
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
    await new Promise((resolve,reject)=>{
      const failed=error=>reject(error);
      server.once('error',failed);
      server.listen(port,'127.0.0.1',()=>{server.removeListener('error',failed);resolve();});
    });
    const url=`http://127.0.0.1:${server.address().port}`;
    configText=JSON.stringify({url,token});
    await fs.mkdir(path.dirname(configFile),{recursive:true});
    temporaryHandle=await fs.open(temporaryConfig,'wx',0o600);
    temporaryOwned=true;
    await fs.writeFile(temporaryHandle,configText);
    await fs.chmod(temporaryConfig,0o600);
    await temporaryHandle.close();temporaryHandle=null;
    // Publish a complete private file without overwriting another active runtime's config.
    await fs.link(temporaryConfig,configFile);configWritten=true;
    await fs.unlink(temporaryConfig);temporaryOwned=false;
    return {url,token,close};
  } catch(error) {
    try { await close(); }
    catch(rollbackError){throw new AggregateError([error,rollbackError],`Runtime startup failed: ${error.message}; rollback incomplete`,{cause:error});}
    throw error;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const runtime=await startRuntime();
  console.log(`BEAR local sandbox ready at ${runtime.url}. Files persist in an owned Docker volume.`);
  let closing=false;
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(closing)return;closing=true;await runtime.close();process.exit(0);});
}
