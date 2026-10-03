// About albums: the browser owns touch scrolling and snapping. Enhancement adds
// desktop dragging, named choices and scoped keys without a playback controller.
const root = document.querySelector('[data-about-studio]');
const cleanup = [];

function initRail(region, viewport, itemSelector, positionName, counterSelector) {
  const items = Array.from(viewport.querySelectorAll(itemSelector));
  if (!items.length) return;
  const counter = region.querySelector(counterSelector);
  const choices = Array.from(region.querySelectorAll('[data-deck-choice]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const on = (element, type, listener, options = {}) =>
    element.addEventListener(type, listener, { ...options, signal: controller.signal });
  let index = 0;
  let destination = null;
  let frame = 0;
  let pointer = null;
  let suppressClick = false;

  function offset(item) {
    const max = viewport.scrollWidth - viewport.clientWidth;
    const left = item.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft - viewport.clientLeft;
    return Math.max(0, Math.min(max, left));
  }

  function mark(next) {
    index = next;
    items.forEach((item, i) => {
      item.dataset[positionName] = i === index ? 'active' : 'other';
      item.removeAttribute('inert');
      item.removeAttribute('aria-hidden');
    });
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    choices.forEach((choice, i) => choice.setAttribute('aria-pressed', String(i === index)));
  }

  function nearest() {
    const distances = items.map(item => Math.abs(offset(item) - viewport.scrollLeft));
    const minimum = Math.min(...distances);
    // Several narrow photos fit at the end. Preserve explicit selection when
    // offsets coincide; ordinary browsing to that edge announces the last item.
    if (distances[index] <= minimum + 1) return index;
    if (viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 2) return items.length - 1;
    return distances.indexOf(minimum);
  }

  function sync() {
    frame = 0;
    if (pointer?.dragging) return;
    if (destination !== null) {
      const selected = destination;
      if (Math.abs(offset(items[selected]) - viewport.scrollLeft) < 2) destination = null;
      mark(selected);
    } else mark(nearest());
  }
  function queueSync() { if (!frame) frame = requestAnimationFrame(sync); }

  function move(next, explicit = false) {
    const selected = (next + items.length) % items.length;
    if (explicit && selected !== index) {
      items.forEach((item, i) => {
        if (i === selected) return;
        const details = item.querySelector('[data-product-expand]');
        if (!details?.open) return;
        if (details.contains(document.activeElement)) region.focus({ preventScroll: true });
        details.open = false;
      });
    }
    if (explicit && items.some(item => item.contains(document.activeElement)) &&
        !items[selected].contains(document.activeElement)) region.focus({ preventScroll: true });
    destination = selected;
    mark(selected);
    viewport.scrollTo({ left: offset(items[selected]), behavior: reduced.matches ? 'instant' : 'smooth' });
    // Keep a named choice visible inside its strip without scrolling the page.
    const choice = choices[selected];
    if (choice) {
      const strip = choice.parentElement;
      const left = choice.offsetLeft - strip.offsetLeft;
      if (left < strip.scrollLeft) strip.scrollTo({ left, behavior: 'instant' });
      else if (left + choice.offsetWidth > strip.scrollLeft + strip.clientWidth)
        strip.scrollTo({ left: left + choice.offsetWidth - strip.clientWidth, behavior: 'instant' });
    }
  }

  choices.forEach((choice, i) => on(choice, 'click', () => move(i, true)));
  on(region, 'keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      event.target.closest('input,textarea,select,[contenteditable]')) return;
    const keys = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: items.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    move(keys[event.key], true);
  });
  on(region, 'focusin', event => {
    const focused = items.findIndex(item => item.contains(event.target));
    if (focused >= 0) move(focused);
  });
  on(viewport, 'scroll', queueSync, { passive: true });
  on(viewport, 'scrollend', () => { destination = null; queueSync(); });
  on(viewport, 'wheel', () => { destination = null; }, { passive: true });

  // Touch/pen are untouched. Mouse capture begins only after a deliberate
  // horizontal drag, so stationary summary/link presses remain native clicks.
  on(viewport, 'pointerdown', event => {
    suppressClick = false;
    destination = null;
    if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0 ||
      event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest('button,input,textarea,select,[contenteditable]')) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, dragging: false };
  });
  on(viewport, 'pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.dragging && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
    if (!pointer.dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      pointer.dragging = true;
      suppressClick = true;
      viewport.style.scrollSnapType = 'none';
      viewport.style.scrollBehavior = 'auto';
      viewport.style.userSelect = 'none';
      window.getSelection()?.removeAllRanges();
      viewport.setPointerCapture(event.pointerId);
    }
    if (!pointer.dragging) return;
    event.preventDefault();
    viewport.scrollLeft = pointer.left - dx;
  });
  function finishDrag(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dragging = pointer.dragging;
    pointer = null;
    if (dragging) {
      const selected = nearest();
      viewport.style.removeProperty('scroll-snap-type');
      viewport.style.removeProperty('scroll-behavior');
      viewport.style.removeProperty('user-select');
      move(selected);
    }
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  }
  on(window, 'pointerup', finishDrag);
  on(viewport, 'pointercancel', finishDrag);
  on(viewport, 'lostpointercapture', finishDrag);
  on(viewport, 'dragstart', event => event.preventDefault());
  on(viewport, 'click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, { capture: true });
  on(reduced, 'change', () => {
    if (reduced.matches) viewport.scrollTo({ left: offset(items[index]), behavior: 'instant' });
  });
  const resize = new ResizeObserver(queueSync);
  resize.observe(viewport);
  cleanup.push(() => { controller.abort(); resize.disconnect(); cancelAnimationFrame(frame); });
  mark(0);
}

if (root) {
  try {
    const hero = root.querySelector('[data-hero-carousel]');
    if (hero) initRail(hero, hero.querySelector('.studio-hero__viewport'), '[data-hero-slide]', 'heroPosition', '[data-hero-current]');
    root.querySelectorAll('[data-card-carousel]').forEach(region =>
      initRail(region, region.querySelector('[data-card-track]'), '[data-card]', 'cardPosition', '[data-card-current]'));
    const road = root.querySelector('[data-road-carousel]');
    if (road) initRail(road, road.querySelector('.studio-road__viewport'), '[data-road-slide]', 'roadPosition', '[data-road-current]');
    root.dataset.deckReady = 'true';
  } catch (error) {
    cleanup.forEach(dispose => dispose());
    document.documentElement.classList.remove('js');
    root.removeAttribute('data-deck-ready');
    root.querySelectorAll('[inert],[aria-hidden="true"]').forEach(element => {
      element.removeAttribute('inert');
      element.removeAttribute('aria-hidden');
    });
  }
}
