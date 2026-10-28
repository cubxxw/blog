import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorkspace} from '../assets/js/space/state.mjs';
import { usesSingleWindow, selectLibrary, readingURLMap, restoreReadingURLs } from '../assets/js/space/reading-layout.mjs';
import { readerSelectionText } from '../assets/js/space/apps.js';

const articles = [
  {url:'/one/',title:'Nango integration',description:'OAuth',section:'engineering',tags:['Go']},
  {url:'/two/',title:'A quiet walk',description:'Travel notes',section:'growth',tags:['Nature']},
  {url:'/three/',title:'Agent reading',description:'Tools and memory',section:'ai-agent',tags:['AI']},
];
test('an older open tab cannot undo canonical reader and bookmark migration through storage sync',()=>{
  const source=fs.readFileSync(new URL('../assets/js/space/desktop.js',import.meta.url),'utf8').split('\n').find(line=>line.includes("window.addEventListener('storage'"));
  let listener;
  const urls=readingURLMap([{url:'/lab-notes/langgraph/',aliases:['/projects/langgraph/']}]);
  const mount=new Function('window','createWorkspace','restoreReadingURLs','readingAliases',`
    let state;const storageKey='bear-space:v1',root={contains:()=>false},document={activeElement:null},isEditableTarget=()=>false,stateViewport=()=>({width:1440,height:900}),nodes=new Map(),render=()=>{};
    ${source}
    return ()=>state;
  `);
  const snapshot=mount({addEventListener(_type,callback){listener=callback;}},createWorkspace,restoreReadingURLs,urls);
  listener({key:'bear-space:v1',newValue:JSON.stringify({version:1,windows:[{app:'reader',id:'reader',payload:'/projects/langgraph/'}],active:'reader',favorites:['/projects/langgraph/']})});
  assert.equal(snapshot().windows[0].payload,'/lab-notes/langgraph/');
  assert.deepEqual(snapshot().favorites,['/lab-notes/langgraph/']);
});
test('saved reader windows and bookmarks follow known aliases while other private state stays intact',()=>{
  const urls=readingURLMap([{url:'/lab-notes/langgraph/',aliases:['/projects/langgraph/']}]);
  const state={note:'PRIVATE',draft:'PRIVATE DRAFT',windows:[{app:'reader',payload:'/projects/langgraph/'},{app:'browser',payload:'/projects/langgraph/'}],favorites:['/projects/langgraph/','/lab-notes/langgraph/','/unknown/']};
  const next=restoreReadingURLs(state,urls);
  assert.equal(next.windows[0].payload,'/lab-notes/langgraph/');
  assert.equal(next.windows[1].payload,'/projects/langgraph/');
  assert.deepEqual(next.favorites,['/lab-notes/langgraph/','/unknown/']);
  assert.equal(next.note,state.note);assert.equal(next.draft,state.draft);
  assert.equal(state.windows[0].payload,'/projects/langgraph/');
});
test('Lab notes is a writing filter independent of the product inventory and original source section',()=>{
  const deep={url:'/zh/lab-notes/langgraph/',title:'LangGraph',section:'ai-agent',labNotes:true};
  assert.deepEqual(selectLibrary({articles:[...articles,deep],filter:'lab-notes'}).matches,[deep]);
  assert.ok(selectLibrary({articles:[...articles,deep],filter:'ai-agent'}).matches.includes(deep));
});
test('compact presentations include portrait tablets without changing wide desktop behavior',()=>{
  for (const width of [320,390,768,1000]) assert.equal(usesSingleWindow(width),true);
  for (const width of [1001,1280,1440,NaN]) assert.equal(usesSingleWindow(width),false);
});
test('the result count and returned entries use the same section and search',()=>{
  const selected=selectLibrary({articles,filter:'engineering',query:'  nAnGo  '});
  assert.deepEqual(selected.matches,[articles[0]]);assert.equal(selected.total,1);assert.equal(selected.searching,true);
  assert.deepEqual(selectLibrary({articles,query:'nature'}).matches,[articles[1]]);
  assert.equal(selectLibrary({articles,query:'missing'}).matches.length,0);
  assert.equal(selectLibrary({articles,query:'missing'}).total,3);
});
test('bookmarks count only saved available documents, including reading pages',()=>{
  const reading={url:'/listening/page/',title:'Rain reading',section:'books'};
  const result=selectLibrary({articles,documents:[...articles,reading],favorites:['/one/','/listening/page/','/removed/'],filter:'favorites',query:'Rain'});
  assert.deepEqual(result.matches,[reading]);assert.equal(result.total,2);
  assert.equal(selectLibrary({articles,filter:'favorites'}).total,0);
});
test('reader selection only exposes live text whose two endpoints belong to the current article',()=>{
  const first={},last={},other={};let connected=true;
  const body={get isConnected(){return connected;},contains:node=>node===first||node===last};
  const selected={rangeCount:1,isCollapsed:false,anchorNode:first,focusNode:last,toString:()=> '  当前文章的选中段落。  '};
  assert.equal(readerSelectionText(body,selected),'当前文章的选中段落。');
  assert.equal(readerSelectionText(body,{...selected,focusNode:other}),'');
  assert.equal(readerSelectionText(body,{...selected,anchorNode:other}),'');
  assert.equal(readerSelectionText(body,{...selected,isCollapsed:true}),'');
  assert.equal(readerSelectionText(body,{...selected,rangeCount:0}),'');
  assert.equal(readerSelectionText(body,null),'');
  connected=false;assert.equal(readerSelectionText(body,selected),'');
  assert.equal(readerSelectionText({isConnected:true,contains:()=>false},selected),'');
});
