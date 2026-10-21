import test from 'node:test';
import assert from 'node:assert/strict';
import {roomViewport, projectQuad, createRendererController,roomScreenQuad,boatPose} from '../assets/js/space/rain-room-state.mjs';

test('the real display remains registered to the monitor through portrait panning and a closer room view',()=>{
  const source=[[1097,322],[1314,326],[1301,454],[1081,439]];
  for(const [width,height,scroll] of [[1440,900,0],[390,844,360],[568,320,0]]){
    const g=roomViewport({width,height});
    for(const zoom of [1,1.18]){
      const origin=[1933*.76,814*.25],quad=roomScreenQuad(g,scroll,{zoom,origin});
      source.forEach(([x,y],i)=>{assert.ok(Math.abs(quad[i][0]-(g.left-scroll+(origin[0]+(x-origin[0])*zoom)*g.scale))<1e-6);assert.ok(Math.abs(quad[i][1]-(g.top+(origin[1]+(y-origin[1])*zoom)*g.scale))<1e-6);});
    }
  }
});

test('the sampan moves in one direction at a gentle pace and wraps only outside the window',()=>{
  for(let time=0;time<128;time+=.5){
    const a=boatPose(time),b=boatPose(time+.05);assert.ok([a.x,a.y,a.width,a.height,a.angle].every(Number.isFinite));
    if(b.x<a.x){assert.ok(a.x-b.x<1);assert.ok(Math.abs(b.y-a.y)<.3);}
    else{assert.ok(a.x+a.width<984);assert.ok(b.x>1751);}
  }
});

test('wide view retains the entire café and portrait opens at the computer and photo frame',()=>{
  for(const [width,height] of [[1440,900],[1280,800],[568,320],[1920,1080]]){
    const g=roomViewport({width,height});
    assert.equal(g.pan,false);assert.ok(g.width<=width+.01&&g.height<=height+.01);
    assert.ok(g.top>=0);assert.equal(g.scrollLeft,0);
  }
  for(const [width,height] of [[375,812],[390,844],[768,1024]]){
    const g=roomViewport({width,height});assert.equal(g.pan,true);
    for(const x of [1210,1510]){const screenX=x*g.scale-g.scrollLeft;assert.ok(screenX>35&&screenX<width-35);}
    assert.ok(85*g.scale>=44,'the photo target remains finger-sized');
    assert.ok(g.height<height-110&&g.width>width);
  }
});

test('photo projection maps every source corner to the actual tablet screen',()=>{
  const quad=[[20,10],[130,24],[113,97],[2,80]],{matrix,map}=projectQuad(160,100,quad);
  assert.equal(matrix.length,16);assert.ok(matrix.every(Number.isFinite));
  [[0,0],[160,0],[160,100],[0,100]].forEach((p,i)=>{
    const result=map(...p);assert.ok(Math.abs(result[0]-quad[i][0])<1e-6);assert.ok(Math.abs(result[1]-quad[i][1])<1e-6);
  });
});

function world(name,events){return {name,mode:'roam',firstFrame:Promise.resolve(true),start(){events.push(name+':start');this.mode='roam';},focus(){this.mode='workspace';},setTheme(id){events.push(name+':theme:'+id);},setQuiet(value){this.quiet=value;},dispose(){events.push(name+':dispose');}};}

test('a late scene import cannot replace the newest room or dispose its renderer',async()=>{
  const pending=new Map(),events=[];
  const c=createRendererController({load:id=>new Promise(resolve=>pending.set(id,resolve)),create:(factory,id)=>factory(id,events)});
  const a=c.select('zen'),b=c.select('jiangnan');
  pending.get('jiangnan')(world);assert.equal((await b).status,'ready');
  pending.get('zen')(world);assert.equal((await a).status,'superseded');
  assert.equal(c.current.name,'jiangnan');assert.ok(!events.includes('jiangnan:dispose'));
});

test('module failure keeps the usable scene; crossing renderers preserves desktop mode and quiet state',async()=>{
  const events=[],c=createRendererController({load:async id=>{if(id==='rain')throw Error('offline');return world;},create:(f,id)=>f(id,events)});
  await c.select('jiangnan');c.current.focus();c.setQuiet(true);
  assert.equal((await c.select('rain')).status,'failed');assert.equal(c.current.name,'jiangnan');
  await c.select('zen');assert.equal(c.current.mode,'workspace');assert.equal(c.current.quiet,true);
  assert.equal(events.filter(e=>e==='jiangnan:dispose').length,1);
  c.dispose();c.dispose();assert.equal(events.filter(e=>e==='zen:dispose').length,1);
});

test('disposing while an import is pending never creates a late canvas or listener',async()=>{
  let resolve,created=0;
  const c=createRendererController({load:()=>new Promise(r=>resolve=r),create:()=>{created++;return world('late',[]);}});
  const pending=c.select('jiangnan');c.dispose();resolve(world);
  assert.equal((await pending).status,'superseded');assert.equal(created,0);assert.equal(c.current,null);
});
