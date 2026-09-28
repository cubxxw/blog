#!/usr/bin/env node
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadVerifiedReceipt, loadHistoricalReceipt } from './lib/site-release.mjs';
import { authenticatedFetch, requestJson, GITHUB_API } from './lib/netlify-release-client.mjs';
import { readPublishedPageMap } from './lib/release-artifacts.mjs';
import { prepareReleaseContext } from './lib/release-followups.mjs';
import { validateSearchState } from './lib/search-delivery.mjs';

export async function runPrepareReleaseFollowups({ args = [], env = process.env, fetchImpl = fetch, exec = execFileSync } = {}) {
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--deployment-id', '--artifact-id', '--out-dir'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid preparation option: ${args[i]}`);
    flags[args[i]] = args[i + 1];
  }
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token || !env.NETLIFY_SITE_ID || !env.NETLIFY_AUTH_TOKEN) throw new Error('Preparation requires GitHub read access and the production Netlify verification credentials.');
  const repo = env.GITHUB_REPOSITORY || 'cubxxw/blog';
  if (repo !== 'cubxxw/blog') throw new Error('Unexpected repository for production followups.');
  const options = { repo, token, siteId: env.NETLIFY_SITE_ID, netlifyToken: env.NETLIFY_AUTH_TOKEN, fetch: fetchImpl };
  const apiFetch = authenticatedFetch({ githubToken: token, netlifyToken: env.NETLIFY_AUTH_TOKEN, fetchImpl });
  const base = `${GITHUB_API}/repos/${repo}`;
  const result = await prepareReleaseContext({
    deploymentId: flags['--deployment-id'], artifactId: flags['--artifact-id'], siteId: env.NETLIFY_SITE_ID,
    listDeployments: async () => {
      const records = [];
      for (let page = 1; page <= 50; page++) {
        const batch = await requestJson(apiFetch, `${base}/deployments?environment=production&per_page=100&page=${page}`);
        if (!Array.isArray(batch)) throw new Error('Incomplete deployment history.');
        records.push(...batch);
        if (batch.length < 100) return records;
      }
      throw new Error('Deployment history exceeds the bounded lookup; select and recover a verified baseline explicitly.');
    },
    loadVerifiedReceipt: (identity) => loadVerifiedReceipt({ ...options, ...identity }),
    loadHistoricalReceipt: (identity) => loadHistoricalReceipt({ ...options, ...identity }),
    loadSearchState: async () => {
      const file=await requestJson(apiFetch,`${base}/contents/config/search-delivery-state.json?ref=main`);
      if(file.encoding!=='base64'||typeof file.content!=='string')throw new Error('Search progress state is unavailable');
      return validateSearchState(JSON.parse(Buffer.from(file.content,'base64').toString('utf8')));
    },
    readArtifactPageMap: (sourceProof) => readPublishedPageMap({sourceProof,fetch:apiFetch,token,exec,env}),
  });
  const out = resolve(flags['--out-dir'] || 'followups');
  mkdirSync(out, { recursive: true });
  const writeJson = (name, value) => writeFileSync(join(out, name), JSON.stringify(value, null, 2) + '\n');
  const { receipt, currentDeploy, sourceProof, deploymentId } = result;
  writeJson('release-context.json', { receipt, currentDeploy, sourceProof, deploymentId });
  writeJson('followups.json', { ...result, currentPageMap: undefined, previousPageMap: undefined,initialPageMap:undefined });
  writeJson('current-page-map.json', result.currentPageMap);
  if (result.previousPageMap) writeJson('previous-page-map.json', result.previousPageMap);
  if (result.initialPageMap) writeJson('initial-page-map.json',result.initialPageMap);
  writeFileSync(join(out, 'urls.txt'), result.urls.length ? result.urls.join('\n') + '\n' : '');
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `status=${result.status}\ndeployment_id=${deploymentId}\nfeed_base_url=${result.feedBaseUrl}\n`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runPrepareReleaseFollowups({ args: process.argv.slice(2) }).then((result) => {
    console.log(`Verified followup preparation: ${result.status}; ${result.urls.length} notification URLs.`);
  }).catch((error) => { console.error(error.message); process.exitCode = 2; });
}
