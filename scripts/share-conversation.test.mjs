import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseFragment } from 'parse5';

// Browser boundary double: the real share controller, Markdown layout, QR encoder
// and modal events run unchanged; only DOM and canvas rasterization are replaced.
function browser({ lang = 'zh', dark = false, dpr = 2, native = true, qr = true } = {}) {
  const records = { text: [], images: [], shares: [], downloads: [], qr: [] };
  let document;
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.style = {}; this.listeners = {}; this.textContent = ''; }
    set id(v) { this.attrs.id = v; } get id() { return this.attrs.id; }
    set className(v) { this.attrs.class = v; } get className() { return this.attrs.class || ''; }
    get dataset() { return Object.fromEntries(Object.entries(this.attrs).filter(([k]) => k.startsWith('data-')).map(([k, v]) => [k.slice(5), v])); }
    get classList() { return { contains: v => this.className.split(/\s+/).includes(v), add: v => { if (!this.classList.contains(v)) this.className += ' ' + v; }, remove: v => { this.className = this.className.split(/\s+/).filter(x => x !== v).join(' '); }, toggle: (v, on) => on ? this.classList.add(v) : this.classList.remove(v) }; }
    setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k] ?? null; }
    appendChild(el) { el.parentNode = this; this.children.push(el); return el; }
    replaceChild(next, old) { this.children[this.children.indexOf(old)] = next; next.parentNode = this; old.parentNode = null; }
    removeChild(el) { this.children = this.children.filter(x => x !== el); el.parentNode = null; }
    remove() { this.parentNode?.removeChild(this); }
    set innerHTML(value) {
      const convert = node => {
        const el = new Element(node.tagName || '#text');
        for (const a of node.attrs || []) el.attrs[a.name] = a.value;
        el.textContent = node.value || '';
        for (const c of node.childNodes || []) el.appendChild(convert(c));
        return el;
      };
      this.children = []; for (const n of parseFragment(value).childNodes) this.appendChild(convert(n));
    }
    matches(selector) {
      if (selector === 'button:not([disabled])') return this.tagName === 'button' && !('disabled' in this.attrs);
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
      return this.tagName === selector;
    }
    querySelectorAll(selector) { return this.children.flatMap(c => [...(c.matches(selector) ? [c] : []), ...c.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector); }
    addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
    removeEventListener(k, fn) { this.listeners[k] = (this.listeners[k] || []).filter(x => x !== fn); }
    click() { if (this.tagName === 'a') records.downloads.push({ filename: this.download, url: this.href }); this.dispatch('click', { target: this }); }
    dispatch(type, event) { for (const f of this.listeners[type] || []) f.call(this, event); this.parentNode?.dispatch(type, event); }
    focus() { document.activeElement = this; }
  }
  class Canvas extends Element {
    constructor() {
      super('canvas'); this.width = 300; this.height = 150;
      this.operations = [];
      const ctx = this.context = {
        font: '10px sans-serif', fillStyle: '#000', textAlign: 'left',
        scale() {}, beginPath() {}, moveTo() {}, arcTo() {}, closePath() {}, fill() {}, stroke() {}, save() {}, restore() {},
        measureText(text) { const size = Number(/([\d.]+)px/.exec(this.font)?.[1] || 10); return { width: Array.from(text).reduce((n, c) => n + (/\p{Script=Han}|\p{Extended_Pictographic}/u.test(c) ? size : size * .54), 0) }; },
        fillText: (text, x, y) => this.operations.push({ type: 'text', text, x, y, font: ctx.font, color: ctx.fillStyle }),
        fillRect: (x, y, width, height) => this.operations.push({ type: 'rect', x, y, width, height, color: ctx.fillStyle }),
        createLinearGradient() { return { addColorStop() {} }; },
      };
    }
    getContext() { return this.context; }
    toBlob(fn) { fn(new Blob(['png'], { type: 'image/png' })); }
    toDataURL() { return 'data:image/png;base64,test'; }
  }
  const body = new Element('body'); if (dark) body.className = 'dark';
  const head = new Element('head'); const root = new Element('html'); root.attrs.lang = lang;
  document = { body, head, documentElement: root, title: 'Source title', activeElement: new Element('button'), createElement: tag => tag === 'canvas' ? new Canvas() : new Element(tag), getElementById: id => body.querySelector('#' + id) || head.querySelector('#' + id), querySelector: () => null, addEventListener: body.addEventListener.bind(body), removeEventListener: body.removeEventListener.bind(body) };
  const navigator = { clipboard: { writeText: async t => { records.text.push(t); }, write: async t => { records.images.push(t); } } };
  if (native) { navigator.share = async data => { records.shares.push(data); }; navigator.canShare = () => true; }
  const window = { document, navigator, devicePixelRatio: dpr, location: { href: 'https://cubxxw.com/zh/ai-agent/posts/source/', origin: 'https://cubxxw.com' }, ClipboardItem: class { constructor(data) { this.data = data; } } };
  const context = vm.createContext({ window, document, navigator, URL, Blob, File: class { constructor(parts, name, options) { this.name = name; this.type = options.type; } }, setTimeout() {}, requestAnimationFrame: fn => fn() });
  if (qr) {
    vm.runInContext(readFileSync(new URL('../static/js/qrcode-generator.js', import.meta.url), 'utf8'), context);
    window.qrcode = (type, level) => { const encoder = context.qrcode(type, level); const add = encoder.addData; encoder.addData = t => { records.qr.push(t); add.call(encoder, t); }; return encoder; };
  }
  vm.runInContext(readFileSync(new URL('../static/js/share-conversation.js', import.meta.url), 'utf8'), context);
  const show = (messages, options = {}) => { window.ShareConversation.show(messages, { lang, title: 'Source title', url: window.location.href, ...options }); return canvas(); };
  const canvas = () => document.getElementById('csp-preview').children[0];
  return { show, canvas, records, document, click: id => document.getElementById(id).click(), mode: value => document.getElementById('csp-modes').querySelectorAll('button').find(b => b.dataset.mode === value).click(), theme: value => document.getElementById('csp-themes').querySelectorAll('button').find(b => b.dataset.theme === value).click() };
}
const pair = (answer, question = '原来的问题如何落地？') => [{ role: 'user', content: question }, { role: 'assistant', content: answer }];
const text = canvas => canvas.operations.filter(op => op.type === 'text');
const printed = canvas => text(canvas).map(op => op.text).join('');

