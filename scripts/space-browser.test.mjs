import test from 'node:test';
import assert from 'node:assert/strict';
import {APPS,createWorkspace,reduceWorkspace,serializeWorkspace} from '../assets/js/space/state.mjs';
const model=await import('../assets/js/space/browser-state.mjs').catch(()=>null);
const origin='https://cubxxw.com';
const products=[{id:'leafhour',name:'Leafhour',url:'https://leafhour.com/en',embed:true},{id:'capri',name:'capri',url:'https://gettalentsignal.com',embed:false},{id:'source',name:'Source',url:'https://github.com/cubxxw/example'},{id:'bad',url:'javascript:alert(1)',embed:true}];

test('the browser is a real registered application that restores one durable window',()=>{
 assert.ok(APPS.includes('browser'));
 let state=reduceWorkspace(createWorkspace(),{type:'open',app:'browser'},{width:1280,height:800});
 state=reduceWorkspace(state,{type:'open',app:'browser'},{width:1280,height:800});
 assert.equal(state.windows.length,1);assert.equal(state.active,'browser');
 assert.equal(createWorkspace(serializeWorkspace(state)).windows[0].app,'browser');
});
test('the start page uses valid product destinations and embeds only explicitly allowed project origins',()=>{
 assert.ok(model?.browserBookmarks&&model?.browserDestination);
 const marks=model.browserBookmarks(products,origin);assert.equal(marks.length,3);
 assert.equal(model.browserDestination('leafhour.com/read',marks,origin).kind,'page');
 assert.equal(model.browserDestination('https://gettalentsignal.com',marks,origin).kind,'external');
 assert.equal(model.browserDestination('https://leafhour.com.evil.test',marks,origin).kind,'external');
 assert.equal(model.browserDestination('https://unlisted.test',marks,origin).kind,'external');
 assert.equal(model.browserDestination('/zh/articles/',marks,origin).kind,'page');
 assert.equal(model.browserDestination('/zh/projects/?vista=image',marks,origin).kind,'external','do not recursively render another room');
 assert.equal(model.browserDestination('',marks,origin).kind,'home');
});
test('browser addresses reject scripts, credentials, scheme-relative URLs and control characters',()=>{
 assert.ok(model?.browserDestination);
 const marks=model.browserBookmarks(products,origin);
 for(const value of ['javascript:alert(1)','data:text/html,bad','//evil.test','https://user:pass@leafhour.com','https://leafhour.com\\@evil.test','https://leafhour.com\n.evil.test'])assert.equal(model.browserDestination(value,marks,origin).kind,'invalid',value);
});
test('legacy room redirects never start another Space inside the browser window',()=>{
 const marks=model.browserBookmarks(products,origin);
 for(const path of ['/about','/about/','/zh/about','/zh/about/','/start-here','/start-here/','/zh/start-here','/zh/start-here/']) {
  assert.equal(model.browserDestination(path+'?from=browser#story',marks,origin).kind,'external',path);
 }
 for(const path of ['/zh/articles/','/articles/about/','/zh/growth/posts/start-here/'])assert.equal(model.browserDestination(path,marks,origin).kind,'page',path);
 assert.equal(model.browserDestination('https://leafhour.com/about/',marks,origin).kind,'page');
});
test('browser history supports home, back, forward, branching and duplicate navigation',()=>{
 assert.ok(model?.createBrowserHistory);
 const h=model.createBrowserHistory();assert.equal(h.current(),'');assert.equal(h.canBack(),false);
 h.visit('https://leafhour.com/');h.visit('https://imstage.org/');assert.equal(h.back(),'https://leafhour.com/');assert.equal(h.canForward(),true);
 h.visit('https://roamorrow.com/');assert.equal(h.canForward(),false);
 h.visit('https://roamorrow.com/');assert.equal(h.back(),'https://leafhour.com/');assert.equal(h.back(),'');assert.equal(h.back(),'');assert.equal(h.forward(),'https://leafhour.com/');
});
