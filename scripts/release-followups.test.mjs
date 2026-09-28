import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diffPublishedPages, prepareFollowups, validateFeedBaseUrl, assertPublicRelease, prepareReleaseContext } from './lib/release-followups.mjs';
import { runReleaseFollowups } from './release-followups.mjs';
import { runNewsletter } from './newsletter-send.mjs';
import { parse as parseYaml } from 'yaml';
import { execFileSync } from 'node:child_process';
import { runPrepareReleaseFollowups } from './prepare-release-followups.mjs';

const sha = 'a'.repeat(40);
const digest = 'b'.repeat(64);
function page(path, hash = '1'.repeat(64)) {
  return { source: `content/en/engineering/posts/${path.slice(1, -1)}.md`, url: path, outputPath: `${path.slice(1)}index.html`, lang: 'en', kind: 'page', contentHash: hash };
}
function pageMap(pages, sourceSha = sha) {
  return { schema: 'blog-page-map/1', sourceSha, clock: '2026-09-28T08:00:00.000Z', target: 'production', baseUrl: 'https://cubxxw.com/', complete: true, pages };
}
function proof(currentPageMap = pageMap([page('/new/')])) {
  const receipt = {
    schema: 'blog-release/1', sourceSha: sha, releaseId: 'release-1234-1', inputDigest: digest, artifactDigest: digest,
    runId: '1234', runAttempt: 1, siteId: 'site-1', deployId: 'deploy123',
    deployUrl: 'https://deploy123--cubxxw.netlify.app', verifiedAt: '2026-09-28T08:01:00.000Z',
    pageMapDigest: createHash('sha256').update(JSON.stringify(currentPageMap)).digest('hex'),
    status: 'verified',
    checks: ['source', 'output', 'browser', 'platform', 'marker', 'routes'].map((name) => ({ name, status: 'success', reportDigest: digest })),
  };
  return {
    receipt, currentPageMap, previousPageMap: pageMap([page('/old/')], 'c'.repeat(40)),
    currentDeploy: { siteId: 'site-1', id: 'deploy123', state: 'ready', published: true, sourceSha: sha, deployUrl: receipt.deployUrl },
  };
}

test('page-map comparison covers skipped releases, newly published dates, updates and removals', () => {
  const previous = pageMap([page('/unchanged/'), page('/updated/'), page('/deleted/')], 'c'.repeat(40));
  const current = pageMap([page('/unchanged/'), page('/updated/', '2'.repeat(64)), page('/commit-one/'), page('/commit-two/'), page('/date-now-published/')]);
  assert.deepEqual(diffPublishedPages({ previous, current }), {
    added: ['/commit-one/', '/commit-two/', '/date-now-published/'], changed: ['/updated/'], removed: ['/deleted/'],
  });
});

test('public recheck rejects same source SHA from another release and never sends API credentials', async () => {
  const { receipt } = proof();
  await assert.rejects(() => assertPublicRelease({ receipt, fetch: async (url, options) => {
    assert.equal(url, 'https://cubxxw.com/__release.json');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, 'error');
    return new Response(JSON.stringify({ sourceSha: sha, releaseId: 'different-release' }));
  } }), /release|current/);
  await assertPublicRelease({ receipt, fetch: async () => new Response(JSON.stringify({ sourceSha: sha, releaseId: receipt.releaseId })) });
});

function preparationFixture() {
  const current = proof();
  const previous = proof(current.previousPageMap);
  previous.receipt.sourceSha = 'c'.repeat(40);
  previous.receipt.verifiedAt = '2026-09-27T08:01:00.000Z';
  const records = [
    { id: 2, payload: { receipt: current.receipt, sourceProof: { artifactId: '22' } } },
    { id: 1, payload: { receipt: previous.receipt, sourceProof: { artifactId: '11' } } },
  ];
  return { current, previous, records, options: {
    deploymentId: '2', artifactId: '22', siteId: 'site-1',
    listDeployments: async () => records,
    loadVerifiedReceipt: async () => ({ ...current, sourceProof: { artifactId: '22' } }),
    loadHistoricalReceipt: async () => ({ ...previous, sourceProof: { artifactId: '11' } }),
    readArtifactPageMap: async ({ artifactId }) => artifactId === '22' ? current.currentPageMap : current.previousPageMap,
  } };
}

