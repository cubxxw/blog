#!/usr/bin/env node
// Generate AI cover images for posts that have no `cover.image`, then write the
// path back into front matter.
//
// Two-stage by design: an LLM that is good at READING (Claude, in the session
// driving this script) turns the post's metadata into one concrete scene, and
// the image model — which is good at PAINTING a described scene but poor at
// inventing metaphors — receives only that scene via --scene. Without --scene
// the script falls back to handing title+description to the image model
// directly, which works but drifts toward stock tech clichés.
//
// Usage:
//   node scripts/generate-covers.mjs                        # dry-run: list targets + prompts
//   node scripts/generate-covers.mjs --write --limit 3      # generate 3, write files + front matter
//   node scripts/generate-covers.mjs --write --file content/zh/growth/posts/x.md \
//       --scene "清晨的长桌上，几条细流汇入一只敞开的木匣……"
//   node scripts/generate-covers.mjs --provider gemini --write --limit 1
//   node scripts/generate-covers.mjs --write --file <path> --force --variants 3   # 3 candidates, pick by eye
//
// Requires ARK_API_KEY (doubao, default) or GEMINI_API_KEY (gemini).

import { readFileSync, writeFileSync, mkdirSync, existsSync, globSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROVIDERS, PROVIDER_NAMES } from './lib/cover-providers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const flag = (name) => argv.includes(`--${name}`);
  const value = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
  };
  return {
    write: flag('write'),
    force: flag('force'),
    provider: value('provider', 'doubao'),
    file: value('file'),
    limit: Number(value('limit', '0')) || 0,
    scene: value('scene'),
    variants: Math.min(Math.max(Number(value('variants', '1')) || 1, 1), 4),
    seed: value('seed') !== null ? Number(value('seed')) : null,
  };
}

// Only the CLI entry point reads argv or exits; importing this module (see
// generate-covers.test.mjs) must have no side effects.
const IS_CLI = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
const args = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------- prompts
//
// Two lessons drive the shape of these prompts, both paid for in bad images:
//
// 1. Anything concrete IN the prompt is something the model may literally draw.
//    Listing "MCP, RSS" as themes produced misspelled labels; spelling out the
//    site palette by hex code produced a swatch chart with the codes drawn on
//    it. So the image prompt carries no jargon, no colours, no hex codes.
//
// 2. Anything conceptual LEFT TO the image model regresses to its priors.
//    "读懂这篇文章，画出贴合主题的画面" hands the metaphor-invention step to a
//    model optimised for rendering, not reading — for abstract topics it falls
//    back on circuits, glowing nodes, blue gradients. So the reading is done
//    upstream (buildScenePrompt → Claude/an LLM → one concrete scene) and the
//    image model is asked only to paint a scene already described.
//
// The style anchor is fixed and identical across every cover so the set coheres:
// medium + colour discipline + composition, no named colours, no hex. The
// composition clause keeps the upper region calm so the image survives being
// cropped or overlaid in share cards.

const STYLE_LINE =
  '风格：扁平的杂志编辑插画，低饱和，整幅画面不超过四种颜色，大面积留白，带细腻的纸纹质感。' +
  '横构图，主体偏下，上方留出安静的空间。';

// Audience targeting, per section. A cover is a share card first: it should
// signal to its own audience what kind of content sits behind the link — a
// tech essay whose cover reads as a lifestyle vignette loses exactly the
// reader it was written for. The differentiation lives in WHAT the scene is
// made of (material vocabulary, stage 1) and one temperament clause (stage 2)
// — never in colours or palettes; the per-section colour table was tried once
// and produced the cyber-tunnel failure.
const SECTIONS = {
  'ai-agent': {
    audience: '面向工程师与 AI 从业者的技术文章',
    material: '画面取材于精密的器物与装置：仪器、工作台、图纸、传送与分拣的机构、模块化的构件',
    mood: '画面气质理性、精确、现代。',
  },
  engineering: {
    audience: '面向工程师的工程实践文章',
    material: '画面取材于工程现场与图纸世界：蓝图、脚手架、管线、桥梁、机械结构',
    mood: '画面气质扎实、精确、克制。',
  },
  growth: {
    audience: '面向普通读者的成长与生活随笔',
    material: '画面取材于自然与日常：房间、桌面、器物、植物、山径与光线',
    mood: '画面气质安静、温和。',
  },
  projects: {
    audience: '面向潜在用户的产品与项目介绍',
    material: '画面像一张产品海报：单一主体的静物陈列，干净的背景，主体被精心呈现',
    mood: '画面气质利落、聚焦。',
  },
};

// Positive definition first ("画面为纯图形与图像构成"), negative list as backup —
// bare negations in diffusion prompts occasionally inject the very thing named.
const CANVAS_LINE =
  '画面为纯图形与图像构成：不出现任何文字、字母、数字、logo、水印，也不出现人脸。';

