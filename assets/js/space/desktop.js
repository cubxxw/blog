import { APPS, createWorkspace, reduceWorkspace, serializeWorkspace, fitRect } from './state.mjs';
import { mountApps, escapeHTML } from './apps.js';

const root = document.querySelector('[data-bear-workspace]');
if (root) mountDesktop(root);
function mountDesktop(root) {
  const catalog = JSON.parse(root.querySelector('[data-space-catalog]').textContent);
  const productRoot = root.closest('[data-product-space]');
  const labels = catalog.labels, zh = catalog.language === 'zh';
  const t = (cn,en) => zh ? cn : en;
  const layer = root.querySelector('[data-space-windows]');
  const viewport = () => ({ width: root.clientWidth, height: root.clientHeight - 42 });
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
    });
  }
  function open(app,payload) {
    if (!APPS.includes(app)) return t('没有这个应用。','Unknown application.');
    const previous = state.windows.find(w => w.app === app);
    // Dock restores the existing document; an explicit payload navigates that app.
    update({ type:'open',app,payload:payload === undefined ? previous?.payload || '' : payload });
    if (!state.windows.some(w => w.app === app)) return t('窗口已满。先关闭一个窗口。','Close a window before opening another.');
    nodes.get(app)?.el.focus({preventScroll:true});
    return t(`已打开：${labels[app]}`,`Opened: ${labels[app]}`);
  }
  function command(commandText) {
    const [name,...parts] = String(commandText).trim().split(/\s+/);
    const arg = parts.join(' ');
    if (name === 'help') return 'apps | ls | open <app> | close <app> | search <words> | note <text> | arrange | export | clear\nrun <command>  '+t('在已连接的本地 Linux 沙盒执行命令','Execute in the connected local Linux sandbox');
    if (name === 'run') return execute('run',{command:arg});
    if (name === 'apps') return APPS.map(app=>`${app.padEnd(10)} ${labels[app]}`).join('\n');
    if (name === 'ls') return state.windows.map(w=>`${w.app}${w.minimized?' [minimized]':''}`).join('\n') || t('没有打开的窗口。','No open windows.');
    if (name === 'open') return open(arg);
    if (name === 'close') { update({type:'close',id:arg}); return t('窗口已关闭。','Window closed.'); }
    if (name === 'search') { showSearch(arg); return t('已打开搜索。','Search opened.'); }
    if (name === 'note') { update({type:'note',text:state.note+(state.note?'\n':'')+arg}); const existing=nodes.get('notes'); if(existing){existing.rendered=false;render();} return t('已追加到你的笔记。','Added to your note.'); }
    if (name === 'arrange') { execute('arrange'); return t('窗口已并排。','Windows arranged.'); }
    if (name === 'export') { execute('export'); return t('已导出工作区文件。','Workspace exported.'); }
    if (name === 'clear') { root.querySelector('[data-terminal-output]')?.replaceChildren(); return ''; }
    return t(`未知命令：${name}。输入 help 查看命令。`,`Unknown command: ${name}. Type help.`);
  }
  function execute(name,args = {}) {
    if (name === 'open') return open(args.app,args.payload);
    if (name === 'command') return command(args.command);
    if (['note','draft','favorite','theme','wallpaper'].includes(name)) { update({type:name,...args},!['note','draft','favorite'].includes(name)); return true; }
    if (name === 'close') { update({type:'close',id:args.id}); return true; }
    if (name === 'arrange') { if(root.clientWidth<=640)showOverview();else update({type:'arrange'}); return true; }
    if (name === 'search') { showSearch(args.query || ''); return true; }
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
    for (const w of [...state.windows]) update({type:'close',id:w.id});
    const width=root.clientWidth<=640?1280:viewport().width;
    update({type:'open',app:'welcome',rect:{x:Math.max(118,(width-1100)/2),y:67,width:Math.min(580,width-150),height:535}});
    update({type:'open',app:'photos',payload:'kumano',rect:{x:Math.max(550,(width-1100)/2+642),y:101,width:320,height:465}});
    update({type:'focus',id:'welcome'});
    update({type:'initialized'});
  }
  function showSearch(query = '') {
    closeMenu(); if (!search.open) search.showModal(); searchInput.value=query; searchIndex=0; drawSearch(); searchInput.focus();
  }
  function closeSearch() { search.close(); root.querySelector('[data-space-search-trigger]').focus({preventScroll:true}); }
  function drawSearch() {
    const query=searchInput.value.toLocaleLowerCase().trim();
    const appItems=APPS.filter(app=>`${app} ${labels[app]}`.toLocaleLowerCase().includes(query)).map(app=>({kind:'app',app,title:labels[app],desc:t('应用','Application')}));
    const productItems=catalog.products.filter(p=>`${p.name} ${p.description}`.toLocaleLowerCase().includes(query)).map(p=>({kind:'product',app:'products',payload:p.id,title:p.name,desc:p.stage}));
    const articleItems=query ? catalog.articles.filter(a=>`${a.title} ${a.description} ${(a.tags||[]).join(' ')}`.toLocaleLowerCase().includes(query)).slice(0,18).map(a=>({kind:'article',app:'reader',payload:a.url,title:a.title,desc:a.date})) : [];
    const items=[...appItems,...productItems,...articleItems].slice(0,24);
    root.querySelector('[data-space-search-results]').innerHTML=items.map((item,index)=>`<button class="space-search-result" data-search-kind="${item.kind}" data-search-app="${item.app}" data-search-payload="${escapeHTML(item.payload||'')}" ${index===searchIndex?'data-selected':''}>${icon(item.app)}<span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.desc)}</small></span></button>`).join('') || `<p class="space-app">${t('没有找到，试试另一个词。','No results. Try another word.')}</p>`;
  }
  searchInput.addEventListener('input',()=>{searchIndex=0;drawSearch();});
  search.addEventListener('keydown',event=>{
    const items=[...search.querySelectorAll('[data-search-app]')];
    if (event.key==='ArrowDown'||event.key==='ArrowUp') { event.preventDefault(); searchIndex=Math.max(0,Math.min(items.length-1,searchIndex+(event.key==='ArrowDown'?1:-1))); items.forEach((b,i)=>b.toggleAttribute('data-selected',i===searchIndex));items[searchIndex]?.scrollIntoView({block:'nearest'}); }
    if (event.key==='Enter'&&event.target===searchInput) {event.preventDefault();items[searchIndex]?.click();}
  });
  search.addEventListener('click',event=>{
    const target=event.target.closest('[data-search-app]');
    if(target){search.close();open(target.dataset.searchApp,target.dataset.searchPayload);}
    if(event.target.closest('[data-space-search-close]'))closeSearch();
    if(event.target===search)closeSearch();
  });
  function showOverview() {
    root.querySelector('[data-space-overview-list]').innerHTML=state.windows.map(w=>`<button class="space-overview__item" data-overview-id="${escapeHTML(w.id)}">${icon(w.app)}<strong>${escapeHTML(title(w))}</strong><small>${w.minimized?t('已最小化','Minimized'):t('打开中','Open')}</small></button>`).join('') || `<p>${t('桌面很清爽，打开一个应用吧。','A quiet desktop. Open an app.')}</p>`;
    overview.showModal();
  }
  overview.addEventListener('click',event=>{
    const item=event.target.closest('[data-overview-id]');
    if(item){const w=state.windows.find(w=>w.id===item.dataset.overviewId);overview.close();open(w.app,w.payload);}
    if(event.target.closest('[data-space-overview-close]')||event.target===overview)overview.close();
  });
  function closeMenu(){menuPanel.hidden=true;menu.setAttribute('aria-expanded','false');}
  root.addEventListener('click',event=>{
    const target=event.target;
    if(target.closest('[data-space-menu-trigger]')){menuPanel.hidden=!menuPanel.hidden;menu.setAttribute('aria-expanded',String(!menuPanel.hidden));return;}
    const opener=target.closest('[data-open]');
    if(opener){closeMenu();open(opener.dataset.open,opener.hasAttribute('data-payload') ? opener.dataset.payload : undefined);return;}
    const action=target.closest('[data-window-action]');
    if(action){const id=action.closest('[data-space-window]').dataset.spaceWindow;if(action.dataset.windowAction==='arrange')execute('arrange');else update({type:action.dataset.windowAction,id}); if(action.dataset.windowAction==='close'||action.dataset.windowAction==='minimize')root.querySelector(`[data-space-dock] [data-open="${id}"]`)?.focus({preventScroll:true});return;}
    if(target.closest('[data-space-arrange]')){closeMenu();execute('arrange');}
    if(target.closest('[data-space-export]')){closeMenu();execute('export');}
    if(target.closest('[data-space-home]')){closeMenu();home();}
    if(target.closest('[data-space-show-desktop]')){closeMenu();for(const w of state.windows)update({type:'minimize',id:w.id});}
    if(target.closest('[data-space-overview-trigger]'))showOverview();
    if(target.closest('[data-space-search-trigger]'))showSearch();
  });
  root.addEventListener('dblclick',event=>{const bar=event.target.closest('[data-window-drag]');if(bar&&!event.target.closest('button'))update({type:'maximize',id:bar.closest('[data-space-window]').dataset.spaceWindow});});
  layer.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const el=event.target.closest('[data-space-window]');if(!el)return;
    const id=el.dataset.spaceWindow;
    if(state.active!==id)update({type:'focus',id});
    const resize=event.target.closest('[data-window-resize]');
    const bar=event.target.closest('[data-window-drag]');
    if(viewport().width<=640||(!resize&&!bar)||event.target.closest('button,a,input,textarea'))return;
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
    const editing=event.target.closest('input,textarea,[contenteditable="true"]');
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showSearch();return;}
    if(event.key==='Escape'){closeMenu();if(search.open||overview.open)return;const current=state.windows.find(w=>w.id===state.active);if(current){update({type:'minimize',id:current.id});root.querySelector(`[data-space-dock] [data-open="${current.app}"]`)?.focus({preventScroll:true});}return;}
    if(!editing&&(event.key==='p'||event.key==='/')){event.preventDefault();showSearch();}
    if(!editing&&event.altKey&&event.key==='Tab'){event.preventDefault();showOverview();}
    if(!editing&&event.altKey&&event.key.startsWith('Arrow')){event.preventDefault();const w=state.windows.find(w=>w.id===state.active);if(w)update({type:'geometry',id:w.id,rect:{...w.rect,x:w.rect.x+(event.key==='ArrowRight'?20:event.key==='ArrowLeft'?-20:0),y:w.rect.y+(event.key==='ArrowDown'?20:event.key==='ArrowUp'?-20:0)}});}
  });
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{finishDrag(true);update({type:'viewport'});},100);});
  window.addEventListener('storage',event=>{if(event.key===storageKey&&event.newValue){const localEditing=root.contains(document.activeElement)&&document.activeElement.matches('textarea,input');if(localEditing){notify(t('另一个标签页更新了空间。刷新后可以载入。','Another tab updated this space. Reload to load it.'));return;}state=createWorkspace(event.newValue,stateViewport());const note=nodes.get('notes');if(note)note.rendered=false;const contact=nodes.get('contact');if(contact)contact.rendered=false;render();}});
  function setView(view,writeHash=true){
    const isLab=view==='lab';
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
  window.BearSpace=Object.freeze({ version:1, tools:Object.freeze([{name:'open',description:'Open an app',apps:[...APPS]},{name:'search',description:'Search public writing'},{name:'note',description:'Replace this visitor’s local note'},{name:'arrange',description:'Arrange open windows'},{name:'export',description:'Download workspace state'},{name:'run',description:'Execute in the connected local Docker sandbox; never on the host'}]), execute, snapshot:()=>JSON.parse(serializeWorkspace(state)) });
  if(!state.initialized)home();else render();
  applyHash();root.dataset.ready='true';
  if(saveFailure)notify(t('无法使用浏览器存储。笔记可导出，但刷新后可能丢失。','Browser storage is unavailable. Export notes before reloading.'));
}
