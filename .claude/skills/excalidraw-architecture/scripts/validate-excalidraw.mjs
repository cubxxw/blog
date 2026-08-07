#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

function usage() {
  console.error(
    "Usage: validate-excalidraw.mjs <scene.excalidraw> [--png preview.png] [--min-font-size 14] [--require-text phrase]",
  );
  process.exit(2);
}

const args = process.argv.slice(2);
if (!args.length || args[0].startsWith("-")) usage();

const inputPath = resolve(process.cwd(), args[0]);
let pngPath = null;
let minimumFontSize = 14;
const requiredText = [];

for (let index = 1; index < args.length; index += 1) {
  const flag = args[index];
  const value = args[index + 1];
  if (flag === "--png" && value) {
    pngPath = resolve(process.cwd(), value);
    index += 1;
  } else if (flag === "--min-font-size" && value) {
    minimumFontSize = Number(value);
    index += 1;
  } else if (flag === "--require-text" && value) {
    requiredText.push(value);
    index += 1;
  } else {
    usage();
  }
}

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);
const hexPattern = /^#[0-9a-f]{6}$/i;

function luminance(hex) {
  const channels = hex
    .match(/[0-9a-f]{2}/gi)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4,
    );
  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  );
}

function contrast(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function boundsFor(element) {
  if (
    (element.type === "arrow" ||
      element.type === "line" ||
      element.type === "freedraw") &&
    Array.isArray(element.points) &&
    element.points.length
  ) {
    const points = element.points.map(([x, y]) => [
      element.x + x,
      element.y + y,
    ]);
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

function pngDimensions(buffer) {
  const signature = buffer.subarray(1, 4).toString("ascii");
  if (signature !== "PNG" || buffer.length < 24) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

let document;
try {
  document = JSON.parse(await readFile(inputPath, "utf8"));
} catch (error) {
  console.error(`FAIL ${inputPath}: ${error.message}`);
  process.exit(1);
}

if (document.type !== "excalidraw") fail("document.type must be excalidraw");
if (document.version !== 2) fail("document.version must be 2");
if (!Array.isArray(document.elements) || !document.elements.length) {
  fail("document.elements must be a non-empty array");
}
if (!document.appState || typeof document.appState !== "object") {
  fail("document.appState is required");
}

const elements = Array.isArray(document.elements) ? document.elements : [];
const ids = new Set();
const byId = new Map();

for (const element of elements) {
  if (!element || typeof element !== "object") {
    fail("every element must be an object");
    continue;
  }
  if (!element.id || typeof element.id !== "string") {
    fail("every element needs a string id");
    continue;
  }
  if (ids.has(element.id)) fail(`duplicate id: ${element.id}`);
  ids.add(element.id);
  byId.set(element.id, element);

  if (element.isDeleted) fail(`${element.id}: remove deleted elements`);
  for (const property of ["x", "y", "width", "height"]) {
    if (!isFiniteNumber(element[property])) {
      fail(`${element.id}: ${property} must be finite`);
    }
  }
  if (
    element.strokeStyle &&
    !["solid", "dashed", "dotted"].includes(element.strokeStyle)
  ) {
    fail(`${element.id}: invalid strokeStyle`);
  }
  if (
    element.roughness !== undefined &&
    (!isFiniteNumber(element.roughness) ||
      element.roughness < 0 ||
      element.roughness > 2)
  ) {
    fail(`${element.id}: roughness must be between 0 and 2`);
  }

  const phase = element.customData?.phase;
  const scopeBearing = !["text", "image"].includes(element.type);
  if (scopeBearing && phase === "later" && element.strokeStyle !== "dashed") {
    fail(`${element.id}: later elements must use dashed strokes`);
  }
  if (scopeBearing && phase === "v1" && element.strokeStyle !== "solid") {
    fail(`${element.id}: V1 elements must use solid strokes`);
  }

  if (element.type === "text") {
    if (typeof element.text !== "string" || !element.text.trim()) {
      fail(`${element.id}: text must not be blank`);
    }
    if (!isFiniteNumber(element.fontSize) || element.fontSize < minimumFontSize) {
      fail(
        `${element.id}: fontSize must be at least ${minimumFontSize}, got ${element.fontSize}`,
      );
    }
  }

  if (["arrow", "line", "freedraw"].includes(element.type)) {
    if (!Array.isArray(element.points) || element.points.length < 2) {
      fail(`${element.id}: linear elements need at least two points`);
    } else if (
      element.points.some(
        (point) =>
          !Array.isArray(point) ||
          point.length !== 2 ||
          !point.every(isFiniteNumber),
      )
    ) {
      fail(`${element.id}: points must contain finite [x, y] pairs`);
    } else {
      const first = element.points[0];
      const last = element.points.at(-1);
      if (first[0] === last[0] && first[1] === last[1]) {
        fail(`${element.id}: connector has zero length`);
      }
    }
  }
}

for (const element of elements) {
  for (const bindingName of ["startBinding", "endBinding"]) {
    const binding = element[bindingName];
    if (binding?.elementId && !byId.has(binding.elementId)) {
      fail(`${element.id}: ${bindingName} targets missing ${binding.elementId}`);
    }
  }
  if (element.containerId && !byId.has(element.containerId)) {
    fail(`${element.id}: missing container ${element.containerId}`);
  }
  for (const bound of element.boundElements ?? []) {
    if (bound?.id && !byId.has(bound.id)) {
      fail(`${element.id}: bound element ${bound.id} is missing`);
    }
  }
}

for (const text of elements.filter((element) => element.type === "text")) {
  if (!text.containerId) continue;
  const container = byId.get(text.containerId);
  if (!container) continue;
  const textBounds = boundsFor(text);
  const containerBounds = boundsFor(container);
  const tolerance = 4;
  if (
    textBounds.minX < containerBounds.minX - tolerance ||
    textBounds.minY < containerBounds.minY - tolerance ||
    textBounds.maxX > containerBounds.maxX + tolerance ||
    textBounds.maxY > containerBounds.maxY + tolerance
  ) {
    fail(`${text.id}: bound text falls outside ${container.id}`);
  }
  if (
    hexPattern.test(text.strokeColor ?? "") &&
    hexPattern.test(container.backgroundColor ?? "") &&
    container.backgroundColor !== "transparent"
  ) {
    const required = text.fontSize >= 24 ? 3 : 4.5;
    const ratio = contrast(text.strokeColor, container.backgroundColor);
    if (ratio < required) {
      fail(
        `${text.id}: contrast ${ratio.toFixed(2)} is below ${required.toFixed(1)}`,
      );
    }
  }
}

const combinedText = elements
  .filter((element) => element.type === "text")
  .map((element) => element.text)
  .join("\n");

for (const phrase of requiredText) {
  if (!combinedText.includes(phrase)) fail(`missing required text: ${phrase}`);
}

const laterElements = elements.filter(
  (element) => element.customData?.phase === "later",
);
if (
  laterElements.length &&
  !/(V1|当前|第一版)/i.test(combinedText)
) {
  warn("later scope exists but the scene does not visibly label V1/current");
}
if (
  laterElements.length &&
  !/(后续|未来|演进|later|future)/i.test(combinedText)
) {
  warn("later scope exists but the scene does not visibly label future/later");
}

const sceneBounds = elements.map(boundsFor);
const sceneWidth =
  Math.max(...sceneBounds.map((bound) => bound.maxX)) -
  Math.min(...sceneBounds.map((bound) => bound.minX));
const sceneHeight =
  Math.max(...sceneBounds.map((bound) => bound.maxY)) -
  Math.min(...sceneBounds.map((bound) => bound.minY));

if (pngPath) {
  try {
    const pngStat = await stat(pngPath);
    const pngBuffer = await readFile(pngPath);
    const png = pngDimensions(pngBuffer);
    if (pngStat.size < 20_000) fail("PNG preview is unexpectedly small");
    if (!png || !png.width || !png.height) {
      fail("PNG preview has invalid dimensions");
    } else if (sceneWidth > 0 && sceneHeight > 0) {
      const sceneRatio = sceneWidth / sceneHeight;
      const pngRatio = png.width / png.height;
      if (Math.abs(sceneRatio - pngRatio) / sceneRatio > 0.12) {
        warn("PNG aspect ratio differs from scene bounds; inspect clipping");
      }
    }
  } catch (error) {
    fail(`cannot inspect PNG: ${error.message}`);
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);

if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  console.error(`FAIL ${inputPath}: ${errors.length} error(s)`);
  process.exit(1);
}

const textCount = elements.filter((element) => element.type === "text").length;
const solidCount = elements.filter(
  (element) => element.strokeStyle === "solid",
).length;
const dashedCount = elements.filter(
  (element) => element.strokeStyle === "dashed",
).length;
console.log(
  `PASS ${inputPath} · ${elements.length} elements · ${textCount} text · ${solidCount} solid · ${dashedCount} dashed · ${laterElements.length} later`,
);
