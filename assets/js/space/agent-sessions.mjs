import {TASK_STORE_KEY,normalizeStoredRecord,markInterrupted} from './agent-loop.mjs';
export const SESSION_KEY='space:agent:sessions:v2';
const previousKey='space:agent:sessions:v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const newId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const title=question=>String(question||'').split('\n\n[Public ')[0].replace(/\s+/g,' ').trim().slice(0,60);

// Each task and tab's draft is its own atomic Storage entry. A concurrent
// writer never serializes or replaces another tab's entire history. Old v1
// snapshots and the original task key remain untouched after migration.
export function createSessionStore({storage,key=SESSION_KEY,maxChars=2000000}={}) {
  const safe=storage&&typeof storage.getItem==='function'&&typeof storage.setItem==='function'&&typeof storage.key==='function'?storage:null;
  const prefix=key+':row:',migrationKey=key+':migrated',client=newId(),rows=new Map(),pending=new Map(),seenDrafts=new Map();
  let activeId='',persisted=true,lastDraftRevision='',draftConflict=false,clock=Date.now();
  const parse=value=>{try{return JSON.parse(value);}catch{return null;}};
  function refresh() {
    if(!safe)return;
    try {
      for(let i=0;i<safe.length;i++){
        const name=safe.key(i);if(!name?.startsWith(prefix)||pending.has(name))continue;
        const value=parse(safe.getItem(name));
        if(value&&typeof value.sessionId==='string'&&['session','task','draft'].includes(value.type))rows.set(name,value);
      }
    }catch{persisted=false;}
  }
  function flush() {
    if(!safe){persisted=false;return false;}
    if([...rows.values()].reduce((n,row)=>n+JSON.stringify(row).length,0)>maxChars){persisted=false;return false;}
    for(const [name,row] of [...pending])try{safe.setItem(name,JSON.stringify(row));pending.delete(name);}catch{persisted=false;return false;}
    persisted=true;return true;
  }
  function write(name,value){rows.set(name,value);pending.set(name,value);return flush();}
  const rowKey=(type,sessionId,suffix='')=>prefix+type+':'+encodeURIComponent(sessionId)+(suffix?':'+encodeURIComponent(suffix):'');
  function snapshot() {
    refresh();const sessions=new Map();
    for(const row of rows.values())if(row.type==='session'&&!sessions.has(row.sessionId))sessions.set(row.sessionId,{id:row.sessionId,title:typeof row.title==='string'?row.title.slice(0,60):'',legacy:row.legacy===true,createdAt:Number(row.createdAt)||Date.now(),updatedAt:Number(row.createdAt)||0,tasks:[],draft:'',draftRevision:'',draftVariants:[]});
    for(const row of rows.values()){
      const session=sessions.get(row.sessionId);if(!session)continue;
      if(row.type==='task'){
        const record=normalizeStoredRecord(row.record);if(record){session.tasks.push(record);session.updatedAt=Math.max(session.updatedAt,Number(row.savedAt)||0);}
      }else if(row.type==='draft'&&typeof row.value==='string')session.draftVariants.push({value:row.value.slice(0,4000),revision:String(row.revision||''),updatedAt:Number(row.updatedAt)||0,conflict:row.conflict===true});
    }
    for(const session of sessions.values()){
      session.tasks.sort((a,b)=>(Date.parse(a.startedAt)||0)-(Date.parse(b.startedAt)||0));
      session.draftVariants.sort((a,b)=>b.updatedAt-a.updatedAt||b.revision.localeCompare(a.revision));
      const draft=session.draftVariants[0];if(draft){session.draft=draft.value;session.draftRevision=draft.revision;}
      if(!session.title&&!session.legacy)session.title=title(session.tasks[0]?.question);
    }
    return [...sessions.values()];
  }
  const find=which=>snapshot().find(session=>session.id===which);
  function select(which) {
    const session=find(which);if(!session)return false;activeId=which;seenDrafts.set(which,{value:session.draft,revision:session.draftRevision});
    try{if(safe)safe.setItem(key,JSON.stringify({version:2,activeId}));else persisted=false;}catch{persisted=false;}
    return true;
  }
  function create() {
    const sessionId='session-'+newId();write(rowKey('session',sessionId),{type:'session',sessionId,createdAt:Date.now()});select(sessionId);return find(sessionId);
  }
  function importSession(session) {
    const sessionId=session?.id;if(typeof sessionId!=='string'||!sessionId)return;
    const meta=rowKey('session',sessionId);
    if(!rows.has(meta))write(meta,{type:'session',sessionId,title:session.title||'',legacy:session.legacy===true,createdAt:Number(session.createdAt)||Date.parse(session.tasks?.[0]?.startedAt)||Date.now()});
    for(const task of Array.isArray(session.tasks)?session.tasks:[]){const record=normalizeStoredRecord(task);if(!record)continue;const name=rowKey('task',sessionId,record.id);if(!rows.has(name))write(name,{type:'task',sessionId,record,savedAt:Number(task.savedAt)||Date.parse(record.endedAt||record.startedAt)||Date.now()});}
    const draftKey=rowKey('draft',sessionId,'migrated');
    if(session.draft&&!rows.has(draftKey))write(draftKey,{type:'draft',sessionId,value:String(session.draft).slice(0,4000),revision:'migrated',updatedAt:Number(session.draftUpdatedAt)||Date.now()});
  }
  refresh();
  let migratedActiveId='',migrationDone=false;
  try{migrationDone=parse(safe?.getItem(migrationKey))?.version===2;}catch{persisted=false;}
  // Only a successfully saved completion marker ends migration. Partial quota
  // failures can leave metadata on disk; retry missing rows on the next load.
  if(!migrationDone){
    let previous,readable=true;try{previous=parse(safe?.getItem(previousKey));}catch{persisted=false;readable=false;}
    if(previous?.version===1&&Array.isArray(previous.sessions)){
      for(const session of previous.sessions)importSession(session);
      migratedActiveId=previous.activeId;
    }else{
      let legacy;try{legacy=parse(safe?.getItem(TASK_STORE_KEY));}catch{persisted=false;readable=false;}
      const tasks=(Array.isArray(legacy)?legacy:Array.isArray(legacy?.tasks)?legacy.tasks:[]).map(normalizeStoredRecord).filter(Boolean).map(markInterrupted);
      if(tasks.length)importSession({id:'session-legacy',legacy:true,tasks});
    }
    if(readable&&flush())try{safe.setItem(migrationKey,JSON.stringify({version:2}));}catch{persisted=false;}
  }
  let saved;try{saved=parse(safe?.getItem(key));}catch{}
  const selectedId=saved?.activeId||migratedActiveId;
  if(!snapshot().length)create();else select(snapshot().some(s=>s.id===selectedId)?selectedId:snapshot().sort((a,b)=>b.updatedAt-a.updatedAt)[0].id);
  return {
    key,get persisted(){return persisted;},get lastDraftRevision(){return lastDraftRevision;},get draftConflict(){return draftConflict;},
    active(){const session=find(activeId);return {...clone(session),tasks:session.tasks.map(markInterrupted)};},
    list(){return clone(snapshot()).sort((a,b)=>b.updatedAt-a.updatedAt);},select,create,
    saveTask(which,raw){
      if(!find(which))return false;const record=normalizeStoredRecord(raw);if(!record)return false;
      const name=rowKey('task',which,record.id),previous=rows.get(name)?.record;
      if(previous?.status==='interrupted'&&record.status!=='interrupted')return false;
      return write(name,{type:'task',sessionId:which,record,savedAt:Date.now()});
    },
    saveDraft(which,value,{expectedRevision}={}) {
      const session=find(which);if(!session)return false;value=String(value||'').slice(0,4000);
      const seen=seenDrafts.get(which)||{value:'',revision:''},revision=expectedRevision??seen.revision;
      // Closing an untouched tab cannot turn its old empty input into a new edit.
      if(value===seen.value){lastDraftRevision=seen.revision;return flush();}
      draftConflict=Boolean(session.draftRevision&&revision!==session.draftRevision&&value!==session.draft);
      clock=Math.max(Date.now(),clock+1,(session.draftVariants[0]?.updatedAt||0)+1);
      lastDraftRevision=client+':'+clock;seenDrafts.set(which,{value,revision:lastDraftRevision});
      return write(rowKey('draft',which,client),{type:'draft',sessionId:which,value,revision:lastDraftRevision,updatedAt:clock,conflict:draftConflict});
    },
    export(){return JSON.stringify({version:2,activeId,sessions:snapshot()},null,2);},
  };
}
export function sessionMessages(session) {
  return (session?.tasks||[]).filter(task=>task.status==='completed'&&task.question&&task.answer).flatMap(task=>[{role:'user',content:task.question},{role:'assistant',content:task.answer}]);
}
