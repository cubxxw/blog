import {browserBookmarks,browserDestination,createBrowserHistory} from './browser-state.mjs';

export function mountBrowser({host,catalog,escapeHTML:html,payload=''}){
 const zh=catalog.language==='zh',t=(cn,en)=>zh?cn:en,abort=new AbortController();
 const bookmarks=browserBookmarks(catalog.products,location.origin),history=createBrowserHistory();
 const listen=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
 host.innerHTML=`<section class="space-browser" data-space-browser>
  <header class="space-browser__chrome"><div class="space-browser__navigation">
   <button type="button" data-browser-back aria-label="${t('返回上个站点','Previous site')}" title="${t('返回上个站点','Previous site')}">←</button>
   <button type="button" data-browser-forward aria-label="${t('前往下个站点','Next site')}" title="${t('前往下个站点','Next site')}">→</button>
   <button type="button" data-browser-home aria-label="${t('浏览器主页','Browser home')}" title="${t('浏览器主页','Browser home')}">⌂</button>
   <button type="button" data-browser-reload aria-label="${t('重新打开站点','Reload website')}" title="${t('重新打开站点','Reload website')}">↻</button></div>
  <form data-browser-form class="space-browser__address"><label><span class="space-sr-only">${t('网址','Website address')}</span><input data-browser-address type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="2048" placeholder="${t('输入网址，或从主页选一个站点','Enter an address, or choose a website')}"></label><button type="submit" aria-label="${t('访问网址','Go to address')}">↵</button></form>
  <a data-browser-external target="_blank" rel="noopener noreferrer" aria-label="${t('在新标签页打开当前网站','Open this website in a new tab')}" title="${t('在新标签页打开','Open in a new tab')}" hidden>↗</a></header>
  <div class="space-browser__content" data-browser-content></div><p class="space-browser__status" data-browser-status role="status"></p></section>`;
 const shell=host.querySelector('[data-space-browser]'),content=host.querySelector('[data-browser-content]'),address=host.querySelector('[data-browser-address]'),status=host.querySelector('[data-browser-status]'),external=host.querySelector('[data-browser-external]');
 const back=host.querySelector('[data-browser-back]'),forward=host.querySelector('[data-browser-forward]'),reload=host.querySelector('[data-browser-reload]');
 let frameEvents=null,loadingTimer=0;
 function sync(){back.disabled=!history.canBack();forward.disabled=!history.canForward();reload.disabled=shell.dataset.browserView!=='page';}
 function home(){
  shell.dataset.browserView='home';shell.dataset.browserLoading='false';address.value='';external.hidden=true;external.removeAttribute('href');status.textContent=t('我的站点与作品','My websites and projects');
  content.innerHTML=`<div class="space-browser-home" data-browser-start><header><h2>${t('做过的东西，常去的地方。','Things I make. Places I return to.')}</h2><p>${t('写作、阅读、旅行，还有一些正在做的产品。','Writing, reading, travel, and a few things in progress.')}</p></header>
   <nav class="space-browser-home__places" aria-label="${t('博客与生活','Writing and life')}"><a href="${zh?'/zh/':'/'}" data-browser-visit>${t('博客首页','Blog')}</a><a href="${zh?'/zh/articles/':'/articles/'}" data-browser-visit>${t('文章','Writing')}</a><a href="${zh?'/zh/travel/':'/travel/'}" data-browser-visit>${t('旅途','Travel')}</a><button type="button" data-open="products" data-payload="">${t('作品集','Projects')}</button></nav>
   <div class="space-browser-bookmarks">${bookmarks.map(p=>`<a class="space-browser-bookmark" data-browser-visit data-browser-bookmark="${html(p.id)}" data-site-color="${html(p.color||'sage')}" href="${html(p.url)}" target="_blank" rel="noopener noreferrer" title="${html(p.name)} · ${p.embed?t('在电脑中浏览','Browse in this computer'):t('在新标签页浏览','Browse in a new tab')}">
    <span class="space-browser-bookmark__picture" aria-hidden="true">${p.image?`<img src="${html(p.image)}" alt="" loading="lazy">`:`<span>${html(p.mark||p.name?.slice(0,2)||'W')}</span>`}</span><span class="space-browser-bookmark__name">${html(p.name)}<span aria-hidden="true">${p.embed?'':'↗'}</span></span><small>${html(p.host)}</small></a>`).join('')}</div></div>`;
 }
 function show(url){
  frameEvents?.abort();frameEvents=null;clearTimeout(loadingTimer);shell.dataset.browserLoading='false';
  const destination=browserDestination(url,bookmarks,location.origin);
  address.removeAttribute('aria-invalid');
  if(destination.kind==='home'){home();sync();return;}
  address.value=destination.url;external.href=destination.url;external.hidden=false;
  if(destination.kind==='external'){
   shell.dataset.browserView='external';
   content.innerHTML=`<div class="space-browser-outbound"><span class="space-browser-outbound__mark" aria-hidden="true">↗</span><h2>${html(destination.title)}</h2><p>${html(new URL(destination.url).hostname)}</p><a class="space-button" href="${html(destination.url)}" target="_blank" rel="noopener noreferrer">${t('在新标签页继续浏览','Continue in a new tab')} ↗</a></div>`;
   status.textContent=t('此站点在独立标签页中浏览，房间的音乐会继续。','Browse this website in its own tab. The room keeps playing.');sync();return;
  }
  shell.dataset.browserView='page';shell.dataset.browserLoading='true';
  const frame=document.createElement('iframe');frame.className='space-browser__page';frame.title=t('浏览网页：','Website: ')+destination.title;
  frame.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  frame.referrerPolicy='no-referrer';frame.setAttribute('allow',"autoplay 'none'; camera 'none'; microphone 'none'; geolocation 'none'");
  frameEvents=new AbortController();frame.addEventListener('load',()=>{
   clearTimeout(loadingTimer);shell.dataset.browserLoading='false';const hostname=new URL(destination.url).hostname;status.textContent=destination.title===hostname?hostname:destination.title+' · '+hostname;
   try{
    const actual=frame.contentWindow.location.href;if(new URL(actual).origin!==location.origin)return;
    const destination=browserDestination(actual,bookmarks,location.origin);
    if(destination.kind==='external'){visit(actual);return;}
    if(destination.kind==='page'){history.visit(actual);address.value=actual;external.href=actual;const title=frame.contentDocument?.title;if(title){frame.title=title;status.textContent=title;}sync();}
   }catch{ /* A remote website owns its own document and internal navigation. */ }
  },{signal:frameEvents.signal});
  frame.src=destination.url;content.replaceChildren(frame);
  // Cross-origin frames do not expose load failures or their later history.
  // Keep a real escape to the website instead of claiming a successful load.
  status.textContent=t('正在打开 ','Opening ')+destination.title+'…';
  loadingTimer=setTimeout(()=>{status.textContent=t('连接比平常慢，可以在右上角用新标签页继续打开。','Taking longer than usual. You can open this website in a new tab at the top right.');},12000);sync();
 }
 function visit(value,{newTab=false,refresh=false}={}){
  const destination=browserDestination(value,bookmarks,location.origin);
  if(destination.kind==='invalid'){address.setAttribute('aria-invalid','true');status.textContent=t('请输入有效的网址。','Enter a valid website address.');address.focus({preventScroll:true});return;}
  if(!refresh&&destination.url===history.current()&&shell.dataset.browserView===({'home':'home','page':'page','external':'external'}[destination.kind])){address.removeAttribute('aria-invalid');address.value=destination.url;return;}
  history.visit(destination.url);show(destination.url);
  if(newTab&&destination.kind==='external')window.open(destination.url,'_blank','noopener,noreferrer');
 }
 listen(host.querySelector('[data-browser-form]'),'submit',event=>{event.preventDefault();visit(address.value,{newTab:true,refresh:true});});
 listen(back,'click',()=>show(history.back()));listen(forward,'click',()=>show(history.forward()));
 listen(host.querySelector('[data-browser-home]'),'click',()=>visit(''));
 listen(reload,'click',()=>visit(history.current(),{refresh:true}));
 listen(content,'click',event=>{
  const link=event.target.closest('a[data-browser-visit]');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const dest=browserDestination(link.getAttribute('href'),bookmarks,location.origin);
  if(dest.kind==='external')return;event.preventDefault();visit(link.href);
 });
 if(payload)visit(payload);else home();sync();
 return {visit,dispose(){clearTimeout(loadingTimer);frameEvents?.abort();abort.abort();content.replaceChildren();}};
}
