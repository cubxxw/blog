import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import { diagnostic } from './content-markdown.mjs';
import { attribute, decodedPath, htmlElements, outputFiles, safeFile, textContent, urlOutputPath } from './content-page-map.mjs';
import { validateContract } from './ci-contracts.mjs';

function nearest(node,tag) {for(let p=node.parentNode;p;p=p.parentNode) if(p.tagName===tag) return p;return null;}
function tableInfo(table) {
  const rows=htmlElements(table).filter(n=>n.tagName==='tr' && nearest(n,'table')===table);
  const spans=[]; const widths=[];
  for(const row of rows) {
    let column=0;
    const cells=(row.childNodes??[]).filter(n=>n.tagName==='td'||n.tagName==='th');
    for(const cell of cells) {
      while(spans[column]>0) column++;
      const colspan=Math.max(1,Math.min(1000,parseInt(attribute(cell,'colspan') ?? '1',10)||1));
      const rawRowspan=parseInt(attribute(cell,'rowspan') ?? '1',10);
      const rowspan=rawRowspan===0?rows.length:Math.max(1,Math.min(65534,rawRowspan||1));
      for(let offset=0;offset<colspan;offset++) spans[column+offset]=rowspan;
      column+=colspan;
    }
    widths.push(Math.max(column,spans.length));
    for(let i=0;i<spans.length;i++) spans[i]=Math.max(0,(spans[i]??0)-1);
    while(spans.length && spans.at(-1)===0) spans.pop();
  }
  return {table,rows,columns:Math.max(0,...widths),widths};
}

export function checkTableContracts({html,file,contracts=[]}) {
  if(!contracts.length) return [];
  const tree=typeof html==='string'?parse(html,{sourceCodeLocationInfo:true}):html;
  const tables=htmlElements(tree).filter(n=>n.tagName==='table').map(tableInfo);
  const diagnostics=[];
  for(const contract of contracts) {
    const matches=tables.filter(t=>htmlElements(t.table).some(n=>n.tagName==='code' && textContent(n)===contract.contains));
    let problem='';
    if(matches.length!==1) problem=`Expected exactly one table containing ${contract.contains}; found ${matches.length}.`;
    else {
      const table=matches[0];
      const data=table.rows.slice(1);
      if(data.length!==contract.rows || table.columns!==contract.columns || table.rows.some(row=>(row.childNodes??[]).filter(n=>n.tagName==='td'||n.tagName==='th').length!==contract.columns)) problem=`Expected ${contract.rows} data rows and ${contract.columns} columns; found ${data.length} rows and ${table.columns} columns.`;
      else if(contract.lastContains && !htmlElements(data.at(-1)).some(n=>n.tagName==='code' && textContent(n)===contract.lastContains)) problem=`Final row must contain ${contract.lastContains}.`;
    }
    if(problem) diagnostics.push(diagnostic({ruleId:'table-regression',file,line:1,message:problem,evidence:JSON.stringify(contract),waivable:false}));
  }
  return diagnostics;
}

async function redirectsFor(publicDir,contracts) {
  const rules=[...(contracts.redirects??[])];
  const file=await safeFile(publicDir,'_redirects',{missing:true});
  if(file) for(const line of (await fs.readFile(file,'utf8')).split(/\r?\n/)) {
    if(!line.trim()||line.trimStart().startsWith('#')) continue;
    const [from,to,status='301',...conditions]=line.trim().split(/\s+/);
    if(conditions.length || !/^(?:30[1278]|200)!?$/.test(status)) continue;
    rules.push({from,to,status:parseInt(status,10)});
  }
  return rules.map(rule=>{
    const names=[];
    const escaped=rule.from.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,()=>{names.push('splat');return '(.*)';}).replace(/:([A-Za-z]\w*)/g,(_,name)=>{names.push(name);return '([^/]+)';});
    return {...rule,pattern:new RegExp(`^${escaped}$`),names};
  });
}

