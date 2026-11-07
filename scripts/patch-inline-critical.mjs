import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const originalHash = '28d4692b7ca2433677c9cbf85dfabf913a650530016f5a9a1e5b3e83d0906091';
const original = 'return array.reduce((a, b) => [...a, b], []);';
const replacement = 'return array.flat();';
const digest = source => createHash('sha256').update(source).digest('hex');

// inline-critical@11.0.1 passes an array to querySelector(...selectors).
// Its flatten helper leaves that array nested, so the optional undefined first
// selector becomes a leading comma. nwsapi@2.2.28 then selects <html>, causing
// getNodeIndent to compile the whole page as a regular expression.
// Fix only that helper. Critical extraction, inlining and all output gates stay
// enabled. Exact source/version checks require review on a dependency upgrade.
export function compatibleSource(source, version) {
  if (version !== '11.0.1') throw new Error('Review the inline-critical compatibility patch for this version');
  const patched = source.replace(replacement, original);
  if (digest(source) === originalHash) return source.replace(original, replacement);
  if (source.includes(replacement) && digest(patched) === originalHash) return source;
  throw new Error('Unexpected inline-critical source; refusing to patch it');
}

export function patchInlineCritical(repoRoot = process.cwd()) {
  const require = createRequire(path.join(repoRoot, 'package.json'));
  const plugin = require.resolve('netlify-plugin-critical-css');
  const critical = createRequire(plugin).resolve('critical');
  const dom = createRequire(critical).resolve('inline-critical/dom');
  const ownedModules = path.join(fs.realpathSync(repoRoot), 'node_modules') + path.sep;
  if (!fs.realpathSync(dom).startsWith(ownedModules)) {
    throw new Error('Refusing to modify dependencies outside this repository installation');
  }
  const metadata = JSON.parse(fs.readFileSync(path.resolve(path.dirname(dom), '../package.json'), 'utf8'));
  const before = fs.readFileSync(dom, 'utf8');
  const after = compatibleSource(before, metadata.version);
  if (after !== before) fs.writeFileSync(dom, after);
  return after !== before;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  patchInlineCritical();
  console.log('Verified inline-critical selector compatibility');
}
