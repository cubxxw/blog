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
