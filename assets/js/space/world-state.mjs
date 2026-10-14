// Metres, with a visitor radius. The opening in the north wall leads to the terrace.
export const WORLD_COLLIDERS = Object.freeze([
  {minX:-7.2,maxX:-6.65,minZ:-4.8,maxZ:5.8},
  {minX:6.65,maxX:7.2,minZ:-4.8,maxZ:5.8},
  {minX:-7,maxX:-1.1,minZ:-4.7,maxZ:-4.4},
  {minX:1.1,maxX:7,minZ:-4.7,maxZ:-4.4},
  {minX:-6.3,maxX:-3.7,minZ:-3.7,maxZ:-1.1},
  {minX:2.1,maxX:5.2,minZ:-3.1,maxZ:-1.9},
  {minX:-3.9,maxX:-2.3,minZ:.5,maxZ:2.1},
  {minX:-.9,maxX:.5,minZ:.7,maxZ:2.1},
  {minX:-6.4,maxX:-5.2,minZ:2.1,maxZ:4.5},
]);
export function stepWalk(position,yaw,input,seconds,colliders=WORLD_COLLIDERS) {
  let f=input.forward||0,r=input.right||0; const length=Math.hypot(f,r);
  if(!length)return {...position}; f/=length;r/=length;
  const distance=Math.min(Math.max(seconds,0),.04)*2.4;
  const dx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*distance;
  const dz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*distance;
  const clear=(x,z)=>!colliders.some(b=>x>b.minX-.22&&x<b.maxX+.22&&z>b.minZ-.22&&z<b.maxZ+.22);
  let x=Math.max(-6.4,Math.min(6.4,position.x+dx)),z=position.z;
  if(!clear(x,z))x=position.x;
  const nextZ=Math.max(-11.5,Math.min(9,position.z+dz));
  if(clear(x,nextZ))z=nextZ;
  return {x,z};
}
export function travelPose(a,b,progress) {
  if(progress<=0)return {...a};if(progress>=1)return {...b};
  const t=progress*progress*(3-2*progress), out={};
  for(const key of ['x','y','z','pitch','fov'])out[key]=a[key]+(b[key]-a[key])*t;
  const delta=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));
  out.yaw=a.yaw+delta*t;return out;
}
export function screenFit({width,height}) {
  const scale=Math.min(3.1/width,1.8/height),visibleFraction=.82;
  const distance=(height*scale)/(2*Math.tan(38*Math.PI/360)*visibleFraction);
  return {scale,distance,visibleFraction};
}
