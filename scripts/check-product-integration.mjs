import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputRoot = process.env.PRODUCT_BUILD_DIR
  ? path.resolve(root, process.env.PRODUCT_BUILD_DIR)
  : path.join(root, "public");
const routes = [
  {
    file: path.join(outputRoot, "projects", "index.html"),
    required: [
      "Products are where ideas meet reality.",
      "Talent Signal",
      "In testing",
      "What this cycle tests",
      "Boundary",
      "https://gettalentsignal.com",
      "https://gettalentsignal.com/demo",
      "https://github.com/getyak/talent-signal",
    ],
  },
  {
    file: path.join(outputRoot, "zh", "projects", "index.html"),
    required: [
      "产品，是判断接受现实检验的地方。",
      "Talent Signal",
      "测试中",
      "这一轮正在验证",
      "边界",
      "https://gettalentsignal.com",
      "https://gettalentsignal.com/demo",
      "https://github.com/getyak/talent-signal",
    ],
  },
];

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const failures = [];

for (const route of routes) {
  let html = "";
  try {
    html = await readFile(route.file, "utf8");
  } catch {
    failures.push(`missing rendered route: ${path.relative(root, route.file)}`);
    continue;
  }

  for (const value of route.required) {
    if (!html.includes(value)) {
      failures.push(`${path.relative(root, route.file)} is missing: ${value}`);
    }
  }

  const text = visibleText(html);
  if (/[—–]/u.test(text)) {
    failures.push(`${path.relative(root, route.file)} contains a visible em/en dash`);
  }

  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) {
    failures.push(`${path.relative(root, route.file)} must render exactly one h1, found ${h1Count}`);
  }

  if (/role=["']progressbar["']/i.test(html) || /osx-progress/i.test(html)) {
    failures.push(`${path.relative(root, route.file)} still renders decorative completion scoring`);
  }
}

const screenshot = path.join(root, "static", "images", "products", "talent-signal.jpg");
try {
  const info = await stat(screenshot);
  if (info.size > 180_000) {
    failures.push(`Talent Signal screenshot exceeds 180 KB: ${info.size} bytes`);
  }
} catch {
  failures.push("missing real Talent Signal product screenshot");
}

if (failures.length > 0) {
  console.error("Product integration check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Product integration check passed for English and Chinese routes.");
