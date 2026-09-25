/* ============================================================
   bear-knowledge-space.js — explorable BEAR knowledge space
   ------------------------------------------------------------
   Entered from Product Lab only. Dynamically imported so article
   pages never pay for this module.

   Tiers (automatic, no settings UI):
     webgpu  — navigator.gpu + fine pointer + wide + motion ok
     canvas  — Canvas2D + motion ok
     static  — reduced-motion, no canvas, tiny screens, or any
               init failure (HTML list remains fully usable)

   The field is decoration. Nodes, cards, filters, and return are
   ordinary DOM so keyboard, touch, and copy stay predictable.
   Page scroll is never hijacked.
   ============================================================ */

const TIER_LABEL = {
  webgpu: { zh: 'WebGPU 粒子场', en: 'WebGPU particle field' },
  canvas: { zh: 'Canvas 粒子场', en: 'Canvas particle field' },
  static: { zh: '静态星图', en: 'Static map' },
};

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clampDPR(max = 2) {
  return Math.min(window.devicePixelRatio || 1, max);
}

/** A stable seven-position atlas. Writing uses a separate readable index. */
function layoutNodes(nodes, width, height) {
  const positions = [
    [0.48, 0.48], [0.75, 0.22], [0.79, 0.69], [0.52, 0.79],
    [0.20, 0.70], [0.17, 0.28], [0.46, 0.17],
  ];
  let productIndex = 0;
  return nodes.map((node) => {
    if (node.kind !== 'product') return { ...node, x: 0, y: 0, r: 4 };
    const [nx, ny] = positions[productIndex % positions.length];
    productIndex += 1;
    return { ...node, x: nx * width, y: ny * height, r: 7 };
  });
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return [0.72, 0.44, 0.12];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function mixRgb(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function rgbCss(rgb, alpha = 1) {
  return `rgba(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)}, ${alpha})`;
}

function readPalette(root) {
  const styles = getComputedStyle(root);
  const ink = styles.getPropertyValue('--bks-ink').trim() || '#221f1b';
  const amber = styles.getPropertyValue('--bks-amber').trim() || '#b96f1e';
  const glow = styles.getPropertyValue('--bks-glow').trim() || '#ffb454';
  const muted = styles.getPropertyValue('--bks-muted').trim() || '#6f6a61';
  return {
    ink: hexToRgb(ink),
    amber: hexToRgb(amber),
    glow: hexToRgb(glow),
    muted: hexToRgb(muted),
  };
}

function createPauseLoop(el, onFrame) {
  let raf = 0;
  let running = false;
  let onScreen = true;
  let last = 0;

  function tick(now) {
    if (!running) return;
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    onFrame(dt, now / 1000);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running || !onScreen || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const io = new IntersectionObserver(
    (entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start();
      else stop();
    },
    { threshold: 0.01 }
  );
  io.observe(el);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  return {
    start,
    stop,
    dispose() {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    },
    get running() {
      return running;
    },
  };
}

/* -------------------- Canvas 2D field -------------------- */

function mountCanvasField(host, paletteRef, state) {
  const canvas = document.createElement('canvas');
  canvas.className = 'bks__field';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    canvas.remove();
    return null;
  }

  const dpr = clampDPR();
  let width = 0;
  let height = 0;
  let particles = [];

  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(120, Math.max(36, (width * height) / 9000)));
    particles = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + (hashString(String(i)) % 20) / 20;
      const r = 0.15 + ((hashString(`p${i}`) % 100) / 100) * 0.75;
      return {
        x: width * (0.5 + Math.cos(a) * r * 0.55),
        y: height * (0.5 + Math.sin(a) * r * 0.5),
        vx: 0,
        vy: 0,
        s: 1 + (hashString(`s${i}`) % 3),
        phase: (hashString(`h${i}`) % 100) / 100,
      };
    });
    state.nodes = layoutNodes(state.nodes, width, height);
    state.onLayout(state.nodes);
    requestAnimationFrame(() => canvas.classList.add('is-ready'));
  }

  function frame(dt) {
    const amount = Math.min(1, dt * 5);
    for (const key of ['ink', 'amber', 'glow', 'muted']) {
      paletteRef.current[key] = mixRgb(paletteRef.current[key], paletteRef.target[key], amount);
    }
    const pal = paletteRef.current;
    ctx.clearRect(0, 0, width, height);

    // soft ambient dust
    for (const p of particles) {
      const dx = state.pointer.x - p.x;
      const dy = state.pointer.y - p.y;
      const dist = Math.hypot(dx, dy) || 1;
      const force = state.pointer.active ? Math.min(28 / dist, 0.55) : 0;
      p.vx += (dx / dist) * force * dt * 18;
      p.vy += (dy / dist) * force * dt * 18;
      p.vx += Math.sin(state.time * 0.35 + p.phase * 6) * dt * 1.2;
      p.vy += Math.cos(state.time * 0.28 + p.phase * 5) * dt * 1.2;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx;
      p.y += p.vy;

      const alpha = 0.12 + p.phase * 0.22;
      ctx.beginPath();
      ctx.fillStyle = rgbCss(p.phase > 0.72 ? pal.glow : pal.muted, alpha);
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    }

    // The canvas is ambience, not a source of inferred relationships.
    // Only the seven product anchors receive a visual highlight.
    const nodes = state.filter === 'all' || state.filter === 'product'
      ? state.nodes.filter((node) => node.kind === 'product') : [];
    for (const n of nodes) {
      const focused = n.id === state.focusId;
      const hovered = n.id === state.hoverId;
      const base = n.kind === 'product' ? pal.amber : pal.muted;
      const alpha = focused || hovered ? 0.85 : 0.45;
      const radius = (n.r || 5) * (focused || hovered ? 1.8 : 1);

      if (focused || hovered) {
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 6);
        glow.addColorStop(0, rgbCss(pal.glow, 0.28));
        glow.addColorStop(1, rgbCss(pal.glow, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius * 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.fillStyle = rgbCss(focused ? pal.glow : base, alpha);
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  resize();
  const loop = createPauseLoop(host, (dt, t) => {
    state.time = t;
    frame(dt);
  });
  loop.start();

  const ro = new ResizeObserver(() => resize());
  ro.observe(host);

  return {
    tier: 'canvas',
    dispose() {
      loop.dispose();
      ro.disconnect();
      canvas.remove();
    },
  };
}

/* -------------------- WebGPU field -------------------- */

const WGSL = /* wgsl */ `
struct Uniforms {
  time: f32,
  width: f32,
  height: f32,
  pointer: f32,
  px: f32,
  py: f32,
  pad0: f32,
  pad1: f32,
  ink: vec4f,
  amber: vec4f,
  glow: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) alpha: f32,
  @location(1) tint: f32,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var out: VSOut;
  // Three vertices must share one particle position. Using vi directly
  // creates the radial shards seen in the first prototype.
  let i = f32(vi / 3u);
  let count = 180.0;
  let ang = (i / count) * 6.2831853 + u.time * 0.012;
  let ring = 0.20 + fract(sin(i * 12.9898) * 43758.5453) * 0.67;
  var x = (0.5 + cos(ang) * ring * 0.52) * u.width;
  var y = (0.5 + sin(ang) * ring * 0.48) * u.height;
  x += sin(u.time * 0.20 + i * 0.17) * 3.0;
  y += cos(u.time * 0.16 + i * 0.13) * 3.0;

  // gentle pointer attraction
  let dx = u.px - x;
  let dy = u.py - y;
  let dist = max(sqrt(dx * dx + dy * dy), 1.0);
  let force = u.pointer * min(30.0 / dist, 0.7);
  x += (dx / dist) * force * 5.0;
  y += (dy / dist) * force * 5.0;

  // expand a small triangle per particle
  let vi2 = i32(vi % 3u);
  var ox = 0.0;
  var oy = 0.0;
  if (vi2 == 0) { ox = -1.0; oy = -1.0; }
  if (vi2 == 1) { ox = 1.0; oy = -1.0; }
  if (vi2 == 2) { ox = 0.0; oy = 1.1; }

  let ndc = vec2f(
    ((x + ox) / u.width) * 2.0 - 1.0,
    1.0 - ((y + oy) / u.height) * 2.0
  );
  out.pos = vec4f(ndc, 0.0, 1.0);
  out.alpha = 0.12 + 0.20 * fract(sin(i * 78.233) * 43758.5453);
  out.tint = fract(sin(i * 39.425) * 24634.6345);
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  let col = mix(u.ink.xyz, mix(u.amber.xyz, u.glow.xyz, in.tint), 0.75);
  return vec4f(col, in.alpha);
}
`;

async function mountWebGpuField(host, paletteRef, state) {
  if (!navigator.gpu) throw new Error('no-webgpu');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('no-adapter');
  const device = await adapter.requestDevice();
  const canvas = document.createElement('canvas');
  canvas.className = 'bks__field';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const context = canvas.getContext('webgpu');
  if (!context) {
    canvas.remove();
    throw new Error('no-webgpu-context');
  }

  const dpr = clampDPR(1.5);
  const format = navigator.gpu.getPreferredCanvasFormat();
  let width = 0;
  let height = 0;

  function resize() {
    width = host.clientWidth;
    height = host.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.configure({ device, format, alphaMode: 'premultiplied' });
    state.nodes = layoutNodes(state.nodes, width, height);
    state.onLayout(state.nodes);
    requestAnimationFrame(() => canvas.classList.add('is-ready'));
  }

  const module = device.createShaderModule({ code: WGSL });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs_main' },
    fragment: {
      module,
      entryPoint: 'fs_main',
      targets: [{ format, blend: {
        color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' },
        alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
      } }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const uniformBuffer = device.createBuffer({
    size: 80,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformData = new Float32Array(20);
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  resize();

  function frame(dt, t) {
    state.time = t;
    const target = paletteRef.target;
    const amount = Math.min(1, dt * 5);
    for (const key of ['ink', 'amber', 'glow', 'muted']) {
      paletteRef.current[key] = mixRgb(paletteRef.current[key], target[key], amount);
    }
    uniformData[0] = t;
    uniformData[1] = width;
    uniformData[2] = height;
    uniformData[3] = state.pointer.active ? 1 : 0;
    uniformData[4] = state.pointer.x;
    uniformData[5] = state.pointer.y;
    uniformData.set(paletteRef.current.ink, 8);
    uniformData.set(paletteRef.current.amber, 12);
    uniformData.set(paletteRef.current.glow, 16);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(180 * 3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  const loop = createPauseLoop(host, frame);
  loop.start();
  const ro = new ResizeObserver(() => resize());
  ro.observe(host);
  let disposed = false;
  device.lost.then((info) => {
    if (disposed || info.reason === 'destroyed') return;
    loop.dispose();
    ro.disconnect();
    canvas.remove();
    state.onGpuLost();
  });

  return {
    tier: 'webgpu',
    dispose() {
      disposed = true;
      loop.dispose();
      ro.disconnect();
      canvas.remove();
      try { device.destroy(); } catch (_) { /* already gone */ }
    },
  };
}

/* -------------------- DOM / interaction -------------------- */

function detectTier() {
  if (prefersReducedMotion()) return 'static';
  if (window.innerWidth < 720) return 'static';
  const fine = window.matchMedia('(pointer: fine)').matches;
  const wide = window.innerWidth >= 1024;
  if (navigator.gpu && fine && wide) return 'webgpu';
  try {
    const c = document.createElement('canvas');
    if (c.getContext('2d')) return 'canvas';
  } catch (_) {
    /* fall through */
  }
  return 'static';
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderDetail(root, node, isZh) {
  const label = root.querySelector('[data-bks-label]');
  const title = root.querySelector('[data-bks-title]');
  const meta = root.querySelector('[data-bks-meta]');
  const desc = root.querySelector('[data-bks-desc]');
  const open = root.querySelector('[data-bks-open]');
  const related = root.querySelector('[data-bks-related]');

  if (!node) {
    if (title) title.textContent = isZh ? '选择一个节点' : 'Pick a node';
    if (desc) {
      desc.textContent = isZh
        ? '点击星图上的产品或写作，查看它和这条产品线的关系。'
        : 'Click a product or piece of writing on the map to see how it sits on the line.';
    }
    if (open) open.hidden = true;
    if (related) related.innerHTML = '';
    return;
  }

  if (label) {
    label.textContent =
      node.kind === 'product'
        ? (isZh ? '产品' : 'Product')
        : node.kind === 'series'
          ? (isZh ? '系列' : 'Series')
          : (isZh ? '写作' : 'Writing');
  }
  if (title) title.textContent = node.title;
  if (meta) {
    const bits = [node.stage || node.date, node.clusterLabel || node.cluster].filter(Boolean);
    meta.textContent = bits.join(' · ');
  }
  if (desc) desc.textContent = node.desc || '';
  if (open) {
    open.hidden = !node.url;
    if (node.url) {
      open.href = node.url;
      const external = /^https?:/i.test(node.url);
      open.target = external ? '_blank' : '_self';
      if (external) open.rel = 'noopener';
      else open.removeAttribute('rel');
    }
  }

  if (related) {
    related.innerHTML = '';
    const items = node.relatedNodes || [];
    if (!items.length) {
      const empty = el('li', 'bks__empty-state');
      empty.appendChild(el('p', 'bks__empty', isZh ? '目前没有明确关联的文章。' : 'No explicit article connection yet.'));
      const browse = el('button', 'bks__browse-writing', isZh ? '浏览全部写作 →' : 'Browse all writing →');
      browse.type = 'button';
      empty.appendChild(browse);
      related.appendChild(empty);
      return;
    }
    items.slice(0, 5).forEach((item) => {
      const li = el('li');
      const a = el('a');
      a.href = item.url;
      if (/^https?:/i.test(item.url)) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      const span = el('span', '', item.title);
      const mark = el('b', '', item.kind === 'product' ? (isZh ? '产品' : 'Product') : (isZh ? '文章' : 'Post'));
      a.appendChild(span);
      a.appendChild(mark);
      li.appendChild(a);
      related.appendChild(li);
    });
  }
}

/**
 * Mount the knowledge space into a host element.
 * @param {HTMLElement} host
 * @param {{ nodes: Array, isZh: boolean, onExit?: () => void }} data
 */
export async function mountKnowledgeSpace(host, data) {
  const isZh = !!data.isZh;
  const nodesRaw = Array.isArray(data.nodes) ? data.nodes : [];

  const state = {
    nodes: nodesRaw.map((n) => ({ ...n, x: 0, y: 0, r: 5 })),
    filter: 'all',
    focusId: nodesRaw[0] ? nodesRaw[0].id : null,
    hoverId: null,
    pointer: { x: 0, y: 0, active: false },
    time: 0,
    onLayout: () => {},
  };

  // Resolve edge ids to neighbour node objects for the detail card.
  const byId = {};
  state.nodes.forEach((n) => {
    byId[n.id] = n;
  });
  state.nodes.forEach((n) => {
    n.relatedNodes = (n.edges || [])
      .map((id) => byId[id])
      .filter(Boolean);
  });

  const paletteRef = { current: readPalette(host), target: readPalette(host) };

  // ---- static HTML shell (always present first) ----
  host.innerHTML = '';
  host.hidden = false;

  const top = el('div', 'bks__top');
  const titles = el('div', 'bks__titles');
  titles.appendChild(el('p', 'bks__kicker', isZh ? 'BEAR 知识空间' : 'BEAR knowledge space'));
  titles.appendChild(el('h2', 'bks__title', isZh ? '产品与写作如何连成一条线' : 'How products and writing form one line'));
  titles.appendChild(el('p', 'bks__lede', isZh
    ? '沿着产品线浏览真实文章与项目。点击节点查看详情，继续打开原文。'
    : 'Walk the product line through real posts and projects. Click a node for detail, then open the source.'));
  top.appendChild(titles);

  const actions = el('div', 'bks__top-actions');
  const tierBadge = el('div', 'bks__tier');
  tierBadge.dataset.tier = 'static';
  const tierDot = el('span', 'bks__tier-dot');
  const tierText = el('span', '', TIER_LABEL.static[isZh ? 'zh' : 'en']);
  tierBadge.appendChild(tierDot);
  tierBadge.appendChild(tierText);
  const backBtn = el('button', 'bks__back', isZh ? '返回 Product Lab' : 'Back to Product Lab');
  backBtn.type = 'button';
  actions.appendChild(tierBadge);
  actions.appendChild(backBtn);
  top.appendChild(actions);
  host.appendChild(top);

  const filters = el('div', 'bks__filters');
  const filterDefs = [
    ['all', isZh ? '全部' : 'All'],
    ['product', `${isZh ? '产品' : 'Products'} ${state.nodes.filter((n) => n.kind === 'product').length}`],
    ['writing', `${isZh ? '写作' : 'Writing'} ${state.nodes.filter((n) => n.kind === 'writing').length}`],
    ['series', `${isZh ? '系列' : 'Series'} ${state.nodes.filter((n) => n.kind === 'series').length}`],
  ];
  const filterButtons = filterDefs.map(([key, text]) => {
    const btn = el('button', 'bks__filter', text);
    btn.type = 'button';
    btn.dataset.filter = key;
    btn.setAttribute('aria-pressed', String(key === 'all'));
    filters.appendChild(btn);
    return btn;
  });
  host.appendChild(filters);

  const body = el('div', 'bks__body');
  const stageWrap = el('div', 'bks__stage-wrap');
  stageWrap.dataset.filter = 'all';
  const stage = el('div', 'bks__stage');
  stage.dataset.filter = 'all';
  const nodeList = el('ul', 'bks__nodes');
  stageWrap.appendChild(stage);
  stageWrap.appendChild(nodeList);
  body.appendChild(stageWrap);

  const panel = el('aside', 'bks__panel');
  panel.setAttribute('aria-live', 'polite');
  panel.appendChild(el('p', 'bks__panel-label', isZh ? '当前节点' : 'Focused node'));
  const panelTitle = el('h3', 'bks__panel-title');
  panelTitle.dataset.bksTitle = '';
  panel.appendChild(panelTitle);
  const panelMeta = el('p', 'bks__panel-meta');
  panelMeta.dataset.bksMeta = '';
  panel.appendChild(panelMeta);
  const panelDesc = el('p', 'bks__panel-desc');
  panelDesc.dataset.bksDesc = '';
  panel.appendChild(panelDesc);

  const actionsRow = el('div', 'bks__panel-actions');
  const openLink = el('a', 'bks__open', isZh ? '打开' : 'Open');
  openLink.dataset.bksOpen = '';
  openLink.hidden = true;
  actionsRow.appendChild(openLink);
  panel.appendChild(actionsRow);

  panel.appendChild(el('p', 'bks__panel-label', isZh ? '相邻条目' : 'Neighbours'));
  const related = el('ul', 'bks__related');
  related.dataset.bksRelated = '';
  panel.appendChild(related);
  body.appendChild(panel);
  host.appendChild(body);

  // Hidden label target used by renderDetail (keeps query stable).
  const hiddenLabel = el('p', 'bks__panel-label');
  hiddenLabel.hidden = true;
  hiddenLabel.dataset.bksLabel = '';
  panel.insertBefore(hiddenLabel, panelTitle);

  host.appendChild(el('p', 'bks__status', isZh
    ? '提示：Tab 浏览节点，Enter 打开，Esc 返回 Product Lab。页面滚动始终可用。'
    : 'Tip: Tab through nodes, Enter opens, Esc returns to Product Lab. Page scroll stays normal.'));

  // ---- node chips ----
  function chipLabel(n) {
    if (n.kind === 'product') {
      return n.mark ? `${n.mark} ${n.shortTitle || n.title}` : (n.shortTitle || n.title);
    }
    return n.title;
  }

  function rebuildNodeChips() {
    const focusedId = nodeList.contains(document.activeElement)
      ? document.activeElement.dataset.nodeId : null;
    nodeList.innerHTML = '';
    const visible = state.nodes.filter((n) =>
      state.filter === 'all' ? n.kind === 'product' : n.kind === state.filter
    );
    visible.forEach((n, index) => {
      const li = el('li', 'bks__node');
      li.dataset.index = String(index + 1).padStart(2, '0');
      if (n.kind === 'product') {
        li.style.left = `${n.x}px`;
        li.style.top = `${n.y}px`;
      }
      const kindClass = n.kind === 'product' ? ' bks__chip--product' : n.kind === 'series' ? ' bks__chip--series' : ' bks__chip--writing';
      const btn = el('button', `bks__chip${kindClass}`);
      btn.type = 'button';
      btn.dataset.nodeId = n.id;
      btn.textContent = chipLabel(n);
      btn.title = n.title;
      btn.setAttribute('aria-pressed', String(n.id === state.focusId));
      btn.setAttribute('aria-label', n.title);
      if (n.id === state.focusId || n.id === state.hoverId) btn.classList.add('is-active');
      if (n.id === state.focusId) btn.classList.add('is-focus');
      li.appendChild(btn);
      nodeList.appendChild(li);
    });
    if (focusedId) {
      const successor = Array.from(nodeList.querySelectorAll('[data-node-id]'))
        .find((button) => button.dataset.nodeId === focusedId);
      if (successor) successor.focus({ preventScroll: true });
    }
  }

  function applyFilter(next) {
    state.filter = next;
    stage.dataset.filter = next;
    stageWrap.dataset.filter = next;
    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === next)));
    const visible = state.nodes.filter((n) => next === 'all' ? n.kind === 'product' : n.kind === next);
    if (!visible.some((n) => n.id === state.focusId)) state.focusId = visible[0] ? visible[0].id : null;
    rebuildNodeChips();
    renderDetail(host, state.nodes.find((n) => n.id === state.focusId) || null, isZh);
  }

  function focusNode(id) {
    state.focusId = id;
    nodeList.querySelectorAll('[data-node-id]').forEach((button) => {
      const active = button.dataset.nodeId === id;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-focus', active);
      button.classList.toggle('is-active', active);
    });
    const node = state.nodes.find((n) => n.id === id) || null;
    renderDetail(host, node, isZh);
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  related.addEventListener('click', (event) => {
    if (!event.target.closest('.bks__browse-writing')) return;
    applyFilter('writing');
    const first = nodeList.querySelector('[data-node-id]');
    if (first) first.focus({ preventScroll: true });
  });

  nodeList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-node-id]');
    if (!btn) return;
    focusNode(btn.getAttribute('data-node-id'));
    btn.focus({ preventScroll: true });
  });

  nodeList.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const button = event.target.closest('[data-node-id]');
    if (!button) return;
    event.preventDefault();
    focusNode(button.dataset.nodeId);
    if (!openLink.hidden) openLink.click();
  });

  nodeList.addEventListener('pointerover', (event) => {
    const btn = event.target.closest('[data-node-id]');
    const id = btn ? btn.getAttribute('data-node-id') : null;
    state.hoverId = id;
    nodeList.querySelectorAll('.bks__chip').forEach((chip) => {
      const chipId = chip.getAttribute('data-node-id');
      chip.classList.toggle('is-active', chipId === state.focusId || chipId === id);
    });
  });
  nodeList.addEventListener('pointerout', () => {
    state.hoverId = null;
    nodeList.querySelectorAll('.bks__chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.getAttribute('data-node-id') === state.focusId);
    });
  });

  stageWrap.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    state.pointer.x = event.clientX - rect.left;
    state.pointer.y = event.clientY - rect.top;
    state.pointer.active = true;
  });
  stageWrap.addEventListener('pointerleave', () => {
    state.pointer.active = false;
  });

  backBtn.addEventListener('click', () => {
    if (typeof data.onExit === 'function') data.onExit();
  });

  // theme continuity: refresh palette + keep field colors warm
  const themeObserver = new MutationObserver(() => {
    paletteRef.target = readPalette(host);
  });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  // First paint of detail from real data (no waiting for GPU).
  state.onLayout = rebuildNodeChips;
  const initial = layoutNodes(state.nodes, stage.clientWidth || 640, stage.clientHeight || 360);
  state.nodes = initial;
  rebuildNodeChips();
  focusNode(state.focusId);

  // ---- field tier ----
  let field = null;
  let tier = 'static';
  const setTier = (next) => {
    tier = next;
    tierBadge.dataset.tier = next;
    tierText.textContent = TIER_LABEL[next][isZh ? 'zh' : 'en'];
  };
  const showStaticField = () => {
    const staticField = el('div', 'bks__field bks__field--static');
    staticField.setAttribute('aria-hidden', 'true');
    stage.prepend(staticField);
    requestAnimationFrame(() => staticField.classList.add('is-ready'));
  };
  state.onGpuLost = () => {
    try {
      field = mountCanvasField(stage, paletteRef, state);
      if (!field) showStaticField();
      setTier(field ? 'canvas' : 'static');
    } catch (_) {
      showStaticField();
      setTier('static');
    }
  };
  try {
    tier = detectTier();
    if (tier === 'webgpu') {
      try {
        field = await mountWebGpuField(stage, paletteRef, state);
      } catch (err) {
        console.warn('[bear-knowledge] webgpu failed, falling back', err);
        stage.querySelectorAll('canvas').forEach((canvas) => canvas.remove());
        tier = 'canvas';
        field = await mountCanvasField(stage, paletteRef, state);
        if (!field) { tier = 'static'; showStaticField(); }
      }
    } else if (tier === 'canvas') {
      field = await mountCanvasField(stage, paletteRef, state);
      if (!field) { tier = 'static'; showStaticField(); }
    } else {
      showStaticField();
    }
  } catch (err) {
    console.warn('[bear-knowledge] field init failed, using static', err);
    stage.querySelectorAll('canvas').forEach((canvas) => canvas.remove());
    tier = 'static';
    showStaticField();
  }

  setTier(tier);

  const onKeydown = (event) => {
    if (event.key === 'Escape' && !host.hidden) {
      event.preventDefault();
      if (typeof data.onExit === 'function') data.onExit();
    }
  };
  document.addEventListener('keydown', onKeydown);

  return {
    tier,
    setFocus: focusNode,
    dispose() {
      document.removeEventListener('keydown', onKeydown);
      themeObserver.disconnect();
      if (field && field.dispose) field.dispose();
      host.innerHTML = '';
    },
  };
}

export default { mountKnowledgeSpace };
