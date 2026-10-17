/* Code-copy confirmation belongs to the completed clipboard operation. */
(function () {
  'use strict';
  var labels = document.currentScript ? document.currentScript.dataset : {};
  var copyLabel = labels.copy || 'Copy';
  var copiedLabel = labels.copied || 'Copied';
  var pendingLabel = labels.pending || 'Copying…';
  var failedLabel = labels.failed || 'Code selected. Press Ctrl/Cmd + C to copy.';
  var interruptedLabel = document.documentElement && /^zh/i.test(document.documentElement.lang) ? '复制未完成，请重试。' : 'Copy did not complete. Try again.';
  var copyIntent = 0;

  function selectionState() {
    var selection = window.getSelection();
    if (!selection) return [];
    var state = [selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset, selection.rangeCount];
    for (var i = 0; i < selection.rangeCount; i++) {
      var range = selection.getRangeAt(i);
      state.push(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
    }
    return state;
  }


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
      var focused = document.activeElement;
      var selected = selectionState();
      window.clearTimeout(resetTimer);
      status.textContent = '';
      button.classList.remove('is-copied');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = pendingLabel;
      var copied = false;
      var intent = ++copyIntent;
      var retained = true;
      function sameSelection() {
        var current = selectionState();
        return current.length === selected.length && current.every(function (value, i) { return value === selected[i]; });
      }
      function onFocus(event) {
        // Disabling the owned button may itself send focus to the body.
        if (event.target !== button && !(event.target === document.body && focused === button && button.disabled)) retained = false;
      }
      function onSelection() { if (!sameSelection()) retained = false; }
      function onPointer(event) { if (!button.contains(event.target)) retained = false; }
      function onInput() { retained = false; }
      function ownsFallback() {
        var current = document.activeElement;
        return retained && intent === copyIntent && sameSelection() &&
          (current === focused || current === button || focused === button && current === document.body);
      }
      document.addEventListener('focusin', onFocus, true);
      document.addEventListener('selectionchange', onSelection);
      document.addEventListener('pointerdown', onPointer, true);
      document.addEventListener('keydown', onInput, true);
      document.addEventListener('input', onInput, true);
      var interrupted = false;
      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(codeblock.textContent);
          copied = true;
        } else copied = legacyCopy();
      } catch (_) {
        if (ownsFallback()) copied = legacyCopy();
        else interrupted = true;
      } finally {
        document.removeEventListener('focusin', onFocus, true);
        document.removeEventListener('selectionchange', onSelection);
        document.removeEventListener('pointerdown', onPointer, true);
        document.removeEventListener('keydown', onInput, true);
        document.removeEventListener('input', onInput, true);
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
        var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        status.textContent = interrupted ? interruptedLabel : touch && labels.failedTouch ? labels.failedTouch : failedLabel;
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
