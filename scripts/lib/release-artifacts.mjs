import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { requestJson, GITHUB_API } from './netlify-release-client.mjs';
// Caller authenticates the sourceProof and compares the returned map digest
// with its receipt. Read one exact ZIP member; never extract arbitrary paths.
export async function readPublishedPageMap({sourceProof,fetch,token,exec=execFileSync,env=process.env}) {
  const {artifactId}=sourceProof;
  if(!/^\d+$/.test(String(artifactId)))throw new Error('Invalid publication artifact ID');
  const route=`repos/cubxxw/blog/actions/artifacts/${artifactId}`;
  const metadata=await requestJson(fetch,`${GITHUB_API}/${route}`);
  if(metadata.expired||metadata.size_in_bytes>512*1024*1024)throw new Error('Publication artifact expired or exceeds bounded reader');
  const dir=mkdtempSync(join(tmpdir(),'blog-publication-map-'));
  try {
    const archive=join(dir,'artifact.zip');
    const bytes=exec('gh',['api',`${route}/zip`],{env:{...env,GH_TOKEN:token},maxBuffer:512*1024*1024,stdio:['ignore','pipe','pipe']});
    writeFileSync(archive,bytes);
    return JSON.parse(exec('unzip',['-p',archive,'page-map.json'],{encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']}));
  } finally {rmSync(dir,{recursive:true,force:true});}
}
