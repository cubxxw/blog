export const RAIN_ROOM_SIZE = Object.freeze({width:1933,height:814});

export function roomViewport({width,height}) {
  width=Math.max(1,width);height=Math.max(1,height);
  const pan=width<960&&height>width*1.18;
  const scale=pan?Math.min(610,Math.max(Math.min(height*.64,height-150),420))/RAIN_ROOM_SIZE.height:Math.min(width/RAIN_ROOM_SIZE.width,height/RAIN_ROOM_SIZE.height);
  const w=RAIN_ROOM_SIZE.width*scale,h=RAIN_ROOM_SIZE.height*scale;
  return {pan,scale,width:w,height:h,top:Math.max(0,(height-h)/2),left:pan?0:Math.max(0,(width-w)/2),scrollLeft:pan?Math.max(0,Math.min(w-width,w*.69-width/2)):0};
}

// Unit-square homography, expressed in CSS's column-major matrix3d order.
export function projectQuad(width,height,quad) {
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=quad;
  const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
  const determinant=dx1*dy2-dx2*dy1;
  const g=Math.abs(determinant)>1e-10?(dx3*dy2-dx2*dy3)/determinant:0;
  const h=Math.abs(determinant)>1e-10?(dx1*dy3-dx3*dy1)/determinant:0;
  const a=x1-x0+g*x1,b=x3-x0+h*x3,d=y1-y0+g*y1,e=y3-y0+h*y3;
  return {matrix:[a/width,d/width,0,g/width,b/height,e/height,0,h/height,0,0,1,0,x0,y0,0,1],map:(x,y)=>{
    const u=x/width,v=y/height,z=g*u+h*v+1;return [(a*u+b*v+x0)/z,(d*u+e*v+y0)/z];
  }};
}

export function createRendererController({load,create,onBusy=()=>{}}) {
  let current=null,theme=null,quiet=false,version=0,disposed=false;
  const kind=id=>id==='jiangnan'?'rain':'three';
  async function select(id) {
    const revision=++version;
    const stale=()=>disposed||revision!==version;
    if(disposed)return {status:'superseded'};
    onBusy(true);
    try {
      if(current&&kind(theme)===kind(id)){
        await current.setTheme(id);if(stale())return {status:'superseded'};
        theme=id;return {status:'ready',world:current};
      }
      const factory=await load(id);if(stale())return {status:'superseded'};
      const mode=current?.mode;current?.dispose();current=null;
      const next=create(factory,id);current=next;theme=id;next.setQuiet(quiet);
      if(mode==='workspace')await next.focus(false);else await next.start({animate:false,focus:false});
      if(!await next.firstFrame)throw new Error('The scene did not paint');
      if(stale())return {status:'superseded'};
      return {status:'ready',world:next};
    } catch(error){return {status:stale()?'superseded':'failed',error};}
    finally{if(!stale())onBusy(false);}
  }
  return {select,setQuiet(value){quiet=value;current?.setQuiet(value);},get current(){return current;},get theme(){return theme;},dispose(){if(disposed)return;disposed=true;++version;current?.dispose();current=null;}};
}
