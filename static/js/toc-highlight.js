(function () {
  'use strict';

  function initTocHighlight() {
    // Collect all TOC links from both sidebar (.toc-sidebar__nav) and reading-companion (.toc-side__nav)
    var sidebarLinks = Array.from(document.querySelectorAll('.toc-sidebar__nav #TableOfContents a'));
    var companionLinks = Array.from(document.querySelectorAll('.toc-side__nav a'));
    var allTocLinks = sidebarLinks.concat(companionLinks);

    if (!allTocLinks.length) return;

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
      // Sync URL hash silently
      if (history.replaceState) {
        history.replaceState(null, '', '#' + id);
      }
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
