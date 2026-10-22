// Keep live iframe documents, focus and form state when the browser supports
// connected DOM moves. Initial attachment and older engines use normal DOM.
export function movePreservingState(parent,node,before=null){
 if(node===before||node.parentNode===parent&&node.nextSibling===before)return true;
 if(typeof parent.moveBefore==='function'&&parent.isConnected&&node.isConnected&&parent.ownerDocument===node.ownerDocument){parent.moveBefore(node,before);return true;}
 parent.insertBefore(node,before);return false;
}
