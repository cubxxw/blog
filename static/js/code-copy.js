/* Code-copy confirmation belongs to the completed clipboard operation. */
(function () {
  'use strict';
  var labels = document.currentScript ? document.currentScript.dataset : {};
  var copyLabel = labels.copy || 'Copy';
  var copiedLabel = labels.copied || 'Copied';
  var pendingLabel = labels.pending || 'Copying…';
  var failedLabel = labels.failed || 'Code selected. Press Ctrl/Cmd + C to copy.';

  document.querySelectorAll('pre > code').forEach(function (codeblock, index) {
    var pre = codeblock.parentNode;
    var container = pre.parentNode;
    var button = document.createElement('button');
    var status = document.createElement('span');
    var resetTimer = 0;
    button.type = 'button';
    button.classList.add('copy-code');
    button.textContent = copyLabel;
    button.setAttribute('aria-live', 'polite');
    button.setAttribute('aria-describedby', 'code-copy-status-' + index);
    status.id = 'code-copy-status-' + index;
    status.classList.add('code-copy-status');
    status.setAttribute('role', 'status');

    function selectCode() {
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(codeblock);
      selection.removeAllRanges();
      selection.addRange(range);
      return selection;
    }

    function legacyCopy() {
      var selection = selectCode();
      var copied = false;
      try { copied = document.execCommand('copy') === true; } catch (_) {}
      if (copied) selection.removeAllRanges();
      return copied;
    }

    button.addEventListener('click', async function () {
      if (button.disabled) return;
      window.clearTimeout(resetTimer);
      status.textContent = '';
      button.classList.remove('is-copied');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = pendingLabel;
      var copied = false;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(codeblock.textContent);
          copied = true;
        } else copied = legacyCopy();
      } catch (_) {
        copied = legacyCopy();
      }
      button.disabled = false;
      button.removeAttribute('aria-busy');
      if (copied) {
        button.textContent = copiedLabel;
        button.classList.add('is-copied');
        resetTimer = window.setTimeout(function () {
          button.textContent = copyLabel;
          button.classList.remove('is-copied');
        }, 2000);
      } else {
        button.textContent = copyLabel;
        status.textContent = failedLabel;
      }
    });

    if (container.classList.contains('highlight')) {
      container.appendChild(button);
      container.appendChild(status);
    } else if (container.parentNode && container.parentNode.firstChild === container) {
      // Hugo's line-number cell has a separate code cell; copy only that cell.
    } else {
      var table = pre.closest ? pre.closest('table') : null;
      var host = table || pre;
      host.appendChild(button);
      host.appendChild(status);
    }
  });
})();
