#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { tmpdir } from "node:os";

function usage() {
  console.error(
    "Usage: render-excalidraw.mjs <scene.excalidraw> [--svg preview.svg] [--png preview.png] [--size 2600]",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
if (!args.length || args[0].startsWith("-")) usage();

const inputPath = resolve(process.cwd(), args[0]);
let svgPath = inputPath.replace(/\.excalidraw$/, ".svg");
let pngPath = null;
let previewSize = 2600;

for (let index = 1; index < args.length; index += 1) {
  const flag = args[index];
  const value = args[index + 1];
  if (flag === "--svg" && value) {
    svgPath = resolve(process.cwd(), value);
    index += 1;
  } else if (flag === "--png" && value) {
    pngPath = resolve(process.cwd(), value);
    index += 1;
  } else if (flag === "--size" && value) {
    previewSize = Number(value);
    index += 1;
  } else {
    usage();
  }
}

const document = JSON.parse(await readFile(inputPath, "utf8"));
const elements = document.elements.filter((element) => !element.isDeleted);
if (!elements.length) throw new Error("Scene contains no visible elements.");

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function dashArray(element) {
  if (element.strokeStyle === "dashed") return "12 10";
  if (element.strokeStyle === "dotted") return "3 7";
  return "none";
}

function opacity(element) {
  return Math.max(0, Math.min(1, (element.opacity ?? 100) / 100));
}

function transform(element) {
  if (!element.angle) return "";
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  return ` transform="rotate(${(element.angle * 180) / Math.PI} ${centerX} ${centerY})"`;
}

function commonShapeStyle(element) {
  const fill =
    element.backgroundColor === "transparent"
      ? "none"
      : element.backgroundColor || "none";
  const stroke =
    element.strokeColor === "transparent"
      ? "none"
      : element.strokeColor || "#1f1f1d";
  return [
    `fill="${fill}"`,
    `stroke="${stroke}"`,
    `stroke-width="${element.strokeWidth ?? 1}"`,
    `stroke-dasharray="${dashArray(element)}"`,
    `stroke-linecap="round"`,
    `stroke-linejoin="round"`,
    `opacity="${opacity(element)}"`,
  ].join(" ");
}

function renderRectangle(element) {
  return `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="${element.roundness ? 8 : 0}" ${commonShapeStyle(element)}${transform(element)} />`;
}

function renderEllipse(element) {
  return `<ellipse cx="${element.x + element.width / 2}" cy="${element.y + element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" ${commonShapeStyle(element)}${transform(element)} />`;
}

function renderDiamond(element) {
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const points = [
    `${centerX},${element.y}`,
    `${element.x + element.width},${centerY}`,
    `${centerX},${element.y + element.height}`,
    `${element.x},${centerY}`,
  ].join(" ");
  return `<polygon points="${points}" ${commonShapeStyle(element)}${transform(element)} />`;
}

function absolutePoints(element) {
  return element.points.map(([x, y]) => [element.x + x, element.y + y]);
}

function arrowHead(points, color, atStart = false) {
  if (points.length < 2) return "";
  const tip = atStart ? points[0] : points.at(-1);
  const neighbor = atStart ? points[1] : points.at(-2);
  const angle = Math.atan2(tip[1] - neighbor[1], tip[0] - neighbor[0]);
  const length = 12;
  const width = 7;
  const baseX = tip[0] - length * Math.cos(angle);
  const baseY = tip[1] - length * Math.sin(angle);
  const left = [
    baseX + width * Math.cos(angle + Math.PI / 2),
    baseY + width * Math.sin(angle + Math.PI / 2),
  ];
  const right = [
    baseX + width * Math.cos(angle - Math.PI / 2),
    baseY + width * Math.sin(angle - Math.PI / 2),
  ];
  return `<polygon points="${tip[0]},${tip[1]} ${left[0]},${left[1]} ${right[0]},${right[1]}" fill="${color}" />`;
}

function renderLinear(element) {
  const points = absolutePoints(element);
  const color = element.strokeColor || "#1f1f1d";
  const polyline = `<polyline points="${points.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${element.strokeWidth ?? 1}" stroke-dasharray="${dashArray(element)}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity(element)}" />`;
  if (element.type !== "arrow") return polyline;
  return [
    polyline,
    element.startArrowhead ? arrowHead(points, color, true) : "",
    element.endArrowhead ? arrowHead(points, color, false) : "",
  ].join("");
}

function fontStack(fontFamily) {
  switch (fontFamily) {
    case 2:
      return '"Helvetica Neue", Helvetica, "PingFang SC", Arial, sans-serif';
    case 3:
      return '"Cascadia Code", "SFMono-Regular", Menlo, monospace';
    case 6:
      return 'Nunito, "PingFang SC", "Hiragino Sans GB", sans-serif';
    case 5:
    default:
      return 'Excalifont, Xiaolai, "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif';
  }
}

function renderText(element) {
  const lines = String(element.text).split("\n");
  const fontSize = element.fontSize ?? 16;
  const lineHeight = fontSize * (element.lineHeight ?? 1.2);
  const contentHeight = lineHeight * lines.length;
  const anchor =
    element.textAlign === "right"
      ? "end"
      : element.textAlign === "center"
        ? "middle"
        : "start";
  const x =
    element.textAlign === "right"
      ? element.x + element.width
      : element.textAlign === "center"
        ? element.x + element.width / 2
        : element.x;
  const startY =
    element.verticalAlign === "bottom"
      ? element.y + element.height - contentHeight + fontSize
      : element.verticalAlign === "middle"
        ? element.y + (element.height - contentHeight) / 2 + fontSize
        : element.y + fontSize;
  const weight =
    element.customData?.weight ??
    (/(^|[-_])(title|heading|section)([-_]|$)/i.test(element.id) ? 700 : 400);
  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="${x}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  return `<text fill="${element.strokeColor || "#1f1f1d"}" font-family='${fontStack(element.fontFamily)}' font-size="${fontSize}" font-weight="${weight}" text-anchor="${anchor}" opacity="${opacity(element)}"${transform(element)}>${tspans}</text>`;
}

function boundsFor(element) {
  if (
    ["arrow", "line", "freedraw"].includes(element.type) &&
    Array.isArray(element.points) &&
    element.points.length
  ) {
    const points = absolutePoints(element);
    return {
      minX: Math.min(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxX: Math.max(...points.map(([x]) => x)),
      maxY: Math.max(...points.map(([, y]) => y)),
    };
  }
  return {
    minX: element.x,
    minY: element.y,
    maxX: element.x + element.width,
    maxY: element.y + element.height,
  };
}

const rendered = elements
  .map((element) => {
    if (element.type === "rectangle" || element.type === "frame") {
      return renderRectangle(element);
    }
    if (element.type === "ellipse") return renderEllipse(element);
    if (element.type === "diamond") return renderDiamond(element);
    if (["arrow", "line", "freedraw"].includes(element.type)) {
      return renderLinear(element);
    }
    if (element.type === "text") return renderText(element);
    return "";
  })
  .join("\n");

const bounds = elements.map(boundsFor);
const minX = Math.min(...bounds.map((bound) => bound.minX));
const minY = Math.min(...bounds.map((bound) => bound.minY));
const maxX = Math.max(...bounds.map((bound) => bound.maxX));
const maxY = Math.max(...bounds.map((bound) => bound.maxY));
const padding = 32;
const width = maxX - minX + padding * 2;
const height = maxY - minY + padding * 2;
const viewX = minX - padding;
const viewY = minY - padding;
const background = document.appState?.viewBackgroundColor || "#faf9f7";

const svg = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${width} ${height}" width="${width}" height="${height}">`,
  `<rect x="${viewX}" y="${viewY}" width="${width}" height="${height}" fill="${background}" />`,
  rendered,
  "</svg>",
  "",
].join("\n");

await writeFile(svgPath, svg, "utf8");
console.log(`SVG ${svgPath}`);

if (pngPath) {
  const temporaryDirectory = await mkdtemp(
    resolve(tmpdir(), "excalidraw-architecture-"),
  );
  const temporarySvg = resolve(
    temporaryDirectory,
    `${basename(svgPath, extname(svgPath))}-square.svg`,
  );
  const quickLookPng = `${temporarySvg}.png`;
  const renderedPng = resolve(temporaryDirectory, "rendered.png");

  try {
    const squareSize = Math.max(width, height);
    const paddedSvg = svg
      .replace(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${width} ${height}" width="${width}" height="${height}">`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${squareSize} ${squareSize}" width="${squareSize}" height="${squareSize}">`,
      )
      .replace(
        `<rect x="${viewX}" y="${viewY}" width="${width}" height="${height}"`,
        `<rect x="${viewX}" y="${viewY}" width="${squareSize}" height="${squareSize}"`,
      );
    await writeFile(temporarySvg, paddedSvg, "utf8");

    const qlmanage = "/usr/bin/qlmanage";
    const magick = execFileSync("/usr/bin/which", ["magick"], {
      encoding: "utf8",
    }).trim();
    execFileSync(
      qlmanage,
      ["-t", "-s", String(previewSize), "-o", temporaryDirectory, temporarySvg],
      { stdio: "ignore" },
    );
    execFileSync(
      magick,
      [
        quickLookPng,
        "-fuzz",
        "1%",
        "-trim",
        "+repage",
        "-bordercolor",
        background,
        "-border",
        "24",
        renderedPng,
      ],
      { stdio: "ignore" },
    );
    await copyFile(renderedPng, pngPath);
    console.log(`PNG ${pngPath}`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
