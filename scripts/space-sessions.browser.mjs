import {enterWorkspace} from './space-browser-entry.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.SESSION_BASE_URL||'http://localhost:8888',output=path.resolve(process.env.SESSION_EVIDENCE_DIR||'output/playwright/space-sessions');await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chromium',args:process.platform==='darwin'?['--enable-gpu','--use-angle=metal']:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[],requests=[],checks=[];page.on('pageerror',error=>errors.push(error.message));
const legacy=JSON.stringify({version:1,tasks:[{id:'old-guide',question:'之前聊过的 Agent 文章',answer:'我推荐《Agent 的记忆》。要我打开文章吗？',status:'completed',steps:[],startedAt:'2026-10-13T10:00:00Z',endedAt:'2026-10-13T10:01:00Z',stopReason:'answered'}]});
await page.addInitScript(legacy=>{if(!localStorage.getItem('session-test-seeded')){localStorage.setItem('bear-agent-tasks:v1',legacy);localStorage.setItem('session-test-seeded','yes');}},legacy);
let readerURL;
await page.route('**/.netlify/functions/bear-agent',async route=>{
  const body=route.request().postDataJSON();requests.push(body);const latest=body.messages.findLast(message=>message.role==='user').content;
  const result=body.messages.some(message=>message.role==='tool')?{message:'已打开刚才推荐的文章，可以继续阅读。',toolCalls:[]}:
    latest==='可以'?{message:'',toolCalls:[{id:'current-open',name:'open_app',args:{app:'reader',payload:readerURL}}]}:
    {message:latest.includes('海边')?'我们在这段新对话里聊海边的咖啡馆。':'这段对话仍记得之前推荐的文章。',toolCalls:[]};
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
});
const ready=()=>enterWorkspace(page);
const send=async text=>{await page.locator('[data-agent-input]').fill(text);await page.locator('[data-agent-send]').click();await page.waitForFunction(()=>{const tasks=[...document.querySelectorAll('[data-agent-task]')];return tasks.at(-1)?.querySelector('[data-agent-badge]')?.dataset.status==='completed';},null,{timeout:60000});};
const history=()=>page.locator('[data-agent-history]').click();
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
try {
  await page.goto(base+'/zh/projects/');await ready();await page.keyboard.press('Control+j');await page.locator('[data-agent-root][data-ready="true"]').waitFor();
  readerURL=await page.evaluate(()=>JSON.parse(document.querySelector('[data-space-catalog]').textContent).articles[0].url);
  await check('existing task records migrate intact and opening history sends no model request',async()=>{
    await page.locator('.bear-agent__question').filter({hasText:'之前聊过的 Agent 文章'}).waitFor();
    assert.equal(await page.locator('[data-agent-session-title]').textContent(),'之前的对话');
    await history();assert.equal(await page.locator('[data-agent-session]').count(),1);assert.equal(requests.length,0);
    await page.locator('[data-agent-history-close]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('bear-agent-tasks:v1')),legacy);
  });
  await check('a follow-up sees the preceding reply and performs only the new tool call',async()=>{
    await send('可以');assert.equal(requests.length,2);assert.deepEqual(requests[0].messages.map(m=>m.role),['user','assistant','user']);
    assert.ok(requests[0].messages[1].content.includes('要我打开文章吗'));assert.equal(requests[0].messages.at(-1).content,'可以');
    assert.equal(await page.locator('[data-reader-body]').isVisible(),true);
  });
  await check('new conversations keep their own messages and unsent drafts',async()=>{
    await page.locator('[data-agent-input]').fill('旧会话的未发送草稿');await page.locator('[data-agent-new]').click();
    assert.equal(await page.locator('[data-agent-task]').count(),0);assert.equal(await page.locator('[data-agent-input]').inputValue(),'');
    const before=requests.length;await send('聊聊海边的咖啡馆');assert.equal(requests[before].messages.length,1);
    assert.ok(!JSON.stringify(requests[before]).includes('之前聊过'));
    await page.locator('[data-agent-input]').fill('新会话草稿');await history();assert.equal(await page.locator('[data-agent-session]').count(),2);
    await page.locator('[data-agent-session="session-legacy"]').click();
    assert.equal(await page.locator('[data-agent-input]').inputValue(),'旧会话的未发送草稿');assert.equal(await page.locator('[data-agent-task]').count(),2);
  });
  await check('reopening and reloading resume the selected session without replaying tasks',async()=>{
    const before=requests.length;await page.locator('[data-space-window="agent"] [data-window-action="close"]').click();
    await page.keyboard.press('Control+j');await page.locator('[data-agent-root]').waitFor();
    assert.equal(await page.locator('[data-agent-input]').inputValue(),'旧会话的未发送草稿');
    await page.reload();await ready();await page.locator('[data-agent-root]').waitFor();
    assert.equal(await page.locator('[data-agent-task]').count(),2);assert.equal(requests.length,before);
    assert.equal(await page.locator('[data-agent-input]').inputValue(),'旧会话的未发送草稿');
    assert.equal(await page.locator('[data-space-window="agent"]').getAttribute('data-companion-mode'),'expanded');
    await page.screenshot({path:path.join(output,'restored-conversation.png')});
  });
  await check('search, export and returning to an old conversation retain the full stored history',async()=>{
    await history();await page.locator('[data-agent-session-search]').fill('海边');assert.equal(await page.locator('[data-agent-session]').count(),1);
    await page.locator('[data-agent-session-search]').fill('');
    const downloadPromise=page.waitForEvent('download');await page.locator('[data-agent-session-export]').click();const download=await downloadPromise;
    const exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(exported.sessions.length,2);assert.equal(exported.sessions.reduce((n,s)=>n+s.tasks.length,0),3);
    await page.screenshot({path:path.join(output,'conversation-history.png')});
    await page.locator('[data-agent-history-close]').click();const before=requests.length;await send('继续');
    assert.ok(requests[before].messages.some(message=>message.content.includes('之前聊过的 Agent')));assert.ok(!requests[before].messages.some(message=>message.content.includes('海边')));
  });
  await check('language and a narrow screen preserve the same sessions and drafts',async()=>{
    await page.locator('[data-agent-input]').fill('保留这条草稿');await page.locator('[data-space-dock] [data-open="settings"]').click();
    await page.locator('[data-set-language="en"]').click();await page.waitForURL(url=>url.pathname==='/projects/');await ready();
    await page.keyboard.press('Control+j');assert.equal(await page.locator('[data-agent-input]').inputValue(),'保留这条草稿');
    await page.setViewportSize({width:390,height:844});await history();await page.locator('[data-agent-session]').first().waitFor();
    assert.equal(await page.locator('[data-agent-session]').count(),2);
    const box=await page.locator('[data-agent-sessions]').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);
    await page.screenshot({path:path.join(output,'mobile-history.png')});
  });
  if(process.env.BEAR_LIVE_AI==='1')await check('real DeepSeek continues a conversation using the preceding turn',async()=>{
    await page.unroute('**/.netlify/functions/bear-agent');await page.setViewportSize({width:1440,height:900});
    await page.locator('[data-agent-history-close]').click();await page.locator('[data-agent-new]').click();
    await send('接下来这段对话中的咖啡馆叫湖边小屋。请简短确认这个名字，不要调用工具。');
    await send('它叫什么名字？只回答名字。');
    assert.match(await page.locator('[data-agent-task]').last().locator('[data-agent-answer]').textContent(),/湖边小屋/);
    await page.screenshot({path:path.join(output,'real-deepseek-memory.png')});
  });
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({checks,errors},null,2));console.log(checks.length+' session browser checks passed.');
}catch(error){await page.screenshot({path:path.join(output,'failure.png')});console.log('ERRORS',errors);throw error;}finally{await browser.close();}
