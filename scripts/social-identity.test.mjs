import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('native identity cards localize home/about and keep per-article title cards', t => {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-identity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ['layouts/partials/seo','layouts/_default','assets/social','data/social','content/en','content/zh','static']) fs.mkdirSync(path.join(root,dir),{recursive:true});
  fs.cpSync(path.join(repo,'assets/social'),path.join(root,'assets/social'),{recursive:true});
  fs.cpSync(path.join(repo,'data/social'),path.join(root,'data/social'),{recursive:true});
  for (const name of fs.readdirSync(path.join(repo,'layouts/partials/seo')).filter(n=>n.startsWith('social-'))) fs.copyFileSync(path.join(repo,'layouts/partials/seo',name),path.join(root,'layouts/partials/seo',name));
  const config={baseURL:'https://cubxxw.com/',defaultContentLanguage:'en',languages:{en:{contentDir:'content/en'},zh:{contentDir:'content/zh'}}};
  fs.writeFileSync(path.join(root,'hugo.json'),JSON.stringify(config));
  const layout='{{ $r := partial "seo/social-image.html" . }}{{ dict "url" $r.url "width" $r.width "height" $r.height "alt" $r.alt | jsonify | safeHTML }}';
  fs.writeFileSync(path.join(root,'layouts/index.html'),layout);
  fs.writeFileSync(path.join(root,'layouts/_default/single.html'),layout);
  for(const lang of ['zh','en']) {
    fs.writeFileSync(path.join(root,`content/${lang}/about.md`),'---\ntitle: About\nlayout: about\n---\n');
    fs.mkdirSync(path.join(root,`content/${lang}/engineering/posts`),{recursive:true});
    fs.writeFileSync(path.join(root,`content/${lang}/engineering/posts/test.md`),'---\ntitle: A meaningful article title\n---\n');
  }
  fs.writeFileSync(path.join(root,'content/en/custom.md'),'---\ntitle: Custom card\nsocial:\n  image: /dedicated.png\n---\n');
  fs.copyFileSync(path.join(repo,'assets/social/paper.png'),path.join(root,'static/dedicated.png'));
  execFileSync('hugo',['--source',root,'--quiet'],{env:{...process.env,GOMAXPROCS:'2',HUGO_NUMWORKERMULTIPLIER:'1'},stdio:'pipe'});
  const read=route=>JSON.parse(fs.readFileSync(path.join(root,'public',route),'utf8'));
  const zh=read('zh/index.html'),en=read('index.html');
  assert.match(zh.url,/home-zh/); assert.match(en.url,/home-en/); assert.notEqual(zh.url,en.url);
  assert.equal(read('zh/about/index.html').url,zh.url); assert.equal(read('about/index.html').url,en.url);
  const article=read('zh/engineering/posts/test/index.html');
  assert.notEqual(article.url,zh.url); assert.match(article.url,/paper_hu_/); assert.equal(article.alt,'A meaningful article title');
  assert.notEqual(read('custom/index.html').url,en.url);
  for(const result of [zh,en,article,read('custom/index.html')]) {
    assert.deepEqual([result.width,result.height],[1200,630]);
    const file=path.join(root,'public',new URL(result.url).pathname);
    assert.ok(fs.existsSync(file));
    const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
  }
  assert.equal(fs.readdirSync(path.join(root,'public/social')).some(n=>n.endsWith('.ttf')),false,'font must remain a build-only input');
});
