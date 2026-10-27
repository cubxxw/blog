import {jiangnanSolarState} from './jiangnan-solar.mjs';
const DAY=86400,KEY='cubxxw-room-time-v1',OFFSET_KEY='cubxxw-room-offset-v1';
const smooth=(a,b,n)=>{const x=Math.max(0,Math.min(1,(n-a)/(b-a)));return x*x*(3-2*x);};
export function jiangnanTimeAt(seconds){
  seconds=((Number.isFinite(seconds)?seconds:21*3600)%DAY+DAY)%DAY;
  const hour=seconds/3600;
  const rain=1-smooth(5.5,6.5,hour)*(1-smooth(19.4,20.2,hour));
  return {seconds,hour,...jiangnanSolarState(hour),rain,catRoutine:hour>=6&&hour<9||hour>=17&&hour<21?'explore':'nap',
    label:`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}`};
}
// Persist an epoch, never a frame counter: navigation, background tabs and a
// refresh all rejoin the same 144-minute day. Animation still uses real seconds.
export function createJiangnanTime({now=Date.now(),storage,startHour}={}){
  now=Number.isFinite(now)?now:Date.now();let epoch=now,initial=21*3600;
  if(Number.isFinite(startHour))initial=((startHour%24)+24)%24*3600;
  else try{
    const saved=JSON.parse(storage?.getItem(KEY)||'null');
    if(Number.isFinite(saved?.epoch)&&saved.epoch>=0&&saved.epoch<=now&&Number.isFinite(saved?.initial)){
      epoch=saved.epoch;initial=saved.initial;
    }else storage?.setItem(KEY,JSON.stringify({epoch,initial}));
  }catch{/* A private window still owns a continuous in-memory day. */}
  let offset=0,holding=null;
  if(!Number.isFinite(startHour))try{
    const saved=JSON.parse(storage?.getItem(OFFSET_KEY)||'null');
    if(saved?.epoch===epoch&&saved?.initial===initial&&Number.isFinite(saved?.offset)&&Math.abs(saved.offset)<DAY*3650)offset=saved.offset;
  }catch{}
  const natural=stamp=>initial+Math.max(0,(Number.isFinite(stamp)?stamp:now)-epoch)/1000*10;
  const commit=(stamp=Date.now())=>{if(holding!==null){offset=holding-natural(stamp);holding=null;}if(Number.isFinite(startHour))return;try{storage?.setItem(OFFSET_KEY,JSON.stringify({epoch,initial,offset}));}catch{}};
  return {
    at(stamp=Date.now()){const sampledAt=Number.isFinite(stamp)?stamp:now,present=natural(sampledAt),unwrapped=holding??present+offset;return {...jiangnanTimeAt(unwrapped),unwrapped,borrowed:Math.abs(unwrapped-present)>.001,sampledAt};},
    presentAt(stamp=Date.now()){const sampledAt=Number.isFinite(stamp)?stamp:now,unwrapped=natural(sampledAt);return {...jiangnanTimeAt(unwrapped),unwrapped,borrowed:false,sampledAt};},
    travelTo(seconds,{stamp=Date.now(),persist=true}={}){if(!Number.isFinite(seconds)||Math.abs(seconds)>DAY*3650)return;offset=seconds-natural(stamp);if(holding!==null)holding=seconds;if(persist)commit(stamp);},
    hold(stamp=Date.now()){holding=holding??natural(stamp)+offset;},
    returnNow(){holding=null;offset=0;commit();},commit
  };
}

// Weather belongs to the room lifetime, rather than to its visual frame loop.
// A reader can cross dawn in an article without leaving night rain running.
export function watchJiangnanWeather(clock,onWeather,{now=()=>Date.now(),schedule=setTimeout,cancel=clearTimeout}={}){
  let stopped=false,timer;
  function update(){
    if(stopped)return;
    onWeather(clock.at(now()));
    if(!stopped)timer=schedule(update,1000);
  }
  update();
  return ()=>{if(stopped)return;stopped=true;cancel(timer);};
}
