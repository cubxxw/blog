/* One keyboard contract for the article sidebar and compact tools sheet. */
(function () {
  'use strict';
  window.ArticleTabs = {
    mount: function (options) {
      var tabs = Array.prototype.slice.call(options.tabs);
      var panels = Array.prototype.slice.call(options.panels);
      if (!tabs.length) return;

      function select(tab, focus) {
        tabs.forEach(function (item) {
          var selected = item === tab;
          item.tabIndex = selected ? 0 : -1;
          item.setAttribute('aria-selected', String(selected));
          item.classList.toggle(options.tabClass, selected);
        });
        panels.forEach(function (panel) {
          var selected = panel.id === options.panelPrefix + tab.dataset.tab;
          panel.hidden = !selected;
          if (options.panelClass) panel.classList.toggle(options.panelClass, selected);
        });
        if (focus) tab.focus({preventScroll: true});
      }

      tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () {select(tab, false);});
        tab.addEventListener('keydown', function (event) {
          var next;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault();
          select(tabs[next], true);
        });
      });
      select(tabs.find(function (tab) {return tab.getAttribute('aria-selected') === 'true';}) || tabs[0], false);
    }
  };
})();
