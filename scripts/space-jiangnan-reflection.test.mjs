import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createJiangnanDoorExcursion} from '../assets/js/space/jiangnan-door-state.mjs';
import {createJiangnanDoorFade} from '../assets/js/space/jiangnan-door-fade.mjs';

const {parse}=createRequire(import.meta.url)('acorn');
const worldURL=new URL('../assets/js/space/world-jiangnan.js',import.meta.url);
const source=readFileSync(worldURL,'utf8'),syntax=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const world=syntax.body.find(node=>node.type==='ExportNamedDeclaration'&&node.declaration?.id?.name==='createCafeWorld').declaration.body;
const text=node=>node?source.slice(node.start,node.end):'';
const declarations=world.body.filter(node=>node.type==='VariableDeclaration').flatMap(node=>node.declarations);
const declaration=name=>text(declarations.find(node=>node.id.name===name));
const functionSource=name=>text(world.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name));
const assignmentTo=(statement,name)=>statement.type==='ExpressionStatement'&&statement.expression.type==='AssignmentExpression'&&statement.expression.left.name===name;
const setup=world.body.find(node=>node.type==='TryStatement'&&node.block.body.some(statement=>assignmentTo(statement,'firstTimer'))).block.body;
const softwareSetup=text(setup.find(statement=>assignmentTo(statement,'reflectionDone')));
const timerSetup=text(setup.find(statement=>assignmentTo(statement,'firstTimer')));
const locals=['disposed','mode','quiet','frame','last','environmentTime','frames','moving','drag','inspection','reflectionDone','firstPending','resolveFirst','firstTimer','readingPage','clockReturn','doorWater'];

// Execute the current world functions, including the real gates and timer
// ownership. Only browser/GPU boundaries are faked; no readiness logic is copied.
const runtime=`
  let ${locals.map(declaration).join(',')};
  const ${['firstFrame','settleFirst','startTime','visible','doorFade','excursion'].map(declaration).join(',')};
  ${['stop','wake'].map(functionSource).join('\n')}
  ${['finishTravel','reflectRoom','tick','visibility'].map(functionSource).join('\n')}
  ${softwareSetup}
  quiet=true;
  ${timerSetup}
  wake();
  ({
    firstFrame,
    setMaps(value){root.dataset.worldPbrMaps=String(value);wake();},
    hide(value){document.hidden=value;visibility();},
    beginFlight(duration){moving={elapsed:0,started:performance.now(),duration,to:{},motion:{at(){return {};}},resolve(){}};wake();},
    get travelling(){return Boolean(moving);},
    setFlowing(value){quiet=!value;wake();},
    get environmentTime(){return environmentTime;}
  });
`;

function fixture({software=false}={}){
  let now=0,nextId=0,draws=0;
  const timers=new Map(),frames=new Map(),captures=[];
  const root={hidden:false,dataset:{worldPbrMaps:'0'}},document={hidden:false};
  const material={isMeshStandardMaterial:true};
  const renderer={shadowMap:{enabled:true},getContext(){return {};},setRenderTarget(){}};
  const noop=()=>{};
  const THREE={
    WebGLCubeRenderTarget:class{constructor(){this.texture={};}dispose(){}},
    CubeCamera:class{
      constructor(){this.position={set(){}};}
      update(){captures.push({maps:Number(root.dataset.worldPbrMaps),at:now});}
      removeFromParent(){}
    },
    PMREMGenerator:class{fromCubemap(){return {texture:{},dispose(){}};}dispose(){}}
  };
  const world=runInNewContext(runtime,{
    performance:{now:()=>now},root,document,software,renderer,THREE,createJiangnanDoorExcursion,createJiangnanDoorFade,
    setTimeout(callback,delay){const id=++nextId;timers.set(id,{at:now+delay,callback});return id;},
    clearTimeout:id=>timers.delete(id),
    requestAnimationFrame(callback){const id=++nextId;frames.set(id,callback);return id;},
    cancelAnimationFrame:id=>frames.delete(id),
    // The previous world queries this capability at capture time; the current
    // world records it during renderer setup. Both see the same software budget.
    worldRenderBudget:()=>({maxPixels:software?384000:Infinity}),
    resources:new Set(),keys:new Set(),touchKeys:new Set(),reduced:{matches:false},
    workspace:{dataset:{surface:'room'}},camera:{},scene:{add(){}},
    room:{update(){},group:{traverse:visit=>visit({material})}},
    exterior:{update(){},group:{visible:true},boat:{position:{x:0,y:0,z:0},rotation:{y:0}},vistaMode:'image'},
    css:{render(){}},resident:null,magicClock:null,standbyClock:null,
    roomTime:{at:()=>({seconds:75600,daylight:0,rain:1,catRoutine:'nap'})},roomLights:{update(){}},audio:null,
    objectControls:{querySelector:()=>({textContent:'看看窗外的雨'})},t:cn=>cn,
    isBlocked:()=>false,navigate:()=>false,roomView:()=>false,
    publishObjects:noop,screenVisibility:noop,applyPose:noop,onTravel:noop,
    renderRoom(){draws++;return {triangles:0,calls:0};},
    onFailure(){throw new Error('Unexpected render failure in reflection fixture');}
  });
  return {
    world,captures,
    get draws(){return draws;},
    get reflected(){return Boolean(material.envMap);},
    advance(time){
      now=time;
      for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.callback();}
    },
    flush(){const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(now);}
  };
}