test('release preparation loads the exact previous verified artifact rather than an adjacent Git commit', async () => {
  const { options } = preparationFixture();
  const prepared = await prepareReleaseContext(options);
  assert.equal(prepared.status, 'ready');
  assert.deepEqual(prepared.urls, ['https://cubxxw.com/new/']);
  assert.equal(prepared.previousDeploymentId, '1');
});

test('first trusted migration is explicitly bootstrap and cannot notify the archive', async () => {
  const { options, records } = preparationFixture();
  const result = await prepareReleaseContext({ ...options, listDeployments: async () => [records[0]] });
  assert.equal(result.status, 'bootstrap');
  assert.deepEqual(result.urls, []);
  assert.equal(result.previousDeploymentId, null);
});
test('rollback is current publication history but never triggers notifications',async()=>{
  const {options,current,records}=preparationFixture();
  const rollback={...current,receipt:{...current.receipt,status:'rollback-verified'}};
  records[0].payload.receipt=rollback.receipt;
  const result=await prepareReleaseContext({...options,loadVerifiedReceipt:async()=>({...rollback,sourceProof:{artifactId:'22'}})});
  assert.equal(result.status,'rollback');assert.deepEqual(result.urls,[]);
});
test('a release after rollback uses the actual previous Netlify deploy, not the newer rejected baseline',async()=>{
  const {options,current,previous,records}=preparationFixture();
  previous.receipt.deployId='restored-a';previous.receipt.deployUrl='https://restored-a--cubxxw.netlify.app';
  previous.receipt.status='rollback-verified';previous.receipt.verifiedAt='2026-09-27T23:00:00.000Z';
  current.receipt.previousDeployId='restored-a';
  records.push({id:9,payload:{receipt:{...previous.receipt,status:'verified',deployId:'failed-b',verifiedAt:'2026-09-27T22:00:00.000Z'},sourceProof:{artifactId:'99'}}});
  const result=await prepareReleaseContext(options);
  assert.equal(result.previousDeploymentId,'1');
});

test('expired previous evidence or mismatched current artifact refuses send-all fallback', async () => {
  const { options } = preparationFixture();
  await assert.rejects(() => prepareReleaseContext({ ...options, loadHistoricalReceipt: async () => { throw new Error('artifact expired'); } }), /recover|historical|expired/i);
  await assert.rejects(() => prepareReleaseContext({ ...options, artifactId: 'unrelated' }), /artifact/i);
  await assert.rejects(() => prepareReleaseContext({ ...options, readArtifactPageMap: async () => pageMap([]) }), /map|digest/);
});

