import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const artifactRoot = resolve(process.env.INTERACTIVE_ARTIFACT_DIR || join(repo, 'tests/.artifacts'));
const hugo = process.env.HUGO_BIN || 'hugo';

test('Hugo watch rebuilds replace occurrence claims, retain validation, and discard removed assets', { timeout: 60000 }, async () => {
  await mkdir(artifactRoot, { recursive: true });
  const dir = await mkdtemp(join(artifactRoot, 'watch-registry-'));
  for (const name of ['assets/css/components', 'assets/js/components', 'data/interactive', 'layouts/partials/interactive']) {
    await cp(join(repo, name), join(dir, name), { recursive: true });
  }
  await mkdir(join(dir, 'layouts/shortcodes'), { recursive: true });
  await cp(join(repo, 'layouts/shortcodes/interactive.html'), join(dir, 'layouts/shortcodes/interactive.html'));
  await writeFile(join(dir, 'layouts/shortcodes/group.html'), '{{ .Inner }}');
  await mkdir(join(dir, 'layouts/_default'), { recursive: true });
  await mkdir(join(dir, 'content'), { recursive: true });
  await writeFile(join(dir, 'hugo.toml'), 'baseURL = "http://localhost/"\ndefaultContentLanguage = "en"\ndisableKinds = ["taxonomy", "term", "RSS", "sitemap"]\n');
  await writeFile(join(dir, 'layouts/_default/single.html'), `<!doctype html><html><body>{{ .Content }}{{ partial "interactive/assets.html" . }}{{ $key := partial "interactive/registry-key.html" . }}{{ $total := 0 }}{{ range (.Store.Get $key | default dict) }}{{ $total = add $total .bytes }}{{ end }}<output data-config-bytes="{{ $total }}"></output></body></html>`);
  const shortcode = (id, kind = 'agent-loop') => `{{< interactive kind="${kind}" id="${id}" spec="${kind === 'agent-loop' ? 'agent-loop-v1' : 'context-window-v1'}" >}}`;
  const body = shortcode('context', 'context-budget') + '\n' + Array.from({ length: 13 }, (_, i) => shortcode(`loop-${i}`)).join('\n');
  const pagePath = join(dir, 'content/probe.md');
  const putPage = text => writeFile(pagePath, `---\ntitle: Probe\n---\n${text}\n`);
  await putPage(body);
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const server = spawn(hugo, ['server', '--source', dir, '--bind', '127.0.0.1', '--port', String(port), '--disableFastRender', '--noHTTPCache', '--disableLiveReload'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  server.stdout.on('data', chunk => { log += chunk; });
  server.stderr.on('data', chunk => { log += chunk; });
  server.on('error', error => { log += error.message; });
  async function waitFor(predicate, label) {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/probe/`);
        const html = await response.text();
        // The fixture's asset links and byte total follow .Content. An
        // unfinished response has an empty/different CSS set too; it must
        // not satisfy an asset-revision predicate. Keep malformed *complete*
        // pages visible to the strict count/byte assertions below, and let
        // non-200 responses reach predicates that inspect Hugo error logs.
        const complete = response.status !== 200 || html.trimEnd().endsWith('</html>');
        if (complete && predicate(response.status, html)) return html;
      } catch { /* Server boot or rebuild in progress. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.fail(`${label}\n${log.slice(-4000)}`);
  }
  const payloads = html => [...html.matchAll(/<script type="application\/json" data-ib-config>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const cssPaths = html => [...html.matchAll(/href="([^\"]*\/css\/components\/[^\"]*)"/g)].map(m => m[1]).sort().join('|');
  function checkBytes(html, count) {
    const configs = payloads(html);
    assert.equal(configs.length, count);
    const emitted = configs.reduce((sum, config) => sum + Buffer.byteLength(config), 0);
    assert.equal(Number(html.match(/data-config-bytes="(\d+)"/)[1]), emitted);
    assert.ok(emitted <= 102400);
  }
  try {
    let html = await waitFor((status, body) => status === 200 && payloads(body).length === 14, 'initial near-budget page');
    checkBytes(html, 14);
    const cssPath = join(dir, 'assets/css/components/context-budget.css');
    const originalCss = await readFile(cssPath, 'utf8');
    for (let revision = 1; revision <= 3; revision++) {
      const previousCss = cssPaths(html);
      await writeFile(cssPath, `${originalCss}\nblog-context-budget { --watch-probe: ${revision}; }\n`);
      html = await waitFor((status, body) => status === 200 && cssPaths(body) !== previousCss, `asset-only rebuild ${revision}`);
      checkBytes(html, 14);
    }
    await writeFile(pagePath, `---
title: Metadata changed


description: More front matter lines
---
${body}
`);
    html = await waitFor((status, body) => status === 200 && payloads(body).length === 14, 'metadata-only line changes');
    // Force an asset rebuild after metadata changes, avoiding a cached pre-edit response.
    const beforeMetadataCss = cssPaths(html);
    await writeFile(cssPath, `${originalCss}\nblog-context-budget { --watch-probe: metadata; }\n`);
    html = await waitFor((status, body) => status === 200 && cssPaths(body) !== beforeMetadataCss, 'asset rebuild after metadata-only edit');
    checkBytes(html, 14);
    const dataPath = join(dir, 'data/interactive/context-window-v1.json');
    const spec = JSON.parse(await readFile(dataPath, 'utf8'));
    spec.copy.en.title = 'Rebuilt context title';
    await writeFile(dataPath, JSON.stringify(spec));
    html = await waitFor((status, body) => status === 200 && body.includes('Rebuilt context title'), 'data rebuild');
    checkBytes(html, 14);
    const duplicateLogOffset = log.length;
    await putPage(body + '\n' + shortcode('context', 'context-budget'));
    await waitFor(() => log.slice(duplicateLogOffset).includes('ERROR interactive: duplicate id'), 'real duplicate still rejected during watch');
    // Move a formerly claimed id to a different occurrence and remove all other claims.
    await putPage('Moved after editing.\n\n' + shortcode('loop-0'));
    html = await waitFor((status, body) => status === 200 && payloads(body).length === 1, 'content edit recovers without stale claims');
    checkBytes(html, 1);
    assert.ok(!cssPaths(html).includes('context-budget'));
    const group = content => `{{< group >}}${content}{{< /group >}}`;
    await putPage(group(shortcode('nested-a')) + '\n' + group(shortcode('nested-b')));
    html = await waitFor((status, body) => status === 200 && payloads(body).length === 2, 'nested occurrences have distinct parent ordinal chains');
    checkBytes(html, 2);
    const nestedLogOffset = log.length;
    await putPage(group(shortcode('nested-a')) + '\n' + group(shortcode('nested-a')));
    await waitFor(() => log.slice(nestedLogOffset).includes('ERROR interactive: duplicate id'), 'duplicate nested ids still fail');
    await putPage('All interactive instances removed.');
    html = await waitFor((status, body) => status === 200 && body.includes('All interactive instances removed.'), 'remove final instance');
    checkBytes(html, 0);
    assert.equal(cssPaths(html), '');
    assert.ok(!html.includes('/js/components/'));
  } finally {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
    await writeFile(join(dir, 'hugo-watch.log'), log);
  }
});
