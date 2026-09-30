// Native anchors remain useful without JavaScript. The side index joins the
// reader only after the introduction, and recedes when reading settles.
const nav = document.querySelector('[data-page-wayfinder]');
if (nav) {
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const header = document.querySelector('.header-wrapper');
  let offset = 0;
  let activeIndex = -2;
  let observer;
  let settleTimer;
  let settledY = window.scrollY;

  function setPresence(state) {
    if (nav.dataset.wayfinderState !== state) nav.dataset.wayfinderState = state;
  }

  function emphasize() {
    if (activeIndex < 0) return;
    clearTimeout(settleTimer);
    setPresence('reading');
    settleTimer = setTimeout(() => setPresence('quiet'), 1400);
  }

  function update() {
    let current = -1;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= offset + 48) current = index;
    });
    if (current === activeIndex) return;
    activeIndex = current;
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (current < 0) {
      clearTimeout(settleTimer);
      setPresence('hidden');
    } else emphasize();
  }

  function observe() {
    const headerHeight = header?.getBoundingClientRect().height || 0;
    nav.parentElement.style.setProperty('--wayfinder-header', `${headerHeight}px`);
    offset = headerHeight;
    const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    document.documentElement.style.setProperty('--wayfinder-offset', `${Math.max(20, offset + 20 - scrollPadding)}px`);
    // Watch the reading line, not a percentage of each (potentially very tall)
    // section. The side index never contributes to the anchor's top clearance.
    observer?.disconnect();
    if ('IntersectionObserver' in window) {
      const readingLine = Math.min(offset + 48, innerHeight - 1);
      observer = new IntersectionObserver(update, {
        rootMargin: `-${readingLine}px 0px -${Math.max(0, innerHeight - readingLine - 1)}px 0px`,
      });
      sections.filter(Boolean).forEach(section => observer.observe(section));
    }
    update();
  }

  const anchors = [...links, ...document.querySelectorAll('.hp-entry-actions a[href^="#"], .studio-hero__actions a[href^="#"]')];
  anchors.forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    // No prevented default: URL hashes, history, and no-script deep links work.
    requestAnimationFrame(() => {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      update();
    });
  }));
  window.addEventListener('hashchange', update);
  window.addEventListener('pageshow', update);
  // History restoration and an immediate jump can happen between observer
  // deliveries. Reconcile once at rest, without a per-frame scroll handler.
  window.addEventListener('scrollend', () => {
    update();
    if (Math.abs(window.scrollY - settledY) > 8) emphasize();
    settledY = window.scrollY;
  });
  // Intent refreshes contrast, not geometry. IntersectionObserver determines
  // whether reading has actually begun; a wheel gesture on the hero can't
  // reveal the index. No animation loop or per-frame scroll reads are needed.
  window.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) emphasize();
  }, { passive: true });
  window.addEventListener('touchmove', emphasize, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) emphasize();
  });
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(observe);
    if (header) resize.observe(header);
  }
  window.addEventListener('resize', observe, { passive: true });
  observe();
}
