// Metre-space geometry plans; local hashes never advance the room's shared RNG.
export function localRandom(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function noise(x,z,seed){return Math.sin(x*.73+seed*.17)*.45+Math.sin(x*1.93-z*.67+seed)*.24+Math.cos(z*1.31+x*.29+seed*.3)*.31;}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function hash(x,z,seed){let h=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(seed,1442695041);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;}
export function field(x,z,seed=1){const ix=Math.floor(x),iz=Math.floor(z),u=smooth(x-ix),v=smooth(z-iz),a=hash(ix,iz,seed),b=hash(ix+1,iz,seed),c=hash(ix,iz+1,seed),d=hash(ix+1,iz+1,seed);return (a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*2-1;}
export function ridgeHeight(x,z,seed=1){
  const bend=field(x*.023,0,seed)*8+Math.sin(x*.041+seed)*4,across=z-bend;
  const spine=Math.exp(-Math.pow(Math.abs(across+5)/17,1.45));
  const peaks=11+field(x*.022,0,seed+7)*5+field(x*.049,across*.035,seed+3)*2.4;
  const fold=1-Math.abs(field(x*.055+across*.025,across*.065,seed+11));
  const gullies=Math.abs(field(x*.14+across*.04,across*.12,seed+9));
  return -.45+Math.max(.1,peaks)*spine*(.48+.65*fold)-gullies*.9*spine+field(x*.36,across*.32,seed+4)*.18*spine;
}
export function ridgeGrid({x=0,z=0,width=190,depth=46,height=1,seed=1,columns=128,rows=32}={}){
  const positions=new Float32Array((columns+1)*(rows+1)*3),uv=new Float32Array((columns+1)*(rows+1)*2),indices=[];
  for(let r=0;r<=rows;r++)for(let c=0;c<=columns;c++){const xx=x+(c/columns-.5)*width,zz=z+(r/rows-.5)*depth,i=r*(columns+1)+c;positions.set([xx,-.45+Math.max(0,ridgeHeight(xx,zz-z,seed)+.45)*Math.sin(r/rows*Math.PI)**1.2*height,zz],i*3);uv.set([xx/8,zz/8],i*2);if(c<columns&&r<rows){const a=i,b=i+1,d=i+columns+1,e=d+1;indices.push(a,d,b,b,d,e);}}
  return {positions,uv,indices:new Uint32Array(indices),triangles:columns*rows*2};
}
export function distantRidgePlan(theme,row,index){const low=Math.min(...row.map(r=>r.x-r.width/2)),high=Math.max(...row.map(r=>r.x+r.width/2));return {x:(low+high)/2,z:-(theme==='mountain'?115:theme==='lake'?105:100)-index*32,width:high-low+index*12,depth:60,height:Math.min(.8,row.reduce((sum,r)=>sum+r.height,0)/row.length/36),seed:17+index*19};}
export function shoreZ(x,theme='lake'){return (theme==='coast'?-18:-18.8)+Math.sin(x*.17+.8)*2.2+Math.sin(x*.049-1.2)*3.1+field(x*.22,0,34)*.7;}
export function shoreGridZ(x,row,rows,theme){const edge=shoreZ(x,theme),boundary=Math.round(rows*.55);return row<=boundary?-100+(edge+100)*(row/boundary):edge+(6-edge)*Math.pow((row-boundary)/(rows-boundary),1.65);}
function shoreSlope(x){const u=x*.22,i=Math.floor(u),t=u-i;return Math.cos(x*.17+.8)*2.2*.17+Math.cos(x*.049-1.2)*3.1*.049+(hash(i+1,0,34)-hash(i,0,34))*2*6*t*(1-t)*.22*.7;}
export function groundLevel(x,z,theme='zen'){
  if(theme==='lake'||theme==='coast'){const distance=z-shoreZ(x,theme),inland=smooth((distance-7)/7)*smooth((-z-10)/5);return -.18+smooth(distance/5)*.08-smooth(-distance/6)*1.6+inland*(field(x*.09,z*.09,41)*.23+field(x*.22,z*.22,18)*.05);}
  const away=smooth((Math.abs(x+.4)-.9)/1.8)*smooth((-z-10)/5),hummock=field(x*.075,z*.075,38)*.36+field(x*.18,z*.18,29)*.08;const soil=-.1+smooth((-z-10)/6)*(field(x*.19,z*.19,51)*.11+field(x*.65,z*.65,13)*.025-.035)+(theme==='rain'?0:away*hummock);
  if(theme==='zen'||theme==='garden'){const basin=Math.hypot((x-3.6)/2.4,(z+13.5)/1.95);return soil-.18*(1-smooth((basin-.75)/.4));}return soil;
}
export function rockPoint(x,y,z,variant=0){
  const scale=1+noise(x*2.7,z*2.7,variant+3)*.12+Math.sin(y*11+x*4+variant)*.055;
  return [x*scale*(1+variant*.045)+y*.09,y*scale*.67+.045*Math.sin(x*7+variant),z*scale*(.83-variant*.035)+x*y*.08];
}
export function mossPoint(x,y,z,variant=0){const a=Math.atan2(z,x),edge=1+Math.sin(a*5+variant)*.11+Math.sin(a*9-variant*.7)*.055;return [x*edge,y*(.90+.10*Math.sin(a*3+variant)),z*edge];}
export const CAFE_LIGHT={ambient:.58,sun:1.8,rainAmbient:.22,rainSun:0,shadow:{left:-10,right:10,top:9,bottom:-9,near:.5,far:32}};
const waves=[[.31,.21,.005,.32],[-.18,.48,.004,.41],[1.1,.73,.002,.61],[-.87,1.43,.0015,.53],[1.79,-.39,.001,.71]];
export function waterLevel(x,z,time){let height=0;for(const [kx,kz,amplitude,speed] of waves)height+=Math.sin(x*kx+z*kz+time*speed)*amplitude;return height;}
export function waterNormal(x,z,time,out=[0,1,0]){let dx=0,dz=0;for(const [kx,kz,amplitude,speed] of waves){const slope=Math.cos(x*kx+z*kz+time*speed)*amplitude;dx+=slope*kx;dz+=slope*kz;}const length=Math.hypot(dx,1,dz);out[0]=-dx/length;out[1]=1/length;out[2]=-dz/length;return out;}
export function sampleWater(x,z,time,theme,out=[0,0,1,0]){
  let height=0,dx=0,dz=0;for(const [kx,kz,amplitude,speed] of waves){const phase=x*kx+z*kz+time*speed,slope=Math.cos(phase)*amplitude;height+=Math.sin(phase)*amplitude;dx+=slope*kx;dz+=slope*kz;}
  if(theme==='lake'||theme==='coast'){const t=(shoreZ(x,theme)-z)/1.2,fade=smooth(t),derivative=t>0&&t<1?6*t*(1-t)/1.2:0;dx=dx*fade+height*derivative*shoreSlope(x);dz=dz*fade-height*derivative;height*=fade;}
  const length=Math.hypot(dx,1,dz);out[0]=height;out[1]=-dx/length;out[2]=1/length;out[3]=-dz/length;return out;
}
// Static capillary normal detail remains visible when the visitor chooses stillness.
function periodicField(x,z,cells){const u=x/(Math.PI*2)*cells,v=z/(Math.PI*2)*cells,ix=Math.floor(u),iz=Math.floor(v),a=smooth(u-ix),b=smooth(v-iz),wrap=i=>(i%cells+cells)%cells,value=(i,j)=>hash(wrap(i),wrap(j),61),p=value(ix,iz),q=value(ix+1,iz),r=value(ix,iz+1),s=value(ix+1,iz+1);return (p+(q-p)*a+(r-p)*b+(p-q-r+s)*a*b)*2-1;}
export function waterDetail(x,z){return periodicField(x,z,16)*.55+periodicField(x,z,32)*.30+periodicField(x,z,64)*.15;}

export function pineCrownPlan(x,z,height){
  const random=localRandom(Math.round((x+40)*217+(z+40)*151)),branches=[],cards=[];
  for(let level=0;level<8;level++)for(let arm=0;arm<5;arm++){
    const angle=arm*Math.PI*2/5+level*1.71+(random()-.5)*.35,y=height*(.20+level*.095),length=height*(.29-level*.029)*(.85+random()*.3),start=[x+.08*y/height,y,z],elbow=[x+Math.cos(angle)*length*.58,y-height*.025,z+Math.sin(angle)*length*.58],end=[x+Math.cos(angle)*length,y+height*(.04+random()*.035),z+Math.sin(angle)*length];
    branches.push({start,elbow,end,radius:height*.0065*(1-level*.09)});
    for(let n=0;n<16;n++){const t=.22+n/15*.80,spread=height*.043*(1-level*.075),roll=n*2.3999632;cards.push({position:[start[0]+(end[0]-start[0])*t+Math.cos(roll)*spread,start[1]+(end[1]-start[1])*t+(random()-.5)*spread,start[2]+(end[2]-start[2])*t+Math.sin(roll)*spread],direction:[Math.cos(angle)*.70,.55+random()*.45,Math.sin(angle)*.70],roll,scale:(.92+random()*.4)*(height/5)*(1-level*.055)});}
  }return {branches,cards};
}