// Regression: fixed-height latest cards silently discarded everything after 15 lines.
test('normal long answers retain their final paragraph before the question and article footer', () => {
  const app = browser();
  const answer = Array.from({ length: 32 }, (_, i) => `第${i + 1}段，这是一段完整的阅读回答，包含可以再次思考的具体内容。`).join('\n\n') + '\n\n保留最后这一段。';
  const canvas = app.show(pair(answer));
  assert.match(printed(canvas), /保留最后这一段。/);
  assert.ok(canvas.height > 1350, 'long answers need a taller image');
  const ops = text(canvas), lastAnswer = ops.findLast(op => op.text.includes('段') && op.y > 100);
  const questionLabel = ops.find(op => /^(提问|原问题|Question)/.test(op.text));
  const source = ops.find(op => op.text === 'Source title');
  assert.ok(questionLabel && questionLabel.y > lastAnswer.y, 'the question follows the complete answer');
  assert.ok(source && source.y > questionLabel.y, 'source belongs in the final footer');
  assert.ok(ops.every(op => op.y < canvas.height - 20), 'nothing is painted off canvas');
  assert.ok(ops.some(op => /(?:36|38|40)px/.test(op.font)), 'export body text is readable at 1080px');
  assert.deepEqual(app.records.qr, ['https://cubxxw.com/zh/ai-agent/posts/source/']);
});