function references(node) {
  const refs=[];
  const add=(attr,type)=>{const value=attribute(node,attr);if(value) refs.push({value,type});};
  if(['a','area'].includes(node.tagName)) add('href','link');
  if(node.tagName==='form') add('action','link');
  if(node.tagName==='meta' && attribute(node,'http-equiv')?.toLowerCase()==='refresh') {
    const value=attribute(node,'content')?.match(/;\s*url\s*=\s*["']?(.+?)["']?\s*$/i)?.[1];
    if(value) refs.push({value,type:'link'});
  }
  if(['img','source','video','audio','script','iframe','embed','track'].includes(node.tagName)) add('src','asset');
  if(node.tagName==='video') add('poster','asset');
  if(node.tagName==='object') add('data','asset');
  if(node.tagName==='link' && /^(?:stylesheet|icon|preload|modulepreload|apple-touch-icon)$/.test(attribute(node,'rel')??'')) add('href','asset');
  if(['img','source'].includes(node.tagName)) {
    const srcset=attribute(node,'srcset');
    if(srcset && !srcset.trim().startsWith('data:')) for(const item of srcset.split(',')) refs.push({value:item.trim().split(/\s+/)[0],type:'asset'});
  }
  return refs;
}

/** Parse every emitted HTML page; no network requests and no product side effects. */
export async function checkOutput({publicDir,pageMap,sourceTables={},contracts={},target=pageMap?.target}) {
  validateContract('blog-page-map/1',pageMap);
  if(!pageMap.complete) throw new Error('Incomplete page map cannot verify output');
  if(target!==pageMap.target) throw new Error('Output target does not match page map');
  const files=await outputFiles(publicDir); const available=new Set(files); const htmlFiles=files.filter(f=>f.endsWith('.html'));
  const pages=new Map(pageMap.pages.map(p=>[p.outputPath,p]));
  if(htmlFiles.some(f=>!pages.has(f)) || pageMap.pages.some(p=>!available.has(p.outputPath))) throw new Error('Page map does not cover actual HTML output');
  const documents=new Map();
  for(const file of htmlFiles) {
    const html=await fs.readFile(await safeFile(publicDir,file),'utf8');
    const tree=parse(html,{sourceCodeLocationInfo:true}); const nodes=htmlElements(tree);
    const refresh=nodes.find(n=>n.tagName==='meta' && attribute(n,'http-equiv')?.toLowerCase()==='refresh');
    const redirectTarget=attribute(refresh??{},'content')?.match(/;\s*url\s*=\s*["']?(.+?)["']?\s*$/i)?.[1];
    const ids=new Set(nodes.flatMap(n=>[attribute(n,'id'),n.tagName==='a'?attribute(n,'name'):null]).filter(Boolean));
    // Products intentionally routes hashes into windows cloned from <template>.
    // Only an explicit per-page semantic contract may treat such data as anchors;
    // template IDs themselves are not ordinary document anchors.
    const dynamicContracts=(contracts.dynamicAnchors??[]).filter(c=>c.outputPath===file);
    for(const contract of dynamicContracts) {
      if(!/^data-[a-z0-9-]+$/.test(contract.attribute) || !Array.isArray(contract.prefixes) || contract.prefixes.some(p=>typeof p!=='string')) throw new Error('Invalid dynamic anchor contract');
      const candidates=[...nodes];
      for(const node of candidates) if(node.tagName==='template' && node.content) candidates.push(...htmlElements(node.content));
      for(const node of candidates) {
        const value=attribute(node,contract.attribute);
        if(value) for(const prefix of contract.prefixes) ids.add(prefix+value);
      }
    }
    documents.set(file,{html,redirectTarget,ids});
  }
  const rules=target==='backup'?[]:await redirectsFor(publicDir,contracts);
  const base=new URL(pageMap.baseUrl); const functions=new Set(target==='backup'?[]:contracts.functionRoutes??[]);
  function resolveReference(raw,sourceUrl,seen=new Set()) {
    let url;
    try {url=new URL(raw,sourceUrl);} catch {return {missing:true};}
    if(!['http:','https:'].includes(url.protocol) || url.origin!==base.origin) return {external:true};
    // URL() normalizes dot segments. Inspect the original internal path after
    // origin classification; malformed external escapes belong to the link audit.
    const pathPart=raw.split(/[?#]/)[0];
    if(/%/i.test(pathPart)) {
      try {decodedPath(pathPart);} catch(error) {if(error.message.startsWith('Invalid URL encoding')) return {missing:true};throw error;}
    }
    if(functions.has(url.pathname)) return {dynamic:true};
    const key=url.href;
    if(seen.has(key)||seen.size>12) return {missing:true}; seen.add(key);
    let relative;
    try {relative=urlOutputPath(url.href,pageMap.baseUrl);} catch(error) {if(/traversal|encoding/.test(error.message)) throw error;return {missing:true};}
    const candidates=[relative];
    if(!path.extname(relative)) candidates.push(relative.replace(/\/$/,'')+'/index.html',relative+'.html');
    const file=candidates.find(candidate=>available.has(candidate));
    if(file) {
      if(documents.get(file)?.redirectTarget) {
        const next=new URL(documents.get(file).redirectTarget,url.href);if(!next.hash) next.hash=url.hash;
        return resolveReference(next.href,sourceUrl,seen);
      }
      let hash=null;
      try {hash=url.hash?decodeURIComponent(url.hash.slice(1)):null;} catch {return {file,badHash:true};}
      return {file,hash};
    }
    for(const rule of rules) {
      const match=url.pathname.match(rule.pattern);if(!match) continue;
      let to=rule.to;
      for(let i=0;i<rule.names.length;i++) to=to.replaceAll(':'+rule.names[i],match[i+1]);
      const next=new URL(to,url.href); if(!next.hash) next.hash=url.hash;
      return resolveReference(next.href,sourceUrl,seen);
    }
    return {missing:true};
  }
  const diagnostics=[];
  for(const [file,doc] of documents) {
    // Retain only anchor indexes across pages; large blogs must not retain every DOM.
    doc.tree=parse(doc.html,{sourceCodeLocationInfo:true});doc.nodes=htmlElements(doc.tree);
    const page=pages.get(file);
    const add=(ruleId,node,message,evidence,waivable=true)=>diagnostics.push(diagnostic({ruleId,file,line:node?.sourceCodeLocation?.startLine??1,message,evidence,waivable}));
    for(const node of doc.nodes) {
      for(const ref of references(node)) {
        const resolved=resolveReference(ref.value,page.url);
        if(resolved.missing) add(ref.type==='asset'?'local-asset-missing':'local-link-missing',node,`Local ${ref.type} does not resolve: ${ref.value}`,ref.value);
        else if(resolved.badHash || resolved.hash && documents.has(resolved.file) && !documents.get(resolved.file).ids.has(resolved.hash)) add('local-anchor-missing',node,`Local anchor does not exist or has invalid encoding: ${ref.value}`,ref.value);
      }
      if(['code','pre','script','style','textarea'].includes(node.tagName) || ['code','pre','script','style','textarea'].some(tag=>nearest(node,tag))) continue;
      for(const child of node.childNodes??[]) if(child.nodeName==='#text' && /\{\{[<%](?!\/\*)/.test(child.value)) add('shortcode-unexpanded',child,'Unexpanded shortcode in visible text.',child.value);
    }
    const content=doc.nodes.find(n=>(attribute(n,'class')??'').split(/\s+/).includes('post-content')) ?? doc.nodes.find(n=>n.tagName==='main') ?? doc.tree;
    const tables=htmlElements(content).filter(n=>n.tagName==='table').map(tableInfo);
    for(const table of tables) if(!table.rows.length || table.widths.some(w=>w!==table.columns)) add('rendered-table-shape',table.table,'Rendered table rows do not occupy the same column grid.',textContent(table.table));
    const expected=sourceTables instanceof Map?sourceTables.get(page.source):sourceTables[page.source];
    if(expected?.length) {
      const remaining=[...tables];
      for(const table of expected) {
        const match=remaining.findIndex(t=>t.rows.length===table.rows+1 && t.columns===table.columns);
        if(match<0) add('rendered-table-missing',null,`Source table at ${page.source}:${table.line} did not render with ${table.rows} data rows and ${table.columns} columns.`,JSON.stringify(table));
        else remaining.splice(match,1);
      }
    }
    diagnostics.push(...checkTableContracts({html:doc.tree,file,contracts:(contracts.tableContracts??[]).filter(c=>c.outputPath===file)}));
    delete doc.tree;delete doc.nodes;
  }
  for(const contract of contracts.tableContracts??[]) if(!documents.has(contract.outputPath)) diagnostics.push(diagnostic({ruleId:'table-regression',file:contract.outputPath,line:1,message:'Required regression page is missing.',evidence:JSON.stringify(contract),waivable:false}));
  return diagnostics;
}
