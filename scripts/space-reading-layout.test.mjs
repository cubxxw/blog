import test from 'node:test';
import assert from 'node:assert/strict';
import { usesSingleWindow, selectLibrary } from '../assets/js/space/reading-layout.mjs';
import { readerSelectionText } from '../assets/js/space/apps.js';

const articles = [
  {url:'/one/',title:'Nango integration',description:'OAuth',section:'engineering',tags:['Go']},
  {url:'/two/',title:'A quiet walk',description:'Travel notes',section:'growth',tags:['Nature']},
  {url:'/three/',title:'Agent reading',description:'Tools and memory',section:'ai-agent',tags:['AI']},
];
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
