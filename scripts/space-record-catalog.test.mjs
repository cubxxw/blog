import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRecordCatalog} from '../assets/js/space/record-catalog.js';

test('the shelf offers three distinct, attributed recordings and three existing photo sleeves',()=>{
  const tracks=createRecordCatalog();
  assert.equal(tracks.length,3);assert.equal(new Set(tracks.map(track=>track.src)).size,3);assert.equal(new Set(tracks.map(track=>track.cover)).size,3);
  assert.deepEqual(tracks.map(track=>track.titleEn),['Night on the Docks - Sax','Long Stroll','Almost New']);
  for(const track of tracks){assert.ok(Object.isFrozen(track));assert.equal(track.artist,'Kevin MacLeod');assert.equal(track.license,'CC BY 4.0');assert.match(track.source,/^https:\/\/(?:remote\.)?incompetech\.com\/music\/royalty-free/);assert.equal(track.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');}
});

test('the original music URL and processed photo URLs can be supplied by the Hugo catalog',()=>{
  const tracks=createRecordCatalog({music:'/prefix/audio/original.mp3',covers:['/photo/a.webp','/photo/b.webp','/photo/c.webp']});
  assert.equal(tracks[0].src,'/prefix/audio/original.mp3');assert.deepEqual(tracks.map(track=>track.cover),['/photo/a.webp','/photo/b.webp','/photo/c.webp']);
  assert.equal(createRecordCatalog()[0].src,'/audio/space/night-on-the-docks-sax.mp3');
});


test('the three recordings are distinct local audio files and derived masters match their provenance',async()=>{
  const hashes=[];
  for(const track of createRecordCatalog()){
    const data=await readFile(new URL('../static'+track.src,import.meta.url));
    assert.ok(data.byteLength>1000000,track.id+' must contain a real complete recording');
    const hash=createHash('sha256').update(data).digest('hex');hashes.push(hash);
    assert.ok((await readFile(new URL('../static'+track.cover,import.meta.url))).byteLength>0);
    if(track.id!=='night-on-the-docks-sax'){
      const provenance=JSON.parse(await readFile(new URL('../static'+track.src.replace('.mp3','.json'),import.meta.url),'utf8'));
      assert.equal(provenance.sha256,hash);assert.equal(provenance.bytes,data.byteLength);assert.equal(provenance.title,track.titleEn);assert.equal(provenance.downloadIntegrityVerified,true);
    }
  }
  assert.equal(new Set(hashes).size,3,'record names must never be aliases for one audio file');
});

test('web rain retains its verified lossless master and ships a substantially smaller attributed copy',async()=>{
  const receipt=JSON.parse(await readFile(new URL('../static/audio/space/rain-distant-storm-loop-web.json',import.meta.url),'utf8'));
  const web=await readFile(new URL('../static/audio/space/'+receipt.file,import.meta.url));
  const master=await readFile(new URL('../static/audio/space/'+receipt.master,import.meta.url));
  assert.equal(receipt.bytes,web.byteLength);assert.equal(receipt.sha256,createHash('sha256').update(web).digest('hex'));
  assert.equal(receipt.masterSha256,createHash('sha256').update(master).digest('hex'));
  assert.ok(web.byteLength<master.byteLength*.1);assert.equal(receipt.license,'CC BY 3.0');
});
