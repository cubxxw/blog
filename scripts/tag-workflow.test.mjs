import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';

test('a tag annotation is literal data, not shell code',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-tag-comment-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const marker=path.join(temp,'unexpected'),out=path.join(temp,'output');
  const comment=`/create tag v1.2.3 "$(touch ${marker})"`;
  const job=YAML.parse(fs.readFileSync('.github/workflows/auto-tag.yml','utf8')).jobs.create_tag;
  const validate=job.steps.find(s=>s.id==='validate');
  // Emulate the runner's pre-shell interpolation to reproduce the old bug.
  const script=validate.run.replaceAll('${{ github.event.comment.body }}',comment);
  const result=spawnSync('bash',['-c',script],{env:{...process.env,TAG_COMMAND:comment,GITHUB_OUTPUT:out},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(fs.existsSync(marker),false);
  assert.ok(fs.readFileSync(out,'utf8').includes(`tag_comment=$(touch ${marker})`));
});
test('unauthorized actors stop before comment handling or checkout',t=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-tag-auth-'));t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const job=YAML.parse(fs.readFileSync('.github/workflows/auto-tag.yml','utf8')).jobs.create_tag;
  const step=job.steps.find(s=>s.id==='authorize');assert.ok(step);
  assert.ok(job.steps.indexOf(step)<job.steps.findIndex(s=>s.uses?.startsWith('actions/checkout')));
  const gh=path.join(temp,'gh');fs.writeFileSync(gh,'#!/bin/sh\nprintf read\n');fs.chmodSync(gh,0o755);
  const result=spawnSync('bash',['-c',step.run],{env:{...process.env,PATH:`${temp}:${process.env.PATH}`,GITHUB_REPOSITORY:'cubxxw/blog',GITHUB_ACTOR:'reader'},encoding:'utf8'});
  assert.notEqual(result.status,0);
});
