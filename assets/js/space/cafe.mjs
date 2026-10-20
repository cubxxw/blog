export const CAFE_THEMES = Object.freeze(['jiangnan', 'zen', 'garden', 'coast', 'mountain', 'lake', 'rain']);
export function cafeTheme(value) { return CAFE_THEMES.includes(value) ? value : 'jiangnan'; }
export function cafeEntryMode({ route, navigation, saved, localeResume = false }) {
  if (route.view !== 'bear') return 'desktop';
  if (localeResume && ['cafe', 'desktop'].includes(saved)) return saved;
  // Old About URLs historically remained in the address bar on leaving the
  // screen. Preserve that one legacy return, but never swallow a reader link.
  if (navigation==='reload' && saved==='cafe' && route.app==='welcome' && route.payload==='identity') return 'cafe';
  if (route.app) return 'desktop';
  if (navigation === 'back_forward' && ['cafe', 'desktop'].includes(saved)) return saved;
  return 'cafe';
}
// Only the most recent successfully loaded scene may change the view or storage.
export function createSceneSelection({ load, commit }) {
  let generation = 0;
  return {
    cancel() { generation++; },
    async select(id) {
      const current = ++generation;
      try {
        const asset = await load(id);
        if (current !== generation) return 'superseded';
        commit(id, asset); return 'selected';
      } catch { return current === generation ? 'failed' : 'superseded'; }
    }
  };
}
