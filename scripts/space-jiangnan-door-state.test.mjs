import test from 'node:test';
import assert from 'node:assert/strict';
import {createJiangnanDoorExcursion, jiangnanDoorPoses, JIANGNAN_DOOR} from '../assets/js/space/jiangnan-door-state.mjs';
import {JIANGNAN_BOUNDS, jiangnanWalk} from '../assets/js/space/jiangnan-state.mjs';

function fixture() {
  let time = 0, id = 0;
  const timers = new Map(), phases = [];
  const machine = createJiangnanDoorExcursion({now:() => time,
    setTimer(fn, delay) {const key = ++id; timers.set(key, {fn, at:time + delay}); return key;},
    clearTimer(key) {timers.delete(key);}, onPhase:phase => phases.push(phase)});
  const advance = ms => {
    const end = time + ms;
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!next) break;
      time = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    time = end;
  };
  return {machine, timers, phases, advance};
}
const flush = () => Promise.resolve();
function complete(machine, run) {
  for (const next of ['opening','threshold','falling','submerged','returning','indoor']) assert.equal(machine.advance(run,next),true,next);
}

test('an excursion follows its deliberate ring once and ignores duplicate activation', () => {
  const f = fixture(), run = f.machine.begin();
  assert.ok(run > 0); assert.equal(f.machine.begin(),0);
  assert.equal(f.machine.advance(run,'submerged'),false);
  complete(f.machine,run);
  assert.equal(f.machine.phase,'indoor'); assert.equal(f.machine.check(run),false);
  assert.equal(f.machine.activeRun,0);
  assert.deepEqual(f.phases,['approaching','opening','threshold','falling','submerged','returning','indoor']);
});

test('a delayed camera callback from an aborted visit cannot advance a reopened door', async () => {
  const f = fixture(), first = f.machine.begin();
  let resolve;
  const delayed = new Promise(r => {resolve=r;}).then(() => f.machine.check(first) && f.machine.advance(first,'opening'));
  assert.equal(f.machine.abort(),true);
  const generation = f.machine.token, second = f.machine.begin();
  assert.ok(second > generation && second > first);
  resolve(); assert.equal(await delayed,false);
  assert.equal(f.machine.phase,'approaching'); assert.equal(f.machine.check(second),true);
});

test('a delayed callback after normal completion is also stale on the next visit', async () => {
  const f = fixture(), first = f.machine.begin();
  let resolve;
  const delayed = new Promise(r => {resolve=r;}).then(() => f.machine.advance(first,'opening'));
  complete(f.machine,first);
  assert.equal(f.machine.check(first),false);
  const second = f.machine.begin(); assert.ok(second > first);
  resolve(); assert.equal(await delayed,false); assert.equal(f.machine.phase,'approaching');
});

test('Escape invalidates pending camera work and beats from every active phase', async () => {
  for (const target of ['approaching','opening','threshold','falling','submerged','returning']) {
    const f = fixture(), first = f.machine.begin();
    for (const next of ['opening','threshold','falling','submerged','returning']) {
      if (f.machine.phase === target) break;
      assert.equal(f.machine.advance(first,next),true);
    }
    const beat = f.machine.wait(first,680), recovery = f.machine.recover();
    assert.ok(recovery > first,target); assert.equal(f.machine.phase,'returning');
    assert.equal(await beat,false); assert.equal(f.machine.check(first),false);
    assert.equal(f.machine.advance(recovery,'indoor'),true); assert.equal(f.timers.size,0);
  }
});

test('hidden time does not spend the remaining opening beat', async () => {
  const f = fixture(), run = f.machine.begin(); let done = false;
  const beat = f.machine.wait(run,680).then(value => {done=true; return value;});
  f.advance(220); f.machine.setPaused(true);
  assert.equal(f.timers.size,0); f.advance(8000); await flush(); assert.equal(done,false);
  f.machine.setPaused(false); f.advance(459); await flush(); assert.equal(done,false);
  f.advance(1); assert.equal(await beat,true);
});

test('a camera promise resolving while hidden waits at the visibility gate', async () => {
  const f = fixture(), run = f.machine.begin(); f.machine.setPaused(true);
  let done = false; const gate = f.machine.wait(run,0).then(value => {done=true; return value;});
  f.advance(4000); await flush(); assert.equal(done,false); assert.equal(f.timers.size,0);
  f.machine.setPaused(false); f.advance(0); assert.equal(await gate,true);
});

test('enabling quiet or reduced motion settles a current beat immediately without losing its run', async () => {
  const f = fixture(), run = f.machine.begin(), beat = f.machine.wait(run,680);
  f.advance(30); f.machine.setStill(true);
  assert.equal(await beat,true); assert.equal(f.timers.size,0);
  assert.equal(f.machine.check(run),true); assert.equal(f.machine.advance(run,'opening'),true);
  f.machine.setStill(false); const next = f.machine.wait(run,60); f.advance(60); assert.equal(await next,true);
});

test('quiet enabled while hidden preserves that freeze, then skips the beat on return', async () => {
  const f = fixture(), run = f.machine.begin(); let done = false;
  const beat = f.machine.wait(run,680).then(value => {done=true; return value;});
  f.machine.setPaused(true); f.machine.setStill(true); f.advance(2000); await flush(); assert.equal(done,false);
  f.machine.setPaused(false); f.advance(0); assert.equal(await beat,true); assert.equal(f.timers.size,0);
});

test('scene abort and disposal settle hidden beats and retain no timers or late callbacks', async () => {
  for (const method of ['abort','dispose']) {
    const f = fixture(), run = f.machine.begin(), beat = f.machine.wait(run,680);
    f.machine.setPaused(true); f.machine[method]();
    assert.equal(await beat,false); assert.equal(f.timers.size,0); assert.equal(f.machine.phase,'indoor');
    const phases = [...f.phases]; f.advance(5000); f.machine.setPaused(false); assert.deepEqual(f.phases,phases);
    assert.equal(f.machine.check(run),false);
    if (method === 'dispose') {assert.equal(f.machine.begin(),0); f.machine.dispose();}
  }
});

test('the special water pose crosses only the opening, while ordinary walking stays indoors', () => {
  const {threshold,water} = jiangnanDoorPoses(1.6), {opening,wall} = JIANGNAN_DOOR;
  const progress = (wall.z-threshold.z)/(water.z-threshold.z), x = threshold.x+(water.x-threshold.x)*progress;
  assert.ok(x > opening.minX+.1 && x < opening.maxX-.1);
  let pose={...threshold,yaw:Math.PI,pitch:0};
  for(let i=0;i<180;i++) pose=jiangnanWalk(pose,{forward:1},.04);
  assert.ok(pose.z <= JIANGNAN_BOUNDS.maxZ);
  for (const aspect of [.32,.55,1,1.6,3,NaN,-1]) {
    for (const view of Object.values(jiangnanDoorPoses(aspect))) for (const number of Object.values(view)) assert.ok(Number.isFinite(number));
  }
});
