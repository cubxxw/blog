export const CAFE_THEMES = Object.freeze(['zen', 'garden', 'coast', 'mountain', 'lake', 'rain']);
export function cafeTheme(value) { return CAFE_THEMES.includes(value) ? value : 'zen'; }
export function cafeEntryMode({ route, navigation, saved, localeResume = false }) {
  if (route.view !== 'bear') return 'desktop';
  if ((localeResume || navigation === 'reload') && ['cafe', 'desktop'].includes(saved)) return saved;
  if (route.app) return 'desktop';
  if (!localeResume && navigation === 'navigate') return 'cafe';
  return saved === 'desktop' ? 'desktop' : 'cafe';
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
