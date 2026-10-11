import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { attribute, htmlElements } from './content-page-map.mjs';

// All generated cards (including explicit raster overrides) are opaque PNGs.
// Validate the actual file, rather than trusting declared dimensions in HTML.
export function checkSocialCard(html, publicDir, { baseURL = 'https://cubxxw.com' } = {}) {
  const headEnd = html.toLowerCase().indexOf('</head>');
  const nodes = htmlElements(parse(headEnd < 0 ? html : html.slice(0, headEnd + 7)));
  const errors = [];
  const meta = name => {
    const matches = nodes.filter(node => node.tagName === 'meta' &&
      (attribute(node, 'property') === name || attribute(node, 'name') === name));
    if (matches.length !== 1) errors.push(`${name}: expected one tag, found ${matches.length}`);
    return attribute(matches[0] ?? {}, 'content') ?? '';
  };
  const image = meta('og:image');
  if (meta('twitter:card') !== 'summary_large_image') errors.push('X card must use summary_large_image');
  if (meta('twitter:image') !== image) errors.push('X and Open Graph images differ');
  if (meta('og:image:secure_url') !== image) errors.push('Open Graph secure image differs');
  if (meta('og:image:type') !== 'image/png') errors.push('Card MIME must be image/png');
  if (meta('og:image:width') !== '1200' || meta('og:image:height') !== '630') errors.push('Card must declare 1200×630');
  for (const name of ['og:image:alt', 'twitter:image:alt', 'og:title', 'og:description']) {
    if (!meta(name).trim()) errors.push(`${name}: empty text`);
  }
  let url;
  try { url = new URL(image); } catch { errors.push('Card URL must be absolute'); return errors; }
  if (url.protocol !== 'https:') errors.push('Card URL must use HTTPS');
  if (/\/assets\/og-(?:image|growth|projects|ai-technology)\.png$/.test(url.pathname)) errors.push('Retired static card is still referenced');
  let relative;
  try { relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''); }
  catch { errors.push('Invalid card path encoding'); return errors; }
  const base = new URL(baseURL);
  if (url.origin !== base.origin) errors.push('Card must use the deployment origin');
  const prefix = decodeURIComponent(base.pathname).replace(/^\/+|\/+$/g, '');
  if (prefix) {
    if (!relative.startsWith(`${prefix}/`)) { errors.push('Card must use the deployment path prefix'); return errors; }
    relative = relative.slice(prefix.length + 1);
  }
  const root = path.resolve(publicDir);
  const candidate = path.resolve(root, relative);
  const file = candidate.startsWith(`${root}${path.sep}`) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
  if (!file) { errors.push(`Card image missing from build: ${url.pathname}`); return errors; }
  const bytes = fs.readFileSync(file);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    errors.push('Card file is not a PNG'); return errors;
  }
  if (bytes.readUInt32BE(16) !== 1200 || bytes.readUInt32BE(20) !== 630) errors.push('Actual card dimensions differ from 1200×630');
  if (bytes.length >= 5 * 1024 * 1024) errors.push('Card file must be under 5 MB');
  return errors;
}
