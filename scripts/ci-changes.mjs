#!/usr/bin/env node
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolveChangeSet } from './lib/ci-changes.mjs';

const args=process.argv.slice(2);
const value=name=>{const at=args.indexOf(name);return at<0?undefined:args[at+1];};
try {
  const root=path.resolve(value('--repo-root')??'.');
  const headSha=value('--head')??process.env.GITHUB_SHA??execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const result=await resolveChangeSet({repoRoot:root,eventPath:value('--event')??process.env.GITHUB_EVENT_PATH,headSha});
  const output=value('--out');
  if(output){mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,`${JSON.stringify(result,null,2)}\n`);}
  else console.log(JSON.stringify(result,null,2));
} catch(error) {console.error(error.message);process.exitCode=2;}
