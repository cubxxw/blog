import { languageDestination, handoffEntryFocus } from './entry.mjs';
import { mountCafe } from './cafe.js';
import { mountFullscreen } from './fullscreen.js';
import { mountClassicDesktop } from './classic-desktop.js';
import { cafeTheme } from './cafe.mjs';
import { publicFocus } from './companion.mjs';
import { APPS, createWorkspace, reduceWorkspace, serializeWorkspace, fitRect, planWindowArrangement } from './state.mjs';
import { mountApps, escapeHTML } from './apps.js';
import { findApplications, searchWorkspace, resultIndex, isEditableTarget, escapeAction, resolveSpaceRoute } from './navigation.mjs';
import { usesSingleWindow } from './reading-layout.mjs';

const root = document.querySelector('[data-bear-workspace]');
// Space belongs to a full page. Its own browser may show the blog, whose links
// must never boot another room, sound engine or WebGL context inside the Mac.
if (root && window.parent===window) mountDesktop(root);
function mountDesktop(root) {
  mountFullscreen(root);
  const catalog = JSON.parse(root.querySelector('[data-space-catalog]').textContent);
  const readingURLs = new Set([...catalog.articles,...(catalog.readingDocuments || [])].map(article=>article.url));
  const productRoot = root.closest('[data-product-space]');
  const labels = catalog.labels, zh = catalog.language === 'zh';
  const t = (cn,en) => zh ? cn : en;
  const layer = root.querySelector('[data-space-windows]');
  const viewport = () => {
    const screen=root.querySelector('.jiangnan-workspace');
    const framed=root.dataset.computerView==='framed'&&root.dataset.cafeMode==='desktop'&&screen;
    const width=framed?screen.clientWidth:root.clientWidth,height=framed?screen.clientHeight:root.clientHeight;
    return {width,height:Math.max(240,height-(root.clientWidth<=640?44:32))};
  };
  mountClassicDesktop({root,execute,notify});
  const stateViewport = () => usesSingleWindow(root.clientWidth) ? { width: 10000, height: 10000 } : viewport();
  const storageKey = 'bear-space:v1';
  let saved, saveFailure = false;
  try { saved = localStorage.getItem(storageKey); } catch { saveFailure = true; }
  let state = createWorkspace(saved,stateViewport());
  const nodes = new Map();
  let onboarding = false, cafe, readingFocus = false;
  let companionFocus = null;
  const entryURL = new URL(location.href);
  let localeResume = entryURL.searchParams.get('space-resume') === catalog.language;
  try { localeResume = localeResume || sessionStorage.getItem('space:locale-resume') === catalog.language; sessionStorage.removeItem('space:locale-resume'); } catch {}
  if (entryURL.searchParams.get('space-resume') === catalog.language) { entryURL.searchParams.delete('space-resume'); history.replaceState(null,'',entryURL.pathname+entryURL.search+entryURL.hash); }
  const completeEntry = () => { onboarding = false; root.removeAttribute('data-onboarding'); try { sessionStorage.setItem('space:visited:v2', 'yes'); } catch {} };
  let toastTimer, searchIndex = 0, drag = null;
  const search = root.querySelector('[data-space-search]');
  const searchInput = root.querySelector('[data-space-search-input]');
  const overview = root.querySelector('[data-space-overview]');
  const launchpad = root.querySelector('[data-space-launchpad]');
  const launchpadInput = root.querySelector('[data-space-launchpad-input]');
  const dialogFocus = new WeakMap();
  const menu = root.querySelector('[data-space-menu-trigger]');
  const menuPanel = root.querySelector('.space-menu');
  let lab, knowledge, knowledgePending = false, knowledgeGeneration = 0;
  const icon = app => root.querySelector('[data-space-icons]').content.querySelector(`[data-app-icon="${app}"] .space-icon`)?.outerHTML || '';
  function notify(message) {
    const toast = root.querySelector('[data-space-toast]'); toast.textContent = message; toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; },4000);
  }
  const apps = mountApps({ root,catalog,execute,getState:()=>state,getContext:()=>companionFocus,getStorageStatus:()=>!saveFailure,updateNote:text=>update({type:'note',text},false),notify,icon });
  root.addEventListener('bear:agent-status',event=>{
    const button=root.querySelector('[data-space-dock] [data-open="agent"]');
    if(button){button.dataset.agentState=event.detail.state;button.title=t('空间助手','Space companion')+' · '+({working:t('进行中','Working'),waiting:t('等待确认','Approval needed'),done:t('已完成','Done'),error:t('未完成','Failed'),stopped:t('已停止','Stopped'),idle:t('就绪','Ready')}[event.detail.state] || '');}
  });
  function persist() {
    try { localStorage.setItem(storageKey,serializeWorkspace(state)); saveFailure=false; return true; }
    catch { if (!saveFailure) notify(t('浏览器未能保存。请导出一份笔记。','Browser storage failed. Please export your notes.')); saveFailure = true; return false; }
  }
  function title(win) {
    if (win.app === 'products' && win.payload) return catalog.products.find(p => p.id === win.payload)?.name || labels.products;
    if (win.app === 'reader' && win.payload) return [...catalog.articles, ...(catalog.readingDocuments || [])].find(a => a.url === win.payload)?.title || labels.reader;
    if (win.app === 'photos' && win.payload) return catalog.photos.find(p => p.id === win.payload)?.title || labels.photos;
    return labels[win.app];
  }
  function update(action, redraw = true) {
    state = reduceWorkspace(state,action,stateViewport());
    const saved=persist(); if (redraw) render();
    root.dispatchEvent(new CustomEvent('bear:workspace-change',{ detail:{type:action.type,active:state.active} }));
    return saved;
  }
  function arrangementLabel(plan) {
    if (plan.mode === 'overview') return t('窗口概览','Window overview');
    return plan.rectangles.length === 1 ? t('适应工作区','Fit window') : t('窗口并排','Arrange windows');
  }
  const arrangementPlan = () => usesSingleWindow(root.clientWidth) || root.dataset.readingFocus === 'true' ? {mode:'overview',rectangles:[]} : planWindowArrangement(state,viewport());
  function syncArrangementControls() {
    const plan = arrangementPlan(), label = arrangementLabel(plan);
    root.querySelectorAll('[data-window-action="arrange"],[data-space-arrange]').forEach(button => {
      button.setAttribute('aria-label',label); button.title = label;
      if (plan.mode === 'overview') button.setAttribute('aria-haspopup','dialog');
      else button.removeAttribute('aria-haspopup');
      if (button.hasAttribute('data-space-arrange')) {
        button.textContent = label;
        // Overview already has a dedicated menu entry. Keep one visible path
        // instead of presenting two identical actions when tiling cannot fit.
        const hide = menuPanel.contains(button) && plan.mode === 'overview';
        if (hide && document.activeElement === button) menuPanel.querySelector('[data-space-overview-trigger]')?.focus({preventScroll:true});
        button.hidden = hide;
      }
    });
  }
  function arrangeWindows() {
    // Phones use a virtual stateViewport to preserve desktop rectangles.
    // Capacity is always based on the actual visible desktop instead.
    const plan = arrangementPlan();
    if (plan.mode === 'overview') { showOverview(); return t('已打开窗口概览。','Window overview opened.'); }
    update({type:'arrange'});
    return plan.rectangles.length === 1 ? t('窗口已适应工作区。','Window fitted to the workspace.') : t('窗口已并排。','Windows arranged.');
  }
  function render() {
    root.dataset.theme = state.theme; root.dataset.wallpaper = state.wallpaper;
    root.dataset.workspaceLayout = usesSingleWindow(root.clientWidth) ? 'single' : 'windows';
    const focusedReader = state.windows.find(win => win.app === 'reader' && readingURLs.has(win.payload) && !win.minimized);
    if (!focusedReader) readingFocus = false;
    root.dataset.readingFocus = String(readingFocus && state.active === focusedReader?.id);
    for (const [id,entry] of nodes) {
      if (!state.windows.some(w => w.id === id)) { apps.dispose(id); entry.el.remove(); nodes.delete(id); }
    }
    state.windows.forEach((win,index) => {
      let entry = nodes.get(win.id);
      if (!entry) {
        const el = document.createElement('section'); el.className = 'space-window'; el.dataset.spaceWindow = win.id;
        if(win.app==='agent')el.dataset.companionMode='compact';
        el.setAttribute('role','region'); el.tabIndex = -1;
        el.innerHTML = `<header class="space-window__bar" data-window-drag><div class="space-window-controls"><button type="button" data-window-action="close" aria-label="${t('关闭窗口','Close window')}"></button><button type="button" data-window-action="minimize" aria-label="${t('最小化窗口','Minimize window')}"></button><button type="button" data-window-action="maximize" aria-label="${t('最大化或恢复窗口','Maximize or restore window')}"></button></div><strong></strong><button class="space-window__layout" type="button" data-window-action="arrange" aria-label="${t('窗口并排','Arrange windows')}">◫</button></header><div class="space-window__body" data-window-body></div><div class="space-resize" data-window-resize="se"></div><div class="space-resize" data-window-resize="e"></div><div class="space-resize" data-window-resize="s"></div>`;
        layer.append(el); entry = { el,payload:null }; nodes.set(win.id,entry);
      }
      const {el} = entry;
      el.hidden = win.minimized || (onboarding && win.app !== 'welcome'); el.dataset.active = String(win.id === state.active);
      el.dataset.app = win.app;
      const name = title(win); el.setAttribute('aria-label',name); el.querySelector('header strong').textContent = name;
      const rect = win.maximized ? { x:8,y:8,width:viewport().width-16,height:viewport().height-108 } : win.rect;
      Object.assign(el.style,{ left:'0px',top:'0px',width:`${rect.width}px`,height:`${rect.height}px`,transform:`translate(${rect.x}px,${rect.y}px)`,zIndex:String(10+index) });
      el.dataset.maximized = String(win.maximized);
      if(entry.rendered&&win.app==='browser'&&entry.payload!==win.payload){apps.navigateBrowser(win.id,win.payload);entry.payload=win.payload;}
      else if (entry.payload !== win.payload || !entry.rendered) {
        apps.render(win,el.querySelector('[data-window-body]')); entry.payload = win.payload; entry.rendered = true;
      }
    });
    root.querySelector('[data-active-label]').textContent = state.windows.find(w => w.id === state.active)?.app ? labels[state.windows.find(w => w.id === state.active).app] : t('工作区','Workspace');
    root.querySelector('[data-mac-active-app]').textContent=state.active&&state.active!=='welcome'?labels[state.windows.find(w=>w.id===state.active)?.app]||'Finder':'Finder';
    root.querySelectorAll('[data-space-dock] [data-open]').forEach(button => {
      const app = button.dataset.open;
      button.toggleAttribute('data-running',state.windows.some(w => w.app === app));
      button.toggleAttribute('data-active',state.windows.some(w => w.id === state.active && w.app === app));
      if (state.windows.some(w => w.id === state.active && w.app === app)) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    if (launchpad.open) drawLaunchpad();
    syncReadingFocus();
    syncArrangementControls();
  }
  function syncReadingFocus() {
    root.querySelectorAll('[data-reader-focus]').forEach(button => {
      button.setAttribute('aria-pressed',String(readingFocus));
      button.textContent=readingFocus?t('退出专注','Exit focus'):t('专注阅读','Focus');
      button.title=readingFocus?t('退出专注阅读（Esc）','Exit reading focus (Esc)'):t('展开文章，专注阅读','Expand the article for focused reading');
    });
  }
  function setReadingFocus(value) {
    const scroller=nodes.get('reader')?.el.querySelector('[data-window-body]');
    const articleBody=scroller?.querySelector('[data-reader-body]'),selected=window.getSelection();
    const endpoints=selected?.rangeCount&&!selected.isCollapsed&&articleBody?.contains(selected.anchorNode)&&articleBody.contains(selected.focusNode)?{anchor:selected.anchorNode,anchorOffset:selected.anchorOffset,focus:selected.focusNode,focusOffset:selected.focusOffset}:null;
    const top=scroller?.getBoundingClientRect().top || 0;
    const anchor=scroller && [...scroller.querySelectorAll('[data-reader-body] .post-content > *')].find(node=>node.getBoundingClientRect().bottom>top+64);
    const offset=anchor?anchor.getBoundingClientRect().top-top:0;
    readingFocus=value;render();
    if(anchor?.isConnected&&scroller)scroller.scrollTop+=anchor.getBoundingClientRect().top-scroller.getBoundingClientRect().top-offset;
    root.querySelector('[data-space-window="reader"] [data-reader-focus]')?.focus({preventScroll:true});
    if(endpoints&&articleBody?.contains(endpoints.anchor)&&articleBody.contains(endpoints.focus))selected.setBaseAndExtent(endpoints.anchor,endpoints.anchorOffset,endpoints.focus,endpoints.focusOffset);
  }
  function open(app,payload) {
    if (!APPS.includes(app)) return t('没有这个应用。','Unknown application.');
    const entering=cafe?.enterDesktop();
    if (app !== 'welcome') completeEntry();
    const previous = state.windows.find(w => w.app === app);
    if(app==='agent' && state.active !== 'agent')companionFocus=publicFocus(state,catalog);
    // Dock restores the existing document; an explicit payload navigates that app.
    update({ type:'open',app,payload:app==='agent' ? '' : payload === undefined ? previous?.payload || '' : payload,...(!previous&&['browser','products'].includes(app)?{rect:{x:70,y:36,width:860,height:590}}:{}) });
    if(app==='browser'&&payload!==undefined)apps.navigateBrowser(app,payload);
    if (!state.windows.some(w => w.app === app)) return t('窗口已满。先关闭一个窗口。','Close a window before opening another.');
    if(entering)entering.then(()=>{if(state.active===app)focusWindow(app);});else focusWindow(app);
    if(app==='agent')root.dispatchEvent(new CustomEvent('bear:agent-prefill',{detail:{focus:companionFocus,question:payload || ''}}));
    return t(`已打开：${labels[app]}`,`Opened: ${labels[app]}`);
  }
  function command(commandText) {
    const [name,...parts] = String(commandText).trim().split(/\s+/);
    const arg = parts.join(' ');
    if (name === 'help') return 'apps | launchpad | ls | open <app> | close <app> | search <words> | note <text> | arrange | export | clear\nrun <command>  '+t('在已连接的本地 Linux 沙盒执行命令','Execute in the connected local Linux sandbox');
    if (name === 'run') return execute('run',{command:arg});
    if (name === 'apps') return APPS.map(app=>`${app.padEnd(10)} ${labels[app]}`).join('\n');
    if (name === 'ls') return state.windows.map(w=>`${w.app}${w.minimized?' [minimized]':''}`).join('\n') || t('没有打开的窗口。','No open windows.');
    if (name === 'open') return open(arg);
    if (name === 'close') { completeEntry(); update({type:'close',id:arg}); return t('窗口已关闭。','Window closed.'); }
    if (name === 'search') { showSearch(arg); return t('已打开搜索。','Search opened.'); }
    if (name === 'launchpad') { showLaunchpad(arg); return t('已打开所有应用。','All apps opened.'); }
    if (name === 'note') { update({type:'note',text:state.note+(state.note?'\n':'')+arg}); const existing=nodes.get('notes'); if(existing){existing.rendered=false;render();} return t('已追加到你的笔记。','Added to your note.'); }
    if (name === 'arrange') return arrangeWindows();
    if (name === 'export') { execute('export'); return t('已导出工作区文件。','Workspace exported.'); }
    if (name === 'clear') { root.querySelector('[data-terminal-output]')?.replaceChildren(); return ''; }
    return t(`未知命令：${name}。输入 help 查看命令。`,`Unknown command: ${name}. Type help.`);
  }
  function execute(name,args = {}) {
    if (name === 'open') return open(args.app,args.payload);
    if (name === 'ask') { open('agent');root.dispatchEvent(new CustomEvent('bear:agent-prefill',{detail:{focus:companionFocus,question:args.question || '',selection:args.selection || ''}}));return true; }
    if (name === 'enter') { completeEntry(); render(); showLaunchpad(); return true; }
    if (name === 'language') {
      const target = languageDestination(args.value, catalog.languageRoutes, location.href);
      if (!target || args.value === catalog.language) return false;
      if (!persist()) { notify(t('暂时无法保存，请先导出工作区再切换语言。','Storage is unavailable. Export your workspace before changing language.')); return false; }
      const destination = new URL(target);
      try { sessionStorage.setItem('space:locale-resume', args.value); }
      catch { destination.searchParams.set('space-resume', args.value); destination.searchParams.set('space-cafe', cafe?.mode || 'desktop'); }
      location.assign(destination.href); return true;
    }
    if (name === 'command') return command(args.command);
    if (['note','draft','favorite'].includes(name)) {
      update({type:name,...args},false);
      const app = name === 'note' ? 'notes' : name === 'draft' ? 'contact' : 'reader';
      const entry = nodes.get(app);
      // Local typing already updates its editor; tool actions must synchronize an open app.
      const typingDraft = name === 'draft' && document.activeElement?.matches('[data-message-draft]') && document.activeElement.value === state.draft;
      if (entry && !typingDraft) {
        if (name === 'favorite' && entry.payload) {
          apps.syncFavorite(entry.el, entry.payload);
        } else { entry.rendered = false; render(); }
      }
      return true;
    }
    if (['theme','wallpaper'].includes(name)) { update({type:name,...args}); return true; }
    if (name === 'close') { completeEntry(); update({type:'close',id:args.id}); return true; }
    if (name === 'arrange') { arrangeWindows(); return true; }
    if (name === 'search') { showSearch(args.query || ''); return true; }
    if (name === 'launchpad') { showLaunchpad(args.query || ''); return true; }
    if (name === 'run') return runSandbox(args.command);
    if (name === 'export') { apps.download(serializeWorkspace(state),'bear-workspace.json','application/json'); notify(t('已导出你的笔记、收藏和布局。','Exported your notes, bookmarks and layout.')); return true; }
    throw new Error(`Unknown workspace tool: ${name}`);
  }
  async function runSandbox(command) {
    if(typeof command!=='string'||!command.trim()||command.length>4000)return t('命令不能为空，最多 4000 字符。','Use a command of up to 4000 characters.');
    try {
      const response=await fetch('/.netlify/functions/bear-runtime',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command}),signal:AbortSignal.timeout(19000)});
      const result=await response.json();
      if(!response.ok||result.available===false)return t('本地沙盒未连接。启动本地执行服务后再试。','Local sandbox is not connected. Start the local runtime first.');
      return `${result.stdout||''}${result.stderr?'\n'+result.stderr:''}\n[exit ${result.exitCode} · /workspace]`;
    } catch {return t('本地沙盒未响应，命令没有得到确认。','The sandbox did not respond; execution is unconfirmed.');}
  }
  function home(payload='') {
    const width = root.clientWidth <= 640 ? 1280 : Math.min(1280,viewport().width);
    const availableHeight=Math.min(800,viewport().height),height = Math.min(500, Math.max(340, availableHeight - 160));
    update({type:'open',app:'welcome',payload,rect:{x:Math.max(16,(width-840)/2),y:Math.max(30,(availableHeight-height-110)/2),width:Math.min(840,width-48),height}});
    update({type:'focus',id:'welcome'});
    update({type:'initialized'});
  }
  function focusWindow(app) {const el=nodes.get(app)?.el,input=app==='agent'?el?.querySelector('[data-agent-input]'):null;(input&&!input.disabled?input:el)?.focus({preventScroll:true});}
  function focusAppControl(app) {
    const button = root.querySelector(`[data-space-dock] [data-open="${app}"]`);
    const fallback = menu;
    (button?.getClientRects().length ? button : fallback)?.focus({preventScroll:true});
  }
  function showDialog(dialog, input, fallback) {
    const fromRoom=cafe?.active,ready=cafe?.enterDesktop();
    completeEntry(); render();
    if (!dialog.open) {
      const active = document.activeElement;
      const sourceDialog = active?.closest('dialog');
      const source = menuPanel.contains(active) ? menu : sourceDialog ? dialogFocus.get(sourceDialog)?.trigger : active;
      dialogFocus.set(dialog,{ trigger:!fromRoom&&root.contains(source)&&!source?.closest('[inert]')&&source?.getClientRects().length ? source : fallback, restore:true,ready });
      for (const other of [search,launchpad,overview]) if (other !== dialog && other.open) closeDialog(other,false);
      closeMenu(); dialog.showModal();
    }
    const pending=dialogFocus.get(dialog);if(pending)pending.ready=ready;
    (input || dialog.querySelector('button'))?.focus({preventScroll:true});
  }
  function closeDialog(dialog, restore = true) {
    const saved = dialogFocus.get(dialog);
    if (saved) saved.restore = restore;
    dialog.close();
  }
  function clickedBackdrop(dialog,event) {
    if (event.target !== dialog) return false;
    const box=dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  }
  for (const dialog of [search,launchpad,overview]) {
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});
    dialog.addEventListener('close',()=>{
      const saved = dialogFocus.get(dialog); dialogFocus.delete(dialog);
      if(!saved?.restore||root.hidden)return;
      // A closing dialog can retain its hidden input until the next paint.
      // Release only that owned focus before waiting for the screen to expand.
      if(dialog.contains(document.activeElement))document.activeElement.blur();
      const usable=el=>el?.isConnected&&!el.closest('[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
      const target=usable(saved.trigger)?saved.trigger:menu;
      handoffEntryFocus({ready:saved.ready,target,origin:document.activeElement,document,window,isCurrent:()=>!root.hidden&&![search,launchpad,overview].some(panel=>panel.open)&&usable(target),focus:()=>target.focus({preventScroll:true})});
    });
  }
  function showSearch(query = '') {
    searchInput.value=query; searchIndex=0; drawSearch();
    showDialog(search,searchInput,menu);
  }
  function closeSearch() { closeDialog(search); }
  function drawSearch() {
    const items=searchWorkspace(catalog,APPS,searchInput.value);
    searchIndex=resultIndex(searchIndex,0,items.length);
    root.querySelector('[data-space-search-status]').textContent=t(`${items.length} 个结果`,`${items.length} results`);
    root.querySelector('[data-space-search-results]').innerHTML=items.map((item,index)=>`<button type="button" class="space-search-result" data-search-kind="${item.kind}" data-search-app="${item.app}" data-search-payload="${escapeHTML(item.payload||'')}" ${index===searchIndex?'data-selected':''}>${icon(item.app)}<span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.desc || t('应用','Application'))}</small></span></button>`).join('') || `<div class="space-search-empty"><strong>${t('没有找到匹配的内容','No matching results')}</strong><p>${t('试试应用名称、文章标题或主题。','Try an app name, article title, or topic.')}</p><div><button type="button" class="space-button space-button--secondary" data-space-search-reset>${t('清空搜索','Clear search')}</button><button type="button" class="space-button" data-space-launchpad-trigger>${t('浏览所有应用','Browse all apps')}</button></div></div>`;
  }
  searchInput.addEventListener('input',()=>{searchIndex=0;drawSearch();});
  search.addEventListener('focusin',event=>{
    const items=[...search.querySelectorAll('[data-search-app]')];
    const index=items.indexOf(event.target);
    if(index>=0){searchIndex=index;items.forEach((button,i)=>button.toggleAttribute('data-selected',i===index));}
  });
  search.addEventListener('keydown',event=>{
    const items=[...search.querySelectorAll('[data-search-app]')];
    if (event.key==='ArrowDown'||event.key==='ArrowUp') {
      event.preventDefault();
      if(event.target!==searchInput && searchIndex===0 && event.key==='ArrowUp'){searchInput.focus();return;}
      searchIndex=event.target===searchInput ? event.key==='ArrowDown'?resultIndex(-1,1,items.length):items.length-1 : resultIndex(searchIndex,event.key==='ArrowDown'?1:-1,items.length);
      items.forEach((button,i)=>button.toggleAttribute('data-selected',i===searchIndex));
      items[searchIndex]?.scrollIntoView({block:'nearest'});items[searchIndex]?.focus({preventScroll:true});
    }
    if (event.key==='Enter'&&event.target===searchInput) {event.preventDefault();items[searchIndex]?.click();}
  });
  search.addEventListener('click',event=>{
    const target=event.target.closest('[data-search-app]');
    if(target){closeDialog(search,false);open(target.dataset.searchApp,target.dataset.searchKind==='app'?undefined:target.dataset.searchPayload);}
    if(event.target.closest('[data-space-search-close]'))closeSearch();
    if(event.target.closest('[data-space-search-reset]'))showSearch();
    if(clickedBackdrop(search,event))closeSearch();
  });
  function drawLaunchpad() {
    const focusedApp=launchpad.contains(document.activeElement) ? document.activeElement.dataset.launchpadApp : null;
    const items=findApplications(APPS,labels,launchpadInput.value);
    root.querySelector('[data-space-launchpad-status]').textContent=t(`${items.length} 个应用`,`${items.length} applications`);
    root.querySelector('[data-space-launchpad-list]').innerHTML=items.map(app=>{
      const win=state.windows.find(w=>w.app===app);
      const status=win ? win.minimized?t('已最小化','Minimized'):t('打开中','Open') : t('打开应用','Open app');
      return `<button type="button" class="space-launchpad__app" data-launchpad-app="${app}"${win?' data-running':''}>${icon(app)}<strong>${escapeHTML(labels[app])}</strong><small>${status}</small></button>`;
    }).join('') || `<div class="space-search-empty"><strong>${t('没有找到这个应用','No matching app')}</strong><p>${t('清空搜索，查看全部 11 个应用。','Clear the search to see all 11 applications.')}</p><button type="button" class="space-button" data-space-launchpad-reset>${t('查看所有应用','Show all apps')}</button></div>`;
    if(focusedApp)launchpad.querySelector(`[data-launchpad-app="${focusedApp}"]`)?.focus({preventScroll:true});
  }
  function showLaunchpad(query = '') {
    launchpadInput.value=query; drawLaunchpad();
    showDialog(launchpad,launchpadInput,menu);
  }
  launchpadInput.addEventListener('input',drawLaunchpad);
  launchpad.addEventListener('keydown',event=>{
    const items=[...launchpad.querySelectorAll('[data-launchpad-app]')];
    if (event.key==='Enter' && event.target===launchpadInput) { event.preventDefault(); items[0]?.click(); }
    if (event.key==='ArrowDown' && event.target===launchpadInput) { event.preventDefault(); items[0]?.focus(); }
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) && event.target.matches('[data-launchpad-app]')) {
      event.preventDefault();
      const columns=getComputedStyle(root.querySelector('[data-space-launchpad-list]')).gridTemplateColumns.split(' ').length;
      const step=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-columns:columns;
      items[resultIndex(items.indexOf(event.target),step,items.length)]?.focus();
    }
  });
  launchpad.addEventListener('click',event=>{
    const app=event.target.closest('[data-launchpad-app]');
    if(app){closeDialog(launchpad,false);open(app.dataset.launchpadApp);}
    if(event.target.closest('[data-space-launchpad-close]')||clickedBackdrop(launchpad,event))closeDialog(launchpad);
    if(event.target.closest('[data-space-launchpad-reset]'))showLaunchpad();
  });
  function showOverview() {
    root.querySelector('[data-space-overview-list]').innerHTML=state.windows.map(w=>`<button class="space-overview__item" data-overview-id="${escapeHTML(w.id)}">${icon(w.app)}<strong>${escapeHTML(title(w))}</strong><small>${w.minimized?t('已最小化','Minimized'):t('打开中','Open')}</small></button>`).join('') || `<p>${t('桌面很清爽，打开一个应用吧。','A quiet desktop. Open an app.')}</p>`;
    showDialog(overview,null,menu);
  }
  overview.addEventListener('click',event=>{
    const item=event.target.closest('[data-overview-id]');
    if(item){const w=state.windows.find(w=>w.id===item.dataset.overviewId);closeDialog(overview,false);if(w)open(w.app,w.payload);}
    if(event.target.closest('[data-space-overview-close]')||clickedBackdrop(overview,event))closeDialog(overview);
  });
  function closeMenu(restore=false){const wasOpen=!menuPanel.hidden;menuPanel.hidden=true;menu.setAttribute('aria-expanded','false');if(restore&&wasOpen)menu.focus({preventScroll:true});}
  function toggleMenu(){menuPanel.hidden=!menuPanel.hidden;menu.setAttribute('aria-expanded',String(!menuPanel.hidden));if(!menuPanel.hidden)menuPanel.querySelector('button')?.focus({preventScroll:true});}
  menu.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();if(menuPanel.hidden)toggleMenu();else menuPanel.querySelector('button')?.focus();}});
  menuPanel.addEventListener('keydown',event=>{
    const items=[...menuPanel.querySelectorAll('button,a')].filter(item=>!item.hidden&&!item.disabled&&item.getClientRects().length);
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();items[resultIndex(items.indexOf(document.activeElement),event.key==='ArrowDown'?1:-1,items.length)]?.focus();}
    if(event.key==='Home'||event.key==='End'){event.preventDefault();items[event.key==='Home'?0:items.length-1]?.focus();}
  });
  let menuPointerDown=false;
  menuPanel.addEventListener('pointerdown',()=>{menuPointerDown=true;});
  for(const eventName of ['pointerup','pointercancel'])document.addEventListener(eventName,()=>{menuPointerDown=false;});
  menuPanel.addEventListener('focusout',event=>{
    // A pointer click can blur the previous menu item before its click event.
    // Keep the target present until pointerup, including non-focusing buttons.
    if(menuPointerDown||menuPanel.contains(event.relatedTarget)||event.relatedTarget===menu)return;
    requestAnimationFrame(()=>{if(!menuPointerDown&&!menuPanel.contains(document.activeElement)&&document.activeElement!==menu)closeMenu();});
  });
  root.addEventListener('click',event=>{
    const target=event.target;
    if(target.closest('[data-reader-focus]')){setReadingFocus(!readingFocus);return;}
    if(target.closest('[data-space-menu-trigger]')){toggleMenu();return;}
    const opener=target.closest('[data-open]');
    if(opener){closeMenu();open(opener.dataset.open,opener.hasAttribute('data-payload') ? opener.dataset.payload : undefined);return;}
    const action=target.closest('[data-window-action]');
    if(action){completeEntry();const id=action.closest('[data-space-window]').dataset.spaceWindow;if(action.dataset.windowAction==='arrange')execute('arrange');else update({type:action.dataset.windowAction,id}); if(action.dataset.windowAction==='close'||action.dataset.windowAction==='minimize')focusAppControl(id);return;}
    if(target.closest('[data-space-arrange]')){closeMenu();execute('arrange');}
    if(target.closest('[data-space-export]')){closeMenu();execute('export');}
    if(target.closest('[data-space-home]')){closeMenu();home();}
    if(target.closest('[data-space-show-desktop]')){completeEntry();closeMenu();for(const w of state.windows)update({type:'minimize',id:w.id});}
    if(target.closest('[data-space-overview-trigger]'))showOverview();
    if(target.closest('[data-space-search-trigger]'))showSearch();
    if(target.closest('[data-space-launchpad-trigger]'))showLaunchpad();
  });
  root.addEventListener('dblclick',event=>{const bar=event.target.closest('[data-window-drag]');if(bar&&!event.target.closest('button'))update({type:'maximize',id:bar.closest('[data-space-window]').dataset.spaceWindow});});
  layer.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const el=event.target.closest('[data-space-window]');if(!el)return;
    const id=el.dataset.spaceWindow;
    if(state.active!==id)update({type:'focus',id});
    if(id==='agent')return;
    const resize=event.target.closest('[data-window-resize]');
    const bar=event.target.closest('[data-window-drag]');
    if(usesSingleWindow(root.clientWidth)||root.dataset.readingFocus==='true'||(!resize&&!bar)||event.target.closest('button,a')||isEditableTarget(event.target))return;
    const w=state.windows.find(w=>w.id===id);if(w.maximized)return;
    event.preventDefault(); const control=resize||bar;control.setPointerCapture(event.pointerId);
    drag={id,el,control,kind:resize?resize.dataset.windowResize:'move',x:event.clientX,y:event.clientY,rect:{...w.rect},next:{...w.rect},snap:null};el.dataset.dragging='true';
  });
  layer.addEventListener('focusin',event=>{
    const el=event.target.closest('[data-space-window]');
    if(el&&state.active!==el.dataset.spaceWindow)update({type:'focus',id:el.dataset.spaceWindow});
  });
  layer.addEventListener('pointermove',event=>{
    if(!drag)return;
    const screen=root.querySelector('.space-spatial-screen');
    const bounds=screen?.getBoundingClientRect();
    const ratio=bounds?.width / viewport().width || 1;
    const dx=(event.clientX-drag.x)/ratio,dy=(event.clientY-drag.y)/ratio;
    const rect={...drag.rect};
    if(drag.kind==='move'){rect.x+=dx;rect.y+=dy;}
    else {if(drag.kind.includes('e'))rect.width+=dx;if(drag.kind.includes('s'))rect.height+=dy;}
    drag.next=fitRect(rect,viewport());
    Object.assign(drag.el.style,{width:`${drag.next.width}px`,height:`${drag.next.height}px`,transform:`translate(${drag.next.x}px,${drag.next.y}px)`});
    const preview=root.querySelector('[data-space-snap]');
    const pointerX=(event.clientX-(bounds?.left||0))/ratio,pointerY=(event.clientY-(bounds?.top||0))/ratio-(root.clientWidth<=640?44:32);
    drag.snap=drag.kind==='move'?(pointerX<25?'left':pointerX>viewport().width-25?'right':pointerY<49?'max':null):null;
    preview.hidden=!drag.snap;
    if(drag.snap){preview.style.left=drag.snap==='right'?'calc(50% + 4px)':'8px';preview.style.width=drag.snap==='max'?'calc(100% - 16px)':'calc(50% - 12px)';}
  });
  function finishDrag(cancel=false){
    if(!drag)return;const d=drag;drag=null;delete d.el.dataset.dragging;root.querySelector('[data-space-snap]').hidden=true;
    if(cancel){render();return;}
    if(d.snap==='max')update({type:'maximize',id:d.id});
    else if(d.snap){const width=(viewport().width-24)/2;update({type:'geometry',id:d.id,rect:{x:d.snap==='left'?8:width+16,y:8,width,height:viewport().height-112}});}
    else update({type:'geometry',id:d.id,rect:d.next});
  }
  layer.addEventListener('pointerup',()=>finishDrag());layer.addEventListener('pointercancel',()=>finishDrag(true));
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.space-menu,[data-space-menu-trigger]'))closeMenu();});
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||document.body.classList.contains('search-palette-open'))return;
    if(event.key==='Escape'&&productRoot.dataset.productView==='lab'&&location.hash==='#knowledge'){
      event.preventDefault();setView('lab');lab.querySelector('[data-bks-enter]')?.focus({preventScroll:true});return;
    }
    if(productRoot.dataset.productView!=='bear')return;
    if(event.isComposing||event.keyCode===229)return;
    if(cafe?.modalOpen)return;
    const editing=isEditableTarget(event.target);
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showSearch();return;}
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='j'){event.preventDefault();closeMenu();for(const dialog of [search,launchpad,overview])if(dialog.open)closeDialog(dialog,false);open('agent');return;}
    if(cafe?.active){if(event.key==='Escape')cafe.escape();return;}
    if(event.key==='Escape'){
      const readerTools=root.querySelector('[data-space-window="reader"][data-active="true"] .space-reader-tools[open]');
      if(readerTools&&!search.open&&!launchpad.open&&!overview.open&&menuPanel.hidden){event.preventDefault();readerTools.open=false;readerTools.querySelector('summary')?.focus({preventScroll:true});return;}
      if(readingFocus&&state.active==='reader'&&!search.open&&!launchpad.open&&!overview.open&&menuPanel.hidden){event.preventDefault();setReadingFocus(false);return;}
      if(cafe?.spatial&&!editing&&!search.open&&!launchpad.open&&!overview.open&&menuPanel.hidden){event.preventDefault();cafe.visit();return;}
      const action=escapeAction({searchOpen:search.open,launchpadOpen:launchpad.open,overviewOpen:overview.open,menuOpen:!menuPanel.hidden,editing,hasActive:Boolean(state.active)});
      if(!action)return;
      event.preventDefault();
      if(action==='menu')closeMenu(true);
      else if(action==='minimize'){const current=state.windows.find(w=>w.id===state.active);if(current){completeEntry();update({type:'minimize',id:current.id});focusAppControl(current.app);}}
      else closeDialog({search,launchpad,overview}[action]);
      return;
    }
    if(search.open||launchpad.open||overview.open||!menuPanel.hidden)return;
    if(!editing&&(event.key==='p'||event.key==='/')){event.preventDefault();showSearch();}
    if(!editing&&event.altKey&&event.key==='Tab'){event.preventDefault();showOverview();}
    if(!editing&&event.altKey&&event.key.startsWith('Arrow')){event.preventDefault();const w=state.windows.find(w=>w.id===state.active);if(w)update({type:'geometry',id:w.id,rect:{...w.rect,x:w.rect.x+(event.key==='ArrowRight'?20:event.key==='ArrowLeft'?-20:0),y:w.rect.y+(event.key==='ArrowDown'?20:event.key==='ArrowUp'?-20:0)}});}
  });
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{finishDrag(true);update({type:'viewport'});},100);});
  root.addEventListener('space:surfacechange',()=>{finishDrag(true);update({type:'viewport'});});
  window.addEventListener('storage',event=>{if(event.key===storageKey&&event.newValue){const localEditing=root.contains(document.activeElement)&&isEditableTarget(document.activeElement);if(localEditing){notify(t('另一个标签页更新了空间。刷新后可以载入。','Another tab updated this space. Reload to load it.'));return;}state=createWorkspace(event.newValue,stateViewport());const note=nodes.get('notes');if(note)note.rendered=false;const contact=nodes.get('contact');if(contact)contact.rendered=false;render();}});
  function setView(view,writeHash=true){
    knowledgeGeneration++;knowledgePending=false;
    delete productRoot.dataset.knowledgeView;
    const isLab=view==='lab';
    if(isLab){cafe?.enterDesktop();completeEntry();render();closeMenu();for(const dialog of [search,launchpad,overview])if(dialog.open)closeDialog(dialog,false);}
    if(isLab&&!lab){productRoot.append(productRoot.querySelector('[data-product-lab-template]').content.cloneNode(true));lab=productRoot.querySelector('[data-product-panel="lab"]');lab.addEventListener('click',event=>{if(event.target.closest('[data-bks-enter]'))openKnowledge();});}
    productRoot.dataset.productView=isLab?'lab':'bear';root.hidden=isLab;if(lab)lab.hidden=!isLab;
    document.body.classList.toggle('products-view-bear',!isLab);document.body.classList.toggle('products-view-lab',isLab);
    productRoot.querySelectorAll('[data-product-view-button]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.productViewButton===(isLab?'lab':'bear'))));
    productRoot.querySelector('[data-product-view-status]').textContent=isLab?'Product Lab':t('CUBXXW OS 工作区','CUBXXW OS workspace');
    if(lab){lab.querySelector('[data-bks-host]').hidden=true;lab.querySelectorAll('.builds-main,.builds-footer,.builds-hero,[data-bks-entry]').forEach(el=>el.hidden=false);}
    if(writeHash)history.replaceState(null,'',location.pathname+location.search+(isLab?'#product-lab':''));
    window.scrollTo({top:0,behavior:'instant'});
  }
  async function openKnowledge(){
    if(knowledgePending)return;
    setView('lab',false);let host=lab.querySelector('[data-bks-host]');host.hidden=false;lab.querySelectorAll('.builds-main,.builds-footer,.builds-hero,[data-bks-entry]').forEach(el=>el.hidden=true);
    history.replaceState(null,'',location.pathname+location.search+'#knowledge');
    productRoot.dataset.knowledgeView='open';
    if(knowledge)return;
    // Each pending mount owns its host. A cancelled mount can never clear a
    // newer one if the visitor immediately leaves and reopens the space.
    const target=host.cloneNode(false);host.replaceWith(target);host=target;
    const generation=knowledgeGeneration;
    const current=()=>generation===knowledgeGeneration&&host.isConnected&&location.hash==='#knowledge'&&productRoot.dataset.productView==='lab';
    knowledgePending=true;
    try{
      const config=JSON.parse(productRoot.querySelector('[data-space-knowledge]').textContent);
      const module=await import(config.module);if(!current())return;
      const mounted=await module.mountKnowledgeSpace(host,{nodes:config.nodes,isZh:zh,onExit:()=>{if(host.isConnected&&location.hash==='#knowledge'&&productRoot.dataset.productView==='lab')setView('lab');}});
      if(!current()){mounted?.dispose?.();return;}
      knowledge=mounted;
    }
    catch{if(current())host.innerHTML=`<p class="space-app">${t('知识空间暂时无法加载。','The knowledge space could not load.')}</p><button data-product-view-button="lab">${t('返回 Product Lab','Back to Product Lab')}</button>`;}
    finally{if(generation===knowledgeGeneration)knowledgePending=false;}
  }
  productRoot.addEventListener('click',async event=>{
    const b=event.target.closest('[data-product-view-button]');if(!b)return;
    setView(b.dataset.productViewButton);
    if(b.dataset.productViewButton==='bear'){
      // The hidden Lab may have deferred the first real frame. Its controls
      // become focusable only after the spatial workspace is ready.
      const entered=await cafe?.enterDesktop();
      if(entered!==false&&!root.hidden&&(document.activeElement===b||document.activeElement===document.body))menu.focus({preventScroll:true});
    }else productRoot.querySelector('.product-view-switch [data-product-view-button="lab"]')?.focus({preventScroll:true});
  });
  function applyHash(restoreLocale = false){
    const entry=new URLSearchParams(location.search).get('profile')==='about'?'about':'';
    const route=resolveSpaceRoute(location.hash,catalog.products,entry);
    if(route.view==='knowledge')openKnowledge();
    else {setView(route.view,false);if(route.app && !restoreLocale)open(route.app,route.payload);}
  }
  window.addEventListener('hashchange',()=>applyHash());
  const clock=()=>{const text=new Intl.DateTimeFormat(zh?'zh-CN':'en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date());root.querySelectorAll('[data-space-clock]').forEach(node=>{node.textContent=text;});};clock();setInterval(clock,60000);
  // Public capability descriptions are data; only the registered operations execute.
  window.BearSpace=Object.freeze({ version:1, tools:Object.freeze([{name:'open',description:'Open an app',apps:[...APPS]},{name:'search',description:'Search public writing'},{name:'launchpad',description:'Browse all workspace applications'},{name:'note',description:'Replace this visitor’s local note'},{name:'arrange',description:'Arrange open windows'},{name:'export',description:'Download workspace state'},{name:'run',description:'Execute in the connected local Docker sandbox; never on the host'}]), execute, snapshot:()=>JSON.parse(serializeWorkspace(state)) });
  const entryRoute = resolveSpaceRoute(location.hash,catalog.products,new URLSearchParams(location.search).get('profile') === 'about' ? 'about' : '');
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  let resumeCafe = false;
  try { resumeCafe = navigationType === 'reload' && !entryRoute.app && sessionStorage.getItem('space:cafe:mode') === 'cafe'; } catch {}
  let preferredScene='jiangnan';try{preferredScene=cafeTheme(localStorage.getItem('space:cafe:theme:v2'));}catch{}
  const roomHome=preferredScene==='jiangnan'&&!entryRoute.app&&!localeResume&&(resumeCafe||!['reload','back_forward'].includes(navigationType));
  if (!state.initialized||roomHome) home(preferredScene==='jiangnan'?'':undefined); else render();
  applyHash(localeResume || resumeCafe);
  const initialTarget=entryRoute.app&&!localeResume&&!resumeCafe?nodes.get(entryRoute.app)?.el:null,initialOrigin=document.activeElement;
  const entryFocusManaged=Boolean(initialTarget);
  cafe = mountCafe({ root, route:entryRoute, navigation:navigationType, localeResume, execute, entryFocusManaged,
    onEnter:()=>{completeEntry();render();},
    beforeVisit:()=>{closeMenu();for(const dialog of [search,launchpad,overview])if(dialog.open)closeDialog(dialog,false);},
    focusDesktop:()=>nodes.get(state.active)?.el || menu
  });
  const focusEntryURL=location.href;
  if(entryFocusManaged)handoffEntryFocus({ready:cafe.ready,target:initialTarget,origin:initialOrigin,document,window,isCurrent:()=>location.href===focusEntryURL&&state.active===entryRoute.app&&root.dataset.cafeMode==='desktop'&&!root.hidden,focus:()=>focusWindow(entryRoute.app)});
  root.dataset.ready='true';
  if(saveFailure)notify(t('无法使用浏览器存储。笔记可导出，但刷新后可能丢失。','Browser storage is unavailable. Export notes before reloading.'));
}
