import test from 'node:test';
import assert from 'node:assert/strict';
const time=await import('../assets/js/space/jiangnan-time.mjs').catch(()=>null);

test('one room day takes 8640 real seconds and survives a reload',()=>{
  assert.ok(time?.createJiangnanTime,'missing shared room clock');
  const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  const clock=time.createJiangnanTime({now:1000000,storage});
  assert.equal(clock.at(1000000).hour,21);
  assert.equal(clock.at(4600000).hour,7);
  assert.equal(clock.at(9640000).hour,21);
  assert.equal(time.createJiangnanTime({now:4600000,storage}).at(4600000).hour,7);
});
test('daylight stops both rain and its ambience, and twilight changes continuously',()=>{
  assert.ok(time?.jiangnanTimeAt);
  const morning=time.jiangnanTimeAt(10*3600),night=time.jiangnanTimeAt(22*3600);
  assert.equal(morning.rain,0);assert.equal(morning.daylight,1);assert.equal(morning.catRoutine,'nap');
  assert.equal(night.rain,1);assert.equal(night.daylight,0);
  const before=time.jiangnanTimeAt(6*3600),after=time.jiangnanTimeAt(6*3600+1);
  assert.ok(after.daylight>=before.daylight&&after.daylight-before.daylight<.001);
  assert.ok(Math.abs(after.rain-before.rain)<.001);
  assert.ok(time.jiangnanTimeAt(18*3600).catRoutine==='explore');
});
test('bad storage or time never produces an invalid scene',()=>{
  assert.ok(time?.createJiangnanTime);
  const storage={getItem(){return '{broken';},setItem(){throw new Error('private storage');}};
  const clock=time.createJiangnanTime({now:5000,storage});
  assert.equal(clock.at(5000).hour,21);
  assert.ok(Number.isFinite(clock.at(NaN).seconds));
});

test('weather crosses dawn without a render frame, and disposal cancels its only wake',()=>{
  assert.equal(typeof time?.watchJiangnanWeather,'function');
  let now=0,serial=0;const pending=new Map(),heard=[];
  const clock=time.createJiangnanTime({now:0});
  const stop=time.watchJiangnanWeather(clock,day=>heard.push(day.rain),{
    now:()=>now,schedule(fn){pending.set(++serial,fn);return serial;},cancel:id=>pending.delete(id)
  });
  assert.deepEqual(heard,[1]);assert.equal(pending.size,1);
  now=3600000;const wake=[...pending.values()][0];pending.clear();wake();
  assert.deepEqual(heard,[1,0]);assert.equal(pending.size,1);
  stop();assert.equal(pending.size,0);wake();assert.equal(heard.length,2);
});

test('published room-clock samples bind their rate to the actual sampling timestamp',()=>{
  const clock=time.createJiangnanTime({now:1000});
  const first=clock.at(1100),later=clock.at(2700);
  assert.equal(first.sampledAt,1100);assert.equal(later.sampledAt,2700);
  assert.ok(Math.abs((later.unwrapped-first.unwrapped)-(later.sampledAt-first.sampledAt)/100)<1e-8);
  clock.travelTo(21600,{stamp:2700,persist:false});clock.hold(2800);
  const held=clock.at(4400),present=clock.presentAt(4400);
  assert.equal(held.sampledAt,4400);assert.equal(present.sampledAt,4400);
  assert.equal(held.unwrapped,21601);assert.equal(held.borrowed,true);
  for(const method of ['at','presentAt'])for(const stamp of [NaN,Infinity,-Infinity]){
    const snapshot=clock[method](stamp);assert.equal(snapshot.sampledAt,1000);assert.ok(Number.isFinite(snapshot.unwrapped));
  }
});
