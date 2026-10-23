#!/usr/bin/env node
// Requires ffmpeg/ffprobe. Keep the original in ignored .netlify/cafe-lab;
// never copy a ten-minute production master into the public assets directory.
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';

const source=resolve(process.argv[2]||'.netlify/cafe-lab/audio-master/Distant_storm_in_the_city_(5).flac');
const destination=resolve(process.argv[3]||'static/audio/space/rain-distant-storm-loop.flac');
const expectedSha1='bda24ca82be3f1a1755ff8aa8920df03fc77efab';
function run(command,args){const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:16*1024*1024});if(result.status!==0)throw new Error(`${command} failed: ${result.stderr}`);return result.stdout;}
function digest(path,algorithm){return createHash(algorithm).update(readFileSync(path)).digest('hex');}
if(digest(source,'sha1')!==expectedSha1)throw new Error('Original SHA1 does not match Wikimedia Commons. No output was changed.');
const original=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_name,sample_rate,channels,bits_per_raw_sample','-of','json',source]));
mkdirSync(dirname(destination),{recursive:true});
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',source,'-t','108','-map','0:a:0','-ac','2','-c:a','flac','-sample_fmt','s32','-compression_level','12','-metadata','title=Distant storm in the city (5) — 108-second room excerpt','-metadata','artist=Matucha','-metadata','copyright=CC BY 3.0 — https://creativecommons.org/licenses/by/3.0/','-metadata','comment=Excerpt by Xinwei Xiong; 8-second equal-power loop overlap is applied by the player.',destination]);
const prepared=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration,size:stream=codec_name,sample_rate,channels,bits_per_raw_sample','-of','json',destination]));
const metadata={
  title:'Distant storm in the city (5)',author:'Matucha',recorded:'2011-02-23',
  sourcePage:'https://commons.wikimedia.org/wiki/File:Distant_storm_in_the_city_(5).flac',
  originalSource:'https://freesound.org/people/matucha/sounds/115250/',
  originalDownload:'https://upload.wikimedia.org/wikipedia/commons/3/30/Distant_storm_in_the_city_%285%29.flac',
  license:'CC BY 3.0',licenseUrl:'https://creativecommons.org/licenses/by/3.0/',
  originalSha1:expectedSha1,originalSha1Verified:true,originalBytes:statSync(source).size,originalFormat:original,
  changes:'First 108 seconds excerpted; the ending, including the strong transient around source second 111, excluded. Original 44.1 kHz / 24-bit stereo preserved in lossless FLAC. The player applies one 8-second equal-power overlap to the decoded boundary; no synthesized noise or extra audio layer.',
  file:destination.split('/').at(-1),sha256:digest(destination,'sha256'),bytes:statSync(destination).size,format:prepared,
  selection:{startSeconds:0,endSeconds:108,excludedEndingTransientAroundSeconds:111},
  runtimeLoop:{crossfadeSeconds:8,loopSeconds:100,contextSampleRate:44100},
  attribution:'Distant storm in the city (5) — Matucha — CC BY 3.0. Excerpted and loop boundary crossfaded by Xinwei Xiong.'
};
writeFileSync(destination.replace(/\.flac$/,'.json'),JSON.stringify(metadata,null,2)+'\n');
console.log(JSON.stringify({file:destination,bytes:metadata.bytes,sha256:metadata.sha256,format:prepared},null,2));
