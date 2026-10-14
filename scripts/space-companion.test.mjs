import test from 'node:test';
import assert from 'node:assert/strict';
import { publicFocus, contextualQuestion, serviceMessage } from '../assets/js/space/companion.mjs';

const catalog = { articles:[{url:'/zh/ai-agent/posts/test/',title:'An article'}], products:[{id:'daypage',name:'DayPage',url:'https://daypage.example'}], readingDocuments:[], photos:[] };
test('context resolves only public catalog objects and excludes private editors', () => {
  const snapshot = {active:'reader',windows:[{id:'reader',app:'reader',payload:'/zh/ai-agent/posts/test/'}],note:'PRIVATE_NOTE',draft:'PRIVATE_DRAFT'};
  assert.deepEqual(publicFocus(snapshot,catalog),{kind:'article',title:'An article',reference:'/zh/ai-agent/posts/test/'});
  for (const app of ['notes','contact','terminal','settings','agent']) assert.equal(publicFocus({...snapshot,active:app,windows:[{id:app,app,payload:'PRIVATE_NOTE'}]},catalog),null);
  assert.equal(publicFocus({...snapshot,windows:[{id:'reader',app:'reader',payload:'https://evil.test'}]},catalog),null);
});
test('explicit public selection has a bounded pinned reference; ordinary typing preserves its question', () => {
  const focus = publicFocus({active:'products',windows:[{id:'products',app:'products',payload:'daypage'}]},catalog);
  assert.equal(contextualQuestion('hello',null,'secret'),'hello');
  const question = contextualQuestion('解释',focus,'x'.repeat(5000));
  assert.ok(question.includes('https://daypage.example'));
  assert.ok(question.length<=4000);
  assert.ok(!question.includes('x'.repeat(1201)));
  assert.ok(contextualQuestion('z'.repeat(5000),focus).includes('daypage.example'));
});
test('service failures explain real causes without echoing provider details', () => {
  assert.match(serviceMessage('ai-rate-limited',true),/限流/);
  assert.match(serviceMessage('ai-credit-exhausted',false),/credit/i);
  assert.match(serviceMessage('ai-not-configured',true),/配置/);
  assert.ok(!serviceMessage('sk-PRIVATE_secret',true).includes('PRIVATE'));
});
