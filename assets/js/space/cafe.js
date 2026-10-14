import { cafeTheme, cafeEntryMode, createSceneSelection } from './cafe.mjs';

export function mountCafe({ root, route, navigation, localeResume, execute, onEnter, beforeVisit, focusDesktop }) {
  const surface = root.querySelector('[data-space-cafe]');
  const dialog = root.querySelector('[data-cafe-dialog]');
  const themes = JSON.parse(root.querySelector('[data-cafe-catalog]').textContent).themes;
  const zh = JSON.parse(root.querySelector('[data-space-catalog]').textContent).language === 'zh';
  const t = (cn, en) => zh ? cn : en;
  const image = root.querySelector('[data-cafe-image]');
  const choices = root.querySelector('[data-cafe-choices]');
  const status = root.querySelector('[data-cafe-status]');
  const pickerStatus = root.querySelector('[data-cafe-picker-status]');
  const desktop = [root.querySelector('[data-space-windows]'), root.querySelector('.space-bottom'), root.querySelector('.space-menu')];
  let theme = 'zen', savedMode, mode, transition, revision = 0, trigger, outside = false;
  try { theme = cafeTheme(localStorage.getItem('space:cafe:theme:v1')); } catch {}
  try { savedMode = sessionStorage.getItem('space:cafe:mode'); } catch {}
  const url = new URL(location.href);
  if (localeResume && url.searchParams.has('space-cafe')) savedMode = url.searchParams.get('space-cafe');
  if (url.searchParams.has('space-cafe')) { url.searchParams.delete('space-cafe'); history.replaceState(null, '', url.pathname + url.search + url.hash); }
  function asset(scene) { return matchMedia('(max-width: 640px)').matches ? scene.small : scene.image; }
  function announce(message) { status.textContent = message; pickerStatus.textContent = message; }
  function setMode(value, focus = false) {
    revision++; transition?.cancel(); transition = null; delete root.dataset.cafeTransition;
    mode = value; root.dataset.cafeMode = value;
    surface.inert = value !== 'cafe';
    desktop.forEach(el => { el.inert = value === 'cafe'; });
    try { sessionStorage.setItem('space:cafe:mode', value); } catch {}
    if (focus) (value === 'cafe' ? surface.querySelector('[data-cafe-enter]') : focusDesktop())?.focus({ preventScroll: true });
  }
  function commit(id, loaded) {
    theme = id; const scene = themes.find(scene => scene.id === id);
    image.src = loaded?.src || asset(scene); image.dataset.theme = id;
    root.dataset.cafeTheme = id;
    root.querySelector('[data-cafe-name]').textContent = scene.name;
    root.querySelector('[data-cafe-note]').textContent = scene.note;
    choices.querySelectorAll('[data-cafe-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cafeTheme === id)));
    try { localStorage.setItem('space:cafe:theme:v1', id); } catch {}
  }
  const selection = createSceneSelection({
    load: id => new Promise((resolve, reject) => {
      const scene = themes.find(scene => scene.id === id);
      if (!scene) { reject(new Error('unknown scene')); return; }
      const preload = new Image(); preload.decoding = 'async';
      preload.onload = () => resolve(preload); preload.onerror = () => reject(new Error('scene unavailable'));
      preload.src = asset(scene);
    }), commit
  });
  commit(theme);
  image.addEventListener('error', () => announce(t('风景暂时未能载入，你仍然可以打开电脑。', 'The view could not load. Your computer is still available.')));
  mode = cafeEntryMode({ route, navigation, saved: savedMode, localeResume }); setMode(mode);
  function closePicker() { dialog.close(); }
  dialog.addEventListener('close', () => {
    const fallback = mode === 'cafe' ? surface.querySelector('[data-cafe-picker]') : root.querySelector('[data-space-menu-trigger]');
    const target = trigger?.isConnected && !trigger.closest('[inert]') && trigger.getClientRects().length && getComputedStyle(trigger).visibility !== 'hidden' ? trigger : fallback;
    target?.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const b = dialog.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) closePicker(); } });
  function openPicker(source) {
    if (dialog.open) return;
    trigger = source;
    if (!choices.children.length) {
      for (const scene of themes) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.cafeTheme = scene.id;
        const thumb = document.createElement('img'); thumb.src = scene.thumb; thumb.alt = ''; thumb.width = 480; thumb.height = 270; thumb.loading = 'lazy';
        const name = document.createElement('strong'); name.textContent = scene.name;
        const note = document.createElement('span'); note.textContent = scene.note;
        button.append(thumb, name, note); choices.append(button);
      }
    }
    choices.querySelectorAll('[data-cafe-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cafeTheme === theme)));
    announce(''); dialog.showModal();
    choices.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }
  async function enterAnimated() {
    if (mode !== 'cafe' || transition) return;
    if (outside) toggleOutside();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) { enterDesktop(true); return; }
    const ownRevision = ++revision;
    root.dataset.cafeTransition = 'entering';
    surface.inert = true;
    transition = root.querySelector('.space-cafe__scene').animate([
      { transform: 'scale(1)', opacity: 1 }, { transform: 'scale(3.6)', opacity: 0 }
    ], { duration: 720, easing: 'cubic-bezier(.4,0,.15,1)', fill: 'forwards' });
    try { await transition.finished; } catch { return; }
    if (ownRevision === revision) enterDesktop(true);
  }
  function enterDesktop(focus = false) {
    if (dialog.open) closePicker();
    if (mode !== 'desktop' || transition) { setMode('desktop', false); onEnter(); }
    if (focus) focusDesktop()?.focus({ preventScroll: true });
  }
  function visit() {
    beforeVisit(); if (dialog.open) closePicker();
    if (outside) toggleOutside();
    setMode('cafe', true);
  }
  function toggleOutside() {
    outside = !outside; root.dataset.cafeView = outside ? 'outside' : 'seat';
    root.querySelector('[data-cafe-outside]').setAttribute('aria-pressed', String(outside));
    root.querySelector('[data-cafe-outside]').firstChild.textContent = outside ? t('回到座位 ', 'Back to my seat ') : t('看看窗外 ', 'Look outside ');
  }
  root.addEventListener('click', async event => {
    const target = event.target;
    if (target.closest('[data-cafe-enter]')) enterAnimated();
    if (target.closest('[data-cafe-visit]')) visit();
    if (target.closest('[data-cafe-picker]')) openPicker(target.closest('[data-cafe-picker]'));
    if (target.closest('[data-cafe-picker-close]')) closePicker();
    if (target.closest('[data-cafe-language]')) execute('language', { value: zh ? 'en' : 'zh' });
    if (target.closest('button[data-cafe-outside]')) toggleOutside();
    if (target.closest('[data-cafe-guide]')) { enterDesktop(); execute('ask', { question: t('带我逛逛这个空间，先推荐一个值得读的内容。', 'Show me around this space and suggest something worth reading.') }); }
    const choice = target.closest('button[data-cafe-theme]');
    if (choice) {
      const id = choice.dataset.cafeTheme;
      if (id === theme) { selection.cancel(); announce(''); return; }
      announce(t('正在推开另一扇窗…', 'Opening another window…'));
      const result = await selection.select(id);
      if (result === 'failed') announce(t('这处风景暂时未能载入，请再试一次。', 'This view could not load. Please try again.'));
      if (result === 'selected') announce(t(`已坐进${themes.find(scene => scene.id === id).name}。`, `Now in ${themes.find(scene => scene.id === id).name}.`));
    }
  });
  return {
    get active() { return mode === 'cafe'; },
    get modalOpen() { return dialog.open; },
    get mode() { return mode; },
    enterDesktop,
    escape() { if (dialog.open) return; if (outside) toggleOutside(); },
    openPicker, visit
  };
}