test('preparation CLI verifies real loader contracts and reads exact page maps from immutable archives', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'blog-followup-cli-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const { current, previous } = preparationFixture();
  Object.assign(previous.receipt, { runId: '1233', releaseId: 'release-1233-1', deployId: 'deploy122', deployUrl: 'https://deploy122--cubxxw.netlify.app' });
  const maps = { '22': current.currentPageMap, '11': current.previousPageMap };
  const archives = {};
  for (const id of ['22', '11']) {
    writeFileSync(join(dir, 'page-map.json'), JSON.stringify(maps[id]));
    execFileSync('zip', ['-q', `${id}.zip`, 'page-map.json'], { cwd: dir });
    archives[id] = readFileSync(join(dir, `${id}.zip`));
  }
  const record = (id, receipt, artifactId) => ({ id, creator: { login: 'github-actions[bot]' }, environment: 'production', sha: receipt.sourceSha,
    payload: { receipt, sourceProof: { repository: 'cubxxw/blog', event: 'push', ref: 'refs/heads/main', sha: receipt.sourceSha, runId: receipt.runId, runAttempt: 1, artifactId, manifestDigest: digest } } });
  const records = [record(2, current.receipt, '22'), record(1, previous.receipt, '11')];
  const fetched = [];
  const result = await runPrepareReleaseFollowups({
    args: ['--deployment-id', '2', '--artifact-id', '22', '--out-dir', join(dir, 'prepared')],
    env: { GITHUB_REPOSITORY: 'cubxxw/blog', GH_TOKEN: 'fake-github', NETLIFY_SITE_ID: 'site-1', NETLIFY_AUTH_TOKEN: 'fake-netlify' },
    fetchImpl: async (value, options) => {
      const url = new URL(value); fetched.push(url.href);
      if(url.pathname.endsWith('/contents/config/search-delivery-state.json'))return new Response(JSON.stringify({encoding:'base64',content:Buffer.from(JSON.stringify({schema:'blog-search-state/1',providers:{}})).toString('base64')}));
      let body;
      if (url.pathname === '/repos/cubxxw/blog/deployments') body = records;
      else if (/\/deployments\/[12]$/.test(url.pathname)) body = records.find((record) => url.pathname.endsWith(`/${record.id}`));
      else if (url.pathname.includes('/actions/runs/')) {
        const receipt = url.pathname.includes('/1234/') ? current.receipt : previous.receipt;
        body = { head_sha: receipt.sourceSha, head_branch: 'main', event: 'push', run_attempt: 1, path: '.github/workflows/main.yaml', repository: { full_name: 'cubxxw/blog' } };
      } else if (url.pathname.includes('/actions/artifacts/')) {
        const receipt = url.pathname.endsWith('/22') ? current.receipt : previous.receipt;
        body = { expired: false, size_in_bytes: 100, name: `blog-site-${receipt.sourceSha}-1`, workflow_run: { id: Number(receipt.runId), head_sha: receipt.sourceSha } };
      } else if (url.pathname === '/api/v1/sites/site-1') body = { id: 'site-1', published_deploy: { id: 'deploy123' } };
      else if (url.pathname.includes('/api/v1/deploys/')) {
        const receipt = url.pathname.endsWith('/deploy123') ? current.receipt : previous.receipt;
        body = { id: receipt.deployId, site_id: 'site-1', state: 'ready', deploy_ssl_url: receipt.deployUrl };
      } else if (url.pathname === '/__release.json') {
        assert.equal(new Headers(options.headers).get('Authorization'), null, 'public marker receives no management credentials');
        const receipt = url.hostname.startsWith('deploy122--') ? previous.receipt : current.receipt;
        body = { sourceSha: receipt.sourceSha, releaseId: receipt.releaseId };
      } else assert.fail(`Unexpected network request: ${url.href}`);
      return new Response(JSON.stringify(body));
    },
    exec: (command, args, options) => {
      if (command === 'gh') {
        assert.equal(args[0], 'api');
        const id = args[1].split('/').at(-2);
        assert.ok(archives[id]);
        return archives[id];
      }
      assert.equal(command, 'unzip');
      assert.equal(args[2], 'page-map.json');
      return execFileSync(command, args, options);
    },
  });
  assert.equal(result.status, 'ready');
  assert.equal(readFileSync(join(dir, 'prepared/urls.txt'), 'utf8'), 'https://cubxxw.com/new/\n');
  assert.equal(JSON.parse(readFileSync(join(dir, 'prepared/release-context.json'), 'utf8')).receipt.releaseId, 'release-1234-1');
  assert.ok(fetched.some((url) => url.endsWith('/actions/runs/1233/attempts/1')));
});

test('missing, partial, duplicate or foreign page maps cannot become empty differences', () => {
  const current = pageMap([page('/new/')]);
  for (const previous of [null, { ...current, complete: false }, { ...current, target: 'preview' }, { ...current, pages: [page('/new/'), { ...page('/new/'), outputPath: 'other.html' }] }, { ...current, pages: [{ ...page('/new/'), url: 'https://evil.example/new/' }] }]) {
    assert.throws(() => diffPublishedPages({ previous, current }));
  }
});

test('followup inputs notify added and changed canonical URLs, never removed URLs', () => {
  const input = proof();
  const result = prepareFollowups(input);
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.urls, ['https://cubxxw.com/new/']);
  assert.equal(result.feedBaseUrl, 'https://deploy123--cubxxw.netlify.app');
  assert.deepEqual(result.removed, ['/old/']);
});

