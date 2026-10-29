import type {Page,TestInfo} from '@playwright/test';
import {readRoomObservation} from './room-observation';

type Check={selector:'.space-world__canvas';state:'focused'}
 |{selector:'[data-space-window="browser"]'|'[data-space-dock]'|'[data-room-inspection]';state:'visible'|'hidden'}
 |{selector:'[data-bear-workspace]';state:'attribute';attribute:'data-room-objects'};
type Report={selector:string;state:string;matched:boolean;count:number;visible?:boolean;focused?:boolean;activeIsNode?:boolean;documentFocused?:boolean;value?:string|null;display?:string;visibility?:string;box?:{x:number;y:number;width:number;height:number};samples:number;elapsedMs:number};
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object';

// Only the existing main-page selectors above. No locator engine or private PW
// state is used. Visibility mirrors pinned Chromium PW1.64.1 computeBox and
// _activelyFocused; each check keeps its own complete Node5000ms gate.
export async function observeRoomDom(page:Page,info:TestInfo,check:Check):Promise<Report>{
 const label='Room DOM '+check.state+' '+check.selector;
 const allowed=check.state==='focused'?check.selector==='.space-world__canvas':check.state==='attribute'?check.selector==='[data-bear-workspace]'&&check.attribute==='data-room-objects':(check.state==='visible'||check.state==='hidden')&&['[data-space-window="browser"]','[data-space-dock]','[data-room-inspection]'].includes(check.selector);
 if(!allowed)throw new Error('Unsupported room DOM observation');
 try{
  const result=await readRoomObservation(page,async check=>{
   const started=performance.now(),deadline=started+5000;let samples=0,last:Report|undefined;
   // These simple CSS selectors also match inside open shadow roots in PW.
   const query=(selector:string)=>{
    const found:Element[]=[];
    const visit=(scope:Document|ShadowRoot)=>{found.push(...scope.querySelectorAll(selector));for(const element of scope.querySelectorAll('*'))if(element.shadowRoot)visit(element.shadowRoot);};
    visit(document);if(found.length>1)throw new Error('Room DOM strict selector matched multiple elements: '+selector);return found;
   };
   const root=query('[data-bear-workspace]')[0];
   if(!root?.isConnected||root.getRootNode()!==document)throw new Error('Room DOM workspace root missing or unsupported');
   const sameRoot=()=>{const roots=query('[data-bear-workspace]');if(roots.length!==1||roots[0]!==root||!root.isConnected||root.ownerDocument!==document)throw new Error('Room DOM workspace root replaced or detached');};
   let range:Range|undefined;
   const textVisible=(node:Node)=>{range??=node.ownerDocument!.createRange();try{range.selectNode(node);const rect=range.getBoundingClientRect();if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height))throw new Error('Room DOM text geometry invalid');return rect.width>0&&rect.height>0;}finally{range.setStart(node.ownerDocument!,0);range.collapse(true);}};
   const visible=(element:Element):boolean=>{
    // PW's general fallback is true without style. In this supported main DOM,
    // missing native style is unsupported and must not manufacture visibility.
    const style=element.ownerDocument.defaultView?.getComputedStyle(element);if(!style)throw new Error('Room DOM style unavailable');
    if(style.display==='contents'){
     for(const child of element.childNodes){if(child.nodeType===1&&visible(child as Element))return true;if(child.nodeType===3&&textVisible(child))return true;}return false;
    }
    // Unparameterized checkVisibility, then CSS visibility, then positive box.
    // Opacity0 and offscreen positions are deliberately not hidden conditions.
    if(!element.checkVisibility()||style.visibility!=='visible')return false;
    const rect=element.getBoundingClientRect();if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height))throw new Error('Room DOM geometry invalid');return rect.width>0&&rect.height>0;
   };
   for(;;){
    if(performance.now()>=deadline)throw new Error(labelForFailure());sameRoot();
    const nodes=query(check.selector),element=nodes[0],connected=Boolean(element?.isConnected);
    if(element){let host=element;for(let tree=host.getRootNode();tree!==document;tree=host.getRootNode()){if(!(tree instanceof ShadowRoot))throw new Error('Unsupported room DOM root');host=tree.host;}if(!root.contains(host))throw new Error('Room DOM target is outside workspace root');}
    const row:Report={selector:check.selector,state:check.state,matched:false,count:nodes.length,samples:++samples,elapsedMs:0};
    if(check.state==='visible'||check.state==='hidden'){
     row.visible=connected&&visible(element);row.matched=check.state==='visible'?row.visible:!row.visible;
    }else if(check.state==='focused'){
     row.activeIsNode=connected&&(element.getRootNode() as Document|ShadowRoot).activeElement===element;row.documentFocused=connected&&element.ownerDocument.hasFocus();row.focused=row.activeIsNode&&row.documentFocused;row.matched=row.focused;
    }else if(check.state==='attribute'&&connected){row.value=element.getAttribute(check.attribute);row.matched=true;}
    if(connected&&(check.state==='hidden'||check.state==='visible')){const style=element.ownerDocument.defaultView?.getComputedStyle(element),box=element.getBoundingClientRect();row.display=style?.display;row.visibility=style?.visibility;row.box={x:box.x,y:box.y,width:box.width,height:box.height};}
    row.elapsedMs=performance.now()-started;last=row;
    if(row.elapsedMs>=5000)throw new Error(labelForFailure());if(row.matched)return row;
    await new Promise(resolve=>setTimeout(resolve,Math.min(50,deadline-performance.now())));
   }
   function labelForFailure(){return 'Room DOM observation exceeded5000ms; last actual sample='+JSON.stringify(last?{...last,value:undefined}:null);}
  },check,{timeout:5000,label,validate:(value):value is Report=>{
   if(!record(value)||value.selector!==check.selector||value.state!==check.state||value.matched!==true||!Number.isSafeInteger(value.count)||Number(value.count)<0||Number(value.count)>1||!Number.isSafeInteger(value.samples)||Number(value.samples)<1||typeof value.elapsedMs!=='number'||!Number.isFinite(value.elapsedMs)||value.elapsedMs<0||value.elapsedMs>=5000)return false;
   if(check.state==='attribute'&&(value.count!==1||(value.value!==null&&typeof value.value!=='string')))return false;
   if((check.state==='visible'||check.state==='hidden')&&(typeof value.visible!=='boolean'||value.matched!==(check.state==='visible'?value.visible:!value.visible)))return false;
   if(check.state==='focused'&&(value.focused!==true||value.count!==1))return false;
   const box=value.box;if(box!==undefined&&(!record(box)||!['x','y','width','height'].every(key=>typeof box[key]==='number'&&Number.isFinite(box[key]))))return false;
   // Public Node metadata, serialized inside readRoomObservation's own deadline.
   // This retains the actual state/box/timing without another page snapshot.
   const {value:raw,...diagnostic}=value;
   if(check.state==='attribute'){let parsed:unknown;try{parsed=JSON.parse(String(raw));}catch{}diagnostic.roomObjects=record(parsed)?{lamp:typeof parsed.lamp==='boolean'?parsed.lamp:null,fan:typeof parsed.fan==='boolean'?parsed.fan:null}:null;}
   info.annotations.push({type:'room-dom-observation',description:JSON.stringify(diagnostic)});return true;
  }});
  return result;
 }catch(error){info.annotations.push({type:'room-dom-observation-error',description:JSON.stringify({label,error:String(error),actualSampleUnavailableWhenNodeDeadlineExpires:true})});throw error;}
}
