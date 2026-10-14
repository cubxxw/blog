import { safeURL } from './state.mjs';
import { mountMedia } from './media.js';
import { mountAgent } from './agent-panel.js';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = escapeHTML;
export function mountApps({ root, catalog, execute, getState, updateNote, notify, icon }) {
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
    const href = safeURL(url, location.origin);
    return href ? `<a class="${className}" href="${html(href)}" target="_blank" rel="noopener noreferrer">${html(label)} ↗</a>` : '';
  };
  const button = (app, label, payload = '', className = 'space-button--secondary space-button') => `<button class="${className}" data-open="${html(app)}" data-payload="${html(payload)}">${html(label)}</button>`;
  const articles = catalog.articles || [];
  const documents = [...articles, ...(catalog.readingDocuments || [])];
  const articleByURL = value => documents.find(a => a.url === value);
  const productByID = value => catalog.products.find(p => p.id === value) || catalog.products[0];
  const listItem = (item, attrs) => `<button class="space-list-item" ${attrs}><small>${html(item.date || '')}</small><strong>${html(item.title || item.name)}</strong><span>${html(item.description || '').slice(0, 210)}</span></button>`;
  function showProducts(host, selectedID) {
    const selected = productByID(selectedID);
    host.innerHTML = `<div class="space-finder"><aside class="space-sidebar"><p>${t('产品目录','PRODUCTS')}</p>${catalog.products.map(p => `<button data-select-product="${html(p.id)}" aria-pressed="${p.id === selected.id}">${html(p.name)}</button>`).join('')}<p style="margin-top:22px">${t('继续探索','EXPLORE')}</p><button data-open="reader">${t('构建笔记','Build notes')}</button><button data-open="books">${t('我的书架','Books')}</button></aside><article class="space-product"><p class="space-eyebrow">${html(selected.stage)}</p><h2>${html(selected.name)}</h2><p>${html(selected.headline)}</p>${selected.image ? `<img class="space-product__shot" src="${html(selected.image)}" alt="${html(selected.alt)}" loading="lazy">` : ''}<p>${html(selected.description)}</p><div class="space-product__links">${link(selected.url,t('打开真实产品','Open the product'),'space-button')}${link(selected.demo,t('测试预览','Try the demo'))}${link(selected.github,t('源码','Source'))}</div>${selected.boundary ? `<p class="space-map__note">${t('当前边界：','Current boundary: ')}${html(selected.boundary)}</p>` : ''}${selected.related?.length ? `<h3 style="margin-top:24px">${t('从构建到思考','Related writing')}</h3>${selected.related.map(url => { const a = articleByURL(url); return a ? listItem(a,`data-open="reader" data-payload="${html(url)}"`) : ''; }).join('')}` : ''}</article></div>`;
    host.querySelectorAll('[data-select-product]').forEach(b => b.addEventListener('click', () => execute('open', { app: 'products', payload: b.dataset.selectProduct })));
  }
  function showLibrary(host, filter = libraryView.filter) {
    host.innerHTML = `<div class="space-toolbar"><span>${t('公开文章','Public writing')} / ${articles.length}</span><input data-library-query type="search" placeholder="${t('找一篇文章…','Find writing…')}" aria-label="${t('筛选文章','Filter writing')}"></div><div class="space-finder"><aside class="space-sidebar"><p>${t('阅读目录','LIBRARY')}</p>${[['all',t('全部文章','All writing')],['ai-agent','AI Agent'],['engineering',t('工程实践','Engineering')],['growth',t('思考与笔记','Thoughts')],['favorites',t('你的收藏','Your bookmarks')]].map(([id,label]) => `<button data-library-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}<p style="margin-top:22px">${t('你的空间','YOUR SPACE')}</p><button data-open="notes">${t('写点想法','Write a note')}</button><button data-open="books">${t('书架','Books')}</button></aside><div class="space-list" data-library-list></div></div>`;
    libraryView.filter = filter;
    const queryInput = host.querySelector('[data-library-query]');
    queryInput.maxLength = 200; queryInput.value = libraryView.query;
    const listHost = host.querySelector('[data-library-list]');
    const draw = () => {
      libraryView.query = queryInput.value; saveLibrary();
      const query = queryInput.value.toLocaleLowerCase();
      const list = (filter === 'favorites' ? documents : articles).filter(a => (filter === 'all' || a.section === filter || (filter === 'favorites' && getState().favorites.includes(a.url))) && `${a.title} ${a.description} ${(a.tags || []).join(' ')}`.toLocaleLowerCase().includes(query));
      host.querySelector('[data-library-list]').innerHTML = list.length ? list.map(a => listItem(a, `data-open="reader" data-payload="${html(a.url)}"`)).join('') : `<p class="space-app">${t('这里还没有条目。','No writing here yet.')}</p>`;
    };
    host.querySelector('[data-library-query]').addEventListener('input', draw);
    host.querySelectorAll('[data-library-filter]').forEach(b => b.addEventListener('click', () => { libraryView.scroll = 0; showLibrary(host, b.dataset.libraryFilter); }));
    listHost.addEventListener('scroll', () => { libraryView.scroll = listHost.scrollTop; saveLibrary(); }, { passive: true });
    draw(); listHost.scrollTop = libraryView.scroll;
  }
  async function showReader(host, url, windowID) {
    const article = articleByURL(url);
    if (!article) { showLibrary(host); return; }
    host.innerHTML = `<div class="space-toolbar">${button('reader',t('← 阅读目录','← Library'))}<div>${link(url,t('原文','Original'))}<button data-reader-favorite style="margin-left:14px">${getState().favorites.includes(url) ? '★' : '☆'} ${t('收藏','Save')}</button></div></div><div class="space-reader__title"><h2>${html(article.title)}</h2><p>${html(article.date)} · ${html(article.section)}</p></div><div class="space-reader__body" data-reader-body><p>${t('正在打开原文…','Opening the article…')}</p></div>`;
    host.querySelector('[data-reader-favorite]').addEventListener('click', event => {
      execute('favorite', { url });
      event.currentTarget.textContent = `${getState().favorites.includes(url) ? '★' : '☆'} ${t('收藏','Save')}`;
    });
    const controller = new AbortController();
    let disposed = false;
    disposers.set(windowID, () => { disposed = true; controller.abort(); });
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
    host.innerHTML = `<div class="space-app space-contact"><p class="space-eyebrow">SAY HELLO</p><h2>${t('有想法，就聊聊。','Have a thought? Say hello.')}</h2><p style="font-size:12px;color:var(--sp-muted)">${t('产品反馈、文章讨论，或者分享一段路上的故事。','Product feedback, a conversation about writing, or a story from the road.')}</p><div class="space-contact-links">${[['github','GitHub'],['x','X'],['zhihu','知乎'],['linkedin','LinkedIn'],['bilibili','Bilibili'],['youtube','YouTube'],['instagram','Instagram'],['polarsteps','Polarsteps']].map(([key,name]) => link(links[key],name)).join('')}</div><h3>${t('先写一张便笺','Write a little note')}</h3><textarea data-message-draft maxlength="6000" aria-label="${t('留言草稿','Message draft')}" placeholder="${t('想对我说什么？','What would you like to tell me?')}"></textarea><div class="space-contact__actions"><a class="space-button" data-contact-email>${t('通过邮件发给我','Send by email')} ↗</a><a data-contact-github target="_blank" rel="noopener noreferrer">${t('在 GitHub 公开留言','Leave a public GitHub message')} ↗</a>${link(links.whatsapp,'WhatsApp')}</div><p class="space-contact__hint">${t('草稿保存在你的浏览器。选择渠道后，由你确认发送；这里不会代发，也不会显示虚假的送达状态。','The draft stays in your browser. Choose a channel and confirm sending there.')}</p>${button('agent',t('想先了解我？和 AI 向导聊聊','Meet me through the AI guide'))}</div>`;
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
    const dispose = mountAgent({ host, catalog, execute, getState, notify });
    disposers.set(windowID, typeof dispose === 'function' ? dispose : () => dispose?.dispose?.());
    if (payload && typeof payload === 'string') {
      const editor = host.querySelector('textarea');
      if (editor) { editor.value = payload.slice(0, 4000); editor.focus({ preventScroll: true }); }
    }
  }
  function showSettings(host) {
    const s = getState();
    host.innerHTML = `<div class="space-settings"><p class="space-eyebrow">MAKE YOURSELF AT HOME</p><h2>${t('你的工作区，你来安排。','Make this workspace yours.')}</h2><h3>${t('语言','Language')}</h3><div class="space-settings__choices space-language" role="group" aria-label="${t('界面语言','Interface language')}">${[['zh','中文'],['en','English']].map(([value,label]) => `<button data-set-language="${value}" lang="${value}" aria-pressed="${catalog.language === value}">${label}<span aria-hidden="true">${catalog.language === value ? '✓' : ''}</span></button>`).join('')}</div><p class="space-language__hint">${t('切换语言，笔记和窗口会留在原处。','Change the language. Keep your notes and windows.')}</p><h3>${t('应用外观','Appearance')}</h3><div class="space-settings__choices">${[['light',t('经典浅色','Classic light')],['dark',t('深色','Dark')]].map(([value,label]) => `<button data-set-theme="${value}" aria-pressed="${s.theme === value}">${label}</button>`).join('')}</div><h3>${t('桌面颜色','Desktop color')}</h3><div class="space-settings__choices">${[['dawn',t('经典青绿','Classic teal')],['dusk',t('暮蓝','Evening blue')],['forest',t('鼠尾草','Sage')]].map(([value,label]) => `<button data-set-wallpaper="${value}" aria-pressed="${s.wallpaper === value}">${label}</button>`).join('')}</div><h3>${t('当前可用范围','Available here')}</h3>${[[t('窗口、笔记、收藏','Windows, notes, bookmarks'),t('当前浏览器保存','Saved in this browser')],[t('访客登录与跨设备同步','Sign-in and cross-device sync'),t('尚未接入','Not connected')],['Immich',media.status().connected ? t('公开相册已连接','Public albums connected') : t('在相册中加载公开内容','Load public content in Photos')],[t('Linux 沙盒','Linux sandbox'),'<span data-runtime-status>'+t('正在检查本地连接','Checking local connection')+'</span>']].map(([name,status]) => `<div class="space-capability"><span>${name}</span><small>${status}</small></div>`).join('')}<p>${t('工作区会记住你的布局和笔记。清除网站数据会移除它们，可以先导出一份。AI 向导可以读公开资料；不会替你发布内容或操作个人账户。','The workspace remembers your layout and notes. Clearing site data removes them; export a copy first. The AI guide reads public material and does not publish or operate personal accounts.')}</p><div style="margin-top:20px;display:flex;gap:10px"><button class="space-button" data-space-export>${t('导出工作区','Export workspace')}</button><button class="space-button space-button--secondary" data-space-arrange>${t('整理窗口','Arrange windows')}</button></div></div>`;
    fetch('/.netlify/functions/bear-runtime').then(r=>r.json()).then(data=>{const label=host.querySelector('[data-runtime-status]');if(label)label.textContent=data.available?t('已连接本地 Docker','Local Docker connected'):t('未连接（仅本地开发可用）','Disconnected (local development only)');}).catch(()=>{const label=host.querySelector('[data-runtime-status]');if(label)label.textContent=t('未连接','Disconnected');});
    host.querySelectorAll('[data-set-language]').forEach(b => b.addEventListener('click', () => execute('language',{value:b.dataset.setLanguage})));
    host.querySelectorAll('[data-set-theme]').forEach(b => b.addEventListener('click', () => { execute('theme',{value:b.dataset.setTheme}); showSettings(host); }));
    host.querySelectorAll('[data-set-wallpaper]').forEach(b => b.addEventListener('click', () => { execute('wallpaper',{value:b.dataset.setWallpaper}); showSettings(host); }));
  }
  function render(win, host) {
    disposers.get(win.id)?.(); disposers.delete(win.id);
    if (win.app === 'welcome') {
      host.innerHTML = `<article class="space-welcome space-app"><div class="space-onboarding"><p class="space-eyebrow">CUBXXW OS <span>PERSONAL SPACE / 01</span></p><div class="space-entry-art" data-space-entry-art aria-hidden="true"><div class="space-entry-cube"><i></i><i></i><i></i></div><span class="space-entry-orbit"></span></div><h2>${t('欢迎来到我的空间。','Welcome to my space.')}</h2><p class="space-welcome__intro">${t('我是熊鑫伟，写代码，做产品，也去路上走走。<br>我的作品、思考和旅途，都放在这里。','I’m Xinwei. I write code, build things, and wander.<br>Here are my projects, thoughts, and places along the way.')}</p><button class="space-button space-enter" data-enter-space>${t('进入空间','Enter Space')} <span aria-hidden="true">↗</span></button><p class="space-entry-hint">${t('从下面的 Dock 出发，或让 AI 向导带你逛逛。','Start with the Dock, or ask the AI guide to show you around.')}</p><div class="space-welcome__routes">${[['reader',t('文章','Writing')],['products',t('作品','Projects')],['agent',t('AI 向导','AI guide')]].map(([app,title]) => `<button data-open="${app}">${title}<span aria-hidden="true">↗</span></button>`).join('')}</div></div><footer class="space-welcome__foot"><span>Xinwei Xiong / cubxxw</span><button data-open="welcome" data-payload="identity">${t('关于我','About me')} ↗</button></footer></article>`;
      host.querySelector('[data-enter-space]').addEventListener('click', () => execute('enter'));
      const template = root.querySelector('[data-space-profile-template]');
      if (template) {
        const profile = template.content.cloneNode(true);
        // Desktop routes use data-profile-section. Keep native fragment focus
        // from stealing a restored window when the interface language changes.
        const ids = new Set([...profile.querySelectorAll('[data-profile-section][id]')].map(element => element.id));
        profile.querySelectorAll('[data-profile-section][id]').forEach(element => { element.id = `space-profile-${element.id}`; });
        profile.querySelectorAll('a[href^="#"]').forEach(link => { if (ids.has(link.hash.slice(1))) link.setAttribute('href', `#space-profile-${link.hash.slice(1)}`); });
        host.querySelector('.space-welcome').append(profile);
      }
      const reveal = payload => {
        const profile = host.querySelector('[data-space-profile]');
        const target = [...host.querySelectorAll('[data-profile-section]')].find(element => element.dataset.profileSection === payload);
        if (!profile || !target) return;
        profile.open = true;
        if (payload === 'start-here') target.querySelector('details')?.setAttribute('open', '');
        target.tabIndex = -1;
        requestAnimationFrame(() => {
          if (host.isConnected && getState().active === 'welcome') {
            target.scrollIntoView({ block: 'start', behavior: 'instant' });
            target.focus({ preventScroll: true });
          }
        });
      };
      host.querySelectorAll('[data-profile-target]').forEach(control => control.addEventListener('click', () => reveal(control.dataset.profileTarget)));
      host.querySelector('.space-welcome__foot [data-payload="identity"]').addEventListener('click', () => reveal('identity'));
      if (win.payload) reveal(win.payload);
    } else if (win.app === 'products') showProducts(host,win.payload);
    else if (win.app === 'reader') { if (win.payload && articleByURL(win.payload)) showReader(host,win.payload,win.id); else showLibrary(host,win.payload === 'growth' ? 'growth' : libraryView.filter); }
    else if (win.app === 'photos') media.renderPhotos(host,win.payload,win.id);
    else if (win.app === 'map') media.renderMap(host,win.payload,win.id);
    else if (win.app === 'books') host.innerHTML = `<div class="space-toolbar"><span>${t('熊鑫伟 · 自著','Written by Xinwei')}</span>${button('reader',t('文章目录','Writing'))}</div><div class="space-book-grid">${catalog.books.map((b,i) => `<article class="space-book"><div class="space-book__cover"><small>BEAR / ${String(i+1).padStart(2,'0')}</small><strong>${html(b.title)}</strong><small style="margin-top:17px">${html(b.author)}</small></div><p>${html(b.description)}</p>${link(b.url,t('开始阅读','Start reading'))}</article>`).join('')}</div>`;
    else if (win.app === 'notes') showNotes(host);
    else if (win.app === 'contact') showContact(host);
    else if (win.app === 'terminal') showTerminal(host);
    else if (win.app === 'agent') showAgent(host,win.id,win.payload);
    else if (win.app === 'settings') showSettings(host);
  }
  return { render, download, dispose(id) { disposers.get(id)?.(); disposers.delete(id); media.dispose(id); } };
}
