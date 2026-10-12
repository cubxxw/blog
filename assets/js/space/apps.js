import { safeURL } from './state.mjs';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = escapeHTML;
export function mountApps({ root, catalog, execute, getState, updateNote, notify, icon }) {
  const zh = catalog.language === 'zh';
  const t = (cn, en) => zh ? cn : en;
  const disposers = new Map();
  const link = (url, label, className = '') => {
    const href = safeURL(url, location.origin);
    return href ? `<a class="${className}" href="${html(href)}" target="_blank" rel="noopener noreferrer">${html(label)} ↗</a>` : '';
  };
  const button = (app, label, payload = '', className = 'space-button--secondary space-button') => `<button class="${className}" data-open="${html(app)}" data-payload="${html(payload)}">${html(label)}</button>`;
  const articles = catalog.articles || [];
  const articleByURL = value => articles.find(a => a.url === value);
  const productByID = value => catalog.products.find(p => p.id === value) || catalog.products[0];
  const photoByID = value => catalog.photos.find(p => p.id === value) || catalog.photos[0];
  const listItem = (item, attrs) => `<button class="space-list-item" ${attrs}><small>${html(item.date || '')}</small><strong>${html(item.title || item.name)}</strong><span>${html(item.description || '').slice(0, 210)}</span></button>`;
  function showProducts(host, selectedID) {
    const selected = productByID(selectedID);
    host.innerHTML = `<div class="space-finder"><aside class="space-sidebar"><p>${t('产品目录','PRODUCTS')}</p>${catalog.products.map(p => `<button data-select-product="${html(p.id)}" aria-pressed="${p.id === selected.id}">${html(p.name)}</button>`).join('')}<p style="margin-top:22px">${t('继续探索','EXPLORE')}</p><button data-open="reader">${t('构建笔记','Build notes')}</button><button data-open="books">${t('我的书架','Books')}</button></aside><article class="space-product"><p class="space-eyebrow">${html(selected.stage)}</p><h2>${html(selected.name)}</h2><p>${html(selected.headline)}</p>${selected.image ? `<img class="space-product__shot" src="${html(selected.image)}" alt="${html(selected.alt)}" loading="lazy">` : ''}<p>${html(selected.description)}</p><div class="space-product__links">${link(selected.url,t('打开真实产品','Open the product'),'space-button')}${link(selected.demo,t('测试预览','Try the demo'))}${link(selected.github,t('源码','Source'))}</div>${selected.boundary ? `<p class="space-map__note">${t('当前边界：','Current boundary: ')}${html(selected.boundary)}</p>` : ''}${selected.related?.length ? `<h3 style="margin-top:24px">${t('从构建到思考','Related writing')}</h3>${selected.related.map(url => { const a = articleByURL(url); return a ? listItem(a,`data-open="reader" data-payload="${html(url)}"`) : ''; }).join('')}` : ''}</article></div>`;
    host.querySelectorAll('[data-select-product]').forEach(b => b.addEventListener('click', () => execute('open', { app: 'products', payload: b.dataset.selectProduct })));
  }
  function showLibrary(host, filter = 'all') {
    host.innerHTML = `<div class="space-toolbar"><span>${t('公开文章','Public writing')} / ${articles.length}</span><input data-library-query type="search" placeholder="${t('找一篇文章…','Find writing…')}" aria-label="${t('筛选文章','Filter writing')}"></div><div class="space-finder"><aside class="space-sidebar"><p>${t('阅读目录','LIBRARY')}</p>${[['all',t('全部文章','All writing')],['ai-agent','AI Agent'],['engineering',t('工程实践','Engineering')],['growth',t('思考与笔记','Thoughts')],['favorites',t('你的收藏','Your bookmarks')]].map(([id,label]) => `<button data-library-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}<p style="margin-top:22px">${t('你的空间','YOUR SPACE')}</p><button data-open="notes">${t('写点想法','Write a note')}</button><button data-open="books">${t('书架','Books')}</button></aside><div class="space-list" data-library-list></div></div>`;
    const draw = () => {
      const query = host.querySelector('[data-library-query]').value.toLocaleLowerCase();
      const list = articles.filter(a => (filter === 'all' || a.section === filter || (filter === 'favorites' && getState().favorites.includes(a.url))) && `${a.title} ${a.description} ${(a.tags || []).join(' ')}`.toLocaleLowerCase().includes(query));
      host.querySelector('[data-library-list]').innerHTML = list.length ? list.map(a => listItem(a, `data-open="reader" data-payload="${html(a.url)}"`)).join('') : `<p class="space-app">${t('这里还没有条目。','No writing here yet.')}</p>`;
    };
    host.querySelector('[data-library-query]').addEventListener('input', draw);
    host.querySelectorAll('[data-library-filter]').forEach(b => b.addEventListener('click', () => showLibrary(host, b.dataset.libraryFilter)));
    draw();
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
  function showPhotos(host, selectedID) {
    if (selectedID && catalog.photos.some(p => p.id === selectedID)) {
      const p = photoByID(selectedID);
      host.innerHTML = `<div class="space-photo-frame"><img src="${html(p.image)}" alt="${html(p.place)}"><div class="space-photo-caption"><div><strong>${html(p.title)}</strong><span>${html(p.place)} · ${t('熊鑫伟 摄','Photo by Xinwei')}</span></div><button data-open="map" data-payload="${html(p.region)}">${t('在地图上看','See the place')} ↗</button></div><div style="margin-top:10px">${button('photos',t('所有照片','All photos'))}</div></div>`;
    } else {
      host.innerHTML = `<div class="space-toolbar"><span>${t('旅途相册','Travel photos')} / ${catalog.photos.length}</span>${button('map',t('去过的地方','Places'))}</div><div class="space-gallery">${catalog.photos.map(p => `<button data-open="photos" data-payload="${html(p.id)}"><img src="${html(p.thumb)}" alt="${html(p.place)}" loading="lazy"><strong>${html(p.title)}</strong><span>${html(p.place)}</span></button>`).join('')}</div>`;
    }
  }
  function showMap(host, placeID) {
    const place = catalog.places.find(p => p.id === placeID) || catalog.places[0];
    const related = catalog.photos.filter(p => p.region === place.id);
    const matches = articles.filter(a => place.match.some(term => `${a.title} ${a.description} ${(a.tags || []).join(' ')}`.includes(term))).slice(0, 4);
    host.innerHTML = `<div class="space-map"><p class="space-eyebrow">PLACES / FIELD NOTES</p><div class="space-map__canvas"><svg viewBox="0 0 720 420" aria-hidden="true"><defs><pattern id="map-grid" width="36" height="30" patternUnits="userSpaceOnUse"><path d="M36 0H0V30" fill="none" stroke="#8fa689" stroke-opacity=".2" stroke-width=".5"/></pattern></defs><rect width="720" height="420" fill="url(#map-grid)"/><g fill="#b4c7a5" stroke="#8ca380" stroke-width="1"><path d="m44 89 54-33 71 11 40 38-17 35-41 5-34 39-29-13-21-38zM165 203l55 14 22 41-17 51-26 50-18-33-2-63-22-27zM322 98l45-24 32 8 16 31-33 25-38-6zM331 157l60 1 31 44-31 73-27 5-25-45-20-38zM399 86l64-18 97 32 54-1 59 60-41 26-50-7-40 26-39-15-28 25-17-30-24-4-6-51-25-12zM541 249l41 3 35 26 4 30-56 11-31-38zM270 375l160-6 200 21-6 11H234z"/></g></svg>${catalog.places.map(p => `<button class="space-map__pin" data-place="${html(p.id)}" style="left:${((p.lon + 180)/360*100).toFixed(2)}%;top:${((90-p.lat)/180*100).toFixed(2)}%">${html(p.name)}</button>`).join('')}</div><div class="space-map__detail"><h3>${html(place.name)}</h3><p>${html(place.description)}</p><div class="space-map__photos">${related.map(p => `<button data-open="photos" data-payload="${html(p.id)}" aria-label="${html(p.title)}"><img src="${html(p.thumb)}" alt="${html(p.place)}" loading="lazy"></button>`).join('')}</div>${matches.map(a => listItem(a,`data-open="reader" data-payload="${html(a.url)}"`)).join('')}</div><p class="space-map__note">${t('目前展示博客已公开的旅行区域。标记代表区域，不是照片拍摄坐标；Immich 尚未接入。','These are travel regions already public on the blog, not photo GPS coordinates. Immich is not connected yet.')}</p></div>`;
    host.querySelectorAll('[data-place]').forEach(b => b.addEventListener('click', () => execute('open', { app: 'map', payload: b.dataset.place })));
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
    const sync = () => {
      execute('draft', { text: draft.value });
      host.querySelector('[data-contact-email]').href = `mailto:${links.email}?subject=${encodeURIComponent('Hello from BEAR Space')}&body=${encodeURIComponent(draft.value)}`;
      host.querySelector('[data-contact-github]').href = `https://github.com/cubxxw/blog/issues/new?title=${encodeURIComponent('Hello from BEAR Space')}&body=${encodeURIComponent(draft.value)}`;
    }; draft.addEventListener('input', sync); sync();
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
  function showAgent(host, windowID) {
    host.innerHTML = `<div class="space-agent"><header class="space-agent__header"><strong>✳ BEAR / ${t('AI 向导','AI guide')}</strong><p>${t('从公开文章了解我，也能帮你打开工作区应用。真人联系在「联系与留言」。','Explore public writing and open workspace apps. Contact Xinwei in Contact.')}</p></header><div class="space-agent__messages"><div class="space-message">${t('欢迎来坐坐。你想看我做的产品、读些思考，还是去路上看看？','Welcome. Would you like to explore my products, writing, or places?')}</div><div class="space-agent__quick">${button('products',t('看看产品','Explore products'))}${button('reader',t('读点思考','Read some writing'),'growth')}${button('map',t('去路上看看','Explore places'))}</div><div data-chat-log></div></div><div class="space-agent__form"><form><textarea aria-label="${t('给 AI 向导的消息','Message the AI guide')}" maxlength="4000" placeholder="${t('聊聊你感兴趣的事…','What are you curious about?')}"></textarea><button class="space-button" data-agent-send>${t('发送','Send')} ↑</button><button type="button" data-agent-stop hidden>${t('停止','Stop')}</button></form><p class="space-agent__status" data-agent-status>${t('AI 回答来自博客服务；工作区操作在本地执行。','AI answers use the blog service; workspace actions run locally.')}</p></div></div>`;
    const form = host.querySelector('form'), input = host.querySelector('textarea'), log = host.querySelector('[data-chat-log]'), status = host.querySelector('[data-agent-status]'), stop = host.querySelector('[data-agent-stop]'), send = host.querySelector('[data-agent-send]');
    let controller; const history = [];
    disposers.set(windowID, () => controller?.abort());
    const append = (role,text) => { const p = document.createElement('div'); p.className = 'space-message'; p.dataset.role = role; p.textContent = text; log.append(p); p.scrollIntoView({ block: 'nearest' }); return p; };
    stop.addEventListener('click', () => controller?.abort());
    form.addEventListener('submit', async event => {
      event.preventDefault(); const question = input.value.trim(); if (!question || controller) return;
      input.value = ''; append('user',question);
      const match = question.match(/^(?:open|打开)\s*(.+)$/i);
      const run = question.match(/^(?:run|运行)\s+(.+)$/s);
      if (run) { const answer=append('assistant',t('正在本地沙盒执行…','Running in the local sandbox…')); send.disabled=true; try{answer.textContent=await execute('run',{command:run[1]});}finally{send.disabled=false;}return; }
      if (match) {
        const app = Object.keys(catalog.labels).find(id => id === match[1].trim() || catalog.labels[id] === match[1].trim());
        if (app) { execute('open',{app}); append('assistant',t(`已打开「${catalog.labels[app]}」。`,`Opened ${catalog.labels[app]}.`)); return; }
      }
      controller = new AbortController(); const timeout = setTimeout(() => controller?.abort(), 55000);
      stop.hidden = false; send.disabled = true;
      status.textContent = t('正在检索公开文章…','Searching public writing…');
      const answer = append('assistant',''); let buffer = '', content = '';
      try {
        const response = await fetch('/.netlify/functions/blog-ai', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ question, language:catalog.language, context:history.slice(-8), stream:true }), signal:controller.signal });
        if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('AI unavailable');
        const reader = response.body.getReader(), decoder = new TextDecoder();
        while (true) {
          const part = await reader.read(); if (part.done) break;
          buffer += decoder.decode(part.value,{stream:true});
          const lines = buffer.split('\n'); buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
            let data; try { data = JSON.parse(line.slice(6)); } catch { continue; }
            if (data.error) throw new Error('AI upstream failed');
            if (data.delta) { content += data.delta; answer.textContent = content; }
            if (data.status) status.textContent = data.status.label || t('正在阅读…','Reading…');
          }
        }
        if (!content) throw new Error('Empty response');
        history.push({role:'user',content:question},{role:'assistant',content});
        status.textContent = t('回答完成。可以继续追问。','Ready for your next question.');
      } catch (error) {
        if (error.name === 'AbortError') { answer.textContent = content || t('已停止。','Stopped.'); status.textContent = t('这次回答已停止或超时。','Stopped or timed out.'); }
        else { answer.textContent = t('AI 服务暂时不可用。你仍可以直接探索文章与产品，或者联系我。','The AI service is unavailable. You can still explore the writing and products, or contact me.'); status.textContent = t('未收到有效回答。','No valid answer received.'); }
      } finally { clearTimeout(timeout); controller = null; stop.hidden = true; send.disabled = false; }
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  }
  function showSettings(host) {
    const s = getState();
    host.innerHTML = `<div class="space-settings"><p class="space-eyebrow">MAKE YOURSELF AT HOME</p><h2>${t('你的工作区，你来安排。','Make this workspace yours.')}</h2><h3>${t('应用外观','Appearance')}</h3><div class="space-settings__choices">${[['light',t('晨光','Light')],['dark',t('夜读','Dark')]].map(([value,label]) => `<button data-set-theme="${value}" aria-pressed="${s.theme === value}">${label}</button>`).join('')}</div><h3>${t('窗外的风景','Wallpaper')}</h3><div class="space-settings__choices">${[['dawn',t('山间晨光','Mountain dawn')],['dusk',t('薄暮','Dusk')],['forest',t('林间','Forest')]].map(([value,label]) => `<button data-set-wallpaper="${value}" aria-pressed="${s.wallpaper === value}">${label}</button>`).join('')}</div><h3>${t('当前可用范围','Available here')}</h3>${[[t('窗口、笔记、收藏','Windows, notes, bookmarks'),t('当前浏览器保存','Saved in this browser')],[t('访客登录与跨设备同步','Sign-in and cross-device sync'),t('尚未接入','Not connected')],['Immich',t('尚未接入','Not connected')],[t('Linux 沙盒','Linux sandbox'),'<span data-runtime-status>'+t('正在检查本地连接','Checking local connection')+'</span>']].map(([name,status]) => `<div class="space-capability"><span>${name}</span><small>${status}</small></div>`).join('')}<p>${t('工作区会记住你的布局和笔记。清除网站数据会移除它们，可以先导出一份。AI 向导可以读公开资料；不会替你发布内容或操作个人账户。','The workspace remembers your layout and notes. Clearing site data removes them; export a copy first. The AI guide reads public material and does not publish or operate personal accounts.')}</p><div style="margin-top:20px;display:flex;gap:10px"><button class="space-button" data-space-export>${t('导出工作区','Export workspace')}</button><button class="space-button space-button--secondary" data-space-arrange>${t('整理窗口','Arrange windows')}</button></div></div>`;
    fetch('/.netlify/functions/bear-runtime').then(r=>r.json()).then(data=>{const label=host.querySelector('[data-runtime-status]');if(label)label.textContent=data.available?t('已连接本地 Docker','Local Docker connected'):t('未连接（仅本地开发可用）','Disconnected (local development only)');}).catch(()=>{const label=host.querySelector('[data-runtime-status]');if(label)label.textContent=t('未连接','Disconnected');});
    host.querySelectorAll('[data-set-theme]').forEach(b => b.addEventListener('click', () => { execute('theme',{value:b.dataset.setTheme}); showSettings(host); }));
    host.querySelectorAll('[data-set-wallpaper]').forEach(b => b.addEventListener('click', () => { execute('wallpaper',{value:b.dataset.setWallpaper}); showSettings(host); }));
  }
  function render(win, host) {
    disposers.get(win.id)?.(); disposers.delete(win.id);
    if (win.app === 'welcome') {
      host.innerHTML = `<article class="space-welcome space-app"><p class="space-eyebrow">A LITTLE WINDOW INTO MY WORLD</p><img class="space-welcome__avatar" src="/images/cubxxw-avatar-96.webp" alt="${t('熊鑫伟的头像插画','Illustrated portrait of Xinwei')}"><h2>${t('嗨，我是熊鑫伟。<br>欢迎来我的空间坐坐。','Hi, I’m Xinwei.<br>Welcome to my little corner.')}</h2><p class="space-welcome__intro">${t('写代码，做产品，也去山里走走。<br>这里放着我在做的东西、写下的想法，<br>还有一些路上的照片。','I write code, build products, and wander into the mountains.<br>Here are the things I’m making, the thoughts I’m writing down,<br>and a few photographs from the road.')}</p><div class="space-welcome__routes">${[['products',t('看看我在做什么','See what I’m making'),t('真实产品与构建记录','Products & build notes')],['reader',t('读一篇文章','Find something to read'),t('AI、工程，还有生活','AI, engineering & life')],['map',t('去路上看看','Explore the places'),t('照片、地图与游记','Photos & travel writing')],['contact',t('留句话给我','Leave me a note'),t('说声你好，也挺好','A hello is always welcome')]].map(([app,title,desc]) => `<button data-open="${app}"><strong>${title}<b>↗</b></strong><span>${desc}</span></button>`).join('')}</div><footer class="space-welcome__foot"><span>cubxxw / ${html(catalog.person.jobTitle)}</span>${link(catalog.links.about,t('完整介绍','More about me'))}</footer></article>`;
    } else if (win.app === 'products') showProducts(host,win.payload);
    else if (win.app === 'reader') { if (win.payload && articleByURL(win.payload)) showReader(host,win.payload,win.id); else showLibrary(host,win.payload === 'growth' ? 'growth' : 'all'); }
    else if (win.app === 'photos') showPhotos(host,win.payload);
    else if (win.app === 'map') showMap(host,win.payload);
    else if (win.app === 'books') host.innerHTML = `<div class="space-toolbar"><span>${t('熊鑫伟 · 自著','Written by Xinwei')}</span>${button('reader',t('文章目录','Writing'))}</div><div class="space-book-grid">${catalog.books.map((b,i) => `<article class="space-book"><div class="space-book__cover"><small>BEAR / ${String(i+1).padStart(2,'0')}</small><strong>${html(b.title)}</strong><small style="margin-top:17px">${html(b.author)}</small></div><p>${html(b.description)}</p>${link(b.url,t('开始阅读','Start reading'))}</article>`).join('')}</div>`;
    else if (win.app === 'notes') showNotes(host);
    else if (win.app === 'contact') showContact(host);
    else if (win.app === 'terminal') showTerminal(host);
    else if (win.app === 'agent') showAgent(host,win.id);
    else if (win.app === 'settings') showSettings(host);
  }
  return { render, download, dispose(id) { disposers.get(id)?.(); disposers.delete(id); } };
}
