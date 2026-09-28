import { createHash } from 'node:crypto';
import { validateContract } from './ci-contracts.mjs';
import { validateReceipt, assertCurrentProduction } from './site-release.mjs';
import { deploymentUrl } from './netlify-release-client.mjs';

const SITE = 'https://cubxxw.com';
const hashJson = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function indexPages(map) {
  validateContract('blog-page-map/1', map);
  if (map.target !== 'production' || !map.complete || ![SITE, `${SITE}/`].includes(map.baseUrl)) throw new Error('A complete production page map is required.');
  const pages = new Map();
  for (const page of map.pages) {
    const url = new URL(page.url, `${SITE}/`);
    if (url.origin !== SITE || url.username || url.password || url.search || url.hash || (!page.url.startsWith('/') && page.url !== url.href) || page.url.startsWith('//')) {
      throw new Error('Published page map URL is not canonical.');
    }
    if (pages.has(url.pathname)) throw new Error(`Duplicate published page-map URL: ${url.pathname}`);
    pages.set(url.pathname, page.contentHash);
  }
  return pages;
}

// Diff the actual last/current published outputs. Git commit adjacency cannot
// capture skipped deploys or articles that became public when their date arrived.
export function diffPublishedPages({ previous, current }) {
  const before = indexPages(previous);
  const after = indexPages(current);
  const added = [], changed = [], removed = [];
  for (const [url, hash] of after) {
    if (!before.has(url)) added.push(url);
    else if (before.get(url) !== hash) changed.push(url);
  }
  for (const url of before.keys()) if (!after.has(url)) removed.push(url);
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
}

function validateContext({ receipt, currentDeploy }) {
  validateReceipt(receipt);
  if (receipt.status !== 'verified') throw new Error('Followups require a verified production receipt; rollback does not notify.');
  const current = currentDeploy;
  if (!current || current.siteId !== receipt.siteId || current.state !== 'ready' || current.published !== true || !/^[0-9a-f]{40}$/.test(current.sourceSha) || typeof current.id !== 'string' || !current.id) {
    throw new Error('Missing or mismatched current production proof.');
  }
  deploymentUrl(current.deployUrl, current.id);
  if (current.id !== receipt.deployId) return 'superseded';
  assertCurrentProduction({ receipt, currentDeploy });
  return 'current';
}

export function validateFeedBaseUrl({ receipt, currentDeploy, feedBaseUrl }) {
  if (validateContext({ receipt, currentDeploy }) !== 'current') throw new Error('The requested feed deployment is superseded.');
  const origin = deploymentUrl(feedBaseUrl, receipt.deployId);
  if (origin !== deploymentUrl(receipt.deployUrl, receipt.deployId)) throw new Error('Feed origin must match the verified deploy exactly.');
  return origin;
}

// currentDeploy must come from the authenticated release adapter. This pure
// function checks consistency, not provenance; the CLI reloads that proof.
export function prepareFollowups({ receipt, previousPageMap, currentPageMap, currentDeploy }) {
  if (validateContext({ receipt, currentDeploy }) !== 'current') return { status: 'superseded', urls: [], feedBaseUrl: null };
  if (currentPageMap?.sourceSha !== receipt.sourceSha || hashJson(currentPageMap) !== receipt.pageMapDigest) throw new Error('Current page map does not match the verified receipt digest/source.');
  const delta = diffPublishedPages({ previous: previousPageMap, current: currentPageMap });
  return {
    status: 'ready',
    urls: [...delta.added, ...delta.changed].sort().map((path) => new URL(path, SITE).href),
    feedBaseUrl: validateFeedBaseUrl({ receipt, currentDeploy, feedBaseUrl: receipt.deployUrl }),
    ...delta,
  };
}

