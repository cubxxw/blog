// Static maple foliage, in metres. No clocks, camera movement or animation.
export const MAPLE_LEAF_BUDGET=80000;
export const LEGACY_MAPLE_RANDOM_DRAWS=12000;
export function consumeLegacyMapleRandom(random){
  // Retain the old shared dummy state; the ground moss now sets its own pose.
  const rotation=[];for(let i=0;i<LEGACY_MAPLE_RANDOM_DRAWS;i++){const value=random();if(i>=11994&&i<=11996)rotation.push(value*3);}return rotation;
}
export function mapleRandom(tree){
  let seed=(Math.imul(Math.round(tree.x*1000),73856093)^Math.imul(Math.round(tree.z*1000),19349663)^Math.imul(Math.round(tree.height*1000),83492791)^79)>>>0;
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
export function mapleCounts(trees,budget=MAPLE_LEAF_BUDGET){
  const counts=trees.map(()=>0),ordered=trees.map((tree,index)=>({tree,index,distance:Math.hypot(tree.x-.85,tree.z-2.45)})).sort((a,b)=>a.distance-b.distance||a.index-b.index);
  let remaining=Math.min(MAPLE_LEAF_BUDGET,Math.max(0,Math.floor(budget)));
  ordered.forEach(({tree,index},rank)=>{const tier=rank<4?8000:rank<10?5000:2500,wanted=Math.max(2500,Math.round(tier*Math.min(1,(tree.height/4.5)**2)));counts[index]=Math.min(8000,wanted,remaining);remaining-=counts[index];});return counts;
}
export function maplePlan(tree,count){
  count=Math.min(8000,Math.max(0,Math.floor(count)));const random=mapleRandom(tree),{x,z,height:h}=tree,clusters=[],branches=[],twigs=[];
  const lean=[(random()-.5)*h*.08,(random()-.5)*h*.08],trunkPoints=[[x,0,z],[x+lean[0]*.5,h*.31,z+lean[1]*.5],[x+lean[0],h*.60,z+lean[1]],[x+lean[0]*.8,h*.92,z+lean[1]*1.2]];
  const trunk=trunkPoints.slice(1).map((end,i)=>({start:trunkPoints[i],end,radius:h*.035*.62**i}));
  const trunkAt=y=>{const i=y<=trunkPoints[1][1]?0:y<=trunkPoints[2][1]?1:2,a=trunkPoints[i],b=trunkPoints[i+1],t=(y-a[1])/(b[1]-a[1]);return a.map((v,j)=>v+(b[j]-v)*t);};
  for(let branch=0;branch<6;branch++){
    const angle=branch*2.4+(random()-.5)*.35,start=trunkAt(h*(.39+branch*.048+random()*.018)),tipY=h*(.72+branch*.024+random()*.055),reach=h*(.23+random()*.09),bend=(random()-.5)*.30;
    const points=[start,[start[0]+Math.cos(angle-bend)*reach*.38,start[1]+(tipY-start[1])*.48,start[2]+Math.sin(angle-bend)*reach*.38],[x+Math.cos(angle+bend)*reach*.76,tipY-h*.055,z+Math.sin(angle+bend)*reach*.76],[x+Math.cos(angle)*reach,tipY,z+Math.sin(angle)*reach]];
    const radius=h*(.012+random()*.004),segments=points.slice(1).map((end,i)=>({start:points[i],end,radius:radius*.62**i})),end=points[3];branches.push({start,end,segments});
    for(const side of [-1,1]){const a=angle+side*(.24+random()*.24),r=h*(side<0?.13+random()*.06:.26+random()*.07),tip=[x+Math.cos(a)*r,tipY+h*(random()*.10-.05),z+Math.sin(a)*r];twigs.push({start:end,end:tip,radius:h*.0028});clusters.push({center:tip,radii:[h*(.17+random()*.045),h*(.15+random()*.045),h*(.17+random()*.045)],angle:a});}
  }
  const positions=new Float32Array(count*3),normals=new Float32Array(count*3),sizes=new Float32Array(count),rolls=new Float32Array(count),shades=new Float32Array(count);
  for(let i=0;i<count;i++){
    const cluster=clusters[i%clusters.length],a=random()*Math.PI*2,vertical=random()*2-1,r=Math.cbrt(random()),horizontal=Math.sqrt(1-vertical*vertical),u=Math.cos(a)*horizontal*r,v=vertical*r,w=Math.sin(a)*horizontal*r;
    positions.set([cluster.center[0]+u*cluster.radii[0],cluster.center[1]+v*cluster.radii[1],cluster.center[2]+w*cluster.radii[2]],i*3);
    const nx=Math.cos(cluster.angle)*.45+(random()-.5)*1.2,ny=.35+random()*.65,nz=Math.sin(cluster.angle)*.45+(random()-.5)*1.2,length=Math.hypot(nx,ny,nz);normals.set([nx/length,ny/length,nz/length],i*3);
    sizes[i]=.08+random()*.08;rolls[i]=random()*Math.PI*2;shades[i]=.89+random()*.15;
  }
  return {count,trunk,clusters,branches,twigs,positions,normals,sizes,rolls,shades};
}
export function mossMound(index,{x,z,width,height,depth}){
  const angle=index*2.399963229728653,c=Math.cos(angle),s=Math.sin(angle),radiusX=Math.hypot(width*c,depth*s),radiusZ=Math.hypot(width*s,depth*c),radiusY=height*.32;
  const support=x-radiusX>=-6.5&&x+radiusX<=6.5&&z-radiusZ>=-16.4&&z+radiusZ<=-10.6?-.035:-.10;
  return {position:[x,support-radiusY*.25,z],rotation:[0,angle,0],scale:[width,radiusY,depth]};
}
