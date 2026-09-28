#!/usr/bin/env node
// CLI trust boundary: local JSON alone cannot authorize a downstream action.
// Reload the selected GitHub Deployment through the authenticated release
// adapter before preparing a notification list or immutable feed context.
import { readFileSync, writeFileSync, mkdirSync, renameSync, appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { loadVerifiedReceipt as loadReceipt, validateReceipt, assertCurrentProduction } from './lib/site-release.mjs';
import { prepareFollowups, assertPublicRelease } from './lib/release-followups.mjs';

function parse(args) {
  const [command, ...flags] = args;
  if (!['prepare', 'load-receipt', 'assert-current'].includes(command)) throw new Error('Use prepare, load-receipt or assert-current.');
  const values = {};
  const allowed = new Set(['--receipt', '--previous-map', '--current-map', '--out', '--urls-out', '--deployment-id', '--context']);
  for (let i = 0; i < flags.length; i++) {
    const name = flags[i];
    const value = flags[++i];
    if (!allowed.has(name) || !value || value.startsWith('--')) throw new Error(`Invalid followup option: ${name}`);
    if (values[name]) throw new Error(`Duplicate followup option: ${name}`);
    values[name] = value;
  }
  for (const name of command === 'assert-current' ? ['--context'] : ['--deployment-id', '--out', ...(command === 'prepare' ? ['--receipt', '--previous-map', '--current-map'] : [])]) {
    if (!values[name]) throw new Error(`${name} is required.`);
  }
  if (command !== 'assert-current' && !/^\d+$/.test(values['--deployment-id'])) throw new Error('--deployment-id must identify a GitHub Deployment.');
  return { command, values };
}
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
function write(file, text) {
  mkdirSync(dirname(resolve(file)), { recursive: true });
  const temp = `${file}.tmp.${process.pid}`;
  writeFileSync(temp, text);
  renameSync(temp, file);
}

export async function runReleaseFollowups({ args = [], env = process.env, fetchImpl = fetch, loadVerifiedReceipt = loadReceipt } = {}) {
  const { command, values } = parse(args);
  if (command === 'assert-current') {
    const { receipt } = readJson(values['--context']);
    try {
      const marker = await assertPublicRelease({ receipt, fetch: fetchImpl });
      const result = { status: 'current', ...marker, checkedAt: new Date().toISOString() };
      if (values['--out']) write(values['--out'], JSON.stringify(result, null, 2) + '\n');
      if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `feed_base_url=${receipt.deployUrl}\n`);
      return result;
    } catch (error) {
      if (values['--out']) write(values['--out'], JSON.stringify({ status: 'inconsistent', sourceSha: receipt?.sourceSha, releaseId: receipt?.releaseId, reason: error.message }, null, 2) + '\n');
      throw error;
    }
  }
  const context = await loadVerifiedReceipt({
    deploymentId: values['--deployment-id'], repo: env.GITHUB_REPOSITORY || 'cubxxw/blog',
    token: env.GH_TOKEN || env.GITHUB_TOKEN, siteId: env.NETLIFY_SITE_ID,
    netlifyToken: env.NETLIFY_AUTH_TOKEN, fetch: fetchImpl,
  });
  validateReceipt(context.receipt);
  assertCurrentProduction(context);
  if (context.receipt.status !== 'verified') throw new Error('A verified production receipt is required.');
  if (command === 'load-receipt') {
    write(values['--out'], JSON.stringify(context, null, 2) + '\n');
    return context;
  }
  const input = readJson(values['--receipt']);
  const receipt = input.receipt ?? input;
  if (!isDeepStrictEqual(receipt, context.receipt)) throw new Error('Local receipt does not match authenticated deployment evidence.');
  const result = prepareFollowups({
    ...context,
    previousPageMap: readJson(values['--previous-map']), currentPageMap: readJson(values['--current-map']),
  });
  write(values['--out'], JSON.stringify(result, null, 2) + '\n');
  if (values['--urls-out']) write(values['--urls-out'], result.urls.length ? result.urls.join('\n') + '\n' : '');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runReleaseFollowups({ args: process.argv.slice(2) }).then((result) => {
    console.log(`Release followups: ${result.status || result.receipt.status}${result.urls ? `; ${result.urls.length} notification URLs` : ''}.`);
  }).catch((error) => { console.error(error.message); process.exitCode = 2; });
}
