// Shared runtime contracts. Invalid/missing evidence never means success.
const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const TARGETS=['production','backup','preview'];
const CHECKS=['success','failure','cancelled','skipped'];
const SUITES=['source','output','browser','interactive','functions','seo','workflow'];
function requireThat(condition,message) {if(!condition)throw new Error(`Invalid CI contract: ${message}`);}
function string(v) {return typeof v==='string'&&v.length>0;}
function object(v) {return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function array(v) {return Array.isArray(v);}
function safePath(v) {return string(v)&&!v.startsWith('/')&&!v.includes('\\')&&!v.split('/').some(p=>p==='..'||p==='.'||p==='');}
function iso(v){return string(v)&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v)&&Number.isFinite(Date.parse(v));}
function unique(values) {return new Set(values).size===values.length;}
function checkRows(v) {return array(v)&&v.every(c=>object(c)&&string(c.name)&&CHECKS.includes(c.status)&&DIGEST.test(c.reportDigest))&&unique(v.map(c=>c.name));}
export function releaseMode(value) {const mode=value===undefined||value===''?'shadow':value;requireThat(['shadow','active','paused'].includes(mode),'release mode');return mode;}
export function requiredJobsPassed(results,required) {return array(required)&&required.length>0&&unique(required)&&required.every(name=>results[name]==='success');}
export function requiredChecksFor(changeSet) {validateContract('blog-change-set/1',changeSet);return [...new Set(changeSet.suites)];}
export function validateContract(kind,value) {
  requireThat(object(value)&&value.schema===kind,'schema');
  if(kind==='blog-change-set/1') {
    requireThat(SHA.test(value.sourceSha)&&(value.baseSha===null||SHA.test(value.baseSha)),'source/base SHA');
    requireThat(typeof value.fullScan==='boolean'&&typeof value.publish==='boolean'&&string(value.reason),'scope flags');
    requireThat(array(value.files)&&value.files.every(f=>object(f)&&/^[AMDRCTU]$/.test(f.status)&&safePath(f.path)&&(f.oldPath===null||safePath(f.oldPath))),'changed files');
    requireThat(array(value.sourceFiles)&&value.sourceFiles.every(safePath)&&unique(value.sourceFiles),'source files');
    requireThat(array(value.suites)&&value.suites.length>0&&value.suites.every(s=>SUITES.includes(s))&&unique(value.suites),'suite selection');
  } else if(kind==='blog-quality/1') {
    requireThat(['enforce','report-only'].includes(value.mode),'report enforcement mode');
    requireThat(array(value.scope)&&value.scope.every(string)&&array(value.diagnostics)&&array(value.waived)&&typeof value.ok==='boolean','quality report');
    for(const d of [...value.diagnostics,...value.waived]) requireThat(object(d)&&string(d.ruleId)&&string(d.file)&&Number.isInteger(d.line)&&d.line>0&&['error','warning'].includes(d.severity)&&string(d.message)&&typeof d.evidence==='string'&&DIGEST.test(d.fingerprint)&&typeof d.waivable==='boolean','diagnostic');
    requireThat(value.ok===!value.diagnostics.some(d=>d.severity==='error'),'quality status agrees with errors');
  } else if(kind==='blog-page-map/1') {
    requireThat(SHA.test(value.sourceSha)&&iso(value.clock)&&TARGETS.includes(value.target)&&string(value.baseUrl)&&typeof value.complete==='boolean','page map identity');
    requireThat(array(value.pages)&&value.pages.every(p=>object(p)&&(p.source===null||safePath(p.source))&&string(p.url)&&safePath(p.outputPath)&&['en','zh'].includes(p.lang)&&string(p.kind)&&DIGEST.test(p.contentHash)),'page entries');
    requireThat(unique(value.pages.map(p=>p.outputPath)),'unique page outputs');
  } else if(kind==='blog-artifact/1') {
    requireThat(SHA.test(value.sourceSha)&&DIGEST.test(value.inputDigest)&&string(value.releaseId)&&TARGETS.includes(value.target)&&iso(value.clock)&&object(value.toolchain),'artifact identity');
    requireThat(array(value.files)&&value.files.length>0&&value.files.every(f=>object(f)&&safePath(f.path)&&DIGEST.test(f.sha256)&&Number.isSafeInteger(f.bytes)&&f.bytes>=0)&&unique(value.files.map(f=>f.path)),'artifact files');
    requireThat(DIGEST.test(value.fileSetDigest)&&DIGEST.test(value.pageMapDigest)&&checkRows(value.checks),'artifact evidence');
    requireThat(array(value.requiredChecks)&&value.requiredChecks.length>0&&value.requiredChecks.every(c=>SUITES.includes(c))&&unique(value.requiredChecks),'required checks');
  } else if(kind==='blog-release/1') {
    requireThat(SHA.test(value.sourceSha)&&DIGEST.test(value.inputDigest)&&DIGEST.test(value.artifactDigest)&&DIGEST.test(value.pageMapDigest),'receipt digest/source identity');
    requireThat(['verified','verification-failed','superseded','rollback-verified'].includes(value.status),'receipt status');
    requireThat(string(value.siteId)&&string(value.deployId)&&string(value.deployUrl)&&/^\d+$/.test(String(value.runId))&&/^\d+$/.test(String(value.runAttempt))&&Number(value.runAttempt)>0,'receipt deployment/run');
    requireThat(checkRows(value.checks),'receipt checks');
    requireThat(value.verifiedAt===null||iso(value.verifiedAt),'verification time');
    if(['verified','rollback-verified'].includes(value.status))requireThat(iso(value.verifiedAt)&&value.checks.length>0&&value.checks.every(c=>c.status==='success'),'verified evidence');
  } else throw new Error(`Unknown CI contract: ${kind}`);
  return value;
}
