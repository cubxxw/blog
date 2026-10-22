import test from 'node:test';
import assert from 'node:assert/strict';
import {createJiangnanTime} from '../assets/js/space/jiangnan-time.mjs';
const sky=await import('../assets/js/space/jiangnan-solar.mjs').catch(()=>null);

test('borrowed time survives reload and returns to the still-running present',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const clock=createJiangnanTime({now:0,storage});assert.equal(typeof clock.travelTo,'function');
 clock.travelTo(21600,{stamp:1000});assert.equal(clock.at(1000).label,'06:00');assert.equal(clock.at(1000).borrowed,true);
 assert.equal(clock.at(61000).label,'06:10');
 const again=createJiangnanTime({now:61000,storage});assert.equal(again.at(61000).label,'06:10');
 again.returnNow();assert.equal(again.at(61000).borrowed,false);assert.equal(again.at(61000).label,'21:10');
});
test('reverse scrubbing crosses midnight without a discontinuity or saving every pointer move',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const clock=createJiangnanTime({now:0,storage});assert.equal(typeof clock.travelTo,'function');
 clock.travelTo(-1800,{stamp:0,persist:false});assert.equal(clock.at(0).label,'23:30');
 assert.equal(createJiangnanTime({now:0,storage}).at(0).label,'21:00');
 clock.commit();assert.equal(createJiangnanTime({now:0,storage}).at(0).label,'23:30');
});
test('holding a moving dial freezes borrowed time while the natural present keeps moving',()=>{
 const clock=createJiangnanTime({now:0});assert.equal(typeof clock.hold,'function');
 clock.travelTo(21600,{stamp:0});clock.hold(1000);
 assert.equal(clock.at(11000).label,'06:00');assert.equal(clock.presentAt(11000).label,'21:01');
 clock.travelTo(25200,{stamp:11000,persist:false});clock.commit(11000);
 assert.equal(clock.at(71000).label,'07:10');
});
test('both sunrises and sunsets cross the visible front of the same window',()=>{
 assert.ok(sky?.jiangnanSolarState);
 const dawn=sky.jiangnanSolarState(6.5),noon=sky.jiangnanSolarState(12),dusk=sky.jiangnanSolarState(17.5);
 assert.ok(dawn.sunDirection[0]<0&&dusk.sunDirection[0]>0);
 for(const at of [dawn,noon,dusk])assert.ok(at.sunDirection[2]<-.3);
 assert.ok(noon.sunDirection[1]>dawn.sunDirection[1]);
 assert.ok(dusk.reflectionStrength>sky.jiangnanSolarState(15).reflectionStrength);
 assert.equal(sky.jiangnanSolarState(22).sunStrength,0);
});
