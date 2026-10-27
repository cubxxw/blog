import test from 'node:test';
import assert from 'node:assert/strict';
import {JIANGNAN_COLLIDERS,JIANGNAN_BOUNDS} from '../assets/js/space/jiangnan-state.mjs';
const cat=await import('../assets/js/space/jiangnan-cat-state.mjs').catch(()=>null);

test('Jiangnan resident exposes a room-specific route adapter',()=>{
  assert.ok(cat?.JIANGNAN_CAT_ADAPTER,'missing Jiangnan resident route adapter');
});
test('every floor route clears the current room furniture with the whole turning footprint',{skip:!cat},()=>{
  assert.ok(cat.JIANGNAN_CAT_RADIUS>=.31);
  for(const a of cat.JIANGNAN_CAT_PLACES){
    assert.ok(cat.jiangnanCatPositionClear(a.x,a.z),a.name);
    for(const i of a.links)assert.ok(cat.jiangnanCatSegmentClear(a,cat.JIANGNAN_CAT_PLACES[i]),`${a.name} → ${cat.JIANGNAN_CAT_PLACES[i].name}`);
  }
});
test('unhurried walking visits varied stops and never penetrates furniture or room walls',{skip:!cat},()=>{
  for(const seed of [1,79,314]){
    let state={...cat.createJiangnanCatState(seed),phase:'look',remaining:0},walked=false,rested=false;const stops=new Set();
    for(let i=0;i<24000;i++){
      const next=cat.stepJiangnanCat(state,1/30);
      assert.ok(cat.jiangnanCatPositionClear(next.x,next.z));
      assert.ok(cat.jiangnanCatSegmentClear(state,next));
      assert.ok(Math.hypot(next.x-state.x,next.z-state.z)<=.32/30+1e-9);
      assert.ok(Math.abs(next.yaw-state.yaw)<=1.9/30+1e-9);
      walked ||= next.speed>0;rested ||= next.phase==='rest';stops.add(next.place);state=next;
    }
    assert.ok(walked&&rested);assert.ok(stops.size>=5);
  }
});
test('pauses preserve route and expression time exactly; active stall has bounded displacement',{skip:!cat},()=>{
  let state=cat.createJiangnanCatState();for(let i=0;i<300;i++)state=cat.stepJiangnanCat(state,.04);
  assert.equal(cat.stepJiangnanCat(state,3600,{paused:true}),state);
  for(const dt of [NaN,Infinity,-1,0])assert.equal(cat.stepJiangnanCat(state,dt),state);
  const next=cat.stepJiangnanCat(state,3600);assert.ok(Math.hypot(next.x-state.x,next.z-state.z)<=.32*.04+1e-9);
});
test('calls from every stop arrive safely, then permit one finite pet response',{skip:!cat},()=>{
  const visitors=[{x:-1.0,z:1.5,yaw:0},{x:1.9,z:1.25,yaw:.5},{x:-1.2,z:-1.3,yaw:1}];
  for(const [place,p] of cat.JIANGNAN_CAT_PLACES.entries())for(const visitor of visitors){
    let state={...cat.createJiangnanCatState(),phase:'look',x:p.x,z:p.z,place,goal:place},reply=cat.requestJiangnanCat(state,'call',visitor,{now:10});
    assert.equal(reply.result,'approaching',p.name);state=reply.state;const seed=state.seed;
    for(let i=0;i<4000&&state.interaction?.stage==='approach';i++){
      const next=cat.stepJiangnanCat(state,.04);assert.ok(cat.jiangnanCatSegmentClear(state,next));state=next;
    }
    assert.equal(state.interaction?.stage,'near',p.name);assert.equal(state.seed,seed);
    assert.ok(Math.hypot(state.x-visitor.x,state.z-visitor.z)<1.31);
    reply=cat.requestJiangnanCat(state,'pet',visitor,{nearby:true,now:14});assert.equal(reply.result,'petting');
    const at={x:reply.state.x,z:reply.state.z};state=reply.state;
    assert.equal(cat.requestJiangnanCat(state,'pet',visitor,{nearby:true,now:15}).result,'cooldown');
    for(let i=0;i<61;i++)state=cat.stepJiangnanCat(state,.04);
    assert.equal(state.interaction,null);assert.equal(state.x,at.x);assert.equal(state.z,at.z);
    for(let i=0;i<500;i++){const next=cat.stepJiangnanCat(state,.04);assert.ok(cat.jiangnanCatSegmentClear(state,next));state=next;}
  }
});
test('wall calls and newly blocked routes stop in place; still pet never moves the animal',{skip:!cat},()=>{
  const state={...cat.createJiangnanCatState(),phase:'look'};assert.equal(cat.requestJiangnanCat(state,'call',{x:0,z:-8},{now:10}).result,'unreachable');
  const still=cat.requestJiangnanCat(state,'pet',{x:1.9,z:1.25},{instant:true,nearby:true,now:10});
  assert.equal(still.result,'petted-still');assert.equal(still.state.x,state.x);assert.equal(still.state.z,state.z);
  const requested=cat.requestJiangnanCat(state,'call',{x:1.9,z:1.25},{now:10}).state;
  const box={minX:state.x-.1,maxX:state.x+.1,minZ:state.z-.1,maxZ:state.z+.1};
  const next=cat.stepJiangnanCat(requested,.04,{colliders:[...JIANGNAN_COLLIDERS,box]});
  assert.equal(next.x,state.x);assert.equal(next.z,state.z);assert.equal(next.interaction.instant,true);
  const corner={x:JIANGNAN_BOUNDS.maxX,z:JIANGNAN_BOUNDS.maxZ};assert.equal(cat.jiangnanCatPositionClear(corner.x,corner.z),false);
});
test('a direct encounter stops walking and looks at the visitor before resuming',{skip:!cat},()=>{
  let state={...cat.createJiangnanCatState(),phase:'walk',goal:1,speed:.2};
  const visitor={x:-.8,z:1.4};state=cat.attendJiangnanCat(state,visitor);const {x,z}=state;
  assert.equal(state.speed,0);assert.equal(state.phase,'look');assert.ok(Math.abs(state.yaw-Math.atan2(visitor.x-x,visitor.z-z))<1e-9);
  for(let i=0;i<100;i++)state=cat.stepJiangnanCat(state,.04);
  assert.equal(state.x,x);assert.equal(state.z,z);
});

test('the advertised resident action follows sleeping, waking, nearby and inspected states',()=>{
  assert.equal(typeof cat.jiangnanCatAction,'function');const visitor={x:0,z:0},near={x:.5,z:0},far={x:4,z:0};
  for(const phase of ['sleep','wake'])assert.equal(cat.jiangnanCatAction({...near,phase},visitor),'call');
  assert.equal(cat.jiangnanCatAction({...near,phase:'look'},visitor),'pet');
  assert.equal(cat.jiangnanCatAction({...far,phase:'look'},visitor),'call');
  assert.equal(cat.jiangnanCatAction({...far,phase:'sleep'},visitor,{inspecting:true}),'pet');
});
