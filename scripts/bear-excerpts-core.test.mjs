import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../assets/js/space/excerpts.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} must be available`);return api[name](...args);};
const catalog={language:'en',articles:[{url:'/zh/a/',title:'Public article',anchors:['part-1']}],readingDocuments:[{url:'/zh/reading/',title:'Public reading'}]};
const input=(patch={})=>({text:'Chosen words',url:'/zh/a/',title:'untrusted title',anchor:'part-1',...patch});
test('saved excerpt uses a known public source and catalog title, including reading documents',()=>{
 assert.equal(call('normalizeExcerpt',input(),catalog).title,'Public article');
 assert.equal(call('normalizeExcerpt',input({url:'/zh/reading/',anchor:''}),catalog).title,'Public reading');
 for(const url of ['https://evil.example/a','//evil.example/a','/a/%2e%2e/b','/a/%252f/b','/zh/a/?private=1'])assert.equal(call('normalizeExcerpt',input({url}),catalog),null,url);
 assert.equal(call('normalizeExcerpt',input({text:'x'.repeat(1201)}),catalog),null,'overlong selected words are not silently shortened');
});
test('new source claims need a current public catalog; inert restoration remains separate',()=>{
 assert.equal(call('createExcerpt',input(),[]).status,'invalid');
 const f=selectionFixture();assert.equal(call('captureExcerptSelection',{...f,article:catalog.articles[0]}),null);
 assert.equal(call('normalizeExcerpts',[input()])[0].text,'Chosen words');
});
test('duplicate and full shelves preserve old records rather than overwrite their text',()=>{
 const first=call('createExcerpt',input(),[],catalog,{id:'one',now:'2026-11-07T00:00:00Z'});assert.equal(first.status,'saved');
 assert.equal(call('createExcerpt',input(),first.excerpts,catalog).status,'duplicate');
 const full=Array.from({length:80},(_,i)=>input({id:'e'+i,text:'Existing '+i}));const result=call('createExcerpt',input({text:'New selection'}),full,catalog);assert.equal(result.status,'full');assert.equal(result.excerpts.length,80);assert.equal(result.excerpts[0].text,'Existing 0');
});
test('unavailable sources keep private saved words and export inert recorded provenance',()=>{
 const record=input({title:'Old source',text:'<source>\n[click](javascript:alert(1))'});const empty={articles:[],language:'en'};
 assert.equal(call('createExcerpt',input({text:'New'}),[record],catalog).excerpts[0].text,record.text);
 assert.equal(call('resolveExcerptSource',record,empty),null);const md=call('serializeExcerptMarkdown',[record],empty);assert.ok(md.includes('&lt;source&gt;'));assert.ok(md.includes('Original currently unavailable'));assert.ok(md.includes('`/zh/a/#part-1`'));assert.ok(!md.includes('](/zh/a/'));
 const linked=call('serializeExcerptMarkdown',[input()],catalog);assert.ok(linked.includes('[Public article](/zh/a/#part-1)'));
});
function selectionFixture({text='Chosen words',widget=false}={}){const start={},end={},control={};const content={isConnected:true,contains:n=>n===start||n===end,querySelectorAll:()=>widget?[control]:[]};const range={startContainer:start,endContainer:end,toString:()=>text,intersectsNode:n=>n===control,cloneRange(){return {...this};}};return {content,range,selection:{rangeCount:1,isCollapsed:false,getRangeAt:()=>range}};}
test('source-only ranges reject detached, generated and uncheckable widgets',()=>{
 const f=selectionFixture();assert.equal(call('isArticleTextRange',f.range,f.content),true);f.content.isConnected=false;assert.equal(call('isArticleTextRange',f.range,f.content),false);
 const g=selectionFixture({widget:true});assert.equal(call('isArticleTextRange',g.range,g.content),false);
});
test('range capture refuses multi-range, changed source and truncation, then invalidates after mutation',()=>{
 const f=selectionFixture();const snapshot=call('captureExcerptSelection',{...f,article:catalog.articles[0],catalog,anchor:'part-1',anchors:['part-1']});assert.equal(snapshot.excerpt.text,'Chosen words');assert.equal(call('isExcerptSelectionCurrent',snapshot,f.content),true);
 snapshot.range.toString=()=> 'Different text';assert.equal(call('isExcerptSelectionCurrent',snapshot,f.content),false);
 assert.equal(call('captureExcerptSelection',{...f,selection:{...f.selection,rangeCount:2},article:catalog.articles[0],catalog}),null);
 const long=selectionFixture({text:'x'.repeat(1201)});assert.equal(call('captureExcerptSelection',{...long,article:catalog.articles[0],catalog}),null);
});
