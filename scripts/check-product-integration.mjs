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
      "BEAR OS",
      "Product Lab",
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
      "BEAR OS",
      "Product Lab",
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

  if (!/data-product-view=(?:"bear"|'bear'|bear)(?:\s|>)/i.test(html)) {
    failures.push(`${path.relative(root, route.file)} must declare BEAR OS as the default view`);
  }

  const bearPanel = html.match(/<section\b[^>]*data-product-panel=(?:"bear"|'bear'|bear)(?:\s|>)[^>]*>/i)?.[0];
  if (!bearPanel || /\shidden(?:\s|=|>)/i.test(bearPanel)) {
    failures.push(`${path.relative(root, route.file)} must render BEAR OS as the default visible panel`);
  }

  const labPanel = html.match(/<section\b[^>]*data-product-panel=(?:"lab"|'lab'|lab)(?:\s|>)[^>]*>/i)?.[0];
  if (!labPanel || !/\shidden(?:\s|=|>)/i.test(labPanel)) {
    failures.push(`${path.relative(root, route.file)} must render Product Lab as the switchable secondary panel`);
  }

  const viewButtons = html.match(/data-product-view-button=(?:"(?:bear|lab)"|'(?:bear|lab)'|(?:bear|lab))(?:\s|>)/gi) ?? [];
  if (viewButtons.length !== 2) {
    failures.push(`${path.relative(root, route.file)} must render exactly two product view controls`);
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