test('a replacement current deployment produces superseded with no notification URLs', () => {
  const input = proof();
  input.currentDeploy.id = 'newerdeploy';
  input.currentDeploy.deployUrl = 'https://newerdeploy--cubxxw.netlify.app';
  input.currentDeploy.sourceSha = 'd'.repeat(40);
  assert.deepEqual(prepareFollowups(input), { status: 'superseded', urls: [], feedBaseUrl: null });
});

test('unknown receipt, missing current proof, wrong source/site/url and modified map are rejected', () => {
  const cases = [
    (value) => { value.receipt.schema = 'untrusted'; },
    (value) => { value.receipt.status = 'verification-failed'; value.receipt.verifiedAt = null; },
    (value) => { value.receipt.checks = []; },
    (value) => { delete value.currentDeploy; },
    (value) => { value.currentDeploy.published = false; },
    (value) => { value.currentDeploy.sourceSha = 'f'.repeat(40); },
    (value) => { value.currentDeploy.siteId = 'another-site'; },
    (value) => { value.currentDeploy.deployUrl = 'https://deploy123--other.netlify.app'; },
    (value) => { value.currentPageMap.pages[0].contentHash = 'f'.repeat(64); },
  ];
  for (const alter of cases) { const input = proof(); alter(input); assert.throws(() => prepareFollowups(input)); }
});

test('immutable feeds accept only the exact verified Netlify deploy origin', () => {
  const input = proof();
  assert.equal(validateFeedBaseUrl({ ...input, feedBaseUrl: `${input.receipt.deployUrl}/` }), input.receipt.deployUrl);
  for (const feedBaseUrl of ['https://evil.example', 'https://cubxxw.com', 'http://deploy123--cubxxw.netlify.app', 'https://deploy123--cubxxw.netlify.app/path/', 'https://deploy123--cubxxw.netlify.app?x=1', 'https://user@deploy123--cubxxw.netlify.app', 'https://deploy123--cubxxw.netlify.app.evil.example']) {
    assert.throws(() => validateFeedBaseUrl({ ...input, feedBaseUrl }), /feed|deploy|origin/);
  }
});

test('sender fixed feed uses the verified deploy but keeps canonical business URLs', async () => {
  const input = proof();
  const urls = [];
  const result = await runNewsletter({
    args: ['--feed', 'en', '--dry-run', '--feed-base-url', input.receipt.deployUrl], verifiedRelease: input,
    env: { BUTTONDOWN_API_KEY: 'not-used' }, now: () => Date.parse('2026-09-28T08:00:00Z'), log: () => {},
    store: { load: async () => ({ sent: {} }), persist: async () => assert.fail('dry run persisted state') },
    fetchImpl: async (url, options) => {
      urls.push(url); assert.equal(options.redirect, 'error');
      return new Response('<rss><channel><item><title>New</title><link>https://cubxxw.com/new/</link><pubDate>Sun, 27 Sep 2026 08:00:00 GMT</pubDate></item></channel></rss>');
    },
  });
  assert.deepEqual(urls, ['https://deploy123--cubxxw.netlify.app/index.xml']);
  assert.equal(result.wouldSend, 1);
});

test('sender cannot fetch arbitrary feed URL even in dry-run or without a receipt', async () => {
  let calls = 0;
  await assert.rejects(() => runNewsletter({ args: ['--dry-run', '--feed-base-url', 'https://evil.example'], fetchImpl: async () => { calls++; } }));
  assert.equal(calls, 0);
});

test('receipt loader requires authenticated provenance and preserves its verified context', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'blog-followups-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const out = join(dir, 'context.json');
  const input = proof();
  let verified = false;
  await runReleaseFollowups({
    args: ['load-receipt', '--deployment-id', '77', '--out', out],
    loadVerifiedReceipt: async ({ deploymentId }) => { assert.equal(deploymentId, '77'); verified = true; return { receipt: input.receipt, currentDeploy: input.currentDeploy }; },
  });
  assert.equal(verified, true);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), { receipt: input.receipt, currentDeploy: input.currentDeploy });
  await assert.rejects(() => runReleaseFollowups({ args: ['load-receipt', '--deployment-id', '77', '--out', out], loadVerifiedReceipt: async () => { throw new Error('untrusted source'); } }), /untrusted/);
});

