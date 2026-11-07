import { createWorkspace, serializeWorkspace } from './state.mjs';

// The caller applies state only after the storage receipt says saved. The
// preview identity is rechecked inside the caller's optional cross-tab lock.
export function commitWorkspaceRestore({ getState, next, expected, store, viewport, isCurrent = () => true, now = new Date().toISOString() }) {
  if (!isCurrent()) return {saved:false,reason:'cancelled'};
  const previous = getState();
  if (serializeWorkspace(previous) !== expected) return {saved:false,reason:'stale-restore'};
  const settings = previous.windows.find(win=>win.app==='settings');
  const windows = next.windows.filter(win=>!settings || win.app!=='settings');
  // Retain the confirmation surface when capacity allows, never silently
  // remove a different imported window to make a seventeenth slot.
  const keepSettings = settings && windows.length < 16;
  if (keepSettings) windows.push(settings);
  const recovery = {id:`restore-${Date.parse(now).toString(36)}`,note:previous.note,draft:previous.draft,at:now,reason:'before-restore'};
  const proposed = createWorkspace({...next,windows,active:keepSettings?settings.id:next.active,recoveries:[...(next.recoveries || []),...(recovery.note || recovery.draft ? [recovery] : [])].slice(-3)},viewport);
  return store.save(proposed);
}
