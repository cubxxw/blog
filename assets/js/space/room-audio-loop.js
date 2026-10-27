// Decode once and loop on the audio sample clock. Neither a media seek nor a
// JavaScript timer sits on the loop boundary, including when a tab is busy.
export function crossfadeLoopBuffer(context,buffer,seconds,{trimSilence=false}={}) {
  let first=0,last=buffer.length;
  if(trimSilence){
    const channels=Array.from({length:buffer.numberOfChannels},(_,channel)=>buffer.getChannelData(channel));
    const audible=index=>channels.some(samples=>Math.abs(samples[index])>.001);
    while(first<last&&!audible(first))first++;
    while(last>first&&!audible(last-1))last--;
    if(first===last){first=0;last=buffer.length;}
  }
  const frames=last-first,overlap=Math.min(Math.round(seconds*buffer.sampleRate),Math.floor(frames/4));
  if(overlap<2)return buffer;
  const length=frames-overlap,result=context.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);
  for(let channel=0;channel<buffer.numberOfChannels;channel++){
    const input=buffer.getChannelData(channel),output=result.getChannelData(channel);
    output.set(input.subarray(first+overlap,last-overlap));
    for(let i=0;i<overlap;i++){
      const phase=i/(overlap-1)*Math.PI/2;
      output[length-overlap+i]=input[last-overlap+i]*Math.cos(phase)+input[first+i]*Math.sin(phase);
    }
  }
  return result;
}

export function createRoomLoopAudio() {
  let context,resuming,resumeHadActivation=false,disposed=false;
  const loops=new Set();
  function getContext(){
    if(disposed)throw new Error('Audio is disposed');
    if(!context){
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Context)throw new Error('Web Audio is unavailable');
      context=new Context({sampleRate:44100});
    }
    return context;
  }
  function resume(){
    const ctx=getContext();
    if(ctx.state==='running')return Promise.resolve(ctx);
    // resume() must run inside the original trusted handler, before fetching or
    // decoding. Chromium can leave its autoplay-blocked promise pending forever.
    const activation=globalThis.navigator?.userActivation;
    if(!resuming||(activation?.isActive&&!resumeHadActivation)){
      resumeHadActivation=Boolean(activation?.isActive);
      const pending=Promise.resolve(ctx.resume());resuming=pending;
      pending.finally(()=>{if(resuming===pending)resuming=null;}).catch(()=>{});
    }
    if(ctx.state!=='running'&&activation&&!activation.hasBeenActive&&!activation.isActive)
      return Promise.reject(Object.assign(new Error('A gesture is required'),{name:'NotAllowedError'}));
    return resuming.then(()=>{
      if(ctx.state!=='running')throw Object.assign(new Error('A gesture is required'),{name:'NotAllowedError'});
      return ctx;
    });
  }
  function createLoop({src,volume,crossfade=0,trimSilence=false,fadeSeconds=0}){
    const abort=new AbortController(),sources=new Set();
    let buffer,loading,source,pending,cleanupTimer,token=0,elapsed=0,startedAt=0,ended=false;
    const time=()=>elapsed+(source?Math.max(0,context.currentTime-startedAt):0);
    function release(entry){
      if(!sources.delete(entry))return;
      if(source===entry){elapsed=time();source=null;}
      entry.node.onended=null;entry.node.disconnect();entry.gain.disconnect();entry.node.buffer=null;
      if(ended&&!sources.size){clearTimeout(cleanupTimer);loops.delete(loop);}
    }
    function load(){
      if(buffer)return Promise.resolve(buffer);
      if(!loading){
        const request=(async()=>{
          const response=await fetch(src,{signal:abort.signal});
          if(!response.ok)throw new Error('Audio request failed');
          const decoded=await getContext().decodeAudioData(await response.arrayBuffer());
          if(ended||disposed)return null;
          buffer=crossfadeLoopBuffer(getContext(),decoded,crossfade,{trimSilence});return buffer;
        })();
        loading=request;
        request.finally(()=>{if(loading===request)loading=null;}).catch(()=>{});
      }
      return loading;
    }
    const loop={
      get paused(){return !source;},get currentTime(){return time();},get duration(){return buffer?.duration||0;},
      setVolume(value,seconds=.5){
        if(ended||disposed||!Number.isFinite(value))return;
        volume=Math.max(0,Math.min(2,value));
        if(source&&context){const now=context.currentTime,param=source.gain.gain;
          if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else {param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}
          param.linearRampToValueAtTime(volume,now+Math.max(.01,seconds));
        }
      },
      play(){
        if(ended||disposed)return Promise.resolve();
        if(source)return Promise.resolve();
        if(pending)return pending;
        const current=++token;
        const playing=(async()=>{
          const ctx=await resume();
          if(ended||disposed||current!==token)return;
          const audio=await load();
          if(ended||disposed||current!==token||!audio)return;
          const now=ctx.currentTime,gain=ctx.createGain(),next=ctx.createBufferSource();
          gain.gain.value=volume;gain.connect(ctx.destination);
          if(fadeSeconds>0){gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+fadeSeconds);}
          next.buffer=audio;next.loop=true;next.loopStart=0;next.loopEnd=audio.duration;next.connect(gain);
          const entry={node:next,gain,startedAt:now};sources.add(entry);next.onended=()=>release(entry);
          try{next.start(0,elapsed%audio.duration);}catch(error){release(entry);throw error;}
          startedAt=now;source=entry;
        })();
        pending=playing;
        playing.finally(()=>{if(pending===playing)pending=null;}).catch(()=>{});
        return playing;
      },
      pause(){
        ++token;pending=null;
        if(!source)return;
        elapsed=time();const previous=source;source=null;
        if(fadeSeconds>0&&!ended&&!disposed&&context.state==='running'){
          const now=context.currentTime,level=volume*Math.min(1,Math.max(0,(now-previous.startedAt)/fadeSeconds));
          // This gain belongs only to the source being retired. A rapid restart
          // gets its own envelope, and its clock resumes at the retained cursor.
          previous.gain.gain.cancelScheduledValues(now);previous.gain.gain.setValueAtTime(level,now);
          previous.gain.gain.linearRampToValueAtTime(0,now+fadeSeconds);previous.node.stop(now+fadeSeconds);
        }else{previous.node.stop();release(previous);}
      },
      dispose({fade=false}={}){
        const releaseSources=()=>{clearTimeout(cleanupTimer);for(const entry of [...sources]){entry.node.stop();release(entry);}loops.delete(loop);};
        if(ended){if(disposed)releaseSources();return;}
        const fadeOut=fade&&fadeSeconds>0&&context?.state==='running'&&!disposed;
        if(fadeOut)loop.pause();
        ended=true;if(!fadeOut)loop.pause();abort.abort();
        buffer=null;loading=null;pending=null;
        // The envelope stays on the sample clock; this timer only releases a
        // retired selection if an engine delays its ended notification.
        if(fadeOut&&sources.size)cleanupTimer=setTimeout(releaseSources,Math.ceil(fadeSeconds*1000)+20);
        else releaseSources();
      }
    };
    loops.add(loop);return loop;
  }
  return {createLoop,dispose(){if(disposed)return;disposed=true;for(const loop of [...loops])loop.dispose();const previous=context;context=null;resuming=null;if(previous)Promise.resolve(previous.close()).catch(()=>{});}};
}
