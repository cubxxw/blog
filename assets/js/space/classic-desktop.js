// Menus stay inside the original window layer, so the room moves one desktop.
export function mountClassicDesktop({root,execute,notify}) {
  const abort=new AbortController(),buttons=[...root.querySelectorAll('[data-mac-menu]')],panels=[...root.querySelectorAll('[data-mac-panel]')];
  const zh=document.documentElement.lang.startsWith('zh');
  const listen=(el,type,fn)=>el.addEventListener(type,fn,{signal:abort.signal});
  let current=null,editing=null,selected='',selectionOwner=null;
  const editable=el=>el?.matches?.('textarea,input:not([type=button]):not([type=submit]),[contenteditable=true]');
  const activeWindow=()=>root.querySelector('[data-space-window][data-active="true"]:not([hidden])');
  function capture(){
    selectionOwner=activeWindow();const active=document.activeElement;
    if(editable(active)&&selectionOwner?.contains(active))editing=active;
    else if(!selectionOwner?.contains(editing))editing=null;
    const range=window.getSelection();selected=range?.anchorNode&&range?.focusNode&&selectionOwner?.contains(range.anchorNode)&&selectionOwner.contains(range.focusNode)?range.toString():'';
    if(!selected&&editing?.isConnected&&!editing.closest('[hidden],[inert]')&&typeof editing.selectionStart==='number')selected=editing.value.slice(editing.selectionStart,editing.selectionEnd);
  }
  function close(restore=false){
    const owned=current?.panel.contains(document.activeElement),trigger=current?.button;
    for(const panel of panels)panel.hidden=true;for(const button of buttons)button.setAttribute('aria-expanded','false');current=null;
    if(restore&&owned&&trigger?.isConnected&&!trigger.closest('[inert]'))trigger.focus({preventScroll:true});
  }
  function open(button,focus=false){
    const panel=panels.find(p=>p.dataset.macPanel===button.dataset.macMenu);if(!panel)return;
    if(button.dataset.macMenu==='edit'){
      const copy=panel.querySelector('[data-mac-edit=copy]');copy.disabled=!selected;
    }
    if(button.dataset.macMenu==='view'){
      for(const control of panel.querySelectorAll('[data-computer-display]')){control.disabled=root.dataset.worldRenderer!=='jiangnan'||root.dataset.worldFailed==='true';control.setAttribute('role','menuitemradio');control.setAttribute('aria-checked',String(control.dataset.computerDisplay===root.dataset.computerView));}
      for(const control of panel.querySelectorAll('[data-mac-theme]')){control.setAttribute('role','menuitemradio');control.setAttribute('aria-checked',String(control.dataset.macTheme===root.dataset.theme));}
    }
    close();panel.hidden=false;button.setAttribute('aria-expanded','true');current={button,panel};
    const layer=root.querySelector('[data-space-windows]');panel.style.left=Math.max(4,Math.min(button.offsetLeft,layer.clientWidth-panel.offsetWidth-4))+'px';
    if(focus)panel.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  for(const button of buttons){
    listen(button,'pointerdown',capture);
    listen(button,'click',()=>{if(current?.button===button)close();else{if(button.dataset.macMenu!=='edit')capture();open(button);}});
    listen(button,'pointerenter',()=>{if(current&&matchMedia('(hover:hover)').matches)open(button);});
    listen(button,'keydown',event=>{if(['ArrowDown','Enter',' '].includes(event.key)){event.preventDefault();capture();open(button,true);}});
  }
  listen(root,'click',event=>{
    const item=event.target.closest('.space-mac-menu button');if(!item)return;
    const edit=item.dataset.macEdit,theme=item.dataset.macTheme;close();
    if(theme)execute('theme',{value:theme});
    if(edit&&(selectionOwner!==activeWindow()||!selectionOwner?.isConnected||selectionOwner.closest('[hidden],[inert]'))){editing=null;selected='';return;}
    if(edit==='copy'&&selected){
      const origin=document.activeElement,target=editing?.isConnected&&!editing.closest('[hidden],[inert]')?editing:selectionOwner;
      const range=typeof editing?.selectionStart==='number'?[editing.selectionStart,editing.selectionEnd,editing.selectionDirection]:null;
      if(navigator.clipboard)navigator.clipboard.writeText(selected).catch(()=>notify(zh?'复制未成功，请使用键盘快捷键。':'Copy did not complete. Use the keyboard shortcut.'));else notify(zh?'请使用键盘快捷键复制。':'Use the keyboard shortcut to copy.');
      if([origin,document.body].includes(document.activeElement)&&target?.isConnected&&selectionOwner===activeWindow()){target.focus({preventScroll:true});if(range&&target===editing)editing.setSelectionRange(...range);}
    }
    if(edit==='all'){
      if(editing?.isConnected&&!editing.closest('[inert]')&&editing.getClientRects().length){editing.focus({preventScroll:true});if(typeof editing.select==='function')editing.select();else{const range=document.createRange();range.selectNodeContents(editing);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}}
      else{const body=selectionOwner.querySelector('[data-window-body]');if(body){const range=document.createRange();range.selectNodeContents(body);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}}
    }
  });
  listen(document,'pointerdown',event=>{if(!event.target.closest('[data-mac-menu],.space-mac-menu'))close();});
  listen(document,'keydown',event=>{
    if(!current||event.defaultPrevented)return;
    if((event.ctrlKey||event.metaKey)&&['k','j'].includes(event.key.toLowerCase())){close();return;}
    if(event.key==='Escape'){event.preventDefault();close(true);return;}
    if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const visible=buttons.filter(button=>button.getClientRects().length),index=visible.indexOf(current.button),next=(index+(event.key==='ArrowRight'?1:-1)+visible.length)%visible.length;open(visible[next],true);return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();const items=[...current.panel.querySelectorAll('button:not(:disabled)')],index=items.indexOf(document.activeElement);
      const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus({preventScroll:true});
    }
    if(event.key==='Tab')close();
  });
  const observer=new MutationObserver(()=>{if(root.hidden||root.dataset.cafeMode!=='desktop')close();});observer.observe(root,{attributes:true,attributeFilter:['hidden','data-cafe-mode']});
  const dispose=()=>{close();observer.disconnect();abort.abort();};listen(window,'pagehide',event=>{if(!event.persisted)dispose();});
  return {dispose};
}
