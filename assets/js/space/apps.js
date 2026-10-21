import { safeURL } from './state.mjs';
import { mountMedia } from './media.js';
import { mountAgent } from './agent-panel.js';
import { mountFinderHome } from './finder-home.js';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = escapeHTML;
export function mountApps({ root, catalog, execute, getState, getContext, updateNote, notify, icon }) {
  const zh = catalog.language === 'zh';
  const t = (cn, en) => zh ? cn : en;
  const disposers = new Map();
  const media = mountMedia({ catalog, execute, notify });
  let libraryView = { filter: 'all', query: '', scroll: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem('bear-library:v1') || 'null');
    if (saved && ['all','ai-agent','engineering','growth','favorites'].includes(saved.filter)) libraryView = { filter: saved.filter, query: typeof saved.query === 'string' ? saved.query.slice(0, 200) : '', scroll: Number.isFinite(saved.scroll) ? Math.max(0, Math.min(100000, saved.scroll)) : 0 };
  } catch { /* A reading preference never blocks public content. */ }
  const saveLibrary = () => { try { localStorage.setItem('bear-library:v1', JSON.stringify(libraryView)); } catch {} };
  const link = (url, label, className = '') => {
    if (typeof url !== 'string' || !url.trim()) return '';
    const href = safeURL(url, location.origin);
    return href ? `<a class="${className}" href="${html(href)}" target="_blank" rel="noopener noreferrer">${html(label)} ↗</a>` : '';
  };
  const button = (app, label, payload = '', className = 'space-button--secondary space-button') => `<button class="${className}" data-open="${html(app)}" data-payload="${html(payload)}">${html(label)}</button>`;
  const articles = catalog.articles || [];
  const documents = [...articles, ...(catalog.readingDocuments || [])];
  const articleByURL = value => documents.find(a => a.url === value);
  const productByID = value => catalog.products.find(p => p.id === value) || catalog.products[0];
  const listItem = (item, attrs, fullDescription = false) => `<button class="space-list-item" ${attrs}><small>${html(item.date || '')}</small><strong>${html(item.title || item.name)}</strong><span>${fullDescription ? html(item.description || '') : html(item.description || '').slice(0, 210)}</span></button>`;
  function syncFavorite(host, url) {
    const control = host.querySelector('[data-reader-favorite]'), article = articleByURL(url);
    if (!control || !article) return;
    const saved = getState().favorites.includes(url);
    control.setAttribute('aria-pressed', String(saved));
    control.setAttribute('aria-label', t('收藏文章：','Bookmark article: ') + article.title);
    control.innerHTML = `<span aria-hidden="true">${saved ? '★' : '☆'}</span> ${saved ? t('已收藏','Saved') : t('收藏','Save')}`;
  }
  function showProducts(host, selectedID, windowID) {
    const products = catalog.products || [];
    const selected = selectedID ? productByID(selectedID) : null;
    const controller = new AbortController();
    disposers.set(windowID, () => controller.abort());
    function choose(control,id,focusID=id) {
      const focused = document.activeElement === control;
      const picker = control.matches('select');
      execute('open', { app: 'products', payload: id });
      // Opening an already visible app settles its region focus in a
      // microtask. Keep this choice only while that same navigation owns it.
      queueMicrotask(() => {
        const region = host.closest('[data-space-window]');
        if (!focused || !host.isConnected || getState().active !== 'products' || !getState().windows.some(win=>win.app==='products'&&win.payload===id) || ![control,region].includes(document.activeElement)) return;
        const replacement = picker ? host.querySelector('[data-product-select]') : [...host.querySelectorAll('[data-select-product]')].find(button=>button.dataset.selectProduct===focusID);
        replacement?.focus({preventScroll:true});
      });
    }
    if (!selected) {
      host.innerHTML = `<section class="space-product-home" data-product-home><header class="space-finder-toolbar"><strong>${t('作品','Projects')}</strong><button type="button" data-space-search-trigger aria-haspopup="dialog">${t('搜索','Search')} <span aria-hidden="true">⌕</span></button></header><div class="space-finder-home__body"><aside class="space-finder-home__sidebar"><p>${t('个人收藏','Favorites')}</p><nav aria-label="${t('个人收藏','Favorites')}"><button type="button" data-open="welcome" data-payload="">${icon('welcome')}<span>${t('我的空间','My Space')}</span></button><button type="button" data-open="products" data-payload="" aria-current="page">${icon('products')}<span>${t('作品','Projects')}</span></button><button type="button" data-open="reader" data-payload="">${icon('reader')}<span>${t('文章与思考','Writing')}</span></button><button type="button" data-open="books">${icon('books')}<span>${t('书架','Books')}</span></button></nav></aside><div class="space-finder-home__files" aria-label="${t('产品目录','Product directory')}">${products.map(p => `<button type="button" class="space-finder-home__item" data-select-product="${html(p.id)}"><span class="finder-folder" data-product-color="${html(p.color || '')}" aria-hidden="true"><span class="finder-folder__mark">${html(p.mark || '')}</span></span><strong>${html(p.name)}</strong>${p.stage ? `<small>${html(p.stage)}</small>` : ''}</button>`).join('')}${products.length ? '' : `<p class="space-finder-empty">${t('暂无作品','No projects yet')}</p>`}</div></div><footer class="space-finder-status"><span>${t(`${products.length} 个项目`,`${products.length} items`)}</span></footer></section>`;
      host.querySelectorAll('[data-select-product]').forEach(b => b.addEventListener('click', () => choose(b,b.dataset.selectProduct), {signal:controller.signal}));
      return;
    }
    host.innerHTML = `<div class="space-product-view"><header class="space-finder-toolbar"><button type="button" data-product-back>← ${t('返回产品目录','Back to projects')}</button><strong>${html(selected.name)}</strong></header><div class="space-finder space-products"><aside class="space-sidebar"><div class="space-product-directory"><p>${t('产品目录','Products')}</p>${products.map(p => `<button type="button" data-select-product="${html(p.id)}" aria-pressed="${p.id === selected.id}">${html(p.name)}</button>`).join('')}</div><label class="space-product-picker"><span>${t('产品','Product')}</span><select data-product-select aria-label="${t('选择产品','Choose a product')}">${products.map(p=>`<option value="${html(p.id)}"${p.id===selected.id?' selected':''}>${html(p.name)}</option>`).join('')}</select></label><nav class="space-product-explore" aria-label="${t('继续探索','Explore more')}"><button type="button" data-open="reader">${t('构建笔记','Build notes')}</button><button type="button" data-open="books">${t('我的书架','Books')}</button></nav></aside><article class="space-product"><p class="space-product__stage">${html(selected.stage)}</p><h2>${html(selected.name)}</h2><p>${html(selected.headline)}</p>${selected.image ? `<img class="space-product__shot" src="${html(selected.image)}" alt="${html(selected.alt)}" loading="lazy">` : ''}<p>${html(selected.description)}</p><div class="space-product__links">${link(selected.url,t('打开真实产品','Open the product'),'space-button')}${link(selected.demo,t('测试预览','Try the demo'))}${link(selected.github,t('源码','Source'))}</div>${selected.boundary ? `<p class="space-product__boundary">${t('当前边界：','Current boundary: ')}${html(selected.boundary)}</p>` : ''}${selected.related?.length ? `<h3>${t('从构建到思考','Related writing')}</h3>${selected.related.map(url => { const a = articleByURL(url); return a ? listItem(a,`data-open="reader" data-payload="${html(url)}"`) : ''; }).join('')}` : ''}</article></div></div>`;
    host.querySelectorAll('[data-select-product]').forEach(b => b.addEventListener('click', () => choose(b,b.dataset.selectProduct), {signal:controller.signal}));
    const picker=host.querySelector('[data-product-select]');picker.addEventListener('change',()=>choose(picker,picker.value), {signal:controller.signal});
    const back=host.querySelector('[data-product-back]');back.addEventListener('click',()=>choose(back,'',selected.id), {signal:controller.signal});
    const ask = document.createElement('button'); ask.type='button';ask.className='space-button space-button--secondary';ask.dataset.productAsk='';ask.textContent=t('✳ 聊聊这个产品','✳ Ask about this project');
    ask.addEventListener('click',()=>execute('ask',{question:t('介绍这个产品，它解决什么问题？','What does this project do, and who is it for?')}), {signal:controller.signal});
    host.querySelector('.space-product__links').append(ask);
  }
  function showLibrary(host, filter = libraryView.filter) {
    const filters = [['all',t('全部文章','All writing')],['ai-agent','AI Agent'],['engineering',t('工程实践','Engineering')],['growth',t('思考与笔记','Thoughts')],['favorites',t('你的收藏','Your bookmarks')]];
    host.innerHTML = `<div class="space-library"><div class="space-toolbar"><span>${t('公开文章','Public writing')} / ${articles.length}</span><input data-library-query type="search" placeholder="${t('找一篇文章…','Find writing…')}" aria-label="${t('筛选文章','Filter writing')}"></div><div class="space-finder space-library__finder"><aside class="space-sidebar"><div class="space-library-directory"><p>${t('阅读目录','Library')}</p>${filters.map(([id,label]) => `<button type="button" data-library-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}</div><label class="space-library-picker"><span>${t('分类','Section')}</span><select data-library-select aria-label="${t('文章分类','Writing section')}">${filters.map(([id,label])=>`<option value="${id}"${filter === id ? ' selected' : ''}>${label}</option>`).join('')}</select></label><nav class="space-library-actions" aria-label="${t('你的空间','Your space')}"><button type="button" data-open="notes">${t('笔记','Notes')}</button><button type="button" data-open="books">${t('书架','Books')}</button></nav></aside><div class="space-list" data-library-list role="region" aria-label="${t('文章列表','Writing list')}" tabindex="0"></div></div></div>`;
    libraryView.filter = filter;
    const queryInput = host.querySelector('[data-library-query]');
    queryInput.maxLength = 200; queryInput.value = libraryView.query;
    const listHost = host.querySelector('[data-library-list]');
    let disposed = false, restoring = true, restoreFrame = 0;
    const windowElement = host.closest('[data-space-window]');
    const layoutObserver = new MutationObserver(scheduleRestore);
    const sizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleRestore) : null;
    function stopRestoring() {
      restoring = false; cancelAnimationFrame(restoreFrame); restoreFrame = 0;
      layoutObserver.disconnect(); sizeObserver?.disconnect();
      for (const type of ['wheel','touchmove','pointerdown','keydown']) listHost.removeEventListener(type, userReading);
    }
    function userReading(event) {
      if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey || !['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))) return;
      stopRestoring();
    }
    function scheduleRestore() {
      if (disposed || !restoring || restoreFrame) return;
      restoreFrame = requestAnimationFrame(() => {
        restoreFrame = 0;
        if (disposed || !restoring || !listHost.isConnected) return;
        // A visible monitor preview is still read-only. Its original nodes
        // move again on entry, so restore only on the interactive desktop.
        if (root.querySelector('[data-space-cafe]') && (root.dataset.cafeMode !== 'desktop' || !root.hasAttribute('data-world-ready') && !root.hasAttribute('data-world-failed') || root.hasAttribute('data-world-loading'))) return;
        if (!listHost.clientWidth || !listHost.clientHeight) return;
        listHost.scrollTop = libraryView.scroll;
        stopRestoring();
      });
    }
    function observeRestore() {
      layoutObserver.observe(root, {attributes:true,attributeFilter:['data-world-ready','data-world-failed','data-world-loading','data-cafe-mode','hidden']});
      if (windowElement) layoutObserver.observe(windowElement, {attributes:true,attributeFilter:['hidden','data-active','style']});
      sizeObserver?.observe(listHost);
      for (const type of ['wheel','touchmove','pointerdown']) listHost.addEventListener(type, userReading, {passive:true});
      listHost.addEventListener('keydown', userReading);
    }
    function surfaceChanged() {
      if (disposed) return;
      // Re-parenting keeps the scroller node but can clear its scroll offset.
      // Use the latest reading position, never the value captured at mount.
      restoring = true;
      observeRestore();
      scheduleRestore();
    }
    observeRestore();
    root.addEventListener('space:surfacechange', surfaceChanged);
    disposers.set(windowElement?.dataset.spaceWindow || 'reader', () => { disposed = true; stopRestoring(); root.removeEventListener('space:surfacechange', surfaceChanged); });
    const draw = () => {
      libraryView.query = queryInput.value; saveLibrary();
      const query = queryInput.value.trim().toLocaleLowerCase();
      const list = (filter === 'favorites' ? documents : articles).filter(a => (filter === 'all' || a.section === filter || (filter === 'favorites' && getState().favorites.includes(a.url))) && `${a.title} ${a.description} ${(a.tags || []).join(' ')}`.toLocaleLowerCase().includes(query));
      if (list.length) {
        listHost.innerHTML = list.map(a => listItem(a, `data-open="reader" data-payload="${html(a.url)}"`, true)).join('');
      } else {
        const searching = query.trim().length > 0;
        const title = searching ? t(`没有找到“${queryInput.value}”`, `No matches for “${queryInput.value}”`) : filter === 'favorites' ? t('还没有收藏文章','No bookmarks yet') : t('这个分类还没有文章','No articles in this category yet');
        const hint = searching ? t('试试其他关键词，或清除搜索查看当前分类。','Try another keyword, or clear your search to view this section.') : filter === 'favorites' ? t('阅读文章时，点击“收藏”就能在这里找到它。','Save an article while reading to find it here.') : t('可以先看看其他分类的文章。','Browse the other sections in the meantime.');
        listHost.innerHTML = `<div class="space-library-empty"><h3>${html(title)}</h3><p>${hint}</p><button type="button" class="space-button space-button--secondary" data-library-recover>${searching ? t('清除搜索','Clear search') : t('查看全部文章','Browse all writing')}</button></div>`;
        listHost.querySelector('[data-library-recover]').addEventListener('click', () => {
          stopRestoring();
          libraryView.scroll = 0;
          queryInput.value = ''; libraryView.query = '';
          if (searching) draw();
          else choose('all');
          queryInput.focus({preventScroll:true});
        });
      }
    };
    const picker = host.querySelector('[data-library-select]');
    const choose = value => {
      stopRestoring();
      filter = value; libraryView.filter = value; libraryView.scroll = 0;
      picker.value = value;
      host.querySelectorAll('[data-library-filter]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.libraryFilter === value)));
      draw(); listHost.scrollTop = 0;
    };
    queryInput.addEventListener('input', () => { stopRestoring(); libraryView.scroll = 0; draw(); listHost.scrollTop = 0; });
    host.querySelectorAll('[data-library-filter]').forEach(b => b.addEventListener('click', () => choose(b.dataset.libraryFilter)));
    picker.addEventListener('change', () => choose(picker.value));
    listHost.addEventListener('scroll', () => { if (disposed || restoring || !listHost.isConnected || !listHost.clientHeight) return; libraryView.scroll = listHost.scrollTop; saveLibrary(); }, { passive: true });
    draw(); scheduleRestore();
  }
  async function showReader(host, url, windowID) {
    const article = articleByURL(url);
    if (!article) { showLibrary(host); return; }
    host.innerHTML = `<div class="space-toolbar space-reader-toolbar">${button('reader',t('← 阅读目录','← Library'))}<div class="space-reader-toolbar__source">${link(url,t('原文','Original'))}<button type="button" data-reader-favorite></button></div></div><div class="space-reader__title"><h2>${html(article.title)}</h2><p>${html(article.date)} · ${html(article.section)}</p></div><div class="space-reader__body" data-reader-body><p>${t('正在打开原文…','Opening the article…')}</p></div>`;
    syncFavorite(host, url);
    host.querySelector('[data-reader-favorite]').addEventListener('click', () => execute('favorite', { url }));
    const actions = document.createElement('div');actions.className='space-reader__ai-actions';
    const ask = document.createElement('button');ask.type='button';ask.dataset.readerAsk='';ask.textContent=t('✳ 总结这篇文章','✳ Summarize this article');
    const explain = document.createElement('button');explain.type='button';explain.dataset.readerExplain='';explain.hidden=true;explain.textContent=t('解释选中文字','Explain selection');
    actions.append(ask,explain);host.querySelector('.space-toolbar').after(actions);
    ask.addEventListener('click',()=>execute('ask',{question:t('总结这篇文章，给出核心观点和阅读入口。','Summarize this article and link to it.')}));
    let selection = '';
    const capture = () => {
      const selected=window.getSelection(); const body=host.querySelector('[data-reader-body]');
      selection = selected && body?.contains(selected.anchorNode) && body.contains(selected.focusNode) ? selected.toString().trim().slice(0,1200) : '';
      explain.hidden=!selection;
    };
    document.addEventListener('selectionchange',capture);
    // Preserve the explicit selection while the toolbar takes focus.
    explain.addEventListener('pointerdown',event=>event.preventDefault());
    explain.addEventListener('click',()=>{if(selection)execute('ask',{question:t('解释下面选中的段落。','Explain this selected passage.'),selection});});
    const controller = new AbortController();
    let disposed = false;
    disposers.set(windowID, () => { disposed = true; controller.abort();document.removeEventListener('selectionchange',capture); });
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const href = safeURL(url, location.origin);
      if (!href || new URL(href).origin !== location.origin) throw new Error('Invalid article');
      const response = await fetch(href, { signal: controller.signal });
      if (!response.ok) throw new Error('Article unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const content = doc.querySelector('.post-content');
      if (!content) throw new Error('Article body unavailable');
      // This reader imports only article content, never its scripts or active embeds.
      content.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta,svg,math,template').forEach(el => el.remove());
      for (const el of content.querySelectorAll('*')) {
        for (const attr of [...el.attributes]) {
          if (!['href','src','alt','title','class','width','height','colspan','rowspan'].includes(attr.name)) el.removeAttribute(attr.name);
        }
        for (const attr of ['href','src']) {
          if (!el.hasAttribute(attr)) continue;
          const safe = safeURL(new URL(el.getAttribute(attr), href).href, location.origin);
          if (safe) el.setAttribute(attr, safe); else el.removeAttribute(attr);
        }
        if (el.tagName === 'A' && el.href && new URL(el.href).origin !== location.origin) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
        if (el.tagName === 'IMG') { el.loading = 'lazy'; el.decoding = 'async'; }
      }
      if (disposed || !host.isConnected) return;
      host.querySelector('[data-reader-body]').replaceChildren(content);
    } catch (error) {
      if (disposed || !host.isConnected) return;
      host.querySelector('[data-reader-body]').innerHTML = `<p>${t('暂时没能打开正文。你仍可以直接阅读原文。','The article could not load. You can still read the original.')}</p>${link(url,t('打开原文','Read original'),'space-button')}`;
    } finally { clearTimeout(timer); }
  }
  function download(text, filename, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function showNotes(host) {
    host.innerHTML = `<div class="space-notes"><div class="space-toolbar"><span>${t('属于你的笔记','A note of your own')}</span><div><button data-note-sandbox>${t('保存到沙盒','Save to sandbox')}</button><button data-note-export style="margin-left:12px">${t('导出 .md','Export .md')} ↗</button></div></div><textarea class="space-note-editor" data-note-editor maxlength="40000" aria-label="${t('你的笔记','Your note')}" placeholder="${t('逛到这里，想到了什么？\n\n可以写下来，下次回来继续。','What did this place make you think of?\n\nWrite it down. Come back and pick it up later.')}"></textarea><footer><span data-note-save>${t('仅保存在当前浏览器，不会公开','Saved in this browser, never published')}</span><span data-note-count></span></footer></div>`;
    const editor = host.querySelector('[data-note-editor]'); editor.value = getState().note;
    const count = () => { host.querySelector('[data-note-count]').textContent = `${editor.value.length} / 40000`; };
    editor.addEventListener('input', () => {
      updateNote(editor.value); count();
      host.querySelector('[data-note-save]').textContent=t('仅保存在当前浏览器，不会公开','Saved in this browser, never published');
    }); count();
    host.querySelector('[data-note-export]').addEventListener('click', () => download(editor.value,'bear-space-note.md'));
    host.querySelector('[data-note-sandbox]').addEventListener('click',async event => {
      const saveButton=event.currentTarget;
      const bytes=new TextEncoder().encode(editor.value);
      if(bytes.length>2600){notify(t('这篇笔记太长，请先导出文件。','This note is too long for one sandbox command. Export it instead.'));return;}
      const encoded=btoa(String.fromCharCode(...bytes));
      saveButton.disabled=true;
      const result=await execute('run',{command:`printf %s '${encoded}' | base64 -d > /workspace/note.md`});
      host.querySelector('[data-note-save]').textContent=result.includes('[exit 0')?t('已保存到本地沙盒 /workspace/note.md','Saved in local sandbox /workspace/note.md'):result;
      saveButton.disabled=false;
    });
  }
  function showContact(host) {
    const links = catalog.links;
    host.innerHTML = `<div class="space-app space-contact"><h2>${t('有想法，就聊聊。','Have a thought? Say hello.')}</h2><p class="space-contact__intro">${t('产品反馈、文章讨论，或者分享一段路上的故事。','Product feedback, a conversation about writing, or a story from the road.')}</p><div class="space-contact-links">${[['github','GitHub'],['x','X'],['zhihu','知乎'],['linkedin','LinkedIn'],['bilibili','Bilibili'],['youtube','YouTube'],['instagram','Instagram'],['polarsteps','Polarsteps']].map(([key,name]) => link(links[key],name)).join('')}</div><h3>${t('先写一张便笺','Write a little note')}</h3><textarea data-message-draft maxlength="6000" aria-label="${t('留言草稿','Message draft')}" placeholder="${t('想对我说什么？','What would you like to tell me?')}"></textarea><div class="space-contact__actions"><a class="space-button" data-contact-email>${t('通过邮件发给我','Send by email')} ↗</a><a data-contact-github target="_blank" rel="noopener noreferrer">${t('在 GitHub 公开留言','Leave a public GitHub message')} ↗</a>${link(links.whatsapp,'WhatsApp')}</div><p class="space-contact__hint">${t('草稿保存在你的浏览器。选择渠道后，由你确认发送；这里不会代发，也不会显示虚假的送达状态。','The draft stays in your browser. Choose a channel and confirm sending there.')}</p>${button('agent',t('想先了解我？和 AI 向导聊聊','Meet me through the AI guide'))}</div>`;
    const draft = host.querySelector('[data-message-draft]'); draft.value = getState().draft;
    const syncLinks = () => {
      host.querySelector('[data-contact-email]').href = `mailto:${links.email}?subject=${encodeURIComponent('Hello from BEAR Space')}&body=${encodeURIComponent(draft.value)}`;
      host.querySelector('[data-contact-github]').href = `https://github.com/cubxxw/blog/issues/new?title=${encodeURIComponent('Hello from BEAR Space')}&body=${encodeURIComponent(draft.value)}`;
    };
    draft.addEventListener('input', () => { execute('draft', { text: draft.value }); syncLinks(); });
    syncLinks();
  }
  function showTerminal(host) {
    host.innerHTML = `<div class="space-terminal"><p>BEAR / WORKSPACE SHELL<br>${t('输入 help 看看能做什么。run &lt;命令&gt; 可调用已连接的本地 Linux 沙盒。','Type help. Use run &lt;command&gt; for the connected local Linux sandbox.')}</p><div class="space-terminal__output" data-terminal-output></div><form><span>guest@bear ~ %</span><input data-terminal-input aria-label="${t('终端命令','Terminal command')}" autocomplete="off" spellcheck="false"></form></div>`;
    const output = host.querySelector('[data-terminal-output]');
    const input = host.querySelector('input');
    const history = []; let historyIndex = 0;
    host.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault(); const command = input.value.trim(); if (!command) return;
      input.value = ''; history.push(command); historyIndex = history.length;
      const line = document.createElement('div'); line.textContent = `› ${command}\n${t('执行中…','Running…')}`;
      output.append(line); if (output.children.length > 80) output.firstChild.remove();
      input.disabled = true;
      try { line.textContent = `› ${command}\n${await execute('command', { command })}`; }
      catch { line.textContent = t('命令失败。','Command failed.'); }
      finally { input.disabled = false; if(host.isConnected && getState().active==='terminal')input.focus(); }
      line.scrollIntoView({ block: 'nearest' });
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); historyIndex = Math.max(0,Math.min(history.length,historyIndex+(event.key==='ArrowUp'?-1:1))); input.value = history[historyIndex] || ''; }
    });
  }
  function showAgent(host, windowID, payload) {
    const dispose = mountAgent({ host, catalog, execute, getState, getContext, notify });
    disposers.set(windowID, typeof dispose === 'function' ? dispose : () => dispose?.dispose?.());
    if (payload && typeof payload === 'string') {
      const editor = host.querySelector('textarea');
      if (editor) { editor.value = payload.slice(0, 4000); editor.focus({ preventScroll: true }); }
    }
  }
  function showSettings(host,windowID) {
    const s = getState();
    host.innerHTML = `<div class="space-settings"><h2>${t('你的工作区，你来安排。','Make this workspace yours.')}</h2><h3>${t('语言','Language')}</h3><div class="space-settings__choices space-language" role="group" aria-label="${t('界面语言','Interface language')}">${[['zh','中文'],['en','English']].map(([value,label]) => `<button data-set-language="${value}" lang="${value}" aria-pressed="${catalog.language === value}">${label}<span aria-hidden="true">${catalog.language === value ? '✓' : ''}</span></button>`).join('')}</div><p class="space-language__hint">${t('切换语言，笔记和窗口会留在原处。','Change the language. Keep your notes and windows.')}</p><h3>${t('咖啡馆','Café')}</h3><div class="space-settings__choices" role="group" aria-label="${t('咖啡馆','Café')}"><button type="button" data-cafe-picker aria-haspopup="dialog">${t('换个地方','Change the scene')}</button><button type="button" data-cafe-visit>${t('回到咖啡馆','Back to the café')}</button></div><h3>${t('应用外观','Appearance')}</h3><div class="space-settings__choices" role="group" aria-label="${t('应用外观','Appearance')}">${[['light',t('经典浅色','Classic light')],['dark',t('深色','Dark')]].map(([value,label]) => `<button data-set-theme="${value}" aria-pressed="${s.theme === value}">${label}</button>`).join('')}</div><h3>${t('桌面颜色','Desktop color')}</h3><div class="space-settings__choices" role="group" aria-label="${t('桌面颜色','Desktop color')}">${[['dawn',t('经典青绿','Classic teal')],['dusk',t('暮蓝','Evening blue')],['forest',t('鼠尾草','Sage')]].map(([value,label]) => `<button data-set-wallpaper="${value}" aria-pressed="${s.wallpaper === value}">${label}</button>`).join('')}</div><h3>${t('当前可用范围','Available here')}</h3>${[[t('窗口、笔记、收藏','Windows, notes, bookmarks'),t('当前浏览器保存','Saved in this browser')],[t('访客登录与跨设备同步','Sign-in and cross-device sync'),t('尚未接入','Not connected')],['Immich',media.status().connected ? t('公开相册已连接','Public albums connected') : t('在相册中加载公开内容','Load public content in Photos')],[t('Linux 沙盒','Linux sandbox'),'<span data-runtime-status>'+t('正在检查本地连接','Checking local connection')+'</span>']].map(([name,status]) => `<div class="space-capability"><span>${name}</span><small>${status}</small></div>`).join('')}<p>${t('工作区会记住你的布局和笔记。清除网站数据会移除它们，可以先导出一份。AI 向导可以读公开资料；不会替你发布内容或操作个人账户。','The workspace remembers your layout and notes. Clearing site data removes them; export a copy first. The AI guide reads public material and does not publish or operate personal accounts.')}</p><div class="space-settings__actions"><button class="space-button" data-space-export>${t('导出工作区','Export workspace')}</button><button class="space-button space-button--secondary" data-space-arrange>${t('整理窗口','Arrange windows')}</button></div></div>`;
    const runtimeLabel = host.querySelector('[data-runtime-status]'),controller = new AbortController();
    let disposed = false;
    const showRuntime = text => { if (!disposed && runtimeLabel.isConnected) runtimeLabel.textContent = text; };
    fetch('/.netlify/functions/bear-runtime',{signal:controller.signal}).then(r=>r.json()).then(data=>showRuntime(data.available?t('已连接本地 Docker','Local Docker connected'):t('未连接（仅本地开发可用）','Disconnected (local development only)'))).catch(()=>showRuntime(t('未连接','Disconnected')));
    const syncChoices = event => {
      if (event && !['theme','wallpaper'].includes(event.detail?.type)) return;
      const current = getState();
      host.querySelectorAll('[data-set-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.setTheme===current.theme)));
      host.querySelectorAll('[data-set-wallpaper]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.setWallpaper===current.wallpaper)));
    };
    root.addEventListener('bear:workspace-change',syncChoices);
    disposers.set(windowID,()=>{ disposed=true;root.removeEventListener('bear:workspace-change',syncChoices);controller.abort(); });
    host.querySelectorAll('[data-set-language]').forEach(b => b.addEventListener('click', () => execute('language',{value:b.dataset.setLanguage})));
    host.querySelectorAll('[data-set-theme]').forEach(b => b.addEventListener('click', () => execute('theme',{value:b.dataset.setTheme})));
    host.querySelectorAll('[data-set-wallpaper]').forEach(b => b.addEventListener('click', () => execute('wallpaper',{value:b.dataset.setWallpaper})));
  }
  function render(win, host) {
    disposers.get(win.id)?.(); disposers.delete(win.id);
    if (win.app === 'welcome') {
      disposers.set(win.id, mountFinderHome({ root, host, catalog, execute, getState, escapeHTML, icon, payload: win.payload }));
    } else if (win.app === 'products') showProducts(host,win.payload,win.id);
    else if (win.app === 'reader') { if (win.payload && articleByURL(win.payload)) showReader(host,win.payload,win.id); else showLibrary(host,win.payload === 'growth' ? 'growth' : libraryView.filter); }
    else if (win.app === 'photos') media.renderPhotos(host,win.payload,win.id);
    else if (win.app === 'map') media.renderMap(host,win.payload,win.id);
    else if (win.app === 'books') host.innerHTML = `<div class="space-toolbar space-books-toolbar"><span>${t('熊鑫伟 · 自著','Written by Xinwei')}</span>${button('reader',t('文章目录','Writing'))}</div><div class="space-book-grid">${catalog.books.map((b,i) => `<article class="space-book"><div class="space-book__cover"><small class="space-book__number">BEAR / ${String(i+1).padStart(2,'0')}</small><strong>${html(b.title)}</strong><small class="space-book__author">${html(b.author)}</small></div><p>${html(b.description)}</p>${link(b.url,t('阅读《'+b.title+'》','Read '+b.title))}</article>`).join('')}</div>`;
    else if (win.app === 'notes') showNotes(host);
    else if (win.app === 'contact') showContact(host);
    else if (win.app === 'terminal') showTerminal(host);
    else if (win.app === 'agent') showAgent(host,win.id,win.payload);
    else if (win.app === 'settings') showSettings(host,win.id);
  }
  return { render, download, syncFavorite, dispose(id) { disposers.get(id)?.(); disposers.delete(id); media.dispose(id); } };
}
