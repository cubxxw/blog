import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { cafeTheme, cafeEntryMode, createSceneSelection } from '../assets/js/space/cafe.mjs';

test('the night room is the default and all six spatial cafés remain restorable', () => {
  for (const id of ['jiangnan', 'zen', 'garden', 'coast', 'mountain', 'lake', 'rain']) assert.equal(cafeTheme(id), id);
  for (const value of [null, '', '__proto__', 'https://other.example/image', {}, '<script>']) assert.equal(cafeTheme(value), 'jiangnan');
});
test('direct content routes take priority over a café visit', () => {
  assert.equal(cafeEntryMode({ route: { view: 'bear', app: 'reader' }, navigation: 'navigate' }), 'desktop');
  assert.equal(cafeEntryMode({ route: { view: 'lab' }, saved: 'cafe', localeResume: true }), 'desktop');
});
test('root visits and reloads enter the café while language changes preserve the current place', () => {
  const route = { view: 'bear' };
  assert.equal(cafeEntryMode({ route, navigation: 'navigate', saved: 'desktop' }), 'cafe');
  assert.equal(cafeEntryMode({ route, navigation: 'reload', saved: 'desktop' }), 'cafe');
  assert.equal(cafeEntryMode({ route, navigation: 'navigate', saved: 'desktop', localeResume: true }), 'desktop');
  assert.equal(cafeEntryMode({ route, navigation: 'reload', saved: 'invalid' }), 'cafe');
});
test('an explicit reader deep link beats stale café storage on reload',()=>{
  assert.equal(cafeEntryMode({route:{view:'bear',app:'reader'},navigation:'reload',saved:'cafe'}),'desktop');
  assert.equal(cafeEntryMode({route:{view:'bear',app:'reader'},navigation:'back_forward',saved:'cafe'}),'desktop');
  assert.equal(cafeEntryMode({route:{view:'bear'},navigation:'back_forward',saved:'desktop'}),'desktop');
});
test('returning to the café from an old About URL survives reload and language changes', () => {
  const route = { view: 'bear', app: 'welcome', payload: 'identity' };
  assert.equal(cafeEntryMode({ route, navigation: 'navigate', saved: 'cafe' }), 'desktop');
  assert.equal(cafeEntryMode({ route, navigation: 'reload', saved: 'cafe' }), 'cafe');
  assert.equal(cafeEntryMode({ route, navigation: 'navigate', saved: 'cafe', localeResume: true }), 'cafe');
});
test('a slow previous scene cannot overwrite the latest selection', async () => {
  const pending = new Map(), committed = [];
  const selection = createSceneSelection({ load: id => new Promise(resolve => pending.set(id, resolve)), commit: id => committed.push(id) });
  const older = selection.select('coast'), newer = selection.select('garden');
  pending.get('garden')(); await newer; pending.get('coast')(); await older;
  assert.deepEqual(committed, ['garden']);
});
test('a failed scene keeps the previous view; selecting the current scene cancels an older load', async () => {
  let resolve, committed = [];
  const selection = createSceneSelection({ load: id => id === 'rain' ? Promise.reject(new Error('offline')) : new Promise(done => resolve = done), commit: id => committed.push(id) });
  assert.equal(await selection.select('rain'), 'failed');
  const pending = selection.select('coast');
  selection.cancel(); resolve(); assert.equal(await pending, 'superseded');
  assert.deepEqual(committed, []);
});

