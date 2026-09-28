import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkSource } from './content-source.mjs';
import { diagnostic } from './content-markdown.mjs';

const WAIVABLE=new Set(['MD055','MD056','MD058','table-delimiter','fence-unclosed','frontmatter-required','frontmatter-type','frontmatter-timezone','frontmatter-description','frontmatter-parse','description-length','tag-count','rendered-table-missing','rendered-table-shape','local-link-missing','local-anchor-missing','local-asset-missing','shortcode-unexpanded']);
const order=(a,b)=>a.file.localeCompare(b.file,'en') || a.line-b.line || a.ruleId.localeCompare(b.ruleId,'en') || a.fingerprint.localeCompare(b.fingerprint,'en');

export function applyBaseline({scope,diagnostics,baseline=[],mode='enforce'}) {
  if(!['enforce','report-only'].includes(mode)) throw new Error('Unknown quality report mode');
  if(!Array.isArray(baseline)) throw new Error('Invalid baseline: expected an entry array');
  const keys=new Set();
  for(const entry of baseline) {
    if(!entry || !WAIVABLE.has(entry.ruleId) || typeof entry.file!=='string' || !entry.file || path.isAbsolute(entry.file) || entry.file.split(/[\\/]/).includes('..') || !/^[a-f0-9]{64}$/.test(entry.fingerprint) || typeof entry.reason!=='string' || !entry.reason.trim()) throw new Error(`Invalid baseline entry: ${entry?.ruleId ?? '(missing rule)'}`);
    const key=`${entry.ruleId}\0${entry.file}\0${entry.fingerprint}`;
    if(keys.has(key)) throw new Error('Invalid baseline: duplicate entry');
    keys.add(key);
  }
  const active=[],waived=[];
  for(const d of diagnostics) {
    const accepted=d.waivable && WAIVABLE.has(d.ruleId) && keys.has(`${d.ruleId}\0${d.file}\0${d.fingerprint}`);
    (accepted?waived:active).push(d);
  }
  return {schema:'blog-quality/1',mode,scope:[...new Set(scope)].sort(),diagnostics:active.sort(order),waived:waived.sort(order),ok:!active.some(d=>d.severity==='error')};
}

export function githubAnnotation(d) {
  const escape=s=>String(s).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
  const property=s=>escape(s).replaceAll(':','%3A').replaceAll(',','%2C');
  return `::${d.severity} file=${property(d.file)},line=${d.line},title=${property(d.ruleId)}::${escape(d.message)}`;
}

async function sourceFiles(root,relative='content') {
  const files=[];
  for(const entry of await fs.readdir(path.join(root,relative),{withFileTypes:true})) {
    const file=`${relative}/${entry.name}`;
    if(entry.isSymbolicLink()) throw new Error(`Source symlink rejected: ${file}`);
    if(entry.isDirectory()) files.push(...await sourceFiles(root,file));
    else if(entry.isFile() && /^content\/(en|zh)\/.+\.md$/.test(file)) files.push(file);
  }
  return files.sort();
}

function legacyGates({repoRoot,scope,flavorScope=scope}) {
  const checks=[['legacy-frontmatter','check-frontmatter-fields.mjs',[]],['legacy-tags','normalize-tags.mjs',['--check']],['legacy-blockquotes','clean-empty-blockquotes.mjs',[]],['legacy-redirects','check-redirects.mjs',[]],['legacy-interactive','check-interactive-specs.mjs',[]]];
  const zh=flavorScope.filter(file=>file.startsWith('content/zh/') && file.endsWith('.md'));
  if(zh.length) checks.push(['legacy-flavor','check-ai-flavor.mjs',[...zh,'--check']]);
  const results=[];
  for(const [ruleId,name,args] of checks) {
    const script=`scripts/${name}`;
    const result=spawnSync(process.execPath,[script,...args],{cwd:repoRoot,encoding:'utf8',maxBuffer:32*1024*1024,timeout:120000});
    if(result.error || result.signal || ![0,1].includes(result.status)) throw new Error(`${script} could not run: ${result.error?.message ?? result.stderr ?? result.signal}`);
    if(result.status!==0) results.push(diagnostic({ruleId,file:script,line:1,message:`Existing hard gate failed: ${name}. ${(result.stderr||result.stdout).trim().slice(0,1200)}`,evidence:result.stdout+'\n'+result.stderr,waivable:false}));
  }
  return results;
}

export async function runSourceQuality({repoRoot,changeSet,all=false,baseline=[],mode='enforce'}) {
  if(Boolean(all)===Boolean(changeSet)) throw new Error('Choose exactly one scope: all or changeSet');
  if(changeSet) {
    const {validateContract}=await import('./ci-contracts.mjs');
    validateContract('blog-change-set/1',changeSet);
  }
  const root=path.resolve(repoRoot);
  const scope=all || changeSet?.fullScan ? await sourceFiles(root) : [...new Set(changeSet.sourceFiles)].sort();
  const tags=JSON.parse(await fs.readFile(path.join(root,'config/tags-mapping.json'),'utf8'));
  const diagnostics=[];
  for(const file of scope) {
    if(!/^content\/(en|zh)\/.+\.md$/.test(file) || file.split('/').includes('..') || file.includes('\\')) throw new Error(`Unsafe source path: ${file}`);
    const full=path.join(root,file);
    let current=root;
    for(const segment of file.split('/')) {current=path.join(current,segment);if((await fs.lstat(current)).isSymbolicLink()) throw new Error(`Source symlink rejected: ${file}`);}
    diagnostics.push(...await checkSource({file,text:await fs.readFile(full,'utf8'),tags}));
  }
  const flavorScope=changeSet ? changeSet.files.filter(f=>f.status!=='D' && scope.includes(f.path)).map(f=>f.path) : scope;
  diagnostics.push(...legacyGates({repoRoot:root,scope,flavorScope}));
  return applyBaseline({scope,diagnostics,baseline,mode});
}
