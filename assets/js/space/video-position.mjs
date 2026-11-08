import { MAX_VIDEO_START_SECONDS } from './video.mjs';

const validID = value => typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
export function createVideoPositionStore({storage,key='bear-video-positions:v1'}={}) {
  function read() {
    const raw=storage?.getItem(key);
    if(raw==null)return [];
    if(typeof raw!=='string'||raw.length>12000)throw Error('Invalid video progress');
    const data=JSON.parse(raw);
    if(data?.version!==1||!Array.isArray(data.entries))throw Error('Invalid video progress');
    return data.entries.filter(item=>validID(item?.id)&&Number.isInteger(item.seconds)&&item.seconds>=0&&item.seconds<=MAX_VIDEO_START_SECONDS).slice(-30);
  }
  return {
    get(id){if(!validID(id))return null;try{return read().find(item=>item.id===id)?.seconds??null;}catch{return null;}},
    set(id,seconds){
      if(!validID(id)||!Number.isFinite(seconds)||seconds<0||seconds>MAX_VIDEO_START_SECONDS)return false;
      try{
        const entries=read().filter(item=>item.id!==id).concat({id,seconds:Math.floor(seconds)}).slice(-30);
        const raw=JSON.stringify({version:1,entries});storage.setItem(key,raw);return storage.getItem(key)===raw;
      }catch{return false;}
    }
  };
}
