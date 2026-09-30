// about-natural-experience.js — the About page decks: hero photo strip,
// workbench threads, product stage, and travel picker.
//
// Contracts kept deliberately small and observable:
//   * Selection is explicit: named choice strips replace prev/next arrows.
//   * Keyboard (ArrowLeft/Right, Home/End) and horizontal swipe still work,
//     scoped to each deck region and never while editing text.
//   * Autoplay is opt-in: every deck starts paused, with a visible localized
//     play/pause label. It pauses offscreen, on hover, on keyboard focus,
//     on hidden tabs and pagehide, and never restarts on its own after a
//     reduced-motion preference change.
//   * Product exploration expands in place with native <details>. Expansion
//     pauses rotation, keeps its height stable, and closes accessibly when
//     the selection changes.
//   * Everything here is progressive enhancement. Without JavaScript the
//     page renders as a static editorial list (see about-natural-experience.css).

const root = document.querySelector('[data-about-studio]');

function initAboutDecks() {
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Keyboard navigation is scoped to each deck, and never intercepts editing.
  function bindDeckKeyboard(carousel, count, getIndex, render) {
    carousel.addEventListener('keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.target.closest('input, textarea, select, [contenteditable]')) return;
      let next;
      if (event.key === 'ArrowLeft') next = getIndex() - 1;
      else if (event.key === 'ArrowRight') next = getIndex() + 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = count - 1;
      else return;
      event.preventDefault();
      render(next);
    });
  }

  function setSlideActive(slide, active, carousel) {
    if (!active && slide.contains(document.activeElement)) carousel.focus({ preventScroll: true });
    slide.inert = !active;
    slide.setAttribute('aria-hidden', active ? 'false' : 'true');
  }

  // Do not capture on pointerdown: a stationary press must remain a real click.
  // Claim only a horizontal drag, then suppress just that drag's generated click.
  function bindDeckSwipe(surface, change) {
    let pointer = null;
    let suppressClick = false;
    surface.addEventListener('pointerdown', function (event) {
      if (!event.isPrimary || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest('button, input, textarea, select, [contenteditable], [role="button"]')) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
      suppressClick = false;
    });
    surface.addEventListener('pointermove', function (event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      const distance = event.clientX - pointer.x;
      const vertical = event.clientY - pointer.y;
      if (!pointer.dragging && Math.abs(vertical) > 12 && Math.abs(vertical) > Math.abs(distance)) {
        pointer = null;
        return;
      }
      if (!pointer.dragging && Math.abs(distance) > 12 && Math.abs(distance) > Math.abs(vertical) * 1.2) {
        pointer.dragging = true;
        suppressClick = true;
        surface.setPointerCapture(event.pointerId);
      }
      if (pointer.dragging) event.preventDefault();
    });
    surface.addEventListener('pointerup', function (event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      const distance = event.clientX - pointer.x;
      const vertical = event.clientY - pointer.y;
      if (pointer.dragging && Math.abs(distance) > 48 && Math.abs(distance) > Math.abs(vertical) * 1.2) {
        change(distance < 0 ? 1 : -1);
      }
      pointer = null;
      if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
      window.setTimeout(function () { suppressClick = false; }, 0);
    });
    surface.addEventListener('pointercancel', function () { pointer = null; suppressClick = false; });
    surface.addEventListener('lostpointercapture', function () { pointer = null; });
    surface.addEventListener('dragstart', function (event) { event.preventDefault(); });
    surface.addEventListener('click', function (event) {
      if (!suppressClick || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  // Autoplay is opt-in (paused at load) and stays inside what a reader can
  // see and control. Expansion state pauses rotation as well.
  function bindAutoplay(region, status, advance, delay) {
    const toggle = region.querySelector('[data-autoplay-toggle]');
    const statusEl = region.querySelector('[role="status"]') || status;
    const playLabel = (toggle && toggle.dataset.labelPlay) || 'Play';
    const pauseLabel = (toggle && toggle.dataset.labelPause) || 'Pause';
    const reducedLabel = (toggle && toggle.dataset.labelReduced) || playLabel;
    let timer = null;
    let visible = false;
    let hovered = false;
    let userPaused = true;

    function stop() {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    }

    function sync() {
      stop();
      const keyboardFocus = region.matches(':focus-visible') || !!region.querySelector(':focus-visible');
      const expanded = region.dataset.expansion === 'open';
      const running = !reduceMotionQuery.matches && !userPaused && visible &&
        !document.hidden && !hovered && !keyboardFocus && !expanded;
      region.dataset.autoplay = running ? 'running' : 'paused';
      if (statusEl) statusEl.setAttribute('aria-live', running ? 'off' : 'polite');
      if (!toggle) return;
      toggle.disabled = reduceMotionQuery.matches;
      toggle.setAttribute('aria-pressed', userPaused || reduceMotionQuery.matches ? 'false' : 'true');
      // Visible label stays short; the reason for a disabled control lives in
      // its accessible name and tooltip.
      toggle.textContent = userPaused ? playLabel : pauseLabel;
      if (reduceMotionQuery.matches) {
        toggle.setAttribute('aria-label', reducedLabel);
        toggle.setAttribute('title', reducedLabel);
      } else {
        toggle.removeAttribute('aria-label');
        toggle.removeAttribute('title');
      }
      if (running) {
        const upcoming = region.querySelector('[data-hero-position="next"] img, [data-card-position="next"] img, [data-road-position="next"] img');
        if (upcoming) upcoming.loading = 'eager';
        timer = window.setTimeout(function () {
          advance();
          sync();
        }, delay);
      }
    }

    if (toggle) toggle.addEventListener('click', function () { userPaused = !userPaused; sync(); });
    // Touch creates compatibility mouseenter events that can stay "hovered"
    // until the next tap. Pointer events identify the actual input instead.
    region.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'touch') return;
      hovered = true;
      sync();
    });
    region.addEventListener('pointerleave', function (event) {
      if (event.pointerType === 'touch') return;
      hovered = false;
      sync();
    });
    region.addEventListener('focusin', sync);
    region.addEventListener('focusout', function () { window.setTimeout(sync, 0); });
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', sync);
    // A preference change may disable autoplay; it must never re-enable it.
    reduceMotionQuery.addEventListener('change', function (event) {
      if (event.matches) userPaused = true;
      sync();
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.12 });
      observer.observe(region);
    } else {
      visible = true;
    }
    sync();
    return sync;
  }

  function bindChoices(region, select) {
    const choices = Array.prototype.slice.call(region.querySelectorAll('[data-deck-choice]'));
    choices.forEach(function (choice, index) {
      choice.addEventListener('click', function () { select(index); });
    });
    return choices;
  }

  function markChoices(choices, index, fromUser) {
    choices.forEach(function (choice, choiceIndex) {
      choice.setAttribute('aria-pressed', choiceIndex === index ? 'true' : 'false');
    });
    const selected = choices[index];
    if (selected && fromUser && selected.scrollIntoView) {
      // Keep the selected chip visible inside its horizontal strip only.
      selected.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
    }
  }

  function bindExpansion(region, track, syncDeck) {
    const expandables = Array.prototype.slice.call(region.querySelectorAll('[data-product-expand]'));
    // View Transition callbacks run after the click that started them. A fast
    // selection change (click summary, then ArrowRight) must win over that
    // stale callback, so every transition carries a generation and the exact
    // state it wants to apply.
    let transitionGeneration = 0;
    let pendingTransition = null;

    function refit() {
      const open = track.querySelector('[data-product-expand][open]');
      const card = open && open.closest('[data-card]');
      track.style.minHeight = card ? `${card.offsetHeight + 48}px` : '';
    }

    function invalidateTransitions() {
      transitionGeneration += 1;
      if (pendingTransition && typeof pendingTransition.skipTransition === 'function') {
        try { pendingTransition.skipTransition(); } catch (error) { /* already finished */ }
      }
      pendingTransition = null;
    }

    function closeAll() {
      invalidateTransitions();
      let closed = false;
      expandables.forEach(function (details) {
        details.dataset.intendedOpen = 'false';
        if (!details.open) return;
        if (details.contains(document.activeElement)) region.focus({ preventScroll: true });
        details.open = false;
        closed = true;
      });
      region.dataset.expansion = track.querySelector('[data-product-expand][open]') ? 'open' : 'closed';
      refit();
      return closed;
    }

    expandables.forEach(function (details) {
      const summary = details.querySelector('summary');
      // Progressive-enhancement View Transition around the native toggle.
      if (summary) {
        summary.addEventListener('click', function (event) {
          const intended = details.dataset.intendedOpen === undefined
            ? details.open
            : details.dataset.intendedOpen === 'true';
          const desiredOpen = !intended;
          details.dataset.intendedOpen = String(desiredOpen);
          if (typeof document.startViewTransition !== 'function' || reduceMotionQuery.matches) return;
          event.preventDefault();
          invalidateTransitions();
          const generation = transitionGeneration;
          const transition = document.startViewTransition(function () {
            // Stale callback: a later selection or collapse already decided.
            if (generation !== transitionGeneration) return;
            details.open = desiredOpen;
          });
          pendingTransition = transition;
          if (transition.ready && transition.ready.catch) transition.ready.catch(function () {});
          if (transition.updateCallbackDone && transition.updateCallbackDone.catch) transition.updateCallbackDone.catch(function () {});
          if (transition.finished && transition.finished.catch) transition.finished.catch(function () {});
        });
      }
      details.addEventListener('toggle', function () {
        details.dataset.intendedOpen = String(details.open);
        const open = track.querySelector('[data-product-expand][open]');
        region.dataset.expansion = open ? 'open' : 'closed';
        refit();
        syncDeck();
      });
    });

    window.addEventListener('resize', refit);
    region.dataset.expansion = track.querySelector('[data-product-expand][open]') ? 'open' : 'closed';
    return { closeAll: closeAll, refit: refit };
  }

  // ── Hero photo strip ───────────────────────────────────────────────────────
  const heroCarousel = root.querySelector('[data-hero-carousel]');
  if (heroCarousel) {
    const heroSlides = Array.prototype.slice.call(heroCarousel.querySelectorAll('[data-hero-slide]'));
    const heroCurrent = heroCarousel.querySelector('[data-hero-current]');
    const heroStatus = heroCurrent.parentElement;
    let heroIndex = 0;

    function renderHero(next, fromUser) {
      heroIndex = (next + heroSlides.length) % heroSlides.length;
      heroSlides.forEach(function (slide, slideIndex) {
        slide.dataset.heroPosition = slideIndex === heroIndex ? 'active' : 'hidden';
        setSlideActive(slide, slideIndex === heroIndex, heroCarousel);
      });
      heroCurrent.textContent = String(heroIndex + 1).padStart(2, '0');
      markChoices(heroChoices, heroIndex, fromUser);
    }

    const syncHero = bindAutoplay(heroCarousel, heroStatus, function () { renderHero(heroIndex + 1); }, 4000);
    function selectHero(next, fromUser) { renderHero(next, fromUser); syncHero(); }
    const heroChoices = bindChoices(heroCarousel, function (index) { selectHero(index, true); });
    bindDeckKeyboard(heroCarousel, heroSlides.length, function () { return heroIndex; }, function (next) { selectHero(next, true); });
    bindDeckSwipe(heroCarousel.querySelector('.studio-hero__viewport'), function (direction) { selectHero(heroIndex + direction, true); });
    renderHero(0);
  }

  // ── Workbench threads and product stage ───────────────────────────────────
  root.querySelectorAll('[data-card-carousel]').forEach(function (carousel) {
    const cards = Array.prototype.slice.call(carousel.querySelectorAll('[data-card]'));
    const counter = carousel.querySelector('[data-card-current]');
    const track = carousel.querySelector('[data-card-track]');
    let deckIndex = 0;

    function renderDeck(next, fromUser) {
      deckIndex = (next + cards.length) % cards.length;
      cards.forEach(function (card, cardIndex) {
        const delta = cardIndex - deckIndex;
        let position = 'hidden';
        if (delta === 0) position = 'active';
        if (delta === -1) position = 'prev';
        if (delta === 1) position = 'next';
        if (delta === cards.length - 1) position = 'prev';
        if (delta === -(cards.length - 1)) position = 'next';
        card.dataset.cardPosition = position;
        setSlideActive(card, delta === 0, carousel);
      });
      counter.textContent = String(deckIndex + 1).padStart(2, '0');
      markChoices(deckChoices, deckIndex, fromUser);
    }

    const syncDeck = bindAutoplay(carousel, counter.parentElement, function () { renderDeck(deckIndex + 1); }, 5200);
    const expansion = bindExpansion(carousel, track, syncDeck);
    function selectDeck(next, fromUser) {
      // Changing selection closes any previous expansion accessibly.
      expansion.closeAll();
      renderDeck(next, fromUser);
      syncDeck();
    }
    const deckChoices = bindChoices(carousel, function (index) { selectDeck(index, true); });
    bindDeckKeyboard(carousel, cards.length, function () { return deckIndex; }, function (next) { selectDeck(next, true); });
    bindDeckSwipe(track, function (direction) { selectDeck(deckIndex + direction, true); });
    renderDeck(0);
  });

  // ── Travel photos with a named picker ─────────────────────────────────────
  const roadCarousel = root.querySelector('[data-road-carousel]');
  if (roadCarousel) {
    const slides = Array.prototype.slice.call(roadCarousel.querySelectorAll('[data-road-slide]'));
    const current = roadCarousel.querySelector('[data-road-current]');
    let index = 0;

    function show(next, fromUser) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) {
        const delta = slideIndex - index;
        let shift = delta;
        if (shift > slides.length / 2) shift -= slides.length;
        if (shift < -slides.length / 2) shift += slides.length;
        let position = 'hidden';
        if (shift === 0) position = 'active';
        if (shift === -1) position = 'prev';
        if (shift === 1) position = 'next';
        if (shift === -2) position = 'far-prev';
        if (shift === 2) position = 'far-next';
        slide.dataset.roadPosition = position;
        setSlideActive(slide, shift === 0, roadCarousel);
      });
      current.textContent = String(index + 1).padStart(2, '0');
      markChoices(roadChoices, index, fromUser);
    }

    const syncRoad = bindAutoplay(roadCarousel, roadCarousel.querySelector('.studio-road__counter'), function () { show(index + 1); }, 4800);
    function selectRoad(next, fromUser) { show(next, fromUser); syncRoad(); }
    const roadChoices = bindChoices(roadCarousel, function (choiceIndex) { selectRoad(choiceIndex, true); });
    bindDeckKeyboard(roadCarousel, slides.length, function () { return index; }, function (next) { selectRoad(next, true); });
    bindDeckSwipe(roadCarousel.querySelector('.studio-road__viewport'), function (direction) { selectRoad(index + direction, true); });
    show(0);
  }

  // Component-ready flag: set only once every deck initialized, so the
  // fallback stylesheet can tell a working deck from a failed module.
  root.setAttribute('data-deck-ready', 'true');
}

if (root) {
  try {
    initAboutDecks();
  } catch (error) {
    // If enhancement fails anywhere, drop the enhanced-layout flag so the
    // page falls back to the static editorial list instead of hiding content.
    document.documentElement.classList.remove('js');
    root.querySelectorAll('[inert], [aria-hidden="true"]').forEach(function (element) {
      element.inert = false;
      element.removeAttribute('aria-hidden');
    });
  }
}