test('early boot keeps its pending reflection deadline and captures fallback only once',async()=>{
  const f=fixture();
  f.world.setMaps(11);f.flush();
  assert.equal(await f.world.firstFrame,true,'entry can become ready before the final material');
  assert.equal(f.captures.length,0,'incomplete materials must not be baked at entry');
  assert.equal(f.reflected,false);
  f.advance(2300);f.flush();
  assert.equal(f.captures.length,1,'the retained deadline must wake a quiet room');
  assert.equal(f.captures[0].maps,11,'fallback may use the available materials');
  assert.equal(f.reflected,true,'the captured environment must reach room materials');
  assert.equal(f.world.environmentTime,0,'a reflection wake must respect paused animation');
  f.world.setMaps(12);f.flush();f.advance(6000);f.flush();
  assert.equal(f.captures.length,1,'late materials must not bake a second reflection');
});

test('a hidden room crossing the reflection deadline captures once after returning',async()=>{
  const f=fixture();
  f.world.setMaps(11);f.flush();
  assert.equal(await f.world.firstFrame,true);
  assert.equal(f.captures.length,0);
  f.world.hide(true);const before=f.draws;
  f.advance(3000);f.flush();
  assert.equal(f.captures.length,0,'hidden deadline must not capture');
  assert.equal(f.draws,before,'hidden deadline must not draw');
  f.world.hide(false);f.flush();
  assert.equal(f.captures.length,1,'visibility must recover an expired deadline');
  assert.equal(f.reflected,true);
  f.world.hide(true);f.advance(6000);f.world.hide(false);f.flush();
  assert.equal(f.captures.length,1,'later visibility changes must not recapture');
  assert.equal(f.world.environmentTime,0);
});

test('software boot cancels the unused reflection wake without another draw',async()=>{
  const f=fixture({software:true});
  f.world.setMaps(11);f.flush();
  assert.equal(await f.world.firstFrame,true);
  const before=f.draws;
  f.advance(2300);f.flush();f.advance(6000);f.flush();
  assert.equal(f.captures.length,0,'the software budget must skip reflection');
  assert.equal(f.reflected,false);
  assert.equal(f.draws,before,'successful boot must retire the unused fallback wake');
});

test('intentional camera travel uses visible wall time even when frames arrive slowly',()=>{
 const f=fixture({software:true});f.world.setMaps(12);f.world.beginFlight(1000);
 for(const stamp of [10,410,810,1210]){f.advance(stamp);f.flush();}
 assert.equal(f.world.travelling,false,'a one-second approach must not become a several-second wait at low FPS');
 assert.equal(f.world.environmentTime,0,'camera time does not unpause the environment');
});

test('a camera flight created between slow frames never inherits time before the click',()=>{
 const f=fixture({software:true});f.world.setMaps(12);f.world.setFlowing(true);f.advance(10);f.flush();
 f.advance(995);f.world.beginFlight(1000);f.advance(1010);f.flush();
 assert.equal(f.world.travelling,true,'the first frame has only 15ms of this flight, not the previous full frame interval');
 f.advance(2010);f.flush();assert.equal(f.world.travelling,false);
});

test('a hidden flight resumes from its previous visible time without catching up the hidden interval',()=>{
 const f=fixture({software:true});f.world.setMaps(12);f.advance(10);f.world.beginFlight(1000);f.flush();f.advance(410);f.flush();
 f.world.hide(true);f.advance(20000);f.world.hide(false);f.flush();assert.equal(f.world.travelling,true);
 f.advance(20700);f.flush();assert.equal(f.world.travelling,false);
});