// Execute the controller's real state writes. Only the camera promise is held:
// native reachability/geometry remains the existing onboarding browser test.
const cafeControllerSource = readFileSync(new URL('../assets/js/space/cafe.js', import.meta.url), 'utf8');
function controllerDeclaration(start, end) {
  const from = cafeControllerSource.indexOf(start), to = cafeControllerSource.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing controller boundary: ${start}`);
  return cafeControllerSource.slice(from, to);
}
function pendingCameraController() {
  const surface = { inert: false }, desktop = [{ inert: true }, { inert: true }];
  const root = { dataset: { cafeMode: 'cafe' } }, calls = [], storage = new Map();
  let movement;
  function move(mode) {
    movement?.resolve(false);
    world.mode = mode;
    return new Promise((resolve, reject) => { movement = { resolve, reject }; });
  }
  const world = { mode: 'roam', focus: () => move('roam'), start: () => move('roam'), leave: () => move('roam'), outside: () => move('roam') };
  const context = vm.createContext({
    surface, desktop, root, world, ready: Promise.resolve(), boot: { dismiss() {} }, dialog: { open: false }, closePicker() {},
    sessionStorage: { setItem: (key, value) => storage.set(key, value) }, onEnter() {}, beforeVisit() {},
    focusDesktop: () => ({ focus: () => calls.push('focus') }),
    location: { href: 'https://blog.invalid/projects/' }, history: { replaceState() {} }, URL,
  });
  vm.runInContext("let revision=0,disposed=false,mode='cafe',desiredMode='cafe';\n" +
    controllerDeclaration('  function setMode(value)', '  function commit(id)') +
    controllerDeclaration('  async function enterDesktop', '  async function visit') +
    controllerDeclaration('  async function visit', "  root.addEventListener('click'") +
    '\nglobalThis.api={enterDesktop,visit,dispose(){disposed=true;}};', context);
  return {
    ...context.api, root, surface, desktop, calls, storage,
    finishFocus() { world.mode = 'workspace'; movement.resolve(true); },
    finishVisit() { movement.resolve(true); },
    rejectFocus() { movement.reject(new Error('camera unavailable')); },
  };
}
const settleController = () => new Promise(setImmediate);

test('an in-flight desktop journey keeps the café cancel surface active until the camera settles', async () => {
  const f = pendingCameraController();
  let opened = false;
  const read = (async () => { if (await f.enterDesktop(true)) opened = true; })();
  await settleController();
  assert.equal(f.root.dataset.cafeMode, 'cafe');
  assert.equal(f.surface.inert, false, 'the picker used to cancel travel must remain actionable');
  assert.ok(f.desktop.every(node => node.inert));
  assert.equal(opened, false);
  assert.deepEqual(f.calls, []);
  f.finishFocus(); await read;
  assert.equal(f.root.dataset.cafeMode, 'desktop');
  assert.equal(f.surface.inert, true);
  assert.ok(f.desktop.every(node => !node.inert));
  assert.equal(opened, true);
  assert.deepEqual(f.calls, ['focus']);
});

test('replaying a café visit cancels the older read without an app open or late focus', async () => {
  const f = pendingCameraController();
  let opened = false;
  const read = (async () => { if (await f.enterDesktop(true)) opened = true; })();
  await settleController();
  const replay = f.visit('seat');
  await settleController(); await read;
  assert.equal(opened, false);
  assert.deepEqual(f.calls, []);
  assert.equal(f.root.dataset.cafeMode, 'cafe');
  assert.equal(f.surface.inert, false);
  f.finishVisit();
  assert.equal(await replay, true);
  assert.equal(f.storage.get('space:cafe:mode'), 'cafe');
});

test('a rejected desktop camera journey preserves the café recovery surface and rejects entry', async () => {
  const f = pendingCameraController();
  const read = assert.rejects(f.enterDesktop(true), /camera unavailable/);
  await settleController(); f.rejectFocus(); await read;
  assert.equal(f.root.dataset.cafeMode, 'cafe');
  assert.equal(f.surface.inert, false);
  assert.deepEqual(f.calls, []);
});

test('disposal prevents a late desktop journey from opening or focusing the replaced view', async () => {
  const f = pendingCameraController();
  const read = f.enterDesktop(true);
  await settleController(); f.dispose(); f.finishFocus();
  assert.equal(await read, false);
  assert.equal(f.root.dataset.cafeMode, 'cafe');
  assert.deepEqual(f.calls, []);
});


// Run the real mode, wake and tick bodies. Geometry/rendering are narrow stubs;
// activity must reflect the committed mode before real post-render telemetry.
function lifecycleActivityFunctions(source){
 const start=source.indexOf('  function tick(time) {'),end=source.indexOf('\n  function visibility() ',start);assert.ok(start>=0&&end>start);
 const modeStart=source.indexOf('  function setMode(value) {'),modeEnd=source.indexOf('\n  function travel(',modeStart);assert.ok(modeStart>=0&&modeEnd>modeStart);
 const wakeStart=source.indexOf('  function wake(){'),wakeEnd=source.indexOf('\n',wakeStart);assert.ok(wakeStart>=0&&wakeEnd>wakeStart);
 return [source.slice(wakeStart,wakeEnd),source.slice(modeStart,modeEnd),source.slice(start,end)].join('\n');
}
function lifecycleActivityScenario(source,o={}){
 const calls=[],events=[];let pending=Boolean(o.pending),settles=0,resets=0,rendered=0,rafs=0,resolved=0,failed=0,blocked=Boolean(o.blocked);
 const ctx={disposed:false,frame:1,active:true,initialized:true,mode:o.mode??'roam',quiet:Boolean(o.quiet),reduced:{matches:Boolean(o.reduced)},isBlocked:()=>blocked,
  keys:new Set(),touchKeys:new Set(),drag:null,lastPaint:o.throttle?990:0,drawing:false,last:900,elapsed:0,
  moving:o.next?{from:{x:0},to:{x:1},start:0,duration:1000,nextMode:o.next,resolve(){resolved++;}}:null,
  inspection:o.inspect?{kind:o.inspect}:null,pose:{x:0,y:0,z:0,yaw:0,pitch:0,fov:54},catStamp:0,water:null,rain:null,firstPending:false,
  root:{dataset:{catActive:'true',catPose:'old'}},screen:{inert:false,style:{}},scene:{},camera:{},
  resident:{get loaded(){return o.loaded!==false;},get pending(){return pending;},resetClock(){resets++;},settle(){settles++;pending=false;},update(seconds,flags){calls.push({seconds,...flags});},snapshot(){return {x:0,z:0,yaw:0,phase:'rest',loaded:o.loaded!==false};}},
  travelPose:(_a,b)=>b,applyPose(value){ctx.pose=value;ctx.wake();},stepWalk:()=>({}),detailPose:()=>({}),
  onTravel(){events.push('travel-ended');if(o.blockOnTravel)blocked=true;},
  renderer:{render(){if(o.renderFails)throw Error('controlled render failure');rendered++;},info:{render:{frame:2,triangles:1,calls:1}}},css:{render(){}},
  settleFirst(){},onFailure(){failed++;},requestAnimationFrame(){rafs++;return 1;},
 };
 const context=vm.createContext(ctx);vm.runInContext(lifecycleActivityFunctions(source),context);context.tick(o.midway?500:1000);
 const snap=()=>JSON.parse(JSON.stringify({mode:ctx.mode,activity:calls.at(-1),catActive:ctx.root.dataset.catActive,renderedMode:ctx.root.dataset.worldRenderedMode,frame:ctx.frame,rendered,rafs,resolved,settles,resets,failed,screenInert:ctx.screen.inert,screenVisibility:ctx.screen.style.visibility}));
 const first=snap();if(o.nextFrame&&ctx.frame)context.tick(2000);
 return {first,final:snap(),calls,events};
}

test('completed travel uses current resident eligibility in the same rendered frame',()=>{
 const source=readFileSync(new URL('../assets/js/space/world-cafe.js',import.meta.url),'utf8');
 for(const options of [{next:'workspace'},{next:'workspace',pending:true},{mode:'inspect',inspect:'cat',pending:true,next:'workspace'},{next:'inspect',inspect:'coffee'}]){
  const result=lifecycleActivityScenario(source,options).first;
  assert.equal(result.activity.active,false);assert.equal(result.activity.interactive,false);
  assert.equal(result.catActive,'false');assert.equal(result.renderedMode,result.mode);
  assert.equal(result.rendered,1);assert.equal(result.rafs,0);
 }
 const moving=lifecycleActivityScenario(source,{next:'workspace',midway:true}).first;
 assert.equal(moving.mode,'roam');assert.equal(moving.activity.active,true);assert.equal(moving.resolved,0);
 const failure=lifecycleActivityScenario(source,{next:'workspace',renderFails:true}).first;
 assert.equal(failure.failed,1);assert.equal(failure.rendered,0);assert.equal(failure.renderedMode,undefined);
 assert.equal(failure.catActive,'true','a failed render cannot publish a successful inactive frame');
});
