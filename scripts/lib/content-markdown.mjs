import { createHash } from 'node:crypto';
import MarkdownIt from 'markdown-it';
import { lint } from 'markdownlint/sync';

const parser = new MarkdownIt({ html: true });
const blank = text => text.replace(/[^\n]/g, ' ');
export function diagnostic({ruleId, file, line=1, severity='error', message, evidence='', waivable=true}) {
  const normalized = String(evidence).replace(/\r\n?/g, '\n').split('\n').map(s=>s.trimEnd()).join('\n').trim();
  return {ruleId,file,line,severity,message,evidence:normalized,
    fingerprint:createHash('sha256').update(`${ruleId}\0${normalized}`).digest('hex'),waivable};
}

/** Offsets are half-open, zero-based line ranges, always in the original file. */
export function frontmatterRange(text) {
  const lines = text.replace(/\r\n?/g,'\n').split('\n');
  if (!['---','+++'].includes(lines[0])) return null;
  const end = lines.findIndex((line,index)=>index>0 && line===lines[0]);
  return end<0 ? {start:0,end:lines.length,raw:lines.slice(1).join('\n'),format:lines[0],closed:false}
    : {start:0,end:end+1,raw:lines.slice(1,end).join('\n'),format:lines[0],closed:true};
}

function stripContainer(line) {
  return line.replace(/^\s*(?:>\s*)*/, '').replace(/^(?:[-+*]|\d+[.)])\s+/, '').trim();
}

/** Pipes escaped with an odd number of backslashes do not split table cells. */
export function tableCells(line) {
  const value=stripContainer(line); const cells=[]; let start=0;
  for(let i=0;i<value.length;i++) {
    if(value[i]!=='|') continue;
    let slashes=0; for(let j=i-1;j>=0 && value[j]==='\\';j--) slashes++;
    if(slashes%2===0) {cells.push(value.slice(start,i).trim());start=i+1;}
  }
  if(cells.length===0) return [];
  cells.push(value.slice(start).trim());
  if(cells[0]==='') cells.shift(); if(cells.at(-1)==='') cells.pop();
  return cells;
}

// Output verification only needs the parsed table inventory; source gates run lint.
export function analyzeMarkdown({file,text,includeLint=true}) {
  const original=text.replace(/\r\n?/g,'\n'); const lines=original.split('\n');
  let masked=original; const maskRanges=[]; const fm=frontmatterRange(original);
  if(fm) {maskRanges.push([0,fm.end]); masked=lines.map((s,i)=>i<fm.end?'':s).join('\n');}
  // These shortcode bodies are explicitly non-Markdown in this repository.
  masked=masked.replace(/\{\{[<%]\s*(demo-terminal|demo-agent-trace|mermaid)\b[\s\S]*?[>%]\}\}[\s\S]*?\{\{[<%]\s*\/\1\s*[>%]\}\}/g,blank);
  // Preserve Markdown bodies (collapse, demo-step, demo-case, etc.).
  masked=masked.replace(/\{\{[<%][\s\S]*?[>%]\}\}/g,blank);
  masked=masked.replace(/^\s*\$\$[^\n]*\n[\s\S]*?^\s*\$\$\s*$/gm,blank);
  const tokens=parser.parse(masked,{}); const diagnostics=[]; const tables=[];
  const excluded = new Set();
  for(const token of tokens) {
    if(['fence','code_block','html_block'].includes(token.type) && token.map) {
      maskRanges.push([...token.map]);
      for(let i=token.map[0];i<token.map[1];i++) excluded.add(i);
      if(token.type==='fence') {
        const last=stripContainer(lines[token.map[1]-1] ?? '');
        const marker=token.markup[0];
        const closing=new RegExp(`^${marker==='`'?'`':'~'}{${token.markup.length},}\\s*$`);
        if(token.map[1]-token.map[0]<2 || !closing.test(last)) diagnostics.push(diagnostic({ruleId:'fence-unclosed',file,line:token.map[0]+1,message:'Close this code fence (repository writing convention).',evidence:lines.slice(token.map[0],token.map[1]).join('\n')}));
      }
    }
  }
  for(let i=0;i<tokens.length;i++) {
    if(tokens[i].type!=='table_open') continue;
    const start=tokens[i].map[0]; let rows=0,columns=0,inHeader=false;
    for(let j=i+1;j<tokens.length && tokens[j].type!=='table_close';j++) {
      if(tokens[j].type==='thead_open') inHeader=true;
      if(tokens[j].type==='thead_close') inHeader=false;
      if(tokens[j].type==='th_open') columns++;
      if(tokens[j].type==='tr_open' && !inHeader) rows++;
    }
    tables.push({line:start+1,rows,columns});
  }
  const visible=masked.split('\n');
  for(let i=1;i<visible.length-1;i++) {
    if(excluded.has(i)) continue;
    // Goldmark/GFM accepts short contiguous delimiters; the parser is authoritative.
    if(tables.some(table=>table.line===i)) continue;
    const cells=tableCells(visible[i]); const header=tableCells(visible[i-1]); const data=tableCells(visible[i+1]);
    if(cells.length<2 || header.length!==cells.length || data.length<2) continue;
    if(!cells.every(c=>/^[\s:-]+$/.test(c) && /-/.test(c))) continue;
    if(cells.every(c=>/^:?-{3,}:?$/.test(c))) continue;
    diagnostics.push(diagnostic({ruleId:'table-delimiter',file,line:i+1,message:'Table delimiter cells require contiguous hyphens, optionally surrounded by colons.',evidence:lines.slice(i-1,i+2).join('\n')}));
  }
  const linted=includeLint?lint({strings:{[file]:masked},config:{default:false,MD055:true,MD056:true,MD058:true},frontMatter:null}):{};
  for(const item of linted[file] ?? []) {
    if(excluded.has(item.lineNumber-1)) continue;
    const id=item.ruleNames[0];
    diagnostics.push(diagnostic({ruleId:id,file,line:item.lineNumber,message:[item.ruleDescription,item.errorDetail].filter(Boolean).join(': '),evidence:lines[item.lineNumber-1]}));
  }
  return {diagnostics,tables,maskRanges};
}
