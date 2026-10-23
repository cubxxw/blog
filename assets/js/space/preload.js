// Fetch the chosen renderer while the HTML is still being parsed. Module
// preloads do not evaluate scene code or create a second WebGL context.
(() => {
  if (window.parent !== window) return;
  const source = document.querySelector('[data-space-world-module]');
  if (!source) return;
  const config = JSON.parse(source.textContent);
  let theme = 'jiangnan';
  try {
    const saved = localStorage.getItem('space:cafe:theme:v2');
    if (['jiangnan', 'zen', 'garden', 'coast', 'mountain', 'lake', 'rain'].includes(saved)) theme = saved;
  } catch {}
  for (const href of [config.workspace, config.module, config.vendor, theme === 'jiangnan' ? config.jiangnan : config.spatial]) {
    if (!href) continue;
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = href;
    document.head.append(link);
  }
})();
