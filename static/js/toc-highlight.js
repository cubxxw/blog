(function () {
  'use strict';

  function initTocHighlight() {
    var tocLinks = document.querySelectorAll('.toc-side__nav a');
    if (!tocLinks.length) return;

    // 构建 标题元素 → TOC 链接 的映射
    var sections = [];
    tocLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href.charAt(0) === '#') {
        var heading = document.getElementById(href.slice(1));
        if (heading) {
          sections.push({ heading: heading, link: link });
        }
      }
    });

    if (!sections.length) return;

    var currentActive = null;
    var OFFSET = 100; // 距离顶部多少像素时触发高亮

    function updateActive() {
      var scrollY = window.scrollY || window.pageYOffset;
      var activeSection = null;

      // 从后往前找最后一个已滚过的标题
      for (var i = sections.length - 1; i >= 0; i--) {
        var headingTop =
          sections[i].heading.getBoundingClientRect().top + scrollY;
        if (scrollY >= headingTop - OFFSET) {
          activeSection = sections[i];
          break;
        }
      }

      if (activeSection !== currentActive) {
        if (currentActive) {
          currentActive.link.classList.remove('toc-active');
        }
        if (activeSection) {
          activeSection.link.classList.add('toc-active');
        }
        currentActive = activeSection;
      }
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive(); // 页面加载时立即执行一次
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTocHighlight);
  } else {
    initTocHighlight();
  }
})();
