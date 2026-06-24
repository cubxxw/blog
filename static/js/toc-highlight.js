(function () {
  'use strict';

  function initTocHighlight() {
    // Sidebar only. The right-side reading-companion TOC (.toc-side__nav) is
    // handled by reading-companion.js — duplicating the observer here causes
    // class-toggle races and URL-hash churn (hash replaceState triggers visible
    // reflow on Chinese-encoded IDs, creating a flicker on every scroll tick).
    var sidebarLinks = Array.from(document.querySelectorAll('.toc-sidebar__nav #TableOfContents a'));
    var allTocLinks = sidebarLinks;

    if (!allTocLinks.length) return;

    // Replay the deep-link "landing" pulse on the destination. We can't rely
    // on :target here: this handler smooth-scrolls and updates the hash with
    // history.replaceState(), which does not re-match :target, so the pulse in
    // interaction-polish.css would never fire on a TOC click. Toggle a class
    // that runs the same wash + accent-bar animation instead. Force a reflow
    // between remove/add so rapid re-clicks on the same heading replay cleanly.
    function flashTarget(el) {
      el.classList.remove('anchor-target-flash');
      void el.offsetWidth; // reflow → restart the keyframes
      el.classList.add('anchor-target-flash');
      window.clearTimeout(el.__flashTimer);
      el.__flashTimer = window.setTimeout(function () {
        el.classList.remove('anchor-target-flash');
      }, 2100); // just past the 2s animation
    }

    // Enable smooth scrolling for TOC links and hash sync
    allTocLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        var target = document.getElementById(decodeURIComponent(href.slice(1)));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        // Update URL hash without jumping
        history.replaceState(null, '', href);
        // Highlight where the reader just landed (gated + neutralised in CSS).
        flashTarget(target);
      });
    });

    // Build map: heading id -> list of TOC links pointing to it
    var sections = [];
    allTocLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href.charAt(0) === '#') {
        var id = decodeURIComponent(href.slice(1));
        var heading = document.getElementById(id);
        if (heading) {
          sections.push({ heading: heading, id: id });
        }
      }
    });

    // Deduplicate by id
    var seen = {};
    sections = sections.filter(function (s) {
      if (seen[s.id]) return false;
      seen[s.id] = true;
      return true;
    });

    if (!sections.length) return;

    function getLinksForId(id) {
      return allTocLinks.filter(function (link) {
        return link.getAttribute('href') === '#' + id;
      });
    }

    function setActive(id) {
      allTocLinks.forEach(function (link) {
        link.classList.remove('toc-active', 'toc-sidebar-active');
      });
      if (!id) return;
      getLinksForId(id).forEach(function (link) {
        if (link.closest('.toc-sidebar__nav')) {
          link.classList.add('toc-sidebar-active');
        } else {
          link.classList.add('toc-active');
        }
      });
    }

    // Use IntersectionObserver to detect which heading is in view
    var activeId = null;
    var headingIds = sections.map(function (s) { return s.id; });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var id = entry.target.id;
        if (entry.isIntersecting) {
          // Pick the topmost visible heading
          var visibleIds = headingIds.filter(function (hid) {
            var el = document.getElementById(hid);
            if (!el) return false;
            var rect = el.getBoundingClientRect();
            return rect.top >= 0 && rect.top < window.innerHeight;
          });
          if (visibleIds.length) {
            activeId = visibleIds[0];
            setActive(activeId);
          }
        } else {
          // If scrolling past, fallback to last heading above viewport
          if (id === activeId) {
            var scrollY = window.scrollY || window.pageYOffset;
            var best = null;
            sections.forEach(function (s) {
              var top = s.heading.getBoundingClientRect().top + scrollY;
              if (scrollY + 80 >= top) {
                best = s.id;
              }
            });
            activeId = best;
            setActive(best);
          }
        }
      });
    }, {
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0
    });

    sections.forEach(function (s) {
      observer.observe(s.heading);
    });
  }

  // Add scroll-behavior smooth for the document
  document.documentElement.style.scrollBehavior = 'smooth';

  if (document.readyState === 'complete') {
    initTocHighlight();
  } else {
    window.addEventListener('load', initTocHighlight);
  }
})();
