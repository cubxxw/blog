import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeLegacyMapleRandom,mapleCounts,maplePlan,mossMound,MAPLE_LEAF_BUDGET} from '../assets/js/space/world-garden.mjs';
const generator=(seed=79)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function originalTrees(){const random=generator();for(let i=0;i<24000+132;i++)random();const trees=[];let rotation;for(let i=0;i<17;i++){trees.push({x:-16+random()*32,z:-14-random()*15,height:2.7+random()*2.6,color:i%3?'#758849':'#a57049'});rotation=consumeLegacyMapleRandom(random);}return {trees,random,rotation};}

test('maple generation preserves the published garden random boundary for the following moss and mountain layout',()=>{
  const {trees,random,rotation}=originalTrees();assert.equal(trees.length,17);
  assert.deepEqual(rotation,[2.8747625041287392,.7653888082131743,2.5141949525568634]);
  assert.deepEqual(Array.from({length:5},random),[.9968974085059017,.8949612588621676,.6254755223635584,.8799301749095321,.010459261713549495]);
});
test('static foliage stays within the whole-garden budget and drops distant trees before near detail when constrained',()=>{
  const {trees}=originalTrees(),full=mapleCounts(trees),limited=mapleCounts(trees,40000),closest=trees.map((t,i)=>({i,d:Math.hypot(t.x-.85,t.z-2.45)})).sort((a,b)=>a.d-b.d).slice(0,4);
  assert.equal(full.length,17);assert.ok(full.every(count=>count>=2500&&count<=8000));assert.ok(full.reduce((a,b)=>a+b,0)<=MAPLE_LEAF_BUDGET);assert.ok(limited.reduce((a,b)=>a+b,0)<=40000);for(const {i} of closest)assert.equal(limited[i],full[i]);assert.ok(limited.some((count,i)=>count<full[i]));
});
test('real-size leaves occupy overlapping, layered crowns above connected curved and tapering branches',()=>{
  for(const height of [2.7,4.1,5.3]){const plan=maplePlan({x:2,z:-18,height},8000);assert.equal(plan.count,8000);assert.equal(plan.trunk.length,3);assert.equal(plan.branches.length,6);assert.equal(plan.twigs.length,12);assert.equal(plan.clusters.length,12);
    const starts=plan.branches.map(branch=>branch.start[1]);assert.ok(Math.max(...starts)-Math.min(...starts)>height*.20);
    for(const branch of plan.branches){assert.equal(branch.segments.length,3);assert.deepEqual(branch.segments[0].start,branch.start);assert.deepEqual(branch.segments.at(-1).end,branch.end);
      const trunk=plan.trunk.find(section=>branch.start[1]>=section.start[1]&&branch.start[1]<=section.end[1]);assert.ok(trunk);const t=(branch.start[1]-trunk.start[1])/(trunk.end[1]-trunk.start[1]);branch.start.forEach((v,i)=>assert.ok(Math.abs(v-(trunk.start[i]+(trunk.end[i]-trunk.start[i])*t))<1e-9));
      branch.segments.slice(1).forEach((section,i)=>{assert.deepEqual(section.start,branch.segments[i].end);assert.ok(Math.abs(section.radius-branch.segments[i].radius*.62)<1e-9);});
    }
    plan.clusters.forEach((cluster,i)=>{assert.deepEqual(cluster.center,plan.twigs[i].end);assert.deepEqual(plan.twigs[i].start,plan.branches[Math.floor(i/2)].end);});
    const connected=new Set([0]);for(let pass=0;pass<12;pass++)plan.clusters.forEach((c,i)=>{if([...connected].some(j=>c.center.reduce((sum,v,k)=>sum+((v-plan.clusters[j].center[k])/(c.radii[k]+plan.clusters[j].radii[k]))**2,0)<1))connected.add(i);});assert.equal(connected.size,12);assert.ok(Math.max(...plan.clusters.map(c=>c.center[1]))-Math.min(...plan.clusters.map(c=>c.center[1]))>height*.1);
    for(let i=0;i<plan.count;i++){const {center,radii}=plan.clusters[i%12],p=Array.from(plan.positions.slice(i*3,i*3+3)),n=Array.from(plan.normals.slice(i*3,i*3+3));assert.ok(p.every(Number.isFinite));assert.ok(p.reduce((sum,v,j)=>sum+((v-center[j])/radii[j])**2,0)<=1.00002);assert.ok(plan.sizes[i]>=.08-1e-8&&plan.sizes[i]<=.16+1e-8);assert.ok(Math.abs(Math.hypot(...n)-1)<1e-6);assert.ok(plan.shades[i]>=.89-1e-7&&plan.shades[i]<=1.04+1e-7);}
  }
});
test('ground moss keeps its sampled horizontal positions and footprint but cannot inherit a tilted tree rotation',()=>{
  const {random}=originalTrees();let first,last;
  for(let i=0;i<130;i++){const sample={x:-10+random()*20,z:-11-random()*12,width:.4+random()*.7,height:.13+random()*.15,depth:.4+random()*.7},mound=mossMound(i,sample);first??=sample;last=sample;assert.equal(mound.position[0],sample.x);assert.equal(mound.position[2],sample.z);assert.deepEqual(mound.rotation,[0,i*2.399963229728653,0]);assert.equal(mound.scale[0],sample.width);assert.equal(mound.scale[2],sample.depth);assert.ok(mound.scale[1]>=.0416&&mound.scale[1]<=.0896);assert.ok(mound.position[1]+mound.scale[1]<=.033);assert.ok(mound.position[1]-mound.scale[1]<-.035);}
  for(const [index,x,z,support] of [[0,0,-13,-.035],[0,6.4,-13,-.10],[1,-6.2,-13,-.10],[2,0,-16.3,-.10],[3,-10,-22,-.10]]){const mound=mossMound(index,{x,z,width:.6,height:.2,depth:.8});assert.ok(mound.position[1]-mound.scale[1]<support);assert.ok(mound.position[1]+mound.scale[1]>support);assert.ok(mound.position[1]<support);}
  assert.equal(first.x,9.937948170118034);assert.equal(last.z,-15.849292426370084);
  assert.deepEqual(Array.from({length:5},random),[.3267592324409634,.14744676742702723,.06661944533698261,.9683175138197839,.9457588486839086]);
});
test('the local maple fork is repeatable and does not mutate source trees or consume an outer random stream',()=>{
  const tree={x:-4,z:-19,height:4.2},copy={...tree},outer=generator(2026),control=generator(2026),a=maplePlan(tree,2500),b=maplePlan(tree,2500);assert.deepEqual(tree,copy);assert.deepEqual(a.positions,b.positions);assert.deepEqual(a.normals,b.normals);assert.deepEqual(a.sizes,b.sizes);assert.deepEqual(Array.from({length:8},outer),Array.from({length:8},control));
});
