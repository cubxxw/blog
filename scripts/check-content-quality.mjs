#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseToml } from 'smol-toml';
import { applyBaseline, githubAnnotation, runSourceQuality } from './lib/content-quality-report.mjs';
import { analyzeMarkdown } from './lib/content-markdown.mjs';
import { checkOutput } from './lib/content-output.mjs';
import { safeFile } from './lib/content-page-map.mjs';
import { validateContract } from './lib/ci-contracts.mjs';

const repoRoot=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
async function json(file) {return JSON.parse(await fs.readFile(path.resolve(repoRoot,file),'utf8'));}
async function main() {
  const [command,...args]=process.argv.slice(2); const opts={};
  const flags=new Set(['--all','--report-only']);
  const values=new Set(['--change-set','--out','--public-dir','--page-map','--baseline','--target']);
  for(let i=0;i<args.length;i++) {
    const name=args[i];
    if(opts[name]!==undefined) throw new Error(`Repeated argument: ${name}`);
    if(flags.has(name)) opts[name]=true;
    else if(values.has(name) && args[i+1] && !args[i+1].startsWith('--')) opts[name]=args[++i];
    else throw new Error(`Unknown or incomplete argument: ${name}`);
  }
  if(!opts['--out']) throw new Error('Report output --out is required');
  const config=await json('config/content-quality.json');
  const baselineDocument=await json(opts['--baseline'] ?? config.baseline);
  if(baselineDocument.schema!=='blog-quality-baseline/1' || !Array.isArray(baselineDocument.entries)) throw new Error('Invalid baseline document');
  const baseline=baselineDocument.entries; const mode=opts['--report-only']?'report-only':'enforce'; let report;
  if(command==='source') {
    if(opts['--public-dir']||opts['--page-map']||opts['--target']) throw new Error('Output options are invalid for source checks');
    const changeSet=opts['--change-set']?await json(opts['--change-set']):undefined;
    report=await runSourceQuality({repoRoot,all:Boolean(opts['--all']),changeSet,baseline,mode});
  } else if(command==='output') {
    if(opts['--all']||opts['--change-set']) throw new Error('Output uses its complete page map as scope');
    if(!opts['--public-dir']||!opts['--page-map']) throw new Error('Output requires --public-dir and --page-map');
    const publicDir=path.resolve(repoRoot,opts['--public-dir']); const pageMap=await json(opts['--page-map']);
    validateContract('blog-page-map/1',pageMap);
    const sourceTables={};
    for(const page of pageMap.pages) if(page.source && /\/(posts|projects)\//.test(page.source)) {
      sourceTables[page.source]=analyzeMarkdown({file:page.source,text:await fs.readFile(await safeFile(repoRoot,page.source),'utf8'),includeLint:false}).tables;
    }
    const netlify=parseToml(await fs.readFile(path.join(repoRoot,'netlify.toml'),'utf8'));
    const contracts={...config,redirects:netlify.redirects ?? []};
    const diagnostics=await checkOutput({publicDir,pageMap,sourceTables,contracts,target:opts['--target']??pageMap.target});
    report=applyBaseline({scope:pageMap.pages.map(page=>page.outputPath),diagnostics,baseline,mode});
  } else throw new Error('Usage: check-content-quality.mjs source --all|--change-set file --out report.json OR output --public-dir dir --page-map file --out report.json');
  validateContract('blog-quality/1',report);
  const out=path.resolve(repoRoot,opts['--out']);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');
  const errors=report.diagnostics.filter(d=>d.severity==='error').length;
  const warnings=report.diagnostics.length-errors;
  if(process.env.GITHUB_ACTIONS==='true') for(const d of report.diagnostics.slice(0,50)) console.log(githubAnnotation(d));
  console.log(`${command} quality (${mode}): ${report.scope.length} files; ${errors} errors, ${warnings} warnings, ${report.waived.length} reviewed exceptions. Report: ${out}`);
  if(mode==='enforce' && !report.ok) process.exitCode=1;
}
main().catch(error=>{console.error(`Content quality check unavailable: ${error.message}`);process.exitCode=2;});
