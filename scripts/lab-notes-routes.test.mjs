import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
const names=new Set(['UFO.md','langgraph.md','langchain.md','markItdown.md','mem0.md','notebooklm.md','tdd.md']);
const files=['en','zh'].flatMap(lang=>fs.readdirSync(`content/${lang}/ai-agent/posts`).filter(file=>names.has(file)).map(file=>`${lang}/ai-agent/posts/${file}`));
const articles=files.map(file=>{
  const text=fs.readFileSync(path.join('content',file),'utf8');
  const match=text.match(/^---\n([\s\S]*?)\n---/);
  return {file,meta:match?YAML.parse(match[1]):{}};
});
test('technical deep reads have distinct canonical routes and compatible old addresses',()=>{
  const notes=articles.filter(({meta})=>meta.labNotes);
  assert.equal(notes.length,13);
  for(const {file,meta} of notes){
    assert.match(meta.url,/^\/(zh\/)?lab-notes\/[^/]+\/$/,file);
    assert.ok(meta.aliases.includes(meta.url.replace('/lab-notes/','/projects/')),file);
    assert.ok(!meta.aliases.includes(meta.url),file);
  }
  assert.deepEqual(articles.filter(({file,meta})=>file.includes('/ai-agent/posts/')&&/^\/(zh\/)?projects\//.test(meta.url||'')).map(a=>a.file),[]);
});
