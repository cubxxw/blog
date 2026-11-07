import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspace} from '../assets/js/space/state.mjs';
const api=await import('../assets/js/space/workspace-transfer.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} must be available`);return api[name](...args);};
const catalog={articles:[{url:'/zh/a/',title:'Current title'}],readingDocuments:[{url:'/zh/reading/',title:'Reading'}]};const workspace=patch=>({...createWorkspace(null,{width:1280,height:800}),excerpts:[],recoveries:[],...patch});
test('bounded backup keeps current browser identities and payloads while omitting credentials',()=>{
 const state=workspace({windows:[{id:'browser:one',app:'browser',payload:'https://example.org/a'},{id:'browser:two',app:'browser',payload:'https://example.org/b'}],active:'browser:two',note:'私有笔记',draft:'draft',favorites:['/zh/a/'],token:'private',tasks:[{answer:'private'}],recoveries:[{id:'r1',note:'old',draft:'',at:'2026-11-07T00:00:00Z',reason:'conflict-local'}]});
 const backup=call('createBackup',state,{now:'2026-11-07T00:00:00Z'});assert.equal(backup.format,'bear-workspace');assert.equal(backup.workspace.windows.length,2);assert.equal(backup.workspace.windows[0].payload,'https://example.org/a');assert.equal(backup.workspace.active,'browser:two');assert.equal(backup.workspace.token,undefined);assert.equal(backup.workspace.tasks,undefined);
 const result=call('parseBackup',JSON.stringify(backup),{catalog});assert.equal(result.state.note,'私有笔记');assert.equal(result.state.recoveries[0].note,'old');assert.equal(result.summary.recoveries,1);
});
test('import preview preserves unavailable quote sources but filters live reader/favorite navigation',()=>{
 const state=workspace({windows:[{id:'reader',app:'reader',payload:'/removed/'}],favorites:['/zh/a/','/removed/','https://evil.example/'],excerpts:[{id:'e1',text:'Saved source words',url:'/removed/',title:'Old title',anchor:''}]});
 const result=call('parseBackup',JSON.stringify(state),{catalog});assert.equal(result.state.windows[0].payload,'');assert.deepEqual(result.state.favorites,['/zh/a/']);assert.equal(result.state.excerpts[0].text,'Saved source words');assert.ok(result.warnings.includes('legacy'));assert.ok(result.warnings.includes('reader-filtered'));assert.ok(result.warnings.includes('excerpt-sources-unavailable'));
 const doc=call('parseBackup',JSON.stringify(workspace({favorites:['/zh/reading/']})),{catalog});assert.deepEqual(doc.state.favorites,['/zh/reading/']);
});
test('malformed, unsupported and oversized private text is rejected before forgiving state restoration',()=>{
 assert.equal(typeof api.parseBackup,'function','the import validator must exist before testing rejected inputs');
 for(const value of ['bad JSON',JSON.stringify({version:2}),JSON.stringify(workspace({note:'x'.repeat(40001)})),JSON.stringify(workspace({excerpts:[{text:'x'.repeat(1201),url:'/zh/a/',title:'a'}]})),JSON.stringify(workspace({recoveries:[{id:'r',note:'x'.repeat(40001),draft:''}]}))])assert.throws(()=>call('parseBackup',value,{catalog}));
 assert.throws(()=>call('parseBackup',' '.repeat(2*1024*1024+1),{catalog}));
});
test('the input budget counts UTF-8 bytes rather than JavaScript characters',()=>{
 const text=JSON.stringify(workspace({ignored:'界'.repeat(710000)}));assert.ok(text.length<2*1024*1024);
 assert.throws(()=>call('parseBackup',text,{catalog}),/2 MiB/);
});
