import test from 'node:test';
import assert from 'node:assert/strict';

const model = await import('../assets/js/space/state.mjs').catch(() => ({}));
const screen = { width: 1440, height: 850 };
function workspace(saved) {
  assert.equal(typeof model.createWorkspace, 'function', 'workspace model must be available');
  return model.createWorkspace(saved, screen);
}
test('opening two applications retains both and gives the latest window focus', () => {
  let s = workspace();
  s = model.reduceWorkspace(s, { type: 'open', app: 'notes' }, screen);
  s = model.reduceWorkspace(s, { type: 'open', app: 'photos' }, screen);
  assert.deepEqual(s.windows.map(w => w.id), ['notes', 'photos']);
  assert.equal(s.active, 'photos');
});
test('a minimized application restores its original geometry without duplicating itself', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'open', app: 'notes' }, screen);
  s = model.reduceWorkspace(s, { type: 'geometry', id: 'notes', rect: { x: 210, y: 120, width: 640, height: 440 } }, screen);
  s = model.reduceWorkspace(s, { type: 'minimize', id: 'notes' }, screen);
  assert.equal(s.windows[0].minimized, true);
  s = model.reduceWorkspace(s, { type: 'open', app: 'notes' }, screen);
  assert.equal(s.windows.length, 1);
  assert.equal(s.windows[0].minimized, false);
  assert.equal(s.windows[0].rect.x, 210);
});
test('a persisted window from a large screen stays reachable after resizing', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'open', app: 'notes' }, screen);
  s = model.reduceWorkspace(s, { type: 'geometry', id: 'notes', rect: { x: 900, y: 420, width: 500, height: 360 } }, screen);
  const restored = model.createWorkspace(model.serializeWorkspace(s), { width: 820, height: 650 });
  const { x, y, width, height } = restored.windows[0].rect;
  assert.ok(x >= 0 && x + width <= 820);
  assert.ok(y >= 0 && y + height <= 550);
});
test('corrupt snapshots and unknown applications do not poison the workspace', () => {
  assert.deepEqual(workspace('{broken').windows, []);
  assert.deepEqual(workspace({ version: 99, windows: [{ app: 'notes' }] }).windows, []);
  assert.deepEqual(workspace({ version: 1, windows: [{ app: '<script>', id: 'x' }] }).windows, []);
});
test('local writing survives serialization and respects the storage size boundary', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'note', text: '一条属于访客的笔记。' }, screen);
  assert.equal(workspace(model.serializeWorkspace(s)).note, '一条属于访客的笔记。');
  s = model.reduceWorkspace(s, { type: 'note', text: 'a'.repeat(60000) }, screen);
  assert.equal(s.note.length, 40000);
});
test('maximize and restore returns to the pre-maximize rectangle', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'open', app: 'notes' }, screen);
  const rect = { ...s.windows[0].rect };
  s = model.reduceWorkspace(s, { type: 'maximize', id: 'notes' }, screen);
  assert.equal(s.windows[0].maximized, true);
  s = model.reduceWorkspace(s, { type: 'maximize', id: 'notes' }, screen);
  assert.deepEqual(s.windows[0].rect, rect);
});
test('closing the active window focuses the next visible window', () => {
  let s = model.reduceWorkspace(workspace(), { type: 'open', app: 'notes' }, screen);
  s = model.reduceWorkspace(s, { type: 'open', app: 'photos' }, screen);
  s = model.reduceWorkspace(s, { type: 'close', id: 'photos' }, screen);
  assert.equal(s.active, 'notes');
});
test('only safe site and HTTPS links can be opened', () => {
  assert.equal(typeof model.safeURL, 'function');
  assert.equal(model.safeURL('javascript:alert(1)', 'https://cubxxw.com'), null);
  assert.equal(model.safeURL('//evil.test', 'https://cubxxw.com'), null);
  assert.equal(model.safeURL('https://good.test/path', 'https://cubxxw.com'), 'https://good.test/path');
  assert.equal(model.safeURL('/zh/articles/', 'https://cubxxw.com'), 'https://cubxxw.com/zh/articles/');
});
test('reader links resolved to the local site retain their safe HTTP URLs', () => {
  assert.equal(model.safeURL('http://localhost:8889/images/photo.webp', 'http://localhost:8889'), 'http://localhost:8889/images/photo.webp');
  assert.equal(model.safeURL('http://untrusted.test/photo.webp', 'http://localhost:8889'), null);
});