// Business jobs need no Netlify management token. Their sealed same-run
// context was authenticated by prepare; this public check detects replacement
// while jobs were queued, including a second deployment of the same source.
export async function assertPublicRelease({ receipt, fetch = globalThis.fetch }) {
  validateReceipt(receipt);
  if (receipt.status !== 'verified' || typeof receipt.releaseId !== 'string' || !receipt.releaseId) throw new Error('Missing verified release identity.');
  const response = await fetch(`${SITE}/__release.json`, {
    redirect: 'error', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Current public release check failed (${response.status}).`);
  const marker = await response.json();
  if (marker.sourceSha !== receipt.sourceSha || marker.releaseId !== receipt.releaseId) throw new Error('The verified release is no longer current; retry from the current deployment.');
  return { sourceSha: marker.sourceSha, releaseId: marker.releaseId };
}

export async function prepareReleaseContext({
  deploymentId, artifactId, siteId, listDeployments, loadVerifiedReceipt,
  loadHistoricalReceipt, readArtifactPageMap, loadSearchState=async()=>null,
}) {
  const records = await listDeployments();
  if (!Array.isArray(records)) throw new Error('Deployment history is unavailable; recover verified evidence.');
  const candidates = records.filter((record) => ['verified','rollback-verified'].includes(record.payload?.receipt?.status) && record.payload.receipt.siteId === siteId)
    .sort((a, b) => Date.parse(b.payload.receipt.verifiedAt) - Date.parse(a.payload.receipt.verifiedAt));
  const selected = deploymentId ? records.find((record) => String(record.id) === String(deploymentId)) : candidates[0];
  if (!selected) throw new Error('No trusted deployment receipt found; verify the current production deployment first.');
  const context = await loadVerifiedReceipt({ deploymentId: String(selected.id) });
  if(context.receipt.status==='rollback-verified')assertCurrentProduction(context);else validateContext(context);
  if (!context.sourceProof?.artifactId || (artifactId && String(context.sourceProof.artifactId) !== String(artifactId))) throw new Error('Current artifact does not match the authenticated receipt.');
  const currentPageMap = await readArtifactPageMap(context.sourceProof);
  indexPages(currentPageMap);
  if (currentPageMap.sourceSha !== context.receipt.sourceSha || hashJson(currentPageMap) !== context.receipt.pageMapDigest) throw new Error('Current page map digest/source mismatch.');
  const base = { schema: 'blog-followups/1', deploymentId: String(selected.id), ...context, currentPageMap };
  if(context.receipt.status==='rollback-verified')return {...base,status:'rollback',urls:[],previousDeploymentId:null,previousPageMap:null,feedBaseUrl:null};
  const previousRecord = candidates.find((record) => String(record.id) !== String(selected.id) && Date.parse(record.payload.receipt.verifiedAt) < Date.parse(context.receipt.verifiedAt) && (!context.receipt.previousDeployId || record.payload.receipt.deployId===context.receipt.previousDeployId));
  if (!previousRecord) {
    if(candidates.some(record=>String(record.id)!==String(selected.id)))throw new Error('Actual previous Netlify publication has no verified history; reconcile it before followups.');
    return { ...base, status: 'bootstrap', urls: [], previousDeploymentId: null, previousPageMap: null, feedBaseUrl: context.receipt.deployUrl };
  }
  let previous, previousPageMap;
  try {
    previous = await loadHistoricalReceipt({ deploymentId: String(previousRecord.id) });
    if (!previous.sourceProof?.artifactId) throw new Error('Missing historical artifact identity.');
    previousPageMap = await readArtifactPageMap(previous.sourceProof);
    if (previousPageMap.sourceSha !== previous.receipt.sourceSha || hashJson(previousPageMap) !== previous.receipt.pageMapDigest) throw new Error('Historical page map digest/source mismatch.');
  } catch (cause) {
    throw new Error('Historical release evidence is unavailable or expired. Recover and verify the previous page map before retrying; never send all pages.', { cause });
  }
  const searchState=await loadSearchState();
  let initialPageMap;
  if(!searchState?.providers?.indexnow||!searchState?.providers?.baidu) {
    const first=candidates.at(-1);
    if(String(first.id)===String(previousRecord.id))initialPageMap=previousPageMap;
    else {
      const initial=await loadHistoricalReceipt({deploymentId:String(first.id)});
      initialPageMap=await readArtifactPageMap(initial.sourceProof);
      if(hashJson(initialPageMap)!==initial.receipt.pageMapDigest)throw new Error('Initial search baseline does not match its verified publication');
    }
  }
  return { ...base, ...prepareFollowups({ ...context, previousPageMap, currentPageMap }), previousPageMap, initialPageMap, previousDeploymentId: String(previousRecord.id) };
}