// Stage 1 — the comprehension step. This prompt is answered by the LLM driving
// the script (printed on dry-run for single files), and its one-line answer is
// what --scene carries into stage 2. The cliché blacklist exists because these
// are precisely the priors an image model reaches for on abstract tech topics.
export function buildScenePrompt({ title, description, section }) {
  const meta = [title && `标题：${title}`, description && `摘要：${description}`]
    .filter(Boolean)
    .join('\n');
  const brief = SECTIONS[section];

  return [
    '根据这篇文章的标题和摘要，为封面插画设计一个视觉隐喻。',
    '',
    meta,
    '',
    ...(brief ? [`这是一篇${brief.audience}。${brief.material}。`] : []),
    '用一到两句话描述一个具体画面：有什么物体、什么样的构图。必须是具象的、可以直接画出来的场景。',
    '禁止科技陈词滥调：电路、发光、机器人、大脑、齿轮、网络节点图。',
    '只输出画面描述本身，不要解释。',
  ].join('\n');
}

// Stage 2 — the painting step. With a scene, the image model gets no metadata
// at all (jargon can't leak into the canvas if it never arrives). Without one,
// title+description pass through as a fallback — tags and keywords never do;
// they add no comprehension and are the densest source of drawable jargon.
export function buildPrompt({ title, description, scene, section }) {
  const brief = SECTIONS[section];
  const style = brief ? `${STYLE_LINE}${brief.mood}` : STYLE_LINE;

  if (scene) {
    return [
      '为一篇博客文章画封面插画。',
      '',
      `画面：${scene}`,
      '',
      style,
      CANVAS_LINE,
    ].join('\n');
  }

  const meta = [title && `标题：${title}`, description && `摘要：${description}`]
    .filter(Boolean)
    .join('\n');

  return [
    '根据下面这篇博客文章的标题和摘要，为它画一张封面插画。',
    '',
    meta,
    '',
    ...(brief ? [`这是一篇${brief.audience}。${brief.material}。`] : []),
    '读懂文章在讲什么，画一个贴合主题的具体画面。以上信息只用于理解主题。',
    style,
    CANVAS_LINE,
  ].join('\n');
}

// ---------------------------------------------------------------- front matter
//
// Deliberately regex-based rather than a YAML dependency, matching the approach
// in normalize-tags.mjs: parse only the fields needed and rewrite surgically,
// so untouched formatting (block scalars, quote styles, comments) survives.
//
// These are exported for scripts/generate-covers.test.mjs — this rewrite runs
// across every post in content/, so its edge cases are worth pinning down.

export function splitFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? { fm: m[1], body: text.slice(m[0].length), raw: m[0] } : null;
}

