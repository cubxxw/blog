import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../assets/js/space/video.mjs').catch(error => { if(error.code === 'ERR_MODULE_NOT_FOUND') return {}; throw error; });
const call=(name,...args)=>{assert.equal(typeof api[name],'function',`${name} must be available`);return api[name](...args);};
const id='abcdefghijk';
test('accepted watch variants yield one canonical identity and bounded start',()=>{
  for(const url of [`https://youtube.com/watch?v=${id}&t=1m2s`,`https://youtu.be/${id}?start=62`,`https://m.youtube.com/shorts/${id}?t=62s`]) assert.deepEqual(call('parseYouTubeURL',url),{id,start:62,watchURL:`https://www.youtube.com/watch?v=${id}&t=62s`});
});
test('ambiguous or hostile URL identities never become video references',()=>{
 for(const url of [`http://youtu.be/${id}`,`https://youtube.com.evil/watch?v=${id}`,`https://user@youtube.com/watch?v=${id}`,`https://youtube.com:443/watch?v=${id}`,`https://youtu.be/${id}/more`,`https://youtube.com/watch?v=${id}&v=${id}`,`https://youtu.be/${id}?t=1&start=1`,`https://youtu.be/${id}?t=21601`,`https://youtu.be/${id}\\x`]) assert.equal(call('parseYouTubeURL',url),null,url);
 assert.equal(call('normalizeVideoReference',{url:'https://evil.example/watch',id},[]),null,'an invalid explicit URL cannot fall back to a different identity');
});
test('privacy embed cannot inherit autoplay, playlist or caller origin flags',()=>{
 const ref=call('parseYouTubeURL',`https://youtube.com/watch?v=${id}&autoplay=1&list=private&origin=https://evil.example&t=10`);
 assert.equal(call('buildYouTubeEmbedURL',ref,'https://cubxxw.com/path'),`https://www.youtube-nocookie.com/embed/${id}?controls=1&autoplay=0&playsinline=1&enablejsapi=1&rel=0&start=10&origin=https%3A%2F%2Fcubxxw.com`);
 assert.ok(!call('buildYouTubeEmbedURL',ref,'javascript:alert(1)').includes('origin='));
});
test('chapter controls use ordered bounded inert public metadata without changing it',()=>{
 const chapters=[{start:30,title_zh:'三十秒',title_en:'Thirty'},{start:0,title:'Start'},{start:30,title:'duplicate'},{start:-1,title:'bad'},{start:21601,title:'bad'}];const before=JSON.stringify(chapters);
 assert.deepEqual(call('normalizeVideoChapters',chapters,'en'),[{start:0,title:'Start'},{start:30,title:'Thirty'}]);assert.equal(JSON.stringify(chapters),before);
 assert.equal(call('normalizeVideoChapters',Array.from({length:20},(_,start)=>({start,title:'Chapter'}))).length,12);
 assert.equal(call('formatVideoTime',3661),'1:01:01');assert.equal(call('formatVideoTime',-1),'');
});
test('reference metadata is inert and local poster paths cannot encode external URLs',()=>{
 const value=call('normalizeVideoReference',`https://youtu.be/${id}`,[{id,title:' A\nTitle ',poster:'//evil.example/a.png',chapters:[{start:5,title:'Five'}]}]);
 assert.equal(value.title,'A Title');assert.equal(value.poster,'');assert.deepEqual(value.chapters,[{start:5,title:'Five'}]);
 assert.equal(call('normalizeVideoReference',{id,poster:'/images/%2f%2fevil.example/x'},[]).poster,'');
 assert.deepEqual(call('clampVideoSize',0,99999),{width:200,height:2160});
});
test('untrusted input chapters cannot override the supplied public metadata',()=>{
 const value=call('normalizeVideoReference',{id,chapters:[{start:9,title:'Injected label'}]},[{id,chapters:[{start:5,title:'Public chapter'}]}]);
 assert.deepEqual(value.chapters,[{start:5,title:'Public chapter'}]);
});
test('inherited registry entries cannot masquerade as public chapter metadata',()=>{
 const refs=Object.create({[id]:{id,chapters:[{start:9,title:'Inherited'}]}});
 assert.deepEqual(call('normalizeVideoReference',{id},refs).chapters,[]);
});
test('fallback titles obey the same inert-text rule as primary labels',()=>{
 assert.equal(call('inertTitle','',' Fallback\nTitle\u0000 '),'Fallback Title');
});
