// DIAGNOSTIC BRANCH ONLY. No product changes, retries, secrets, autorun or upload.
// NodeRunner.run spawns a fresh Lighthouse CLI/Chrome per call; unlike collect's
// runUntilSuccess it does not hide up to three attempts. Pinned source:
// github.com/GoogleChrome/lighthouse-ci/blob/v0.15.1/packages/cli/src/collect/node-runner.js
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {createRequire} = require('node:module');
const {spawnSync} = require('node:child_process');
const root = process.cwd();
const out = path.join(root, 'linux-projects-lhflags');
const configPath = path.join(root, 'lighthouserc.json');
const configBytes = fs.readFileSync(configPath);
const config = JSON.parse(configBytes);
const formalConfigSha256 = '43e5a816062841a4ebb630d6dca8356b264d88b3f922aa0e145d8a3f0b3d8f40';
const entrySha256 = 'efbefe49f7bd380f4955acd760c4fb6aec55d1156782debca20904d6903befec';
const preview = {source:'5549fc390867d339fb69e155bb88f8fc1e2f8e01',deploy:'6ae234266b7b03410e11a769',url:'https://6ae234266b7b03410e11a769--cubxxw.netlify.app/projects/',worldSha256:'48305a6f94d871a198ac99b84a993b7ebb07b885b4c1cf0eca76f90be813bcb3'};
const targets = [
  {...preview,label:'original-flags',extraChromeFlags:[]},
  {...preview,label:'explicit-swiftshader',extraChromeFlags:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']},
];
const manifest = {schema:'projects-linux-lhflags/1', diagnostic:true, formalRecovery:false,
  collectorSource:process.env.GITHUB_SHA, collectorBranch:process.env.GITHUB_REF_NAME,
  runId:process.env.GITHUB_RUN_ID, runAttempt:process.env.GITHUB_RUN_ATTEMPT,
  platform:process.platform, node:process.version, startedAt:new Date().toISOString(),
  officialPlan:{urlCount:config.ci.collect.url.length,numberOfRuns:config.ci.collect.numberOfRuns,
    configSha256:createHash('sha256').update(configBytes).digest('hex'),assertions:config.ci.assert.assertions},
  invocationUnit:'one NodeRunner.run call; not a claim of one internal browser navigation',
  targetPlan:targets.map(t=>({...t,plannedCollectorInvocations:1})), observations:[]};
fs.mkdirSync(out,{recursive:true});
const save = () => fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
const requireCondition = (ok,code) => { if(!ok) throw new Error(code); };
async function readJson(url){const r=await fetch(url,{signal:AbortSignal.timeout(15000)});requireCondition(r.ok,'public-identity-read-failed');return r.json();}
async function verifyIdentities(){
  const d=await readJson('https://api.netlify.com/api/v1/deploys/'+preview.deploy);
  const row={id:d?.id,state:d?.state,context:d?.context,commit_ref:d?.commit_ref,branch:d?.branch};
  requireCondition(row.id===preview.deploy&&row.commit_ref===preview.source&&row.state==='ready','target-source-or-deploy-changed');
  requireCondition(row.context==='deploy-preview','target-context-mismatch');
  return [row];
}
async function fingerprint(target){
  const r=await fetch(target.url,{signal:AbortSignal.timeout(15000)});
  requireCondition(r.status===200&&new URL(r.url).origin===new URL(target.url).origin,'target-html-unavailable');
  const html=await r.text();
  const script=html.match(/\bsrc=["']?(\/js\/bear-workspace\.([a-f0-9]{64})\.js)/);
  requireCondition(script?.[2]===entrySha256,'entry-script-declaration-mismatch');
  const declaration=html.match(/<script\b[^>]*\bdata-space-world-module\b[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const world=declaration?JSON.parse(declaration).jiangnan:null;
  requireCondition(world==='/js/space/world-jiangnan.'+target.worldSha256+'.js','world-module-declaration-mismatch');
  const result={htmlHttp:r.status};
  for(const [kind,asset,expected] of [['entry',script[1],entrySha256],['world',world,target.worldSha256]]){
    const a=await fetch(new URL(asset,target.url),{signal:AbortSignal.timeout(15000)});
    requireCondition(a.status===200&&new URL(a.url).origin===new URL(target.url).origin,'target-script-unavailable');
    const bytes=Buffer.from(await a.arrayBuffer());const hash=createHash('sha256').update(bytes).digest('hex');
    requireCondition(hash===expected,'target-script-bytes-mismatch');
    result[kind]={path:asset,bytes:bytes.length,sha256:hash};
  }
  return result;
}
const codes=new Set(['PAGE_HUNG','PROTOCOL_TIMEOUT','TARGET_CRASHED','NO_FCP','ERRORED_DOCUMENT_REQUEST','FAILED_DOCUMENT_REQUEST']);
const cdpMethods=new Set(['Runtime.evaluate','Page.captureScreenshot','DOMSnapshot.captureSnapshot','Tracing.end','Page.getLayoutMetrics']);
function failureMethod(text){for(const m of text.matchAll(/(?:Protocol error \(|"protocolMethod"\s*:\s*")([A-Za-z]+\.[A-Za-z]+)(?:\)|")/g))if(cdpMethods.has(m[1]))return m[1];return 'unknown';}
const safeCode = code => codes.has(code)?code:'unknown';
const guardCodes=new Set(['actual-settings-mismatch','expected-one-lhr','assertion-artifact-missing','entry-script-declaration-mismatch','world-module-declaration-mismatch','target-script-bytes-mismatch','target-script-unavailable','target-html-unavailable','target-source-or-deploy-changed','target-context-mismatch','public-identity-read-failed']);
function failure(error){const text=String(error?.stderr||'');return {
  kind:guardCodes.has(error?.message)?error.message:text.includes('page stopped responding')?'page-hung':text.includes('Target closed')?'target-closed':text.includes('PROTOCOL_TIMEOUT')?'protocol-timeout':'collector-or-call-failure',
  errorName:['Error','TypeError','SyntaxError','RangeError','TimeoutError'].includes(error?.name)?error.name:'unknown',
  runtimeCode:[...codes].find(code=>text.includes(code))||'unknown',
  cdpMethod:failureMethod(text),
  exitCode:/^Lighthouse failed with exit code -?\d+$/.test(error?.message||'')?Number(error.message.split(' ').at(-1)):null,
  pageLoadTimeout:text.includes('Timed out waiting for page load'),targetClosed:text.includes('Target closed')};}
function summarize(lhr){
  const s=lhr.configSettings||{},e=lhr.environment||{};
  return {lighthouseVersion:lhr.lighthouseVersion,fetchTime:lhr.fetchTime,runtimeError:lhr.runtimeError?{code:safeCode(lhr.runtimeError.code)}:null,
    settings:{formFactor:s.formFactor,throttlingMethod:s.throttlingMethod,throttling:s.throttling,screenEmulation:s.screenEmulation,maxWaitForLoad:s.maxWaitForLoad},
    environment:{hostUserAgent:e.hostUserAgent,benchmarkIndex:e.benchmarkIndex},
    scriptFingerprints:(lhr.audits?.['network-requests']?.details?.items||[]).flatMap(item=>{try{const u=new URL(item.url);return /^\/js\/(bear-workspace|space\/world-jiangnan|space\/cafe-scene|vendor\/three\.module\.min)\.[a-f0-9]{64}\.js$/.test(u.pathname)?[{path:u.pathname,http:item.statusCode}]:[];}catch{return [];}})};
}
(async()=>{
  save();
  requireCondition(process.platform==='linux'&&process.version==='v22.23.1','wrong-node-or-platform');
  requireCondition(manifest.collectorBranch==='codex/blog-lighthouse-flags-20261029','wrong-diagnostic-branch');
  requireCondition(manifest.officialPlan.configSha256===formalConfigSha256,'official-config-hash-mismatch');
  requireCondition(config.ci.collect.url.length===13&&config.ci.collect.numberOfRuns===1&&config.ci.collect.settings.chromeFlags==='--no-sandbox --disable-dev-shm-usage','official-config-drift');
  const tools=createRequire(path.join(root,'.lh-diagnostic-tools/package.json'));
  const NodeRunner=tools('@lhci/cli/src/collect/node-runner.js');
  const {saveLHR}=tools('@lhci/utils/src/saved-reports.js');
  const cliVersion=tools('@lhci/cli/package.json').version,lhVersion=tools('lighthouse/package.json').version;
  const lhRequire=createRequire(tools.resolve('lighthouse'));
  const launcherPackage=JSON.parse(fs.readFileSync(path.join(path.dirname(lhRequire.resolve('chrome-launcher')),'..','package.json')));
  const chromePath=require('playwright').chromium.executablePath();
  const chrome=spawnSync(chromePath,['--version'],{encoding:'utf8'}).stdout.trim();
  requireCondition(cliVersion==='0.15.1'&&lhVersion==='12.6.1'&&launcherPackage.name==='chrome-launcher'&&launcherPackage.version==='1.2.2'&&chrome==='Google Chrome for Testing 156.0.8078.4','wrong-collector-or-browser');
  manifest.collector={cli:cliVersion,lighthouse:lhVersion,chromeLauncher:launcherPackage.version,chromeLauncherResolvedFrom:'lighthouse',chrome,extraObservers:false,
    invocation:'@lhci/cli/src/collect/node-runner.js#run (one call per target)',
    loadDeadlineMs:45000,defaultProtocolDeadlineMs:30000,throttlingMethod:'simulate',cpuSlowdownMultiplier:4,screen:{width:412,height:823,deviceScaleFactor:1.75,mobile:true}};
  manifest.identityBefore=await verifyIdentities();save();
  // The collector child inherits only this allowlist, excluding Actions runtime
  // credentials and all GitHub/service secret variables. Upload is a later step.
  const allowed=new Set(['PATH','HOME','TMPDIR','TMP','TEMP','LANG','LC_ALL','CI','RUNNER_TRACKING_ID']);
  for(const key of Object.keys(process.env))if(!allowed.has(key))delete process.env[key];
  let failed=false;
  for(const target of targets){
    const reportDir=path.join(out,target.label);fs.mkdirSync(reportDir,{recursive:true});
    const row={...target,collectorInvocations:0,phase:'identity-preflight',startedAt:new Date().toISOString()};manifest.observations.push(row);save();
    try{
      await verifyIdentities();row.fingerprintBefore=await fingerprint(target);
      const dir=path.join(root,'.lh-diagnostic-work',target.label);fs.mkdirSync(path.join(dir,'.lighthouseci'),{recursive:true});process.chdir(dir);
      row.collectorInvocations=1;row.phase='collecting';save();
      const settings={...config.ci.collect.settings,chromeFlags:[config.ci.collect.settings.chromeFlags,...target.extraChromeFlags].join(' ')};
      row.settingsInput=settings;
      const raw=await new NodeRunner().run(target.url,{chromePath,settings});
      row.phase='parse-lhr';
      const lhr=JSON.parse(raw);row.measurement=summarize(lhr);row.collection='completed';
      fs.writeFileSync(path.join(reportDir,'lhr.json'),raw);row.lhrArtifact=target.label+'/lhr.json';row.phase='validate-settings';
      requireCondition(lhr.lighthouseVersion==='12.6.1'&&lhr.configSettings.throttlingMethod==='simulate'&&lhr.configSettings.maxWaitForLoad===45000&&lhr.configSettings.throttling.cpuSlowdownMultiplier===4&&lhr.configSettings.formFactor==='mobile'&&lhr.configSettings.screenEmulation.width===412&&lhr.configSettings.screenEmulation.height===823&&lhr.configSettings.screenEmulation.deviceScaleFactor===1.75,'actual-settings-mismatch');
      const savedDir=path.join(dir,'.lighthouseci');
      // saved-reports caches cwd when required. Its explicit baseDir keeps the
      // result alongside the assertion child, rather than in root/.lighthouseci.
      await saveLHR(raw,savedDir);
      const saved=fs.readdirSync(savedDir).filter(file=>/^lhr-\d+\.json$/.test(file));
      row.savedLhrCount=saved.length;requireCondition(saved.length===1,'expected-one-lhr');row.phase='asserting';
      const assertion=spawnSync(process.execPath,[tools.resolve('@lhci/cli/src/cli.js'),'assert','--config',configPath],{encoding:'utf8',env:process.env});
      const assertionsPath=path.join(savedDir,'assertion-results.json');
      requireCondition(fs.existsSync(assertionsPath),'assertion-artifact-missing');
      fs.copyFileSync(assertionsPath,path.join(reportDir,'assertion-results.json'));row.assertionArtifact=target.label+'/assertion-results.json';
      row.assertionExit=assertion.status;if(assertion.status!==0||lhr.runtimeError)failed=true;
      row.worldModuleObservedInLhr=row.measurement.scriptFingerprints.some(item=>item.path==='/js/space/world-jiangnan.'+target.worldSha256+'.js'&&item.http===200);
      row.phase='complete';
    }catch(error){row.collection='failed';row.failure=failure(error);failed=true;
      try{const lhr=JSON.parse(error?.stdout||'');if(lhr.lighthouseVersion==='12.6.1'){fs.writeFileSync(path.join(reportDir,'lhr.json'),error.stdout);row.lhrArtifact=target.label+'/lhr.json';row.measurement=summarize(lhr);}}catch{}
    }
    finally{process.chdir(root);row.finishedAt=new Date().toISOString();save();}
    try{row.fingerprintAfter=await fingerprint(target);requireCondition(row.fingerprintAfter.entry.sha256===row.fingerprintBefore.entry.sha256&&row.fingerprintAfter.world.sha256===row.fingerprintBefore.world.sha256,'target-assets-changed');await verifyIdentities();}catch{row.consistency='failed';failed=true;}
    save();
  }
  manifest.identityAfter=await verifyIdentities();manifest.status=failed?'diagnostic-failed':'diagnostic-completed';manifest.finishedAt=new Date().toISOString();save();if(failed)process.exitCode=1;
})().catch(error=>{const known=new Set(['wrong-node-or-platform','wrong-diagnostic-branch','official-config-hash-mismatch','official-config-drift','wrong-collector-or-browser','public-identity-read-failed','target-source-or-deploy-changed','target-context-mismatch']);manifest.guardFailure=known.has(error?.message)?error.message:'preflight-or-consistency-failed';manifest.status='blocked-or-invalid';manifest.finishedAt=new Date().toISOString();save();process.exitCode=1;});