test('collection preserves every ordinary turn instead of silently slicing the latest three', async () => {
  const app = browser(); const messages = [1, 2, 3, 4].flatMap(i => pair(`完整回答 ${i}。\n\n回答 ${i} 的收尾。`, `第 ${i} 个问题？`));
  app.show(messages); app.mode('collection');
  for (const i of [1, 2, 3, 4]) assert.match(printed(app.canvas()), new RegExp(`回答 ${i} 的收尾。`));
  app.click('csb-copy-text'); await Promise.resolve();
  assert.match(app.records.text[0], /完整回答 1/);
  assert.ok(app.records.text[0].indexOf('完整回答 1') < app.records.text[0].indexOf('第 1 个问题'));
});

test('extreme content stays inside a safe canvas and labels the AI excerpt separately from its article QR', () => {
  const app = browser(); const canvas = app.show(pair(('超长回答中的具体内容。\n\n').repeat(9000)));
  assert.equal(canvas.width, 1080);
  assert.ok(canvas.height <= 14000 && canvas.width * canvas.height <= 16_000_000);
  assert.match(printed(canvas), /AI.*节选|AI.*摘录/);
  assert.ok(!/扫码.*(?:完整回答|全部回答)|Scan.*full (?:answer|reply)/i.test(printed(canvas)));
  const source = text(canvas).find(op => op.text === 'Source title');
  assert.ok(source.y > text(canvas).find(op => /AI.*节选|AI.*摘录/.test(op.text)).y);
});

test('legacy code and quotes preserve their content, including angle brackets and long links', () => {
  const app = browser({ lang: 'en' });
  const link = 'https://example.com/' + 'longpath'.repeat(45);
  const canvas = app.show(pair('Paragraph one.\n\n> A quote stays here.\n\n```js\nconst value = "<tag>";\nif (value) {\n  console.log(value);\n}\n```\n\n' + link + '\n\nFinal 👨‍👩‍👧‍👦 paragraph.', 'Why preserve it?'));
  const output = printed(canvas);
  assert.match(output, /A quote stays here\./);
  assert.match(output, /const value = "<tag>";/);
  assert.match(output, /Final 👨‍👩‍👧‍👦 paragraph\./);
  assert.ok(!output.includes('```'));
  assert.ok(text(canvas).every(op => canvas.context.measureText.call({ font: op.font }, op.text).width <= 920), 'long tokens wrap within the paper');
});

test('text export retains paragraphs, code, answer first, and the real source URL', async () => {
  const app = browser({ lang: 'en' });
  app.show(pair('First paragraph.\n\nSecond paragraph.\n\n```html\n<span>literal</span>\n```', 'Explain?'));
  app.click('csb-copy-text'); await Promise.resolve();
  assert.match(app.records.text[0], /First paragraph\.\n\nSecond paragraph\./);
  assert.match(app.records.text[0], /<span>literal<\/span>/);
  assert.ok(app.records.text[0].indexOf('Second paragraph.') < app.records.text[0].indexOf('Explain?'));
  assert.ok(app.records.text[0].endsWith('https://cubxxw.com/zh/ai-agent/posts/source/'));
});

test('all themes rerender while copy, download, native share and keyboard focus remain usable', async () => {
  const app = browser({ lang: 'en', dark: true }); app.show(pair('A complete answer.', 'Why?'));
  const initial = app.canvas();
  for (const theme of ['classic', 'midnight', 'dusk', 'ink']) { app.theme(theme); assert.notEqual(app.canvas(), initial); assert.match(printed(app.canvas()), /A complete answer\./); }
  assert.ok(app.document.activeElement.classList.contains('conv-share-btn--primary'));
  app.click('csb-copy-img'); app.click('csb-save-img'); app.click('csb-web-share'); await Promise.resolve();
  assert.equal(app.records.images.length, 1); assert.equal(app.records.downloads.length, 1);
  assert.equal(app.records.shares.length, 1); assert.equal(app.records.shares[0].url, 'https://cubxxw.com/zh/ai-agent/posts/source/');
  assert.equal(app.records.shares[0].files[0].type, 'image/png');
});

