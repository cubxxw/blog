import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = "static/images/columns/geo";
mkdirSync(outDir, { recursive: true });

const palette = {
  bg: "#f8fafc",
  ink: "#102033",
  muted: "#526173",
  grid: "#d7dee8",
  cyan: "#0891b2",
  blue: "#2563eb",
  green: "#059669",
  amber: "#d97706",
  red: "#b91c1c",
  violet: "#7c3aed",
};

const covers = [
  {
    slug: "series",
    zh: {
      kicker: "GEO COLUMN",
      title: "GEO 生成式引擎优化",
      subtitle: "当搜索从给链接变成给答案",
    },
    en: {
      kicker: "GEO COLUMN",
      title: "Generative Engine Optimization",
      subtitle: "When search stops giving links and starts giving answers",
    },
    accent: palette.blue,
    motif: "map",
  },
  {
    slug: "01-guide",
    zh: {
      kicker: "CHAPTER 01 · PILLAR",
      title: "GEO 完全指南",
      subtitle: "从 SEO 排名到 AI 引用的五层模型",
    },
    en: {
      kicker: "CHAPTER 01 · PILLAR",
      title: "GEO Complete Guide",
      subtitle: "The five-layer model from SEO ranking to AI citation",
    },
    accent: palette.cyan,
    motif: "layers",
  },
  {
    slug: "02-retrieval",
    zh: {
      kicker: "CHAPTER 02 · MECHANICS",
      title: "AI 如何检索、重排、引用",
      subtitle: "RAG 管线里的三道引用关卡",
    },
    en: {
      kicker: "CHAPTER 02 · MECHANICS",
      title: "How AI Retrieves and Cites",
      subtitle: "Three citation gates inside the RAG pipeline",
    },
    accent: palette.green,
    motif: "pipeline",
  },
  {
    slug: "03-structured",
    zh: {
      kicker: "CHAPTER 03 · TACTICS",
      title: "把每一段写成可引用",
      subtitle: "Answer-First、Schema 与主题集群",
    },
    en: {
      kicker: "CHAPTER 03 · TACTICS",
      title: "Make Every Paragraph Citable",
      subtitle: "Answer-First, Schema, and topic clusters",
    },
    accent: palette.violet,
    motif: "blocks",
  },
  {
    slug: "04-trust",
    zh: {
      kicker: "CHAPTER 04 · TRUST",
      title: "信任与站外背书",
      subtitle: "E-E-A-T、实体一致性与社区引用",
    },
    en: {
      kicker: "CHAPTER 04 · TRUST",
      title: "Trust and Endorsement",
      subtitle: "E-E-A-T, entity consistency, and community proof",
    },
    accent: palette.amber,
    motif: "constellation",
  },
  {
    slug: "05-case-study",
    zh: {
      kicker: "CHAPTER 05 · CASE STUDY",
      title: "本博客 GEO 改造复盘",
      subtitle: "用真实 GSC 与 PSI 数据跑五层模型",
    },
    en: {
      kicker: "CHAPTER 05 · CASE STUDY",
      title: "GEO Blog Rebuild Case Study",
      subtitle: "Running the five-layer model on real data",
    },
    accent: palette.red,
    motif: "dashboard",
  },
  {
    slug: "06-measurement",
    zh: {
      kicker: "CHAPTER 06 · MEASUREMENT",
      title: "GEO 度量与工具",
      subtitle: "被引率、声量份额与 DIY 监测",
    },
    en: {
      kicker: "CHAPTER 06 · MEASUREMENT",
      title: "GEO Measurement and Tools",
      subtitle: "Citation rate, share of voice, and DIY monitoring",
    },
    accent: palette.blue,
    motif: "radar",
  },
];

