import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../assets/js/space/desktop.js', import.meta.url), 'utf8');
const start = source.indexOf('  for (const dialog of [search,launchpad,overview]) {');
const end = source.indexOf('\n  function showSearch(', start);
assert.ok(start >= 0 && end > start, 'production dialog listener block must exist');
const listeners = source.slice(start, end);

// HTML queues close events: deliver a previous close only after the same dialog
// has reopened. Run the actual production listeners, rather than a copied guard.
function fixture() {
  const tasks = [], handoffs = [], dialogFocus = new Map();
  const document = { activeElement: null }, window = {}, root = { hidden: false };
  const control = () => ({
    isConnected: true, inert: false, visible: true, focuses: [],
    closest() { return this.inert ? {} : null; },
    getClientRects() { return this.visible ? [{}] : []; },
    focus(options) { this.focuses.push(options); document.activeElement = this; },
  });
  const menu = control();
  const dialogs = Array.from({ length: 3 }, () => {
    const handlers = new Map();
    const input = control();
    input.blurs = 0;
    input.blur = () => { input.blurs++; if (document.activeElement === input) document.activeElement = null; };
    return {
      open: false, input,
      addEventListener(type, handler) { handlers.set(type, handler); },
      contains(node) { return node === input; },
      showModal() { this.open = true; },
      close() { this.open = false; tasks.push(() => handlers.get('close')()); },
    };
  });
  const [search, launchpad, overview] = dialogs;
  const closeDialog = dialog => dialog.close();
  runInNewContext(listeners, {
    search, launchpad, overview, dialogFocus, root, document, window, menu, closeDialog,
    getComputedStyle: element => ({ visibility: element.visible ? 'visible' : 'hidden' }),
    handoffEntryFocus: options => handoffs.push(options),
  });
  return { dialogs, dialogFocus, document, root, menu, control, handoffs,
    deliverClose() { assert.equal(tasks.length, 1); tasks.shift()(); },
  };
}

test('a queued close cannot clear or blur a newer opening of the same dialog', () => {
  for (const index of [0, 1, 2]) {
    const f = fixture(), dialog = f.dialogs[index];
    dialog.showModal();
    f.dialogFocus.set(dialog, { trigger: f.control(), restore: true, ready: Promise.resolve() });
    dialog.close();
    dialog.showModal();
    const current = { trigger: f.control(), restore: true, ready: Promise.resolve() };
    f.dialogFocus.set(dialog, current);
    dialog.input.focus();
    f.deliverClose();
    assert.equal(f.dialogFocus.get(dialog), current, 'new focus ownership must survive the old close');
    assert.equal(f.document.activeElement, dialog.input);
    assert.equal(dialog.input.blurs, 0);
    assert.equal(f.handoffs.length, 0, 'old close must not schedule a restoration');
    dialog.close(); f.deliverClose();
    assert.equal(f.dialogFocus.has(dialog), false);
    assert.equal(f.handoffs.length, 1);
    assert.equal(f.handoffs[0].target, current.trigger, 'the genuine new close retains its own trigger');
    assert.equal(f.handoffs[0].isCurrent(), true);
    f.handoffs[0].focus();
    assert.equal(f.document.activeElement, current.trigger);
  }
});

test('a normal close releases its input and restores the original trigger', () => {
  const f = fixture(), dialog = f.dialogs[0], trigger = f.control(), ready = Promise.resolve();
  dialog.showModal();
  f.dialogFocus.set(dialog, { trigger, restore: true, ready });
  dialog.input.focus();
  dialog.close(); f.deliverClose();
  assert.equal(f.dialogFocus.has(dialog), false);
  assert.equal(dialog.input.blurs, 1);
  assert.equal(f.handoffs.length, 1);
  const handoff = f.handoffs[0];
  assert.equal(handoff.ready, ready);
  assert.equal(handoff.target, trigger);
  assert.equal(handoff.isCurrent(), true);
  handoff.focus();
  assert.equal(f.document.activeElement, trigger);
  assert.equal(trigger.focuses[0].preventScroll, true);
});

test('restore false still clears its record without blurring or restoring focus', () => {
  const f = fixture(), dialog = f.dialogs[0];
  dialog.showModal();
  f.dialogFocus.set(dialog, { trigger: f.control(), restore: false });
  dialog.input.focus();
  dialog.close(); f.deliverClose();
  assert.equal(f.dialogFocus.has(dialog), false);
  assert.equal(f.document.activeElement, dialog.input);
  assert.equal(dialog.input.blurs, 0);
  assert.equal(f.handoffs.length, 0);
});

test('a hidden workspace clears the closing record without scheduling focus', () => {
  const f = fixture(), dialog = f.dialogs[0];
  dialog.showModal();
  f.dialogFocus.set(dialog, { trigger: f.control(), restore: true });
  dialog.input.focus(); f.root.hidden = true;
  dialog.close(); f.deliverClose();
  assert.equal(f.dialogFocus.has(dialog), false);
  assert.equal(dialog.input.blurs, 0);
  assert.equal(f.handoffs.length, 0);
});

test('an unavailable trigger falls back to the menu and a newer dialog prevents restoration', () => {
  const f = fixture(), dialog = f.dialogs[0], trigger = f.control();
  trigger.isConnected = false;
  dialog.showModal();
  f.dialogFocus.set(dialog, { trigger, restore: true });
  dialog.close(); f.deliverClose();
  const handoff = f.handoffs[0];
  assert.equal(handoff.target, f.menu);
  assert.equal(handoff.isCurrent(), true);
  f.dialogs[1].showModal();
  assert.equal(handoff.isCurrent(), false);
});
