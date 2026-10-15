/* Share the current article, confirming only a completed clipboard write. */
(function () {
  'use strict';
  var zh = document.documentElement.lang.indexOf('zh') === 0;
  var toast = document.createElement('div');
  toast.className = 'et-copy-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  var toastTimer, manual, manualInput, trigger, requestSerial = 0;

  function confirm() {
    window.clearTimeout(toastTimer);
    toast.textContent = zh ? '链接已复制' : 'Link copied';
    toast.classList.add('et-copy-toast--visible');
    toastTimer = window.setTimeout(function () {toast.classList.remove('et-copy-toast--visible');}, 2000);
  }
  function showManual(href, button) {
    if (!manual) {
      manual = document.createElement('dialog');
      manual.className = 'article-copy-fallback';
      manual.setAttribute('aria-labelledby', 'article-copy-title');
      var title = document.createElement('h2');
      title.id = 'article-copy-title';
      title.textContent = zh ? '复制文章链接' : 'Copy article link';
      var help = document.createElement('p');
      help.textContent = zh ? '浏览器未允许自动复制。长按下面的链接，或按 Ctrl / ⌘ + C 复制。' : 'Automatic copy is unavailable. Press and hold the link, or use Ctrl / ⌘ + C to copy it.';
      manualInput = document.createElement('input');
      manualInput.readOnly = true;
      manualInput.setAttribute('aria-label', zh ? '文章链接' : 'Article link');
      var close = document.createElement('button');
      close.type = 'button';
      close.textContent = zh ? '关闭' : 'Close';
      close.addEventListener('click', function () {manual.close();});
      manualInput.addEventListener('focus', function () {manualInput.select();});
      manual.addEventListener('close', function () {if (trigger && trigger.isConnected && trigger.getClientRects().length) trigger.focus({preventScroll: true});});
      manual.append(title, help, manualInput, close);
      document.body.appendChild(manual);
    }
    trigger = button;
    manualInput.value = href;
    if (!manual.open) manual.showModal();
    manualInput.focus({preventScroll: true});
    manualInput.select();
  }
  function legacyCopy(href) {
    var previous = document.activeElement;
    var field = document.createElement('textarea');
    field.value = href;
    field.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(field);
    field.select();
    var copied = false;
    try {copied = document.execCommand('copy') === true;} catch (_) {}
    field.remove();
    if (previous && previous.isConnected) previous.focus({preventScroll: true});
    return copied;
  }
  document.addEventListener('click', async function (event) {
    var button = event.target.closest('.et-share-copy, .abs-share-copy');
    if (!button || button.disabled) return;
    var href = button.dataset.href || location.href;
    var serial = ++requestSerial;
    var sheet = button.closest('.article-bottom-sheet');
    function intended() {
      return serial === requestSerial && button.isConnected &&
        document.visibilityState !== 'hidden' &&
        (!sheet || sheet.classList.contains('abs--open')) &&
        (document.activeElement === document.body || document.activeElement === button || button.contains(document.activeElement));
    }
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    var copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(href);
        copied = true;
      } else if (intended()) copied = legacyCopy(href);
    } catch (_) {if (intended()) copied = legacyCopy(href);}
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (!intended()) return;
    if (copied) confirm();
    else showManual(href, button);
  });
})();