function esc(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function motif(kind, accent) {
  if (kind === "layers") {
    return `
      <g opacity="0.96">
        <rect x="770" y="156" width="260" height="64" rx="14" fill="${accent}" opacity="0.16"/>
        <rect x="730" y="244" width="320" height="64" rx="14" fill="${accent}" opacity="0.24"/>
        <rect x="690" y="332" width="380" height="64" rx="14" fill="${accent}" opacity="0.34"/>
        <rect x="650" y="420" width="440" height="64" rx="14" fill="${accent}" opacity="0.46"/>
        <path d="M650 452 H1090" stroke="${accent}" stroke-width="4"/>
      </g>`;
  }
  if (kind === "pipeline") {
    return `
      <g fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M670 190 H820 C880 190 880 270 940 270 H1070"/>
        <path d="M670 350 H800 C860 350 860 270 940 270"/>
        <circle cx="670" cy="190" r="24" fill="#fff"/>
        <circle cx="670" cy="350" r="24" fill="#fff"/>
        <circle cx="940" cy="270" r="34" fill="#fff"/>
        <circle cx="1070" cy="270" r="24" fill="#fff"/>
      </g>`;
  }
  if (kind === "blocks") {
    return `
      <g>
        ${[0, 1, 2, 3, 4].map((row) =>
          [0, 1, 2].map((col) => {
            const x = 690 + col * 126 + (row % 2) * 34;
            const y = 132 + row * 78;
            const op = 0.16 + row * 0.07 + col * 0.04;
            return `<rect x="${x}" y="${y}" width="96" height="48" rx="10" fill="${accent}" opacity="${op.toFixed(2)}"/>`;
          }).join("")
        ).join("")}
      </g>`;
  }
  if (kind === "constellation") {
    return `
      <g stroke="${accent}" stroke-width="3" fill="#fff">
        <path d="M720 380 L820 250 L930 320 L1030 180 L1060 420 L930 320 L820 250" fill="none" opacity="0.7"/>
        ${[[720,380,18],[820,250,24],[930,320,30],[1030,180,20],[1060,420,24]].map(([x,y,r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}
      </g>`;
  }
  if (kind === "dashboard") {
    return `
      <g>
        <rect x="672" y="128" width="414" height="330" rx="24" fill="#fff" stroke="${accent}" stroke-width="4"/>
        <path d="M712 378 C780 318 828 344 880 270 C936 190 994 206 1042 162" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
        <rect x="720" y="176" width="120" height="30" rx="8" fill="${accent}" opacity="0.18"/>
        <rect x="720" y="226" width="180" height="30" rx="8" fill="${accent}" opacity="0.24"/>
        <rect x="720" y="276" width="90" height="30" rx="8" fill="${accent}" opacity="0.32"/>
        <circle cx="1042" cy="162" r="13" fill="${accent}"/>
      </g>`;
  }
  if (kind === "radar") {
    return `
      <g transform="translate(890 302)" fill="none" stroke="${accent}" stroke-width="3">
        <circle r="56" opacity="0.28"/><circle r="112" opacity="0.28"/><circle r="168" opacity="0.28"/>
        <path d="M0 -172 V172 M-172 0 H172 M-122 -122 L122 122 M122 -122 L-122 122" opacity="0.22"/>
        <path d="M0 0 L118 -118" stroke-width="7" stroke-linecap="round"/>
        <circle cx="118" cy="-118" r="14" fill="${accent}" stroke="none"/>
      </g>`;
  }
  return `
    <g fill="none" stroke="${accent}" stroke-width="4">
      <path d="M660 380 C740 250 820 450 900 260 S1040 180 1090 340" opacity="0.85"/>
      <path d="M680 180 H1030 M720 250 H1070 M650 322 H990" opacity="0.36"/>
      <circle cx="746" cy="286" r="18" fill="#fff"/>
      <circle cx="894" cy="270" r="26" fill="#fff"/>
      <circle cx="1040" cy="230" r="18" fill="#fff"/>
    </g>`;
}

function svg({ lang, data, accent, motif: motifKind }) {
  const isZh = lang === "zh";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${esc(data.title)}</title>
  <desc id="desc">${esc(data.subtitle)}</desc>
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.13"/>
    </linearGradient>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M36 0H0v36" fill="none" stroke="${palette.grid}" stroke-width="1" opacity="0.46"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" rx="0" fill="${palette.bg}"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect x="42" y="42" width="1116" height="546" rx="34" fill="url(#fade)" stroke="${palette.grid}" stroke-width="2"/>
  <circle cx="1040" cy="110" r="180" fill="${accent}" opacity="0.08"/>
  <circle cx="1070" cy="540" r="120" fill="${accent}" opacity="0.08"/>
  ${motif(motifKind, accent)}
  <g>
    <text x="88" y="142" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="4" fill="${accent}">${esc(data.kicker)}</text>
    <text x="88" y="${isZh ? 250 : 242}" font-family="${isZh ? "'Noto Serif SC','PingFang SC','Microsoft YaHei',serif" : "Georgia,'Times New Roman',serif"}" font-size="${isZh ? 66 : 58}" font-weight="700" fill="${palette.ink}">
      ${wrap(data.title, isZh ? 11 : 23).map((line, idx) => `<tspan x="88" dy="${idx === 0 ? 0 : isZh ? 78 : 66}">${esc(line)}</tspan>`).join("")}
    </text>
    <text x="90" y="442" font-family="${isZh ? "'PingFang SC','Microsoft YaHei',Arial,sans-serif" : "Arial, sans-serif"}" font-size="${isZh ? 28 : 26}" font-weight="500" fill="${palette.muted}">
      ${wrap(data.subtitle, isZh ? 18 : 42).map((line, idx) => `<tspan x="90" dy="${idx === 0 ? 0 : 38}">${esc(line)}</tspan>`).join("")}
    </text>
    <rect x="90" y="516" width="260" height="4" rx="2" fill="${accent}"/>
    <text x="90" y="552" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="3" fill="${palette.muted}">CUBXXW · AI SEARCH</text>
  </g>
</svg>
`;
}

function wrap(text, max) {
  if (/[\u4e00-\u9fff]/.test(text)) {
    const lines = [];
    let line = "";
    for (const ch of text) {
      line += ch;
      if (line.length >= max) {
        lines.push(line);
        line = "";
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

for (const cover of covers) {
  for (const lang of ["zh", "en"]) {
    writeFileSync(
      join(outDir, `${lang}-${cover.slug}.svg`),
      svg({ lang, data: cover[lang], accent: cover.accent, motif: cover.motif }),
    );
  }
}
