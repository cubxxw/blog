import { APPS, createWorkspace, reduceWorkspace, serializeWorkspace, fitRect } from './state.mjs';
import { mountApps, escapeHTML } from './apps.js';
import { findApplications, searchWorkspace, resultIndex, isEditableTarget, escapeAction } from './navigation.mjs';

const root = document.querySelector('[data-bear-workspace]');
if (root) mountDesktop(root);
function mountDesktop(root) {
  const catalog = JSON.parse(root.querySelector('[data-space-catalog]').textContent);
  const productRoot = root.closest('[data-product-space]');
  const labels = catalog.labels, zh = catalog.language === 'zh';
  const t = (cn,en) => zh ? cn : en;
  const layer = root.querySelector('[data-space-windows]');
  const viewport = () => ({ width: root.clientWidth, height: root.clientHeight - root.querySelector('.space-menubar').offsetHeight });
  const stateViewport = () => root.clientWidth <= 640 ? { width: 10000, height: 10000 } : viewport();
  const storageKey = 'bear-space:v1';
  let saved, saveFailure = false;
  try { saved = localStorage.getItem(storageKey); } catch { saveFailure = true; }
  let state = createWorkspace(saved,stateViewport());
  const nodes = new Map();
  let toastTimer, searchIndex = 0, drag = null;
  const search = root.querySelector('[data-space-search]');
  const searchInput = root.querySelector('[data-space-search-input]');
  const overview = root.querySelector('[data-space-overview]');
  const launchpad = root.querySelector('[data-space-launchpad]');
  const launchpadInput = root.querySelector('[data-space-launchpad-input]');
  const dialogFocus = new WeakMap();
  const menu = root.querySelector('[data-space-menu-trigger]');
  const menuPanel = root.querySelector('.space-menu');
  let lab, knowledge, knowledgePending = false;
  const icon = app => root.querySelector(`[data-space-dock] [data-open="${app}"] .space-icon`)?.outerHTML || '';
  function notify(message) {
    const toast = root.querySelector('[data-space-toast]'); toast.textContent = message; toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; },4000);
  }
  const apps = mountApps({ root,catalog,execute,getState:()=>state,updateNote:text=>update({type:'note',text},false),notify,icon });
  function persist() {
    try { localStorage.setItem(storageKey,serializeWorkspace(state)); }
    catch { if (!saveFailure) notify(t('浏览器未能保存。请导出一份笔记。','Browser storage failed. Please export your notes.')); saveFailure = true; }
  }
  function title(win) {
    if (win.app === 'products' && win.payload) return catalog.products.find(p => p.id === win.payload)?.name || labels.products;
    if (win.app === 'reader' && win.payload) return catalog.articles.find(a => a.url === win.payload)?.title || labels.reader;
    if (win.app === 'photos' && win.payload) return catalog.photos.find(p => p.id === win.payload)?.title || labels.photos;
    return labels[win.app];
  }
  function update(action, redraw = true) {
    state = reduceWorkspace(state,action,stateViewport());
    persist(); if (redraw) render();
    root.dispatchEvent(new CustomEvent('bear:workspace-change',{ detail:{type:action.type,active:state.active} }));
  }
  function render() {
    root.dataset.theme = state.theme; root.dataset.wallpaper = state.wallpaper;
    for (const [id,entry] of nodes) {
      if (!state.windows.some(w => w.id === id)) { apps.dispose(id); entry.el.remove(); nodes.delete(id); }
    }
    state.windows.forEach((win,index) => {
      let entry = nodes.get(win.id);
      if (!entry) {
        const el = document.createElement('section'); el.className = 'space-window'; el.dataset.spaceWindow = win.id;
        el.setAttribute('role','region'); el.tabIndex = -1;
        el.innerHTML = `<header class="space-window__bar" data-window-drag><div class="space-window-controls"><button type="button" data-window-action="close" aria-label="${t('关闭窗口','Close window')}"></button><button type="button" data-window-action="minimize" aria-label="${t('最小化窗口','Minimize window')}"></button><button type="button" data-window-action="maximize" aria-label="${t('最大化或恢复窗口','Maximize or restore window')}"></button></div><strong></strong><button class="space-window__layout" type="button" data-window-action="arrange" aria-label="${t('窗口并排','Arrange windows')}">◫</button></header><div class="space-window__body" data-window-body></div><div class="space-resize" data-window-resize="se"></div><div class="space-resize" data-window-resize="e"></div><div class="space-resize" data-window-resize="s"></div>`;
        layer.append(el); entry = { el,payload:null }; nodes.set(win.id,entry);
      }
      const {el} = entry;
      el.hidden = win.minimized; el.dataset.active = String(win.id === state.active);
      const name = title(win); el.setAttribute('aria-label',name); el.querySelector('header strong').textContent = name;
      const rect = win.maximized ? { x:8,y:8,width:viewport().width-16,height:viewport().height-108 } : win.rect;
      Object.assign(el.style,{ left:'0px',top:'0px',width:`${rect.width}px`,height:`${rect.height}px`,transform:`translate(${rect.x}px,${rect.y}px)`,zIndex:String(10+index) });
      el.dataset.maximized = String(win.maximized);
      if (entry.payload !== win.payload || !entry.rendered) {
        apps.render(win,el.querySelector('[data-window-body]')); entry.payload = win.payload; entry.rendered = true;
      }
    });
    root.querySelector('[data-active-label]').textContent = state.windows.find(w => w.id === state.active)?.app ? labels[state.windows.find(w => w.id === state.active).app] : t('工作区','Workspace');
    root.querySelectorAll('[data-space-dock] [data-open]').forEach(button => {
      const app = button.dataset.open;
      button.toggleAttribute('data-running',state.windows.some(w => w.app === app));
      button.toggleAttribute('data-active',state.windows.some(w => w.id === state.active && w.app === app));
      if (state.windows.some(w => w.id === state.active && w.app === app)) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    if (launchpad.open) drawLaunchpad();
  }
  function open(app,payload) {
    if (!APPS.includes(app)) return t('没有这个应用。','Unknown application.');
    const previous = state.windows.find(w => w.app === app);
    // Dock restores the existing document; an explicit payload navigates that app.
    update({ type:'open',app,payload:payload === undefined ? previous?.payload || '' : payload });
    if (!state.windows.some(w => w.app === app)) return t('窗口已满。先关闭一个窗口。','Close a window before opening another.');
    focusWindow(app);
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
    if (name === 'close') { update({type:'close',id:arg}); return t('窗口已关闭。','Window closed.'); }
    if (name === 'search') { showSearch(arg); return t('已打开搜索。','Search opened.'); }
    if (name === 'launchpad') { showLaunchpad(arg); return t('已打开所有应用。','All apps opened.'); }
    if (name === 'note') { update({type:'note',text:state.note+(state.note?'\n':'')+arg}); const existing=nodes.get('notes'); if(existing){existing.rendered=false;render();} return t('已追加到你的笔记。','Added to your note.'); }
    if (name === 'arrange') { execute('arrange'); return t('窗口已并排。','Windows arranged.'); }
    if (name === 'export') { execute('export'); return t('已导出工作区文件。','Workspace exported.'); }
    if (name === 'clear') { root.querySelector('[data-terminal-output]')?.replaceChildren(); return ''; }
    return t(`未知命令：${name}。输入 help 查看命令。`,`Unknown command: ${name}. Type help.`);
  }
  function execute(name,args = {}) {
    if (name === 'open') return open(args.app,args.payload);
    if (name === 'command') return command(args.command);
    if (['note','draft','favorite'].includes(name)) {
      update({type:name,...args},false);
      const app = name === 'note' ? 'notes' : name === 'draft' ? 'contact' : 'reader';
      const entry = nodes.get(app);
      // Local typing already updates its editor; tool actions must synchronize an open app.
      const typingDraft = name === 'draft' && document.activeElement?.matches('[data-message-draft]') && document.activeElement.value === state.draft;
      if (entry && !typingDraft) {
        if (name === 'favorite' && entry.payload) {
          const favorite = entry.el.querySelector('[data-reader-favorite]');
          if (favorite) favorite.textContent = `${state.favorites.includes(entry.payload) ? '★' : '☆'} ${t('收藏','Save')}`;
        } else { entry.rendered = false; render(); }
      }
      return true;
    }
    if (['theme','wallpaper'].includes(name)) { update({type:name,...args}); return true; }
    if (name === 'close') { update({type:'close',id:args.id}); return true; }
    if (name === 'arrange') { if(root.clientWidth<=640)showOverview();else update({type:'arrange'}); return true; }
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
  function home() {
    const width=root.clientWidth<=640?1280:viewport().width;
    if (!state.initialized) {
      update({type:'open',app:'welcome',rect:{x:Math.max(118,(width-1100)/2),y:67,width:Math.min(580,width-150),height:535}});
      update({type:'open',app:'photos',payload:'kumano',rect:{x:Math.max(550,(width-1100)/2+642),y:101,width:320,height:465}});
    } else { open('photos'); open('welcome'); }
    update({type:'focus',id:'welcome'});
    update({type:'initialized'});
  }
  function focusWindow(app) { nodes.get(app)?.el.focus({preventScroll:true}); }
  function focusAppControl(app) {
    const button = root.querySelector(`[data-space-dock] [data-open="${app}"]`);
    const fallback = root.querySelector('[data-space-launchpad-trigger]');
    (button?.getClientRects().length ? button : fallback)?.focus({preventScroll:true});
  }
  function showDialog(dialog, input, fallback) {
    if (!dialog.open) {
      const active = document.activeElement;
      const sourceDialog = active?.closest('dialog');
      const source = menuPanel.contains(active) ? menu : sourceDialog ? dialogFocus.get(sourceDialog)?.trigger : active;
      dialogFocus.set(dialog,{ trigger:root.contains(source) && source?.getClientRects().length ? source : fallback, restore:true });
      for (const other of [search,launchpad,overview]) if (other !== dialog && other.open) closeDialog(other,false);
      closeMenu(); dialog.showModal();
    }
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
      if (saved?.restore && saved.trigger?.isConnected && !root.hidden) saved.trigger.focus({preventScroll:true});
    });
  }
  function showSearch(query = '') {
    searchInput.value=query; searchIndex=0; drawSearch();
    showDialog(search,searchInput,root.querySelector('[data-space-search-trigger]'));
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
    showDialog(launchpad,launchpadInput,root.querySelector('[data-space-launchpad-trigger]'));
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
    showDialog(overview,null,root.querySelector('[data-space-overview-trigger]'));
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
    const items=[...menuPanel.querySelectorAll('button,a')];
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
    if(target.closest('[data-space-menu-trigger]')){toggleMenu();return;}
    const opener=target.closest('[data-open]');
    if(opener){closeMenu();open(opener.dataset.open,opener.hasAttribute('data-payload') ? opener.dataset.payload : undefined);return;}
    const action=target.closest('[data-window-action]');
    if(action){const id=action.closest('[data-space-window]').dataset.spaceWindow;if(action.dataset.windowAction==='arrange')execute('arrange');else update({type:action.dataset.windowAction,id}); if(action.dataset.windowAction==='close'||action.dataset.windowAction==='minimize')focusAppControl(id);return;}
    if(target.closest('[data-space-arrange]')){closeMenu();execute('arrange');}
    if(target.closest('[data-space-export]')){closeMenu();execute('export');}
    if(target.closest('[data-space-home]')){closeMenu();home();}
    if(target.closest('[data-space-show-desktop]')){closeMenu();for(const w of state.windows)update({type:'minimize',id:w.id});}
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
    const resize=event.target.closest('[data-window-resize]');
    const bar=event.target.closest('[data-window-drag]');
    if(viewport().width<=640||(!resize&&!bar)||event.target.closest('button,a')||isEditableTarget(event.target))return;
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
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    const rect={...drag.rect};
    if(drag.kind==='move'){rect.x+=dx;rect.y+=dy;}
    else {if(drag.kind.includes('e'))rect.width+=dx;if(drag.kind.includes('s'))rect.height+=dy;}
    drag.next=fitRect(rect,viewport());
    Object.assign(drag.el.style,{width:`${drag.next.width}px`,height:`${drag.next.height}px`,transform:`translate(${drag.next.x}px,${drag.next.y}px)`});
    const preview=root.querySelector('[data-space-snap]');
    drag.snap=drag.kind==='move'?(event.clientX<25?'left':event.clientX>viewport().width-25?'right':event.clientY<49?'max':null):null;
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
    if(productRoot.dataset.productView!=='bear')return;
    if(event.isComposing)return;
    const editing=isEditableTarget(event.target);
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showSearch();return;}
    if(event.key==='Escape'){
      const action=escapeAction({searchOpen:search.open,launchpadOpen:launchpad.open,overviewOpen:overview.open,menuOpen:!menuPanel.hidden,editing,hasActive:Boolean(state.active)});
      if(!action)return;
      event.preventDefault();
      if(action==='menu')closeMenu(true);
      else if(action==='minimize'){const current=state.windows.find(w=>w.id===state.active);if(current){update({type:'minimize',id:current.id});focusAppControl(current.app);}}
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
  window.addEventListener('storage',event=>{if(event.key===storageKey&&event.newValue){const localEditing=root.contains(document.activeElement)&&isEditableTarget(document.activeElement);if(localEditing){notify(t('另一个标签页更新了空间。刷新后可以载入。','Another tab updated this space. Reload to load it.'));return;}state=createWorkspace(event.newValue,stateViewport());const note=nodes.get('notes');if(note)note.rendered=false;const contact=nodes.get('contact');if(contact)contact.rendered=false;render();}});
  function setView(view,writeHash=true){
    const isLab=view==='lab';
    if(isLab){closeMenu();for(const dialog of [search,launchpad,overview])if(dialog.open)closeDialog(dialog,false);}
    if(isLab&&!lab){productRoot.append(productRoot.querySelector('[data-product-lab-template]').content.cloneNode(true));lab=productRoot.querySelector('[data-product-panel="lab"]');lab.addEventListener('click',event=>{if(event.target.closest('[data-bks-enter]'))openKnowledge();});}
    productRoot.dataset.productView=isLab?'lab':'bear';root.hidden=isLab;if(lab)lab.hidden=!isLab;
    document.body.classList.toggle('products-view-bear',!isLab);document.body.classList.toggle('products-view-lab',isLab);
    productRoot.querySelectorAll('[data-product-view-button]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.productViewButton===(isLab?'lab':'bear'))));
    productRoot.querySelector('[data-product-view-status]').textContent=isLab?'Product Lab':t('BEAR OS 工作区','BEAR OS workspace');
    if(lab){lab.querySelector('[data-bks-host]').hidden=true;lab.querySelectorAll('.builds-main,.builds-footer,.builds-hero,[data-bks-entry]').forEach(el=>el.hidden=false);}
    if(writeHash)history.replaceState(null,'',location.pathname+location.search+(isLab?'#product-lab':''));
    window.scrollTo({top:0,behavior:'instant'});
  }
  async function openKnowledge(){
    if(knowledgePending)return;
    setView('lab',false);const host=lab.querySelector('[data-bks-host]');host.hidden=false;lab.querySelectorAll('.builds-main,.builds-footer,.builds-hero,[data-bks-entry]').forEach(el=>el.hidden=true);
    history.replaceState(null,'',location.pathname+location.search+'#knowledge');
    if(knowledge)return;
    knowledgePending=true;
    try{const config=JSON.parse(productRoot.querySelector('[data-space-knowledge]').textContent);const module=await import(config.module);knowledge=await module.mountKnowledgeSpace(host,{nodes:config.nodes,isZh:zh,onExit:()=>{host.hidden=true;lab.querySelectorAll('.builds-main,.builds-footer,.builds-hero,[data-bks-entry]').forEach(el=>el.hidden=false);history.replaceState(null,'',location.pathname+location.search+'#product-lab');}});}
    catch{host.innerHTML=`<p class="space-app">${t('知识空间暂时无法加载。','The knowledge space could not load.')}</p><button data-product-view-button="lab">${t('返回 Product Lab','Back to Product Lab')}</button>`;}
    finally{knowledgePending=false;}
  }
  productRoot.addEventListener('click',event=>{const b=event.target.closest('[data-product-view-button]');if(b)setView(b.dataset.productViewButton);});
  function applyHash(){
    const hash=location.hash.slice(1);
    if(hash==='product-lab')setView('lab',false);
    else if(hash==='knowledge')openKnowledge();
    else {setView('bear',false);const id=hash.replace(/^focus-/,'');if(catalog.products.some(p=>p.id===id))open('products',id);}
  }
  window.addEventListener('hashchange',applyHash);
  const clock=()=>{root.querySelector('[data-space-clock]').textContent=new Intl.DateTimeFormat(zh?'zh-CN':'en-GB',{weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date());};clock();setInterval(clock,60000);
  // Public capability descriptions are data; only the registered operations execute.
  window.BearSpace=Object.freeze({ version:1, tools:Object.freeze([{name:'open',description:'Open an app',apps:[...APPS]},{name:'search',description:'Search public writing'},{name:'launchpad',description:'Browse all workspace applications'},{name:'note',description:'Replace this visitor’s local note'},{name:'arrange',description:'Arrange open windows'},{name:'export',description:'Download workspace state'},{name:'run',description:'Execute in the connected local Docker sandbox; never on the host'}]), execute, snapshot:()=>JSON.parse(serializeWorkspace(state)) });
  if(!state.initialized)home();else render();
  applyHash();root.dataset.ready='true';
  if(saveFailure)notify(t('无法使用浏览器存储。笔记可导出，但刷新后可能丢失。','Browser storage is unavailable. Export notes before reloading.'));
}
