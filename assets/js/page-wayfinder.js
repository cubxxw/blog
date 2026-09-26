// Native anchors remain useful without JavaScript. Enhancement only tracks
// the reading position and keeps keyboard focus with the chosen destination.
const nav = document.querySelector('[data-page-wayfinder]');
if (nav) {
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const header = document.querySelector('.header-wrapper');
  let offset = 0;
  let activeIndex = -2;
  let queued = false;

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
  }

  function observe() {
    const headerHeight = header?.getBoundingClientRect().height || 0;
    nav.style.setProperty('--wayfinder-header', `${headerHeight}px`);
    offset = headerHeight + nav.getBoundingClientRect().height;
    const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    document.documentElement.style.setProperty('--wayfinder-offset', `${Math.max(20, offset + 20 - scrollPadding)}px`);
    update();
  }

  // Four geometry reads only while scrolling; a tall section need not fully
  // intersect the viewport for its heading to cross the reading position.
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });

  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const target = sections[index];
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
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(observe);
    resize.observe(nav);
    if (header) resize.observe(header);
  } else window.addEventListener('resize', observe, { passive: true });
  observe();
}
