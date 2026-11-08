import { MAX_EXCERPT_LENGTH, normalizeExcerpt, normalizeExcerpts, resolveExcerptSource, serializeExcerptMarkdown, isArticleTextRange } from './excerpts.mjs';
export { isArticleTextRange } from './excerpts.mjs';

let counter = 0;
const noop = () => {};
// Generated player controls/status are never attributed to the article author.
// Reject a selection crossing the widget as well as one starting inside it.
function node(doc, tag, className = '', text) {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function words(catalog) {
  const zh = catalog?.language === 'zh';
  return (cn, en) => zh ? cn : en;
}
function listen(target, name, callback, options) {
  target.addEventListener(name, callback, options);
  return () => target.removeEventListener(name, callback, options);
}

/** Mount after the actual article body has arrived. Its selection snapshot is local
 * to this article's DOM and never accepts a model-supplied selection string.
 */
export function mountReadingTools({ host, article, catalog, execute, getState, notify = noop }) {
  const body = host?.querySelector('[data-reader-body]');
  const toolbar = host?.querySelector('.space-toolbar');
  const source = normalizeExcerpt({ text: 'source validation', url: article?.url, title: article?.title }, catalog);
  if (!body || !toolbar || !source || typeof execute !== 'function' || typeof getState !== 'function') return noop;
  const doc = host.ownerDocument, t = words(catalog);
  const tools = node(doc, 'div', 'space-reading-tools');
  const save = node(doc, 'button', 'space-reading-tools__save', t('保存摘录', 'Save excerpt'));
  save.type = 'button'; save.disabled = true; save.dataset.excerptSave = '';
  const feedback = node(doc, 'span', 'space-reading-tools__feedback', t('选中正文后保存，最多 1200 字符', 'Select article text, up to 1,200 characters'));
  feedback.id = `space-excerpt-feedback-${++counter}`;
  feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
  save.setAttribute('aria-describedby', feedback.id);
  tools.append(save, feedback); toolbar.append(tools);
  const wasReadingToolbar = toolbar.classList.contains('space-reading-toolbar');
  toolbar.classList.add('space-reading-toolbar');
  let snapshot = null, disposed = false, busy = false, preserveSelection = false;
  const content = () => body.querySelector('.post-content');
  const setFeedback = (message, error = false) => { feedback.textContent = message; feedback.dataset.error = String(error); };
  const rangeText = range => range.toString().replace(/\r\n?/g, '\n').trim();
  function validSnapshot() {
    const current = content();
    return !disposed && !host.closest('[data-space-window]')?.hidden && !doc.hidden && snapshot && host.isConnected && body.isConnected && host.contains(body) && current === snapshot.content && isArticleTextRange(snapshot.range,current) && rangeText(snapshot.range) === snapshot.text;
  }
  function clear(message = t('选中正文后保存，最多 1200 字符', 'Select article text, up to 1,200 characters')) {
    snapshot = null; preserveSelection = false; save.disabled = true;
    if (!busy) setFeedback(message);
  }
  function actualAnchor(range, current) {
    const start = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const anchors = [...current.querySelectorAll('[id]')].map(el => el.id);
    let element = start;
    while (element && element !== current) {
      if (element.id && normalizeExcerpt({ text: 'anchor validation', url: source.url, title: source.title, anchor: element.id }, catalog, { anchors })) return element.id;
      element = element.parentElement;
    }
    let anchor = '';
    for (const heading of current.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')) {
      if ((heading === start || heading.contains(start) || (heading.compareDocumentPosition(start) & 4)) && normalizeExcerpt({ text: 'anchor validation', url: source.url, title: source.title, anchor: heading.id }, catalog, { anchors })) anchor = heading.id;
    }
    return anchor;
  }
  function capture() {
    if (disposed || busy) return;
    const selection = doc.getSelection(), current = content();
    if (!selection || selection.isCollapsed || selection.rangeCount !== 1) {
      if (!preserveSelection || !validSnapshot()) clear();
      return;
    }
    const range = selection.getRangeAt(0);
    if (!current || !current.contains(range.startContainer) || !current.contains(range.endContainer)) { clear(); return; }
    if (!isArticleTextRange(range,current)) { clear(t('请只选文章正文，避开播放器控件。','Select article text without the player controls.')); return; }
    const text = rangeText(range);
    if (text.length > MAX_EXCERPT_LENGTH) { clear(t('选区超过 1200 字符，请缩短；不会自动截断。', 'Over 1,200 characters. Select less; the excerpt will not be truncated.')); return; }
    const anchors = [...current.querySelectorAll('[id]')].map(el => el.id);
    const excerpt = normalizeExcerpt({ text, url: source.url, title: source.title, anchor: actualAnchor(range, current) }, catalog, { anchors });
    if (!excerpt) { clear(); return; }
    snapshot = { ...excerpt, content: current, range: range.cloneRange() };
    preserveSelection = false; save.disabled = false;
    setFeedback(t(`已选 ${text.length} 字符 · 只保存在浏览器`, `${text.length} characters selected · saved only in this browser`));
  }
  const disposers = [
    listen(doc, 'selectionchange', capture),
    listen(body, 'pointerup', capture),
    listen(body, 'keyup', capture),
    listen(doc, 'pointerdown', event => {
      if (toolbar.contains(event.target)) { capture(); preserveSelection = !!snapshot; }
      else if (!body.contains(event.target)) clear();
      else preserveSelection = false;
    }, true),
    listen(doc, 'focusin', event => { if (!host.contains(event.target)) clear(); }),
  ];
  const Mutation = doc.defaultView?.MutationObserver;
  const observer = Mutation ? new Mutation(records => {
    const generated = record => (record.target.nodeType === 1 ? record.target : record.target.parentElement)?.closest('[data-video-widget]');
    if (snapshot && !records.every(generated)) clear(t('正文已变化，请重新选中文字。', 'The article changed. Select text again.'));
  }) : null;
  observer?.observe(body, { childList: true, characterData: true, subtree: true });
  disposers.push(listen(save, 'click', async () => {
    if (busy) return;
    if (!validSnapshot()) { clear(t('请重新选中这篇文章的正文。', 'Select text in this article again.')); return; }
    const selected = { text: snapshot.text, url: source.url, title: source.title, anchor: snapshot.anchor };
    busy = true; save.disabled = true; save.textContent = t('保存中…', 'Saving…');
    try {
      const result = await execute('excerpt', selected);
      if (disposed) return;
      const readback = normalizeExcerpts(getState()?.excerpts, catalog).find(item => item.url === selected.url && item.text === selected.text);
      if (result?.saved === true && result?.ok !== false && readback) {
        snapshot = null;
        setFeedback(result.status === 'duplicate' || result.duplicate ? t('这段摘录已在浏览器中保存。', 'This excerpt is already saved in this browser.') : t('摘录已保存到浏览器，可在「你的笔记」回看来源。', 'Saved in this browser. Find its source in Your notes.'));
      } else if (readback && result?.saved === false) {
        setFeedback(t('已保留在当前会话，浏览器保存失败；请到笔记导出。', 'Kept in this session, but browser saving failed. Export from Your notes.'), true);
      } else {
        setFeedback(result?.status === 'full' ? t('已保存 80 条，请在笔记中删除一条后再试。', '80 excerpts are saved. Remove one in Your notes and try again.') : t('未确认保存成功，请重试或导出工作区。', 'Saving was not confirmed. Retry or export your workspace.'), true);
      }
    } catch {
      if (!disposed) setFeedback(t('保存失败，选区仍可重试。', 'Saving failed. You can retry the selection.'), true);
    } finally {
      busy = false;
      if (!disposed) { save.textContent = t('保存摘录', 'Save excerpt'); save.disabled = !validSnapshot(); }
    }
  }));
  capture();
  return () => {
    disposed = true; snapshot = null; observer?.disconnect(); disposers.forEach(dispose => dispose());
    tools.remove(); if (!wasReadingToolbar) toolbar.classList.remove('space-reading-toolbar');
  };
}

/** A separate shelf: explicit operations never modify the visitor's original note. */
export function mountExcerptShelf({ host, catalog, getState, execute, notify = noop }) {
  if (!host || typeof getState !== 'function' || typeof execute !== 'function') return noop;
  const doc = host.ownerDocument, t = words(catalog), workspace = host.closest('[data-bear-workspace]');
  let disposed = false, busy = false, message = '', messageError = false;
  host.classList.add('space-excerpt-shelf');
  function status(text, error = false) {
    message = text; messageError = error;
    const feedback = host.querySelector('[data-excerpt-status]');
    if (feedback) { feedback.textContent = text; feedback.dataset.error = String(error); }
  }
  function values() { return normalizeExcerpts(getState()?.excerpts); }
  function action(label, name, id) {
    const button = node(doc, 'button', 'space-excerpt-shelf__action', label);
    button.type = 'button'; button.dataset.excerptAction = name;
    if (id) button.dataset.excerptId = id;
    button.disabled = busy;
    return button;
  }
  function render() {
    if (disposed) return;
    const active=doc.activeElement,ownedFocus=host.contains(active),actionName=active?.dataset?.excerptAction,actionID=active?.dataset?.excerptId;
    if(ownedFocus&&active?.matches?.('[data-excerpt-copy-fallback]'))return;
    const header = node(doc, 'header', 'space-excerpt-shelf__header');
    const description = node(doc, 'div');
    description.append(node(doc, 'h3', '', t('文章摘录', 'Article excerpts')), node(doc, 'p', '', t('你的原文选区与来源，仅保存在当前浏览器。', 'Your selected article passages and sources, saved in this browser.')));
    const actions = node(doc, 'div', 'space-excerpt-shelf__actions');
    const feedback = node(doc, 'p', 'space-excerpt-shelf__status', message);
    feedback.dataset.excerptStatus = ''; feedback.dataset.error = String(messageError);
    feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
    header.append(description, actions);
    let items;
    try { items = values(); } catch {
      actions.append(action(t('重试', 'Retry'), 'retry'));
      feedback.textContent = t('暂时无法读取摘录。原始笔记未被改动。', 'Excerpts could not be read. Your original note is unchanged.');
      feedback.dataset.error = 'true'; host.replaceChildren(header, feedback); return;
    }
    const copyAll = action(t('复制引用', 'Copy citations'), 'copy-all');
    const exportAll = action(t('导出 .md', 'Export .md'), 'export');
    copyAll.disabled ||= !items.length; exportAll.disabled ||= !items.length;
    actions.append(copyAll, exportAll);
    const list = node(doc, 'div', 'space-excerpt-shelf__list');
    if (!items.length) list.append(node(doc, 'p', 'space-excerpt-shelf__empty', t('还没有摘录。阅读文章时选中文字，再点「保存摘录」。', 'No excerpts yet. Select article text and choose Save excerpt.')));
    for (const item of items) {
      const entry = node(doc, 'article', 'space-excerpt-shelf__entry'); entry.dataset.excerptId = item.id;
      const quote = node(doc, 'blockquote', 'space-excerpt-shelf__quote', item.text);
      const footer = node(doc, 'footer', 'space-excerpt-shelf__source');
      const available = resolveExcerptSource(item, catalog);
      let source;
      if (available) {
        source = action(available.title, 'source', item.id); source.classList.add('space-excerpt-shelf__backlink');
        source.setAttribute('aria-label', t(`回到文章：${available.title}`, `Return to article: ${available.title}`));
      } else {
        source = node(doc, 'div', 'space-excerpt-shelf__unavailable'); source.dataset.excerptUnavailable = '';
        source.append(node(doc, 'span', '', item.title), node(doc, 'small', '', t('原文暂不可用 · 摘录仍保留', 'Original currently unavailable · Your excerpt is preserved')));
      }
      const itemActions = node(doc, 'div', 'space-excerpt-shelf__actions');
      itemActions.append(action(t('复制引用', 'Copy citation'), 'copy', item.id), action(t('删除此摘录', 'Remove excerpt'), 'remove', item.id));
      footer.append(source, itemActions); entry.append(quote, footer); list.append(entry);
    }
    host.replaceChildren(header, list, feedback);
    if(ownedFocus){const controls=[...host.querySelectorAll('[data-excerpt-action]')];(controls.find(node=>node.dataset.excerptAction===actionName&&node.dataset.excerptId===actionID&&!node.disabled)||controls.find(node=>!node.disabled))?.focus({preventScroll:true});}
  }
  async function copy(markdown) {
    try {
      if (!doc.defaultView?.navigator?.clipboard?.writeText) throw new Error('clipboard unavailable');
      await doc.defaultView.navigator.clipboard.writeText(markdown);
      if (!disposed) status(t('引用已复制。', 'Citation copied.'));
    } catch {
      if (disposed) return;
      let fallback = host.querySelector('[data-excerpt-copy-fallback]');
      if (!fallback) {
        fallback = node(doc, 'textarea', 'space-excerpt-shelf__copy-fallback');
        fallback.dataset.excerptCopyFallback = ''; fallback.readOnly = true;
        fallback.setAttribute('aria-label', t('可手动复制的 Markdown 引用', 'Markdown citations for manual copying'));
        host.append(fallback);
      }
      fallback.value = markdown; fallback.focus(); fallback.select();
      status(t('自动复制未成功；引用已选中，请手动复制。', 'Automatic copying failed. The citations are selected for manual copying.'), true);
    }
  }
  function download(markdown) {
    const win = doc.defaultView;
    const url = win.URL.createObjectURL(new win.Blob([markdown + '\n'], { type: 'text/markdown;charset=utf-8' }));
    const link = node(doc, 'a'); link.href = url; link.download = 'bear-article-excerpts.md';
    try { doc.body.append(link); link.click(); status(t('已准备 Markdown 导出，包含来源记录。', 'Prepared the Markdown export with source records.')); }
    finally { link.remove(); win.setTimeout(() => win.URL.revokeObjectURL(url), 1000); }
  }
  const disposers = [listen(host, 'click', async event => {
    const target = event.target.closest('[data-excerpt-action]');
    if (!target || !host.contains(target) || target.disabled || disposed || busy) return;
    const name = target.dataset.excerptAction;
    if (name === 'retry') { render(); return; }
    try {
      const items = values(), item = items.find(value => value.id === target.dataset.excerptId);
      if (name === 'source') {
        const source = item && resolveExcerptSource(item, catalog);
        if (!source) { status(t('原文暂不可用，摘录仍保留。', 'The original is currently unavailable. Your excerpt is preserved.')); render(); return; }
        await execute('open', { app: 'reader', payload: source.url, anchor: source.anchor });
      } else if (name === 'copy' || name === 'copy-all') {
        const markdown = serializeExcerptMarkdown(name === 'copy' ? (item ? [item] : []) : items, catalog);
        if (!markdown) throw new Error('nothing to copy');
        await copy(markdown);
      } else if (name === 'export') {
        const markdown = serializeExcerptMarkdown(items, catalog);
        if (!markdown) throw new Error('nothing to export');
        download(markdown);
      } else if (name === 'remove') {
        if (!item) throw new Error('excerpt unavailable');
        busy = true; target.disabled = true;
        const result = await execute('excerpt-remove', { id: item.id });
        if (disposed) return;
        const removed = !normalizeExcerpts(getState()?.excerpts).some(value => value.id === item.id);
        if (result?.saved === true && removed) status(t('这条摘录已删除。', 'The excerpt was removed.'));
        else status(t('删除未能持久保存，请重试或导出工作区。', 'The removal was not saved in browser storage. Retry or export your workspace.'), true);
        busy = false; render();
      }
    } catch {
      if (!disposed) { busy = false; status(t('操作未完成，请重试。', 'The action did not complete. Try again.'), true); render(); notify(t('摘录操作未完成。', 'The excerpt action did not complete.')); }
    }
  })];
  if (workspace) disposers.push(listen(workspace, 'bear:workspace-change', event => {
    if (!busy && ['excerpt', 'excerpt-remove', 'delete_excerpt', 'excerpts', 'storage','restore'].includes(event.detail?.type)) render();
  }));
  render();
  return () => { disposed = true; disposers.forEach(dispose => dispose()); host.replaceChildren(); host.classList.remove('space-excerpt-shelf'); };
}
