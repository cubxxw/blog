/**
 * ui-copy.mjs — the bilingual dictionary for FIXED button copy. Scenario
 * content and factual notes live in the spec data (data/interactive/*.json);
 * these chrome strings are maintained with the components in both locales.
 *
 * Visible labels are kept short and non-wrapping (the SSR toolbar slot in
 * layouts/partials/interactive/agent-loop.html mirrors the visible strings);
 * the `*Aria` entries carry the full accessible names.
 */
export const UI_COPY = {
  zh: {
    reset: '重置',
    resetAria: '重置',
    prev: '上一步',
    prevAria: '上一步',
    next: '下一步',
    nextAria: '下一步',
    play: '播放',
    playAria: '播放',
    pause: '暂停',
    pauseAria: '暂停',
  },
  en: {
    reset: 'Reset',
    resetAria: 'Reset',
    prev: 'Prev',
    prevAria: 'Previous step',
    next: 'Next',
    nextAria: 'Next step',
    play: 'Play',
    playAria: 'Play',
    pause: 'Pause',
    pauseAria: 'Pause',
  },
};

/** Button label lookup with a safe fallback. */
export function uiLabel(lang, key) {
  const table = UI_COPY[lang] || UI_COPY.en;
  return table[key] || UI_COPY.en[key] || key;
}
