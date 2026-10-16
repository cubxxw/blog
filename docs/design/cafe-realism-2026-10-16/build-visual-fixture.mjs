// Private, local-only fixture: never copied into Hugo's source/static tree.
// Uses the exact built production factory and assets; only its controls differ.
import fs from 'node:fs';
import path from 'node:path';
import {parse} from 'parse5';
const output=process.argv[2];
if(!output)throw new Error('Pass the existing local preview output directory');
const html=fs.readFileSync(path.join(output,'zh/projects/index.html'),'utf8');
const tree=parse(html),scripts=[];
function walk(node){if(node.tagName==='script')scripts.push(node);for(const child of node.childNodes||[])walk(child);}walk(tree);
const has=(node,name)=>node.attrs.some(attr=>attr.name===name);
const body=node=>node.childNodes.map(n=>n.value||'').join('');
const world=JSON.parse(body(scripts.find(n=>has(n,'data-space-world-module'))));
const catalog=JSON.parse(body(scripts.find(n=>has(n,'data-cafe-catalog'))));
const imports=body(scripts.find(n=>n.attrs.some(a=>a.name==='type'&&a.value==='importmap')));
const page=`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>咖啡馆构图与连续性私有验收</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#15241c;font:14px system-ui;color:#fff}#stage{position:absolute;inset:0}.space-world,.space-world__canvas,.space-world__css{position:absolute;inset:0;width:100%;height:100%}.space-world__css{pointer-events:none}.space-world__css>*{pointer-events:auto}#controls{position:fixed;z-index:9;left:12px;right:12px;top:12px;display:flex;flex-wrap:wrap;gap:8px;pointer-events:none}summary{pointer-events:auto;min-height:44px;background:#14271eee;padding:8px 12px;box-sizing:border-box;cursor:pointer}#controls:not([open]){right:auto}#controls[open]{display:block}#controls[open] button{margin:4px}button{pointer-events:auto;min-height:44px;padding:8px 12px;border:1px solid #b8c6b0;border-radius:6px;color:#fff;background:#14271eee;font:inherit}button:focus-visible{outline:3px solid #f4dd94;outline-offset:3px}#status{position:fixed;z-index:8;bottom:12px;left:12px;background:#14271eee;padding:10px;max-width:calc(100% - 44px)}.space-spatial-screen{position:absolute;background:#183329;color:#fff;box-sizing:border-box;padding:100px}textarea{width:70%;height:240px;font:24px system-ui}</style>
<div id="stage"><div data-space-windows><label>隔离测试笔记<textarea id="note">Synthetic café continuity · 真实书名与拉花</textarea></label></div><div data-space-snap></div><div class="space-bottom"></div><div class="space-menu"></div></div>
<details id="controls"><summary>验收控制</summary><button id="human">A 人眼构图</button><button id="miniature">B 微缩构图</button><button id="coffee">咖啡近景</button><button id="books">书架近景</button><button id="back">返回原位</button><button id="workspace">工作区</button><button id="leave">离开工作区</button><button id="quiet">安静模式</button><button id="cycle">销毁并重建</button></details><output id="status" role="status">准备</output>
<script type="importmap">${imports}</script><script type="module">
import {createCafeWorld} from ${JSON.stringify(world.module)};
const catalog=${JSON.stringify(catalog)},root=document.querySelector('#stage'),status=document.querySelector('#status'),note=document.querySelector('#note');
let world,composition='human',quiet=false,cycles=0;
function mount(value){world?.dispose();composition=value;world=createCafeWorld({root,theme:'zen',...catalog,composition,isBlocked:()=>false,onComputer:()=>world.focus(false),onDetail:kind=>world.inspect(kind),onInspect:kind=>status.textContent=kind||'漫游',onFailure:()=>status.textContent='渲染失败'});world.setQuiet(quiet);world.firstFrame.then(ok=>{if(ok)world.start({animate:false});status.textContent=ok?'本地生产场景 · '+value:'首帧失败';});root.dataset.noteIdentity=String(note===root.querySelector('#note'));root.dataset.cycles=String(cycles);}
document.querySelector('#human').onclick=()=>mount('human');document.querySelector('#miniature').onclick=()=>mount('miniature');
document.querySelector('#coffee').onclick=()=>world.inspect('coffee');document.querySelector('#books').onclick=()=>world.inspect('books');document.querySelector('#back').onclick=()=>world.restoreInspection();document.querySelector('#workspace').onclick=()=>world.focus(false);document.querySelector('#leave').onclick=()=>world.leave();document.querySelector('#quiet').onclick=event=>{quiet=!quiet;world.setQuiet(quiet);event.target.setAttribute('aria-pressed',String(quiet));};document.querySelector('#cycle').onclick=()=>{cycles++;mount(composition);};
mount('human');
</script></html>`;
const target=path.join(output,'_qa/cafe-realism.html');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,page);
console.log(JSON.stringify({target,module:world.module,bookCount:catalog.books.length}));
