(function () {
  'use strict';

  var language = ((document.documentElement.getAttribute('lang') || 'en').toLowerCase().indexOf('zh') === 0) ? 'zh' : 'en';
  var messages = {
    zh: {
      notFound: 'AI 函数未找到，请确认 netlify dev 正在运行',
      nonJsonPrefix: 'AI 服务返回非 JSON 响应',
      requestFailed: '请求失败',
      noAnswer: '（未收到回复）',
      timeout: '请求超时，请稍后重试。',
      genericError: '请求失败，请稍后重试。',
      retry: '↺ 重试',
      sourcesLabel: '相关阅读',
      greeting: '文章已就绪。选择一个阅读角度，或继续追问你在意的细节。',
      followupLabel: '继续追问',
      topicTemplate: function (h) { return '「' + h + '」这部分能展开讲讲吗？'; },
      followups: [
        '能再具体展开一下吗？',
        '有没有相反的观点或例外？',
        '在现实里怎么应用这个？',
        '能举一个具体例子吗？',
        '这个观点的前提成立吗？',
        '和主流看法有什么不同？',
        '如果反过来想会怎样？',
        '最关键的一点是什么？'
      ]
    },
    en: {
      notFound: 'AI function not found. Make sure netlify dev is running.',
      nonJsonPrefix: 'AI service returned a non-JSON response',
      requestFailed: 'Request failed',
      noAnswer: '(No answer received)',
      timeout: 'Request timed out. Please try again.',
      genericError: 'Request failed. Please try again.',
      retry: '↺ Retry',
      sourcesLabel: 'Related reading',
      greeting: "The article is ready. Choose a reading lens or ask about a detail that matters to you.",
      followupLabel: 'Keep asking',
      topicTemplate: function (h) { return 'Can you expand on the "' + h + '" part?'; },
      followups: [
        'Can you expand on that?',
        'Any counter-arguments or exceptions?',
        'How do I apply this in practice?',
        'Can you give a concrete example?',
        'Do its assumptions actually hold?',
        'How does this differ from the mainstream view?',
        'What if we flip the premise?',
        "What's the single most important takeaway?"
      ]
    }
  };

  function t(key) {
    return (messages[language] && messages[language][key]) || messages.en[key] || key;
  }

  // ─── 1. Tab Switching ──────────────────────────────────────────────────────
  function initTabs() {
    var tabs = document.querySelectorAll('.reading-companion .rc-tab');
    var panels = document.querySelectorAll('.reading-companion .rc-panel');
    if (!tabs.length) return;

    if (window.ArticleTabs) window.ArticleTabs.mount({
      tabs: tabs, panels: panels, tabClass: 'rc-tab--active',
      panelClass: 'rc-panel--active', panelPrefix: 'rc-panel-'
    });
  }

  // ─── 2. TOC Scroll Highlighting ───────────────────────────────────────────
  function initTocHighlight() {
    var nav = document.querySelector('.toc-side__nav');
    var tocLinks = nav ? nav.querySelectorAll('a') : [];
    if (!tocLinks.length) return;

    var sections = [];
    tocLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var raw = href.slice(1);
      var heading = null;
      try {
        heading = document.getElementById(decodeURIComponent(raw));
      } catch (e) {
        heading = null;
      }
      if (!heading) heading = document.getElementById(raw);
      if (heading) sections.push({ heading: heading, link: link });
    });
    if (!sections.length) return;

    // ── Progressive disclosure: group the flat TOC into sections ──
    // The outline is a single flat <ul>; H2/H3/H4 are siblings, not nested.
    // We treat the shallowest heading level present as the "section anchor"
    // (always visible) and gather each anchor's deeper headings as its
    // collapsible children. Only the section the reader is currently in stays
    // expanded — the rest recede to their anchors, so the panel reads as a
    // short map instead of a wall of every subheading at once.
    var items = Array.prototype.slice.call(nav.querySelectorAll('.toc-item'));
    var groupOf = null; // Map: .toc-item li -> group index
    var groups = [];    // [{ anchor: li|null, subs: [li,…] }]
    if (items.length) {
      groupOf = (typeof Map === 'function') ? new Map() : null;
      var levelOf = function (li) {
        var a = li.querySelector('a');
        return a ? (parseInt(a.getAttribute('data-level'), 10) || 2) : 2;
      };
      var topLevel = items.reduce(function (min, li) {
        return Math.min(min, levelOf(li));
      }, 99);
      var cursor = -1;
      items.forEach(function (li) {
        if (levelOf(li) <= topLevel) {
          cursor = groups.length;
          groups.push({ anchor: li, subs: [] });
        } else {
          if (cursor === -1) { cursor = groups.length; groups.push({ anchor: null, subs: [] }); }
          groups[cursor].subs.push(li);
          li.classList.add('toc-item--sub');
        }
        if (groupOf) groupOf.set(li, cursor);
      });
      // Only worth collapsing when at least one section actually has children.
      var hasNesting = groups.some(function (g) { return g.subs.length; });
      if (hasNesting) nav.classList.add('toc-side__nav--grouped');
      else { groups = []; groupOf = null; }
    }

    var openGroup = -1;
    function setOpenGroup(gi) {
      if (!groups.length || gi === openGroup) return;
      openGroup = gi;
      for (var i = 0; i < groups.length; i++) {
        var open = (i === gi);
        var g = groups[i];
        if (g.anchor) g.anchor.classList.toggle('toc-section-current', open);
        for (var j = 0; j < g.subs.length; j++) {
          g.subs[j].classList.toggle('toc-collapsed', !open);
        }
      }
    }

    var currentActive = null;
    var OFFSET = 140;
    var rafPending = false;

    // Scroll the active TOC item into view within the sticky panel container
    function scrollTocItemIntoView(link) {
      // The scrollable container is .editorial-tools-panel (overflow-y: auto)
      var container = link.closest('.editorial-tools-panel') || link.closest('.toc-side__nav');
      if (!container) return;
      var containerRect = container.getBoundingClientRect();
      var linkRect = link.getBoundingClientRect();
      var padding = 40;
      if (linkRect.top < containerRect.top + padding || linkRect.bottom > containerRect.bottom - padding) {
        var targetScrollTop = container.scrollTop + (linkRect.top - containerRect.top) - (containerRect.height / 2) + (linkRect.height / 2);
        container.scrollTo({ top: targetScrollTop, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    }

    function updateActive() {
      rafPending = false;
      var scrollY = window.scrollY || window.pageYOffset;
      var activeSection = null;
      for (var i = sections.length - 1; i >= 0; i--) {
        var top = sections[i].heading.getBoundingClientRect().top + scrollY;
        if (scrollY >= top - OFFSET) {
          activeSection = sections[i];
          break;
        }
      }
      // Reveal the section the reader is in (falls back to the first group
      // while still above the first heading), independent of whether the
      // active *link* changed — keeps the open section correct on load.
      if (groups.length) {
        var gi = 0;
        if (activeSection) {
          var li = activeSection.link.closest('.toc-item');
          if (li && groupOf && groupOf.has(li)) gi = groupOf.get(li);
        }
        setOpenGroup(gi);
      }
      if (activeSection === currentActive) return;
      if (currentActive) currentActive.link.classList.remove('toc-active');
      if (activeSection) {
        activeSection.link.classList.add('toc-active');
        scrollTocItemIntoView(activeSection.link);
      }
      currentActive = activeSection;
    }

    function onScroll() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(updateActive);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    updateActive();
  }

  // ─── 3. Article Content Extractor ─────────────────────────────────────────
  var ARTICLE_MAX = 5500;

  function getArticleText() {
    var el = document.querySelector('.post-content');
    if (!el) return '';
    var clone = el.cloneNode(true);
    ['script', 'style', 'nav', 'aside', '.reading-companion'].forEach(function (sel) {
      clone.querySelectorAll(sel).forEach(function (n) { n.remove(); });
    });
    var text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length <= ARTICLE_MAX) return text;
    // For long articles, keep the opening AND the ending rather than just the
    // head — many pieces put their thesis up front and the payoff at the close,
    // so a head-only slice leaves the AI blind to the conclusion.
    var head = Math.round(ARTICLE_MAX * 0.7);
    var tail = ARTICLE_MAX - head;
    return text.slice(0, head) + ' […] ' + text.slice(text.length - tail);
  }

  function getArticleTitle() {
    var el = document.querySelector('.post-single .post-title, h1.post-title');
    return el ? el.innerText.trim() : document.title;
  }

  // ─── 4. Plain conversational paragraphs, escaped before rendering ─────────
  function parseMarkdown(text) {
    function escapeHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    var inCode = false;
    var plain = String(text || '').replace(/\r\n?/g, '\n').split('\n').map(function (line) {
      if (/^\s*(?:```|~~~)/.test(line)) { inCode = !inCode; return ''; }
      if (inCode) return line;
      return line
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^\s{0,3}>\s?/, '')
        .replace(/^\s{0,3}(?:[-*+]\s+|\d{1,3}[.)]\s+)/, '')
        .replace(/(^|[^A-Za-z0-9_*])\*\*([^*\n]+)\*\*(?![A-Za-z0-9_*])/g, '$1$2')
        .replace(/(^|[^A-Za-z0-9_])__([^_\n]+)__(?![A-Za-z0-9_])/g, '$1$2')
        .replace(/(^|[^A-Za-z0-9_*])\*(\S(?:[^*\n]*?\S)?)\*(?![A-Za-z0-9_*])/g, '$1$2')
        .replace(/`([^`\n]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '$1 ($2)');
    }).join('\n');
    return plain.split(/\n\s*\n/).filter(function (paragraph) { return paragraph.trim(); }).map(function (paragraph) {
      return '<p>' + escapeHtml(paragraph.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  // ─── 5. AI Panel ──────────────────────────────────────────────────────────
  function initAiPanel() {
    var panel = document.querySelector('[data-article-chat]');
    if (panel && window.ArticleChat) window.ArticleChat.init(panel, { prefix: 'rc', render: parseMarkdown });
  }

  // ─── 6. Bootstrap ─────────────────────────────────────────────────────────
  function init() {
    if (!document.querySelector('.reading-companion')) return;
    initTabs();
    initTocHighlight();
    initAiPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