test('prepare CLI revalidates receipt source before accepting local files', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'blog-followups-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const input = proof();
  for (const [name, value] of Object.entries({ receipt: input.receipt, previous: input.previousPageMap, current: input.currentPageMap })) writeFileSync(join(dir, `${name}.json`), JSON.stringify(value));
  const out = join(dir, 'followups.json');
  const args = ['prepare', '--receipt', join(dir, 'receipt.json'), '--previous-map', join(dir, 'previous.json'), '--current-map', join(dir, 'current.json'), '--deployment-id', '77', '--out', out];
  await runReleaseFollowups({ args, loadVerifiedReceipt: async () => ({ receipt: input.receipt, currentDeploy: input.currentDeploy }) });
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')).urls, ['https://cubxxw.com/new/']);
  const forged = { ...input.receipt, sourceSha: 'e'.repeat(40) };
  writeFileSync(join(dir, 'receipt.json'), JSON.stringify(forged));
  await assert.rejects(() => runReleaseFollowups({ args, loadVerifiedReceipt: async () => ({ receipt: input.receipt, currentDeploy: input.currentDeploy }) }), /receipt|match/);
});

test('business workflows consume same-run sealed evidence and never receive Netlify management credentials', () => {
  for (const name of ['newsletter', 'sitemap-ping', 'blog-post-workflow', 'lighthouse']) {
    const wf = parseYaml(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'));
    assert.ok(wf.on.workflow_call.inputs.release_context_artifact_id);
    assert.equal(JSON.stringify(wf).includes('NETLIFY_AUTH_TOKEN'), false, name);
    const job = Object.values(wf.jobs).find((value) => value.steps?.some((step) => step.run?.includes('assert-current')));
    assert.ok(job, name);
    assert.ok(job.if.includes("vars.BLOG_RELEASE_MODE == 'active'"));
    assert.ok(job.if.includes("vars.BLOG_RELEASE_MODE == 'shadow'"));
    const download = job.steps.find((step) => step.uses?.startsWith('actions/download-artifact') && step.with?.['artifact-ids']);
    assert.equal(download.with['artifact-ids'], '${{ inputs.release_context_artifact_id }}');
    assert.equal(download.with['run-id'], undefined, 'sealed evidence must come from this same run');
  }
});

test('followup orchestrator keeps verification secrets isolated and first-migration notifications disabled', () => {
  const wf = parseYaml(readFileSync(new URL('../.github/workflows/release-followups.yml', import.meta.url), 'utf8'));
  assert.equal(wf.jobs.prepare.environment, 'production');
  assert.ok(wf.jobs.prepare.steps.some((step) => step.env?.NETLIFY_AUTH_TOKEN));
  for (const name of ['newsletter', 'search', 'readme', 'lighthouse']) {
    assert.ok(wf.jobs[name].if.includes("needs.prepare.outputs.status == 'ready'"));
    assert.notEqual(wf.jobs[name].secrets, 'inherit');
    assert.equal(JSON.stringify(wf.jobs[name]).includes('NETLIFY_AUTH_TOKEN'), false);
  }
});

test('scheduled audit is read-only, reports external failures and never modifies quality policy', () => {
  const wf = parseYaml(readFileSync(new URL('../.github/workflows/content-audit.yml', import.meta.url), 'utf8'));
  assert.deepEqual(wf.permissions, { contents: 'read' });
  assert.equal(wf.on.schedule[0].cron, '0 1 * * 0');
  assert.ok(wf.on.workflow_dispatch);
  const steps = Object.values(wf.jobs).flatMap((job) => job.steps || []);
  const external = steps.find((step) => step.uses?.startsWith('lycheeverse/lychee-action'));
  assert.equal(external.with.lycheeVersion, 'v0.24.2');
  assert.equal(external.with.fail, false);
  assert.ok(steps.some((step) => step.run?.includes('--report-only')));
  const serialized = JSON.stringify(wf);
  assert.equal(/contents[^a-z]+write|git push|baseline:update|--prod|NETLIFY_AUTH_TOKEN/.test(serialized), false);
});
