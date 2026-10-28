// Only public HTML sections belong in a café listening session. Asset, account,
// API and arbitrary same-origin endpoints retain ordinary browser navigation.
const sections=new Set(['articles','ai-agent','engineering','growth','projects','lab-notes','columns','tags','categories','archives','search','about','now','friends','travel']);
export function listeningPageURL(value,base){
  try{
    const url=new URL(value,base),origin=new URL(base).origin;
    if(!['http:','https:'].includes(url.protocol)||url.origin!==origin||url.username||url.password)return null;
    const segments=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if(segments.some(part=>part.startsWith('.')||/[\\/\u0000-\u001f]/.test(part)))return null;
    if(['zh','en'].includes(segments[0]))segments.shift();
    if(segments.length&&!sections.has(segments[0]))return null;
    const leaf=segments.at(-1)||'';if(/\.[^/]+$/.test(leaf)&&!/\.html?$/i.test(leaf))return null;
    return url;
  }catch{return null;}
}
export function isListeningRoomURL(value,base){
  const url=listeningPageURL(value,base);
  return Boolean(url&&/^\/(?:zh\/|en\/)?projects(?:\/(?:index\.html?)?)?$/.test(url.pathname));
}
export function isPlainListeningClick(event){
  return Boolean(event?.isTrusted&&!event.defaultPrevented&&event.button===0&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey);
}
export function hasNativeListeningTarget(anchor){
  const target=anchor?.getAttribute('target')||anchor?.ownerDocument?.querySelector('base[target]')?.getAttribute('target')||'';
  return Boolean(anchor?.hasAttribute('download')||(target&&target.toLowerCase()!=='_self'));
}
export function listeningLinkURL(anchor,event,base){
  if(!anchor||!isPlainListeningClick(event)||hasNativeListeningTarget(anchor)||anchor.relList?.contains('external'))return null;
  const href=anchor.getAttribute('href');if(!href||href.startsWith('#'))return null;
  const url=listeningPageURL(anchor.href||href,base);if(!url)return null;
  const current=new URL(base);
  if(url.pathname===current.pathname&&url.search===current.search&&url.hash)return null;
  return url;
}