test('missing QR encoder leaves the article source readable without a false scan invitation', () => {
  const app = browser({ qr: false }); const canvas = app.show(pair('短回答。'));
  assert.match(printed(canvas), /cubxxw\.com/);
  assert.ok(!/扫码|Scan/.test(printed(canvas)));
});

test('capped exports with an unavailable QR never claim that a QR is present', () => {
  const app = browser({ qr: false });
  const canvas = app.show(pair(('超长回答中的具体内容。\n\n').repeat(9000)));
  assert.match(printed(canvas), /AI.*节选|AI.*摘录/);
  assert.doesNotMatch(printed(canvas), /二维码|QR links|扫码|Scan/);
});

test('QR modules keep an integer grid and four clear cells even on the dark paper', () => {
  const app = browser({ dark: true }); const canvas = app.show(pair('保留清晰可扫描的来源。'));
  const plate = canvas.operations.find(op => op.type === 'rect' && op.color === '#ffffff' && op.width === op.height && op.width > 100);
  assert.ok(plate, 'QR has a solid white square quiet zone');
  const modules = canvas.operations.filter(op => op.type === 'rect' && op.color === '#111111');
  assert.ok(modules.length > 100);
  const cell = modules[0].width;
  const startX = Math.min(...modules.map(op => op.x)), startY = Math.min(...modules.map(op => op.y));
  assert.ok(startX - plate.x >= cell * 4 && startY - plate.y >= cell * 4);
  assert.ok(modules.every(op => op.width === cell && op.height === cell && (op.x - startX) % cell === 0 && (op.y - startY) % cell === 0));
  assert.ok(Math.max(...modules.map(op => op.y + op.height)) <= plate.y + plate.height - cell * 4);
});

test('an explicit English card uses English labels and only supplied source dates', () => {
  const app = browser({ lang: 'zh' });
  const canvas = app.show(pair('Full answer.', 'Why?'), { lang: 'en', date: '2026-10-08T12:00:00+08:00' });
  assert.match(printed(canvas), /AI reading note/);
  assert.match(printed(canvas), /2026-10-08/);
  assert.ok(!/Xinwei|Xiong/.test(printed(canvas)), 'AI reply is never attributed to the article author');
});

test('a source URL too dense for the compact QR never paints outside its footer', () => {
  const app = browser(); const canvas = app.show(pair('A short answer.'), { url: 'https://cubxxw.com/' + 'a'.repeat(1600) });
  const modules = canvas.operations.filter(op => op.type === 'rect' && op.color === '#111111');
  const plate = canvas.operations.find(op => op.type === 'rect' && op.color === '#ffffff' && op.width === op.height && op.width > 100);
  assert.ok(modules.every(op => op.x + op.width <= plate.x + plate.width - op.width * 4 && op.y + op.height <= plate.y + plate.height - op.height * 4));
  if (!modules.length) assert.ok(!/扫码|Scan/.test(printed(canvas)));
});

test('legacy Markdown links retain their destinations and plain arithmetic keeps its symbols', async () => {
  const app = browser({ lang: 'en' });
  const canvas = app.show(pair('See [official guide](https://example.com/docs).\n\nThe expression 2*3*4 remains exact.', 'What does it mean?'));
  assert.match(printed(canvas), /https:\/\/example\.com\/docs/);
  assert.match(printed(canvas), /2\*3\*4/);
  app.click('csb-copy-text'); await Promise.resolve();
  assert.match(app.records.text[0], /https:\/\/example\.com\/docs/);
  assert.match(app.records.text[0], /2\*3\*4/);
});