export function scalar(fm, key) {
  // Block scalars first: `key: >` / `key: |` (with optional chomping indicator
  // and trailing spaces) followed by an indented block. Checking these before
  // the inline form keeps a bare `>` from being mistaken for the value.
  const block = fm.match(new RegExp(`^${key}:[ \\t]*[>|][-+]?[ \\t]*\\n((?:[ \\t]+.*\\n?)+)`, 'm'));
  if (block) return block[1].split('\n').map((l) => l.trim()).filter(Boolean).join(' ').trim();
  // Inline: key: value | key: 'value' | key: "value"
  const inline = fm.match(new RegExp(`^${key}:[ \\t]*(.+)$`, 'm'));
  if (inline) {
    const v = inline[1].trim().replace(/^["']|["']$/g, '').trim();
    return v === '' ? null : v;
  }
  return null;
}

export function list(fm, key) {
  const inline = fm.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, 'm'));
  if (inline) {
    return inline[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  const block = fm.match(new RegExp(`^${key}:\\s*\\n((?:\\s*-\\s+.*\\n?)+)`, 'm'));
  if (block) {
    return block[1]
      .split('\n')
      .map((l) => l.replace(/^\s*-\s+/, '').trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return [];
}

export function hasCover(fm) {
  const block = fm.match(/^cover:\s*\n((?:\s+.*\n?)+)/m);
  return Boolean(block && /^\s+image:\s*\S/m.test(block[1]));
}


// Insert or replace the cover block. Existing sibling keys (alt, caption,
// hidden) are preserved when only `image:` needs updating.
export function setCover(fm, imagePath, alt) {
  const escapedAlt = String(alt).replace(/"/g, '\\"');
  const blockMatch = fm.match(/^cover:\s*\n((?:[ \t]+.*\n?)+)/m);

  if (blockMatch) {
    let block = blockMatch[1];
    block = /^[ \t]+image:/m.test(block)
      ? block.replace(/^([ \t]+)image:.*$/m, `$1image: ${imagePath}`)
      : `  image: ${imagePath}\n` + block;
    if (!/^[ \t]+alt:/m.test(block)) block += `  alt: "${escapedAlt}"\n`;
    return fm.replace(blockMatch[0], `cover:\n${block}`);
  }
  return `${fm}\ncover:\n  image: ${imagePath}\n  alt: "${escapedAlt}"`;
}

// ---------------------------------------------------------------- targets

function slugOf(path) {
  return path.split('/').pop().replace(/\.md$/, '');
}

function collectTargets() {
  const files = args.file
    ? [args.file]
    : globSync('content/{zh,en}/{ai-agent,engineering,growth,projects}/**/*.md', { cwd: ROOT });

  const targets = [];
  for (const rel of files.sort()) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      console.error(`  ! not found: ${rel}`);
      continue;
    }
    const stem = slugOf(rel);
    if (stem === '_index' || stem === 'index') continue;

    const text = readFileSync(abs, 'utf8');
    const parsed = splitFrontMatter(text);
    if (!parsed) continue;
    if (String(scalar(parsed.fm, 'draft')).toLowerCase() === 'true') continue;
    if (hasCover(parsed.fm) && !args.force) continue;

    const title = scalar(parsed.fm, 'title');
    if (!title) continue;

    const parts = rel.split('/');
    targets.push({
      rel,
      abs,
      text,
      fm: parsed.fm,
      lang: parts[1],
      section: parts[2],
      slug: stem,
      title,
      description: scalar(parsed.fm, 'description') ?? '',
      tags: list(parsed.fm, 'tags'),
      date: scalar(parsed.fm, 'date') ?? '',
      keywords: list(parsed.fm, 'keywords'),
    });
  }
  return args.limit ? targets.slice(0, args.limit) : targets;
}

// ---------------------------------------------------------------- main

async function main() {
  const provider = PROVIDERS[args.provider];
  const targets = collectTargets();

  if (targets.length === 0) {
    console.log('Nothing to do — every matching post already has a cover.');
    return;
  }

  console.log(
    `${targets.length} post(s) without a cover · provider: ${args.provider} · ` +
      `${args.write ? 'WRITE' : 'DRY-RUN (pass --write to generate)'}\n`,
  );

  // zh/en pairs of the same article share one image: same slug, same section,
  // same meaning. Generating twice would cost double and, worse, hand the two
  // language versions visually unrelated covers.
  const cache = new Map();
  let generated = 0;
  let failed = 0;

  for (const t of targets) {
    const year = (t.date.match(/^(\d{4})/) ?? [])[1] ?? 'undated';
    const key = `${t.section}/${t.slug}`;
    const dirRel = `static/images/covers/${t.section}/${year}`;
    const fileRel = `${dirRel}/${t.slug}.${provider.ext}`;
    const publicPath = `/images/covers/${t.section}/${year}/${t.slug}.${provider.ext}`;
    // --scene applies to exactly one article, so it only rides with --file.
    const scene = args.file ? args.scene : null;
    const prompt = buildPrompt({ ...t, scene });

    console.log(`── ${t.rel}`);
    console.log(`   ${t.title}`);

    if (!args.write) {
      console.log(`   → ${publicPath}`);
      console.log(`   image prompt [${scene ? 'scene' : 'fallback'}]: ${prompt}\n`);
      if (args.file && !scene) {
        console.log(`   —— stage-1 scene prompt (answer this, then rerun with --scene "<答案>") ——`);
        console.log(`   ${buildScenePrompt(t).replace(/\n/g, '\n   ')}\n`);
      }
      continue;
    }

    try {
      if (cache.has(key)) {
        console.log(`   ↻ reusing image from ${cache.get(key)}`);
      } else if (existsSync(join(ROOT, fileRel)) && !args.force) {
        console.log('   ↻ image already on disk (use --force to regenerate)');
        cache.set(key, t.rel);
      } else {
        // Same-prompt variance dwarfs prompt-tweak gains, so cheap candidates
        // beat re-prompting: v2+ land beside the primary as <slug>.v2.jpeg etc.
        // Keep the best (renamed to <slug>.jpeg if needed), delete the rest.
        for (let v = 1; v <= args.variants; v++) {
          const variantRel = v === 1 ? fileRel : `${dirRel}/${t.slug}.v${v}.${provider.ext}`;
          const seed = args.seed !== null ? args.seed + (v - 1) : undefined;
          const buf = await provider.generate({ prompt, aspect: 'wide', seed });
          mkdirSync(join(ROOT, dirRel), { recursive: true });
          writeFileSync(join(ROOT, variantRel), buf);
          generated++;
          console.log(`   ✓ ${variantRel} (${(buf.length / 1024).toFixed(0)} KB)`);
        }
        cache.set(key, t.rel);
      }

      const updatedFm = setCover(t.fm, publicPath, t.title);
      writeFileSync(t.abs, t.text.replace(t.fm, updatedFm));
      console.log(`   ✓ front matter → cover.image: ${publicPath}\n`);
    } catch (err) {
      failed++;
      console.error(`   ✗ ${err.message}\n`);
    }
  }

  if (args.write) {
    console.log(`Done. ${generated} image(s) generated, ${failed} failed.`);
    if (generated > 0) {
      console.log('Review the images before committing — generated art needs a human eye.');
    }
  }
  if (failed > 0) process.exitCode = 1;
}

if (IS_CLI) {
  if (!PROVIDER_NAMES.includes(args.provider)) {
    console.error(`Unknown provider "${args.provider}". Available: ${PROVIDER_NAMES.join(', ')}`);
    process.exit(1);
  }
  if (args.scene && !args.file) {
    console.error('--scene describes one article and requires --file <path>.');
    process.exit(1);
  }
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