function openWindows(count, viewport) {
  let state=model.createWorkspace(undefined,viewport);
  for(const app of ['welcome','notes','map','terminal'].slice(0,count))state=model.reduceWorkspace(state,{type:'open',app},viewport);
  return model.reduceWorkspace(state,{type:'note',text:'Keep this private note.'},viewport);
}
function assertTiles(plan,viewport) {
  assert.equal(plan.mode,'tile');
  for(const {rect} of plan.rectangles) {
    assert.ok(rect.width>=320&&rect.height>=260);
    assert.ok(rect.x>=8&&rect.y>=12);
    assert.ok(rect.x+rect.width<=viewport.width-8+0.001);
    assert.ok(rect.y+rect.height<=viewport.height-100-8+0.001);
    assert.deepEqual(model.fitRect(rect,viewport),rect,'minimum-size clamping must not expand a planned tile');
  }
  for(let i=0;i<plan.rectangles.length;i++)for(let j=i+1;j<plan.rectangles.length;j++) {
    const a=plan.rectangles[i].rect,b=plan.rectangles[j].rect;
    assert.ok(a.x+a.width+4<=b.x+0.001||b.x+b.width+4<=a.x+0.001||a.y+a.height+4<=b.y+0.001||b.y+b.height+4<=a.y+0.001,'tiles keep a real 4px gap');
  }
}
test('short desktops fall back without mutating rectangles, maximize state or local writing',()=>{
  const viewport={width:844,height:390};
  for(const count of [3,4]) {
    let state=openWindows(count,viewport);state=model.reduceWorkspace(state,{type:'maximize',id:'notes'},viewport);
    const before=JSON.stringify(state);
    assert.equal(model.planWindowArrangement(state,viewport).mode,'overview');
    assert.equal(model.reduceWorkspace(state,{type:'arrange'},viewport),state);
    assert.equal(JSON.stringify(state),before);
  }
});
test('ordinary two- and four-window desktops tile within the real usable area',()=>{
  const viewport={width:1440,height:900};
  for(const count of [2,4]) {
    const state=openWindows(count,viewport),plan=model.planWindowArrangement(state,viewport);assertTiles(plan,viewport);
    const next=model.reduceWorkspace(state,{type:'arrange'},viewport);
    assert.deepEqual(Object.fromEntries(next.windows.map(win=>[win.id,win.rect])),Object.fromEntries(plan.rectangles.map(item=>[item.id,item.rect])));
    assert.equal(next.note,state.note);assert.equal(next.active,state.active);
  }
});
test('zero windows use overview and one eligible window fits the workspace',()=>{
  const viewport={width:844,height:390},empty=openWindows(0,viewport);
  assert.equal(model.planWindowArrangement(empty,viewport).mode,'overview');
  assert.equal(model.reduceWorkspace(empty,{type:'arrange'},viewport),empty);
  const single=openWindows(1,viewport),plan=model.planWindowArrangement(single,viewport);assertTiles(plan,viewport);
  assert.equal(plan.rectangles.length,1);assert.equal(plan.rectangles[0].rect.width,viewport.width-16);
});
test('the raw 320 by 260 cell boundary is enforced before fitRect can enlarge it',()=>{
  const exact={width:660,height:380},state=openWindows(2,exact),plan=model.planWindowArrangement(state,exact);
  assertTiles(plan,exact);assert.equal(plan.rectangles[0].rect.width,320);assert.equal(plan.rectangles[0].rect.height,260);
  for(const viewport of [{width:659,height:380},{width:660,height:379}]) {
    assert.equal(model.planWindowArrangement(state,viewport).mode,'overview');
    assert.equal(model.reduceWorkspace(state,{type:'arrange'},viewport),state);
  }
});
test('a wider short desktop may use a valid alternative column count',()=>{
  const viewport={width:1440,height:390},state=openWindows(3,viewport),plan=model.planWindowArrangement(state,viewport);
  assertTiles(plan,viewport);assert.equal(new Set(plan.rectangles.map(item=>item.rect.y)).size,1);
});
test('minimized windows keep their rectangles and do not consume a tiling cell',()=>{
  const viewport={width:844,height:390};let state=openWindows(3,viewport);
  state=model.reduceWorkspace(state,{type:'minimize',id:'map'},viewport);
  const minimized={...state.windows.find(win=>win.id==='map').rect},plan=model.planWindowArrangement(state,viewport);
  assertTiles(plan,viewport);assert.equal(plan.rectangles.length,2);
  const next=model.reduceWorkspace(state,{type:'arrange'},viewport);
  assert.deepEqual(next.windows.find(win=>win.id==='map').rect,minimized);
  assert.equal(next.windows.find(win=>win.id==='map').minimized,true);
});
test('phone capacity uses the real viewport while retaining larger stored rectangles',()=>{
  const state=openWindows(2,{width:10000,height:10000}),viewport={width:390,height:844},before=JSON.stringify(state);
  assert.equal(model.planWindowArrangement(state,viewport).mode,'overview');
  assert.equal(model.reduceWorkspace(state,{type:'arrange'},viewport),state);assert.equal(JSON.stringify(state),before);
});
test('focusing an already tiled document does not reshuffle its next arrangement',()=>{
  const viewport={width:1440,height:900};let state=openWindows(4,viewport);
  state=model.reduceWorkspace(state,{type:'arrange'},viewport);
  const rectangles=Object.fromEntries(state.windows.map(win=>[win.id,{...win.rect}]));
  state=model.reduceWorkspace(state,{type:'focus',id:'notes'},viewport);
  const order=state.windows.map(win=>win.id),next=model.reduceWorkspace(state,{type:'arrange'},viewport);
  assert.deepEqual(Object.fromEntries(next.windows.map(win=>[win.id,win.rect])),rectangles);
  assert.deepEqual(next.windows.map(win=>win.id),order);assert.equal(next.active,'notes');assert.equal(next.note,state.note);
});
