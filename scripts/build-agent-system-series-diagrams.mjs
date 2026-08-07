#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const palette = {
  canvas: "#faf9f7",
  ink: "#1f1f1d",
  muted: "#66625c",
  border: "#bdb8ae",
  red: "#c43d2b",
  blue: "#dcebf4",
  sage: "#dfece4",
  vermilion: "#f5d8d2",
  amber: "#f7e8bd",
  violet: "#e7e0ef",
};

let sequence = 0;

function base(id, type, x, y, width, height, customData = {}) {
  sequence += 1;
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: palette.ink,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    isDeleted: false,
    seed: 1000 + sequence,
    version: 1,
    versionNonce: 9000 + sequence,
    groupIds: [],
    frameId: null,
    boundElements: [],
    link: null,
    locked: false,
    customData,
  };
}

function rect(id, x, y, width, height, options = {}) {
  return {
    ...base(id, "rectangle", x, y, width, height, {
      phase: options.phase ?? "v1",
      role: options.role ?? "node",
    }),
    strokeColor: options.stroke ?? palette.ink,
    backgroundColor: options.fill ?? palette.canvas,
    strokeWidth: options.strokeWidth ?? 2,
    strokeStyle: options.phase === "later" ? "dashed" : "solid",
    roughness: options.roughness ?? 1,
    opacity: options.opacity ?? 100,
    roundness: { type: 3 },
  };
}

function ellipse(id, x, y, width, height, options = {}) {
  return {
    ...base(id, "ellipse", x, y, width, height, {
      phase: options.phase ?? "v1",
      role: options.role ?? "node",
    }),
    strokeColor: options.stroke ?? palette.ink,
    backgroundColor: options.fill ?? palette.canvas,
    strokeWidth: options.strokeWidth ?? 2,
    strokeStyle: options.phase === "later" ? "dashed" : "solid",
    roughness: options.roughness ?? 1,
    opacity: options.opacity ?? 100,
  };
}

function label(id, x, y, width, height, value, options = {}) {
  return {
    ...base(id, "text", x, y, width, height, {
      role: options.role ?? "annotation",
      weight: options.weight ?? 400,
    }),
    strokeColor: options.color ?? palette.ink,
    backgroundColor: "transparent",
    strokeWidth: 1,
    fontSize: options.size ?? 16,
    fontFamily: options.fontFamily ?? 5,
    text: value,
    originalText: value,
    textAlign: options.align ?? "left",
    verticalAlign: options.verticalAlign ?? "top",
    lineHeight: 1.2,
    containerId: null,
    autoResize: true,
  };
}

function arrow(id, x, y, points, options = {}) {
  const xs = points.map(([pointX]) => pointX);
  const ys = points.map(([, pointY]) => pointY);
  return {
    ...base(
      id,
      "arrow",
      x,
      y,
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
      {
        phase: options.phase ?? "v1",
        role: "connector",
      },
    ),
    strokeColor: options.color ?? palette.ink,
    backgroundColor: "transparent",
    strokeWidth: options.strokeWidth ?? 2,
    strokeStyle: options.phase === "later" ? "dashed" : "solid",
    points,
    startArrowhead: options.startArrowhead ?? null,
    endArrowhead: options.endArrowhead ?? "triangle",
    startBinding: null,
    endBinding: null,
    lastCommittedPoint: null,
    elbowed: false,
  };
}

function scene(elements) {
  return {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements,
    appState: {
      viewBackgroundColor: palette.canvas,
      gridSize: 20,
    },
    files: {},
  };
}

function heading(title, subtitle) {
  return [
    label("title", 70, 48, 1500, 52, title, {
      size: 36,
      weight: 700,
    }),
    label("subtitle", 72, 112, 1500, 30, subtitle, {
      size: 20,
      color: palette.muted,
    }),
  ];
}

function piMinimalKernel() {
  const elements = [
    rect("host-boundary", 250, 335, 1310, 445, {
      fill: palette.blue,
      stroke: palette.red,
      strokeWidth: 2,
      opacity: 32,
      role: "section",
    }),
    rect("provider-band", 80, 190, 510, 145, {
      fill: palette.violet,
      stroke: "#695b83",
      role: "section",
    }),
    rect("extension-rail", 1180, 330, 325, 390, {
      fill: palette.amber,
      stroke: "#9a6c17",
      role: "section",
    }),
    rect("session-band", 300, 820, 1200, 190, {
      fill: palette.sage,
      stroke: "#5f7f6b",
      role: "section",
    }),
    arrow("provider-to-adapter", 570, 260, [[0, 0], [190, 0]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("adapter-to-kernel", 880, 335, [[0, 0], [0, 75]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("resource-to-kernel", 480, 535, [[0, 0], [175, 0]], {
      color: palette.ink,
      strokeWidth: 3,
    }),
    arrow("kernel-to-tools", 1050, 535, [[0, 0], [110, 0]], {
      color: palette.ink,
      strokeWidth: 3,
    }),
    arrow("extension-to-kernel", 1180, 455, [[0, 0], [-120, 0]], {
      color: "#9a6c17",
      strokeWidth: 2,
    }),
    arrow("kernel-to-session", 855, 690, [[0, 0], [0, 130]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    arrow("tree-root-main", 590, 917, [[0, 0], [110, 0]], {
      color: "#5f7f6b",
    }),
    arrow("tree-main-leaf", 850, 917, [[0, 0], [110, 0]], {
      color: "#5f7f6b",
    }),
    arrow("tree-main-branch", 825, 938, [[0, 0], [0, 35], [135, 35]], {
      color: "#5f7f6b",
    }),
    ellipse("kernel", 655, 410, 395, 280, {
      fill: palette.violet,
      stroke: palette.ink,
      strokeWidth: 4,
    }),
    rect("adapter", 760, 205, 240, 130, {
      fill: palette.canvas,
      stroke: "#695b83",
      strokeWidth: 2,
    }),
    rect("resources", 285, 420, 195, 230, {
      fill: palette.canvas,
      stroke: palette.ink,
      strokeWidth: 2,
    }),
    rect("tool-host", 1160, 420, 0, 230, {
      fill: palette.canvas,
      stroke: palette.ink,
      strokeWidth: 0,
      opacity: 0,
    }),
    rect("tools", 1060, 465, 100, 140, {
      fill: palette.canvas,
      stroke: palette.ink,
      strokeWidth: 2,
    }),
    rect("extension-plan", 1215, 395, 255, 55, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("extension-mcp", 1215, 465, 255, 55, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("extension-agent", 1215, 535, 255, 55, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("extension-policy", 1215, 605, 255, 75, {
      fill: palette.vermilion,
      stroke: palette.red,
    }),
    rect("tree-root", 455, 875, 135, 85, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    rect("tree-main", 700, 875, 150, 85, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    rect("tree-leaf", 960, 875, 190, 85, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("tree-branch", 960, 960, 190, 45, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    ...heading(
      "Pi：最小 Agent Kernel 保留什么",
      "小核保留 loop、provider stream、状态、事件与中断；workflow 和安全责任沿扩展轨道外移",
    ),
    label("provider-heading", 105, 202, 400, 28, "Provider 网络 · 可替换模型", {
      size: 20,
      color: "#695b83",
      weight: 700,
    }),
    label(
      "provider-list",
      120,
      248,
      430,
      60,
      "Anthropic · OpenAI · Google · Bedrock · Mistral",
      { size: 16, color: palette.ink, align: "center" },
    ),
    label(
      "adapter-text",
      790,
      230,
      180,
      75,
      "pi-ai\nstream + message\nadapter",
      { size: 18, align: "center", weight: 700 },
    ),
    label("host-label", 275, 348, 600, 28, "Host process boundary · 与启动用户同权", {
      size: 18,
      color: palette.red,
      weight: 700,
    }),
    label(
      "resource-text",
      310,
      452,
      145,
      150,
      "Resource Loader\n\nAGENTS.md\nSkills / Packages\nProject Trust",
      { size: 18, align: "center", weight: 700 },
    ),
    label(
      "kernel-text",
      715,
      454,
      275,
      175,
      "pi-agent-core\n\nmessages + tools\nmodel stream\nresult feedback\nevents · abort · stop",
      { size: 20, align: "center", weight: 700 },
    ),
    label("tools-text", 1077, 493, 65, 90, "read\nbash\nedit\nwrite", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("extension-heading", 1210, 344, 270, 28, "可拆卸 Extension 轨道", {
      size: 20,
      color: "#7a5411",
      weight: 700,
    }),
    label("extension-plan-text", 1240, 410, 205, 28, "PLAN / TODO / workflow", {
      size: 16,
      align: "center",
    }),
    label("extension-mcp-text", 1240, 480, 205, 28, "MCP / provider / UI", {
      size: 16,
      align: "center",
    }),
    label("extension-agent-text", 1240, 550, 205, 28, "subagent / background", {
      size: 16,
      align: "center",
    }),
    label(
      "extension-policy-text",
      1240,
      614,
      205,
      55,
      "permission / sandbox routing\nGit checkpoint / eval",
      { size: 16, align: "center", color: "#8f2e22", weight: 700 },
    ),
    label(
      "trust-note",
      1090,
      735,
      430,
      28,
      "Project Trust ≠ sandbox · Extension ≠ 低权限插件",
      { size: 16, color: palette.red, weight: 700 },
    ),
    label("session-heading", 330, 832, 650, 28, "Append-only JSONL Session Tree", {
      size: 20,
      color: "#4a6755",
      weight: 700,
    }),
    label("tree-root-text", 480, 896, 85, 30, "root", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("tree-main-text", 725, 896, 100, 30, "parent", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("tree-leaf-text", 980, 894, 150, 50, "active leaf\n→ model context", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("tree-branch-text", 982, 968, 145, 28, "retained branch", {
      size: 14,
      align: "center",
    }),
    label(
      "session-note",
      1190,
      875,
      270,
      90,
      "完整历史留在 JSONL\n当前上下文只投影 active path\n切换 leaf 不回滚工作树",
      { size: 16, color: "#4a6755" },
    ),
    label(
      "footer-note",
      70,
      1040,
      1600,
      28,
      "责任外移：Plan → 文件/扩展 · 多 Agent → tmux/package · 权限/隔离 → extension/OS · 验收/回滚 → tests/Git/host",
      { size: 16, color: palette.muted },
    ),
  ];

  return scene(elements);
}

function codexEventControlPlane() {
  const elements = [
    ...heading(
      "Codex：一个 Core 怎样服务多个 Surface",
      "公开 App Server 契约在外，内部 Submission / Event 双总线在内；安全决策留在 effect 之前",
    ),
    rect("surface-band", 80, 180, 1440, 155, {
      fill: palette.blue,
      stroke: "#52758c",
      role: "section",
    }),
    rect("surface-cli", 120, 225, 260, 70, {
      fill: palette.canvas,
      stroke: "#52758c",
    }),
    rect("surface-ide", 445, 225, 260, 70, {
      fill: palette.canvas,
      stroke: "#52758c",
    }),
    rect("surface-desktop", 770, 225, 260, 70, {
      fill: palette.canvas,
      stroke: "#52758c",
    }),
    rect("surface-custom", 1095, 225, 380, 70, {
      fill: palette.canvas,
      stroke: "#52758c",
    }),
    rect("contract-band", 170, 370, 1260, 105, {
      fill: palette.violet,
      stroke: "#695b83",
      role: "section",
    }),
    rect("core-boundary", 260, 525, 1080, 350, {
      fill: palette.sage,
      stroke: "#4f725d",
      strokeWidth: 3,
      role: "section",
    }),
    rect("submission-bus", 320, 575, 960, 70, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 3,
    }),
    rect("event-bus", 320, 755, 960, 70, {
      fill: palette.blue,
      stroke: "#52758c",
      strokeWidth: 3,
    }),
    rect("thread-engine", 555, 660, 490, 70, {
      fill: palette.canvas,
      stroke: palette.ink,
      strokeWidth: 3,
    }),
    rect("effect-gate", 260, 930, 1080, 120, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
      role: "section",
    }),
    rect("approval", 325, 965, 270, 55, {
      fill: palette.canvas,
      stroke: palette.red,
    }),
    rect("sandbox", 665, 965, 270, 55, {
      fill: palette.canvas,
      stroke: palette.red,
    }),
    rect("effect", 1005, 965, 270, 55, {
      fill: palette.canvas,
      stroke: palette.red,
    }),
    arrow("surface-contract", 800, 335, [[0, 0], [0, 35]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("contract-submission", 800, 475, [[0, 0], [0, 100]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    arrow("submission-engine", 800, 645, [[0, 0], [0, 15]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    arrow("engine-event", 800, 730, [[0, 0], [0, 25]], {
      color: "#52758c",
      strokeWidth: 3,
    }),
    arrow("event-contract", 1230, 755, [[0, 0], [110, -160], [90, -280]], {
      color: "#52758c",
      strokeWidth: 3,
    }),
    arrow("engine-gate", 800, 730, [[0, 0], [0, 200]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("approval-sandbox", 595, 992, [[0, 0], [70, 0]], {
      color: palette.red,
      strokeWidth: 2,
    }),
    arrow("sandbox-effect", 935, 992, [[0, 0], [70, 0]], {
      color: palette.red,
      strokeWidth: 2,
    }),
    label("surface-heading", 105, 190, 420, 28, "产品 Surface · 各自拥有交互，不复制 core", {
      size: 19,
      color: "#3d6076",
      weight: 700,
    }),
    label("surface-cli-text", 150, 246, 200, 28, "CLI / TUI", {
      size: 20,
      align: "center",
      weight: 700,
    }),
    label("surface-ide-text", 475, 246, 200, 28, "IDE Extension", {
      size: 20,
      align: "center",
      weight: 700,
    }),
    label("surface-desktop-text", 800, 246, 200, 28, "Desktop / ChatGPT", {
      size: 19,
      align: "center",
      weight: 700,
    }),
    label("surface-custom-text", 1125, 246, 320, 28, "Custom product / remote TUI", {
      size: 19,
      align: "center",
      weight: 700,
    }),
    label(
      "contract-text",
      220,
      394,
      1160,
      60,
      "App Server · public JSON-RPC contract\ninitialize → thread/start | resume | fork → turn/start | steer | interrupt → notifications",
      { size: 20, align: "center", weight: 700, color: "#55466f" },
    ),
    label("core-heading", 290, 535, 820, 28, "Rust core · 内部实现层（不要当成稳定公共协议）", {
      size: 18,
      color: "#3f654d",
      weight: 700,
    }),
    label(
      "submission-text",
      350,
      596,
      900,
      30,
      "Submission Queue  →  user input · exec · interrupt · approval response",
      { size: 19, align: "center", weight: 700, color: "#76510e" },
    ),
    label(
      "thread-engine-text",
      585,
      681,
      430,
      28,
      "Thread → Turn → Item · Agent loop + state",
      { size: 19, align: "center", weight: 700 },
    ),
    label(
      "event-text",
      350,
      776,
      900,
      30,
      "Event Queue  →  item delta · command progress · patch · turn/completed",
      { size: 19, align: "center", weight: 700, color: "#3d6076" },
    ),
    label(
      "effect-heading",
      290,
      940,
      960,
      24,
      "Effect boundary · 命令、写文件、网络与外部工具在这里接受治理",
      { size: 17, color: "#8f2e22", weight: 700 },
    ),
    label("approval-text", 350, 980, 220, 24, "Approval · 何时询问", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("sandbox-text", 690, 980, 220, 24, "Sandbox · 技术边界", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("effect-text", 1030, 980, 220, 24, "Effect · shell / patch / net", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label(
      "ownership-note",
      95,
      1080,
      1410,
      48,
      "所有权判断：Surface 拥有呈现与输入；App Server 拥有跨进程契约；core 拥有 loop 与权威任务状态；host policy 与 OS sandbox 共同约束副作用。",
      { size: 17, color: palette.muted, align: "center" },
    ),
  ];

  return scene(elements);
}

function manusComputerToArtifact() {
  const elements = [
    ...heading(
      "Manus：为什么一台计算机会把回复变成交付物",
      "Task envelope 包住执行身体；artifact 离开 VM 后，真正的验收与外部副作用仍属于用户",
    ),
    rect("task-envelope", 110, 190, 1060, 710, {
      fill: palette.blue,
      stroke: "#52758c",
      strokeWidth: 3,
      role: "section",
    }),
    rect("sandbox-vm", 210, 315, 860, 455, {
      fill: palette.sage,
      stroke: "#4f725d",
      strokeWidth: 3,
      role: "section",
    }),
    rect("input-box", 160, 230, 370, 65, {
      fill: palette.canvas,
      stroke: "#52758c",
    }),
    rect("browser-box", 265, 430, 165, 100, {
      fill: palette.canvas,
      stroke: "#4f725d",
    }),
    rect("files-box", 475, 430, 165, 100, {
      fill: palette.canvas,
      stroke: "#4f725d",
    }),
    rect("code-box", 685, 430, 165, 100, {
      fill: palette.canvas,
      stroke: "#4f725d",
    }),
    rect("software-box", 895, 430, 125, 100, {
      fill: palette.canvas,
      stroke: "#4f725d",
    }),
    rect("working-state", 365, 620, 550, 80, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 3,
    }),
    rect("artifact-tray", 760, 805, 360, 70, {
      fill: palette.violet,
      stroke: "#695b83",
      strokeWidth: 3,
    }),
    rect("human-review", 1235, 400, 290, 170, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("operator-boundary", 1225, 665, 310, 225, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 3,
      role: "section",
    }),
    rect("local-browser", 1270, 740, 220, 85, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("wide-research", 1210, 190, 330, 150, {
      fill: palette.violet,
      stroke: "#695b83",
      role: "section",
    }),
    ellipse("subagent-a", 1245, 250, 65, 50, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    ellipse("subagent-b", 1335, 250, 65, 50, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    ellipse("subagent-c", 1425, 250, 65, 50, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("lifecycle-note", 125, 955, 1415, 100, {
      fill: palette.canvas,
      stroke: palette.border,
      role: "section",
    }),
    arrow("input-vm", 525, 262, [[0, 0], [115, 0], [0, 90]], {
      color: "#52758c",
      strokeWidth: 3,
    }),
    arrow("browser-files", 430, 480, [[0, 0], [45, 0]], {
      color: "#4f725d",
    }),
    arrow("files-code", 640, 480, [[0, 0], [45, 0]], {
      color: "#4f725d",
    }),
    arrow("code-software", 850, 480, [[0, 0], [45, 0]], {
      color: "#4f725d",
    }),
    arrow("tools-working", 640, 530, [[0, 0], [0, 90]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    arrow("working-artifact", 915, 660, [[0, 0], [115, 0], [0, 145]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("artifact-review", 1120, 840, [[0, 0], [105, -360]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("review-revise", 1235, 535, [[0, 0], [-65, 0]], {
      color: palette.red,
      strokeWidth: 2,
      startArrowhead: "triangle",
    }),
    arrow("operator-effect", 1270, 782, [[0, 0], [-100, -185]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    arrow("wide-fanout", 1370, 230, [[0, 0], [-90, 20]], {
      color: "#695b83",
    }),
    arrow("wide-fanin", 1370, 300, [[0, 0], [0, 40], [-200, 40]], {
      color: "#695b83",
    }),
    label("task-title", 145, 202, 650, 28, "Task envelope · 一次任务、一台隔离计算机", {
      size: 21,
      color: "#3d6076",
      weight: 700,
    }),
    label("input-text", 190, 247, 310, 28, "Goal + files + constraints", {
      size: 19,
      align: "center",
      weight: 700,
    }),
    label("vm-title", 245, 335, 600, 30, "Temporary Sandbox VM · per task", {
      size: 22,
      color: "#3f654d",
      weight: 700,
    }),
    label(
      "vm-subtitle",
      245,
      377,
      750,
      28,
      "network · filesystem · browser · software · code",
      { size: 17, color: palette.muted },
    ),
    label("browser-text", 290, 456, 115, 50, "Browser\nweb action", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("files-text", 500, 456, 115, 50, "Files\ninputs / state", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("code-text", 710, 456, 115, 50, "Code\ncustom tools", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("software-text", 910, 456, 95, 50, "Software\nruntime", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label(
      "working-text",
      400,
      641,
      480,
      38,
      "Working state · intermediate code / cache / temp files",
      { size: 18, align: "center", weight: 700, color: "#76510e" },
    ),
    label("artifact-text", 790, 825, 300, 30, "Artifact tray · report / site / file", {
      size: 18,
      align: "center",
      weight: 700,
      color: "#55466f",
    }),
    label("review-title", 1265, 420, 230, 30, "Human acceptance gate", {
      size: 20,
      align: "center",
      weight: 700,
      color: "#8f2e22",
    }),
    label(
      "review-text",
      1265,
      468,
      230,
      75,
      "inspect artifact\nverify sources / diff / behavior\naccept · revise · reject",
      { size: 17, align: "center" },
    ),
    label("operator-title", 1250, 680, 260, 28, "Browser Operator · local boundary", {
      size: 18,
      align: "center",
      weight: 700,
      color: "#76510e",
    }),
    label(
      "local-browser-text",
      1295,
      754,
      170,
      55,
      "existing login + local IP\nsession authorization",
      { size: 16, align: "center", weight: 700 },
    ),
    label(
      "operator-note",
      1250,
      842,
      260,
      30,
      "不在 cloud sandbox 内",
      { size: 16, align: "center", color: palette.red, weight: 700 },
    ),
    label("wide-title", 1235, 202, 280, 28, "Wide Research · 小型 fan-out / fan-in", {
      size: 17,
      align: "center",
      color: "#55466f",
      weight: 700,
    }),
    label("subagent-a-text", 1265, 265, 24, 20, "A", {
      size: 14,
      align: "center",
      weight: 700,
    }),
    label("subagent-b-text", 1355, 265, 24, 20, "B", {
      size: 14,
      align: "center",
      weight: 700,
    }),
    label("subagent-c-text", 1445, 265, 24, 20, "C", {
      size: 14,
      align: "center",
      weight: 700,
    }),
    label(
      "lifecycle-text",
      160,
      974,
      1350,
      58,
      "临时 Sandbox：sleep → recycle → 只恢复 artifact / attachment / 重要项目文件    ·    Cloud Computer：独立的长期 Ubuntu VM，文件、软件与进程跨 session 持续\nVM 可重建 ≠ 已发送邮件、已提交表单、已发布内容或已发生交易可以回滚",
      { size: 17, align: "center", color: palette.muted, weight: 700 },
    ),
  ];

  return scene(elements);
}

function n8nDeterministicSpine() {
  const elements = [
    ...heading(
      "n8n：确定性铁路与受限 Agent 支线",
      "图执行负责可见控制流；模型只在语义判断岛内工作，外部写入靠业务键、回执与对账获得可恢复性",
    ),
    rect("spine-band", 65, 350, 1500, 300, {
      fill: palette.blue,
      stroke: "#52758c",
      strokeWidth: 3,
      role: "section",
    }),
    rect("trigger", 95, 455, 160, 90, {
      fill: palette.canvas,
      stroke: "#52758c",
    }),
    rect("normalize", 300, 455, 170, 90, {
      fill: palette.canvas,
      stroke: "#52758c",
    }),
    rect("rules", 515, 455, 160, 90, {
      fill: palette.canvas,
      stroke: "#52758c",
    }),
    rect("agent-gate", 720, 455, 185, 90, {
      fill: palette.violet,
      stroke: "#695b83",
      strokeWidth: 3,
    }),
    rect("policy", 950, 455, 180, 90, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("operation-key", 1175, 455, 175, 90, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 3,
    }),
    rect("external-effect", 1395, 455, 135, 90, {
      fill: palette.canvas,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("agent-island", 600, 175, 430, 200, {
      fill: palette.violet,
      stroke: "#695b83",
      strokeWidth: 3,
      role: "section",
    }),
    ellipse("model", 645, 255, 100, 70, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    ellipse("memory", 765, 255, 100, 70, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    ellipse("tools", 885, 255, 100, 70, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("receipt-loop", 1135, 685, 395, 115, {
      fill: palette.sage,
      stroke: "#4f725d",
      strokeWidth: 3,
    }),
    rect("yard-band", 140, 875, 1320, 180, {
      fill: palette.sage,
      stroke: "#4f725d",
      strokeWidth: 3,
      role: "section",
    }),
    rect("main-process", 190, 930, 210, 70, {
      fill: palette.canvas,
      stroke: "#4f725d",
    }),
    rect("redis", 470, 930, 210, 70, {
      fill: palette.vermilion,
      stroke: palette.red,
    }),
    rect("workers", 750, 930, 250, 70, {
      fill: palette.canvas,
      stroke: "#4f725d",
    }),
    rect("postgres", 1070, 930, 330, 70, {
      fill: palette.amber,
      stroke: "#9a6c17",
    }),
    arrow("trigger-normalize", 255, 500, [[0, 0], [45, 0]], {
      color: "#52758c",
      strokeWidth: 3,
    }),
    arrow("normalize-rules", 470, 500, [[0, 0], [45, 0]], {
      color: "#52758c",
      strokeWidth: 3,
    }),
    arrow("rules-agent", 675, 500, [[0, 0], [45, 0]], {
      color: "#52758c",
      strokeWidth: 3,
    }),
    arrow("agent-policy", 905, 500, [[0, 0], [45, 0]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("policy-key", 1130, 500, [[0, 0], [45, 0]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("key-effect", 1350, 500, [[0, 0], [45, 0]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("rules-island", 595, 455, [[0, 0], [0, -80], [90, 0]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("island-agent", 930, 360, [[0, 0], [-60, 95]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("model-memory", 745, 290, [[0, 0], [20, 0]], {
      color: "#695b83",
    }),
    arrow("memory-tools", 865, 290, [[0, 0], [20, 0]], {
      color: "#695b83",
    }),
    arrow("effect-receipt", 1460, 545, [[0, 0], [0, 140]], {
      color: "#4f725d",
      strokeWidth: 3,
    }),
    arrow("receipt-key", 1235, 685, [[0, 0], [0, -140]], {
      color: "#4f725d",
      strokeWidth: 3,
    }),
    arrow("main-redis", 400, 965, [[0, 0], [70, 0]], {
      color: "#4f725d",
      strokeWidth: 3,
    }),
    arrow("redis-workers", 680, 965, [[0, 0], [70, 0]], {
      color: "#4f725d",
      strokeWidth: 3,
    }),
    arrow("workers-postgres", 1000, 965, [[0, 0], [70, 0]], {
      color: "#4f725d",
      strokeWidth: 3,
    }),
    arrow("spine-yard", 810, 650, [[0, 0], [0, 225]], {
      color: "#4f725d",
      strokeWidth: 2,
    }),
    label("spine-title", 95, 370, 660, 30, "Deterministic spine · 节点、分支、等待与 execution", {
      size: 21,
      color: "#3d6076",
      weight: 700,
    }),
    label("trigger-text", 115, 481, 120, 35, "Trigger\nexecution", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("normalize-text", 320, 481, 130, 35, "Normalize\nitem contract", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("rules-text", 535, 481, 120, 35, "Rules / IF\nvisible route", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("agent-gate-text", 740, 481, 145, 35, "Agent output\nschema + evidence", {
      size: 17,
      align: "center",
      weight: 700,
      color: "#55466f",
    }),
    label("policy-text", 970, 481, 140, 35, "Policy / Human\nallow · reject", {
      size: 17,
      align: "center",
      weight: 700,
      color: "#8f2e22",
    }),
    label("operation-key-text", 1195, 481, 135, 35, "Operation key\nledger lookup", {
      size: 17,
      align: "center",
      weight: 700,
      color: "#76510e",
    }),
    label("external-effect-text", 1412, 481, 100, 35, "External\nwrite", {
      size: 17,
      align: "center",
      weight: 700,
      color: "#8f2e22",
    }),
    label("agent-title", 630, 192, 370, 28, "Bounded Agent island · 概率性判断只在支线内", {
      size: 19,
      align: "center",
      weight: 700,
      color: "#55466f",
    }),
    label("model-text", 670, 278, 50, 22, "Model", {
      size: 15,
      align: "center",
      weight: 700,
    }),
    label("memory-text", 785, 278, 60, 22, "Memory", {
      size: 15,
      align: "center",
      weight: 700,
    }),
    label("tools-text-n8n", 910, 278, 50, 22, "Tools", {
      size: 15,
      align: "center",
      weight: 700,
    }),
    label(
      "agent-note",
      650,
      335,
      330,
      22,
      "memory ≠ business source of truth",
      { size: 15, align: "center", color: palette.red, weight: 700 },
    ),
    label(
      "receipt-text",
      1165,
      709,
      335,
      65,
      "Receipt + external reference\nreconcile unknown outcome before retry\nretry ≠ exactly-once",
      { size: 17, align: "center", weight: 700, color: "#3f654d" },
    ),
    label("yard-title", 170, 888, 600, 28, "Queue-mode 运维车场 · 热路径分工，不是业务事实模型", {
      size: 19,
      color: "#3f654d",
      weight: 700,
    }),
    label("main-text", 215, 952, 160, 28, "Main / Webhook\naccept + enqueue", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("redis-text", 495, 952, 160, 28, "Redis / Bull\njob broker", {
      size: 17,
      align: "center",
      weight: 700,
      color: "#8f2e22",
    }),
    label("workers-text", 780, 952, 190, 28, "Workers × N\nexecute workflow", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("postgres-text", 1100, 952, 270, 28, "Postgres\nworkflow + execution records", {
      size: 17,
      align: "center",
      weight: 700,
      color: "#76510e",
    }),
    label(
      "footer-n8n",
      75,
      1090,
      1480,
      44,
      "Redis 排队不等于业务成功 · execution success 不等于外部写入唯一 · Postgres execution record 不应替代 CRM / payment / inventory 等业务事实源",
      { size: 17, color: palette.muted, align: "center", weight: 700 },
    ),
  ];

  return scene(elements);
}

function openclawPersistentGateway() {
  const elements = [
    ...heading(
      "OpenClaw：连续性必须经过路由，而不是身份猜测",
      "渠道事实先命中 binding，再进入 agent enclave、session 与 capability；Gateway 是常驻控制面，不是模型",
    ),
    rect("internet-boundary", 65, 185, 410, 580, {
      fill: palette.blue,
      stroke: "#55798d",
      opacity: 34,
      role: "section",
    }),
    rect("gateway-boundary", 535, 185, 470, 580, {
      fill: palette.amber,
      stroke: "#9a6c17",
      opacity: 46,
      role: "section",
    }),
    rect("agent-boundary", 1070, 185, 505, 580, {
      fill: palette.sage,
      stroke: "#5f7f6b",
      opacity: 42,
      role: "section",
    }),
    rect("device-boundary", 535, 825, 1040, 225, {
      fill: palette.violet,
      stroke: "#695b83",
      opacity: 42,
      role: "section",
    }),
    rect("telegram", 105, 270, 305, 68, {
      fill: palette.canvas,
      stroke: "#55798d",
    }),
    rect("slack", 105, 365, 305, 68, {
      fill: palette.canvas,
      stroke: "#55798d",
    }),
    rect("mail-web", 105, 460, 305, 86, {
      fill: palette.canvas,
      stroke: "#55798d",
    }),
    rect("sender-facts", 105, 605, 305, 95, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("gateway", 590, 245, 360, 115, {
      fill: palette.canvas,
      stroke: "#9a6c17",
      strokeWidth: 4,
    }),
    rect("binding-table", 590, 415, 360, 145, {
      fill: palette.canvas,
      stroke: "#9a6c17",
      strokeWidth: 3,
    }),
    rect("session-key", 590, 615, 360, 92, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("agent-home", 1120, 245, 405, 190, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("agent-work", 1120, 500, 405, 190, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("device-node", 585, 885, 270, 100, {
      fill: palette.canvas,
      stroke: "#695b83",
      strokeWidth: 3,
    }),
    rect("tool-policy", 925, 885, 270, 100, {
      fill: palette.canvas,
      stroke: "#695b83",
      strokeWidth: 3,
    }),
    rect("external-effect", 1265, 885, 260, 100, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    arrow("channel-telegram-gateway", 410, 304, [[0, 0], [180, 0]], {
      color: "#55798d",
      strokeWidth: 3,
    }),
    arrow("channel-slack-gateway", 410, 399, [[0, 0], [95, 0], [95, -70], [180, -70]], {
      color: "#55798d",
      strokeWidth: 3,
    }),
    arrow("channel-mail-gateway", 410, 503, [[0, 0], [95, 0], [95, -174], [180, -174]], {
      color: "#55798d",
      strokeWidth: 3,
    }),
    arrow("gateway-binding", 770, 360, [[0, 0], [0, 55]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    arrow("binding-session", 770, 560, [[0, 0], [0, 55]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("binding-home", 950, 460, [[0, 0], [80, 0], [80, -120], [170, -120]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    arrow("binding-work", 950, 510, [[0, 0], [80, 0], [80, 85], [170, 85]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    arrow("session-home", 950, 650, [[0, 0], [95, 0], [95, -260], [170, -260]], {
      color: palette.red,
      strokeWidth: 2,
    }),
    arrow("session-work", 950, 670, [[0, 0], [95, 0], [95, -75], [170, -75]], {
      color: palette.red,
      strokeWidth: 2,
    }),
    arrow("gateway-node", 715, 765, [[0, 0], [0, 120]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("agent-tools", 1322, 690, [[0, 0], [0, 120], [-262, 120], [-262, 195]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("tool-effect", 1195, 935, [[0, 0], [70, 0]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    label("internet-title", 95, 200, 340, 30, "互联网输入 · 不可信内容边界", {
      size: 19,
      color: "#55798d",
      weight: 700,
    }),
    label("telegram-label", 140, 290, 235, 25, "Telegram · account A", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("slack-label", 140, 385, 235, 25, "Slack · workspace B", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("mail-web-label", 130, 477, 255, 50, "Mail / Web / Docs\n内容可携带 prompt injection", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("sender-label", 125, 625, 265, 60, "只信渠道提供的身份事实\nchannel · accountId · peer\n不让模型猜“是不是同一个人”", {
      size: 16,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("gateway-title", 565, 200, 405, 30, "常驻 Gateway · 一台主机一个控制面", {
      size: 19,
      color: "#76510e",
      weight: 700,
    }),
    label("gateway-label", 625, 270, 290, 64, "Provider connections\nTyped WebSocket API\nhealth · presence · agent events", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("binding-label", 620, 438, 300, 98, "Deterministic bindings\npeer > guild/team > account > channel\n同 tier 首条配置获胜\n遗漏 accountId ≠ wildcard", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("session-label", 620, 635, 300, 50, "Session key 是路由坐标\n不是 tenant authorization", {
      size: 18,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("agent-title", 1100, 200, 435, 30, "Per-agent enclave · 状态分离，不是宿主隔离", {
      size: 19,
      color: "#3f654d",
      weight: 700,
    }),
    label("agent-home-label", 1150, 270, 345, 140, "agent: home\n\nworkspace / bootstrap files\nagentDir / auth profiles\nsessions.json + JSONL\nmodel + tool policy", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("agent-work-label", 1150, 525, 345, 140, "agent: work\n\n独立 workspace / agentDir\n独立 auth / session store\n显式共享 memory/plugin 才跨界\nworkspace cwd ≠ sandbox", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("device-title", 565, 840, 930, 28, "设备与副作用信任边界 · 节点要配对，能力要授权，外部结果要可对账", {
      size: 19,
      color: "#695b83",
      weight: 700,
    }),
    label("device-label", 615, 906, 210, 58, "Paired device node\nrole + caps + commands\ncamera · screen · location", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("policy-label", 955, 906, 210, 58, "Tool / sandbox policy\nleast privilege\napproval + audit", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("effect-label", 1290, 906, 210, 58, "External effect\nidempotency key\nreceipt + reconcile", {
      size: 17,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label(
      "footer-openclaw",
      80,
      1090,
      1480,
      45,
      "连续性来自明确映射与受控 recall，不来自把所有渠道塞进同一会话 · per-agent 隔离不等于 hostile multi-tenant isolation · 一个不互信租户应拥有一个独立 Gateway cell",
      { size: 17, color: palette.muted, align: "center", weight: 700 },
    ),
  ];

  return scene(elements);
}

function taxhackerBoundedAi() {
  const elements = [
    ...heading(
      "TaxHacker：把不确定性压缩成一个结构化函数",
      "文档进入多模态 extraction，穿过 schema narrow waist；只有原件对照、表单校验与人工保存才能生成 canonical transaction",
    ),
    rect("document-boundary", 70, 190, 375, 650, {
      fill: palette.blue,
      stroke: palette.red,
      opacity: 34,
      role: "section",
    }),
    rect("model-boundary", 500, 190, 450, 650, {
      fill: palette.violet,
      stroke: "#695b83",
      opacity: 40,
      role: "section",
    }),
    rect("verification-boundary", 1095, 190, 465, 650, {
      fill: palette.sage,
      stroke: "#5f7f6b",
      opacity: 44,
      role: "section",
    }),
    rect("receipt", 115, 280, 285, 150, {
      fill: palette.canvas,
      stroke: "#55798d",
      strokeWidth: 3,
    }),
    rect("preview-limit", 115, 500, 285, 120, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("provider-openai", 555, 280, 340, 80, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("provider-google", 555, 390, 340, 80, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("provider-mistral", 555, 500, 340, 80, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("provider-result", 555, 660, 340, 115, {
      fill: palette.canvas,
      stroke: "#695b83",
      strokeWidth: 3,
    }),
    rect("schema-waist", 945, 350, 165, 260, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 4,
    }),
    rect("source-compare", 1145, 275, 365, 105, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("form-validate", 1145, 420, 365, 105, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("duplicate-gate", 1145, 565, 365, 105, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("save-gate", 1145, 710, 365, 70, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("canonical-boundary", 500, 900, 1060, 180, {
      fill: palette.amber,
      stroke: "#9a6c17",
      opacity: 42,
      role: "section",
    }),
    rect("cached-candidate", 555, 945, 320, 90, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("canonical-record", 1135, 945, 365, 90, {
      fill: palette.canvas,
      stroke: "#9a6c17",
      strokeWidth: 4,
    }),
    arrow("receipt-to-model", 400, 355, [[0, 0], [155, 0]], {
      color: "#55798d",
      strokeWidth: 3,
    }),
    arrow("openai-fallback", 725, 360, [[0, 0], [0, 30]], {
      color: "#695b83",
      strokeWidth: 2,
    }),
    arrow("google-fallback", 725, 470, [[0, 0], [0, 30]], {
      color: "#695b83",
      strokeWidth: 2,
    }),
    arrow("provider-to-result", 725, 580, [[0, 0], [0, 80]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("result-to-schema", 895, 717, [[0, 0], [80, 0], [80, -237]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    arrow("schema-to-source", 1110, 405, [[0, 0], [35, 0], [35, -77]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    arrow("source-to-form", 1327, 380, [[0, 0], [0, 40]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    arrow("form-to-duplicate", 1327, 525, [[0, 0], [0, 40]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    arrow("duplicate-to-save", 1327, 670, [[0, 0], [0, 40]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("result-to-cache", 725, 775, [[0, 0], [0, 170]], {
      color: "#695b83",
      strokeWidth: 2,
    }),
    arrow("save-to-canonical", 1327, 780, [[0, 0], [0, 165]], {
      color: palette.red,
      strokeWidth: 4,
    }),
    label("document-title", 100, 205, 315, 28, "不可信文档边界", {
      size: 20,
      color: palette.red,
      weight: 700,
    }),
    label("receipt-label", 145, 305, 225, 100, "Receipt / invoice / PDF\n\nimage previews\n+ user prompts", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("preview-label", 145, 525, 225, 70, "只分析前 4 页\n上传文件与预览仍含\n金融数据 / PII", {
      size: 17,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("model-title", 530, 205, 390, 28, "LLM extraction · 配置顺序 fallback，不是投票", {
      size: 20,
      color: "#695b83",
      weight: 700,
    }),
    label("openai-label", 585, 303, 280, 35, "Provider A · configured first", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("google-label", 585, 413, 280, 35, "Provider B · if A errors", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("mistral-label", 585, 523, 280, 35, "Provider C · if B errors", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("result-label", 585, 683, 280, 70, "temperature = 0 · first success wins\nOpenAI / Google / Mistral: structured output\ncompatible: JSON.parse only", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("waist-label", 972, 378, 112, 205, "SCHEMA\nNARROW\nWAIST\n\nrequired\n+ no extra\n\ncompatible\npath gap\n\n形状 ≠ 事实", {
      size: 16,
      align: "center",
      color: "#76510e",
      weight: 700,
    }),
    label("verify-title", 1125, 205, 395, 28, "事实与金融写入边界", {
      size: 20,
      color: "#3f654d",
      weight: 700,
    }),
    label("source-label", 1175, 297, 305, 60, "Original preview side-by-side\n人核对 merchant · total · date · items", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("form-label", 1175, 442, 305, 60, "Zod form validation\n类型 / 长度 / 日期 / 金额转分\n仍不证明来源正确", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("duplicate-label", 1175, 587, 305, 60, "Duplicate candidate check\nkeep both / replace / cancel\n不是通用会计对账", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("save-label", 1175, 730, 305, 30, "显式 Save as Transaction", {
      size: 18,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("canonical-title", 530, 915, 970, 25, "两个状态必须分开：模型候选可缓存，canonical record 只能经应用动作写入", {
      size: 19,
      color: "#76510e",
      weight: 700,
      align: "center",
    }),
    label("cache-label", 585, 967, 260, 45, "File.cachedParseResult\n可重开表单 · 可被纠正\n不是会计事实源", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("record-label", 1165, 967, 305, 45, "Postgres Transaction\nuser-scoped canonical record\n保留原文件关联", {
      size: 17,
      align: "center",
      color: "#76510e",
      weight: 700,
    }),
    label(
      "footer-taxhacker",
      90,
      1120,
      1460,
      42,
      "当不确定性可以收缩为 extraction(input) → candidate output，成熟设计应把控制流留给应用 · schema-valid 只证明结构可解析 · provider fallback 只证明可用性",
      { size: 17, color: palette.muted, align: "center", weight: 700 },
    ),
  ];

  return scene(elements);
}

function openMontageArtifactProductionLine() {
  const elements = [
    ...heading(
      "OpenMontage · Instructions as Code 与工件生产线",
      "coding assistant 解释控制面；canonical JSON、checkpoint 与外部 validator 承担可恢复边界",
    ),
    rect("instruction-lane", 95, 175, 1510, 175, {
      fill: palette.violet,
      stroke: "#695b83",
      opacity: 48,
      role: "section",
    }),
    rect("manifest", 150, 220, 265, 82, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("coding-assistant", 610, 205, 430, 112, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("director-skills", 1235, 220, 300, 82, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    arrow("manifest-to-assistant", 415, 261, [[0, 0], [195, 0]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    arrow("skills-to-assistant", 1235, 261, [[0, 0], [-195, 0]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    label("instruction-title", 120, 184, 480, 28, "INSTRUCTION CONTROL LANE", {
      size: 18,
      color: "#695b83",
      weight: 700,
    }),
    label("manifest-label", 165, 238, 235, 45, "YAML manifest\nstage order · gates · criteria", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("assistant-label", 630, 226, 390, 62, "Coding assistant = orchestrator\n读取规则 · 选择工具 · 写入工件\n不是隐藏的 Python 调度器", {
      size: 18,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("skills-label", 1250, 238, 270, 45, "Markdown director skills\n领域做法 · review focus", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    rect("film-strip", 75, 405, 1550, 350, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 3,
      opacity: 36,
      role: "section",
    }),
    label("river-title", 105, 370, 750, 30, "CANONICAL ARTIFACT RIVER · 每一格都是可验证的 JSON 交接面", {
      size: 20,
      color: "#76510e",
      weight: 700,
    }),
    rect("stage-research", 105, 465, 165, 215, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("stage-proposal", 295, 465, 165, 215, {
      fill: palette.canvas,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("stage-script", 485, 465, 165, 215, {
      fill: palette.canvas,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("stage-scene", 675, 465, 165, 215, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("stage-assets", 865, 465, 165, 215, {
      fill: palette.canvas,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("stage-edit", 1055, 465, 165, 215, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("stage-compose", 1245, 465, 165, 215, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("stage-publish", 1435, 465, 165, 215, {
      fill: palette.canvas,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    arrow("research-proposal", 270, 572, [[0, 0], [25, 0]], {
      color: "#9a6c17",
    }),
    arrow("proposal-script", 460, 572, [[0, 0], [25, 0]], {
      color: "#9a6c17",
    }),
    arrow("script-scene", 650, 572, [[0, 0], [25, 0]], {
      color: "#9a6c17",
    }),
    arrow("scene-assets", 840, 572, [[0, 0], [25, 0]], {
      color: "#9a6c17",
    }),
    arrow("assets-edit", 1030, 572, [[0, 0], [25, 0]], {
      color: "#9a6c17",
    }),
    arrow("edit-compose", 1220, 572, [[0, 0], [25, 0]], {
      color: "#9a6c17",
    }),
    arrow("compose-publish", 1410, 572, [[0, 0], [25, 0]], {
      color: "#9a6c17",
    }),
    label("research-label", 117, 487, 142, 160, "RESEARCH\n\nresearch_brief\n\n来源、受众\n约束", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("proposal-label", 307, 487, 142, 160, "PROPOSAL\n\nproposal_packet\n\n方向、预算\n\nHUMAN GATE", {
      size: 16,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("script-label", 497, 487, 142, 160, "SCRIPT\n\nbrief + script\n\n叙事、时长\n\nHUMAN GATE", {
      size: 16,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("scene-label", 687, 487, 142, 160, "SCENE PLAN\n\nscene_plan\n\n镜头、时间轴\n资产需求", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("assets-label", 877, 487, 142, 160, "ASSETS\n\nasset_manifest\n\npath · provider\nlicense 可选\n\nHUMAN GATE", {
      size: 16,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("edit-label", 1067, 487, 142, 160, "EDIT\n\nedit_decisions\n\nruntime 锁定\n回退显式记录", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("compose-label", 1257, 487, 142, 160, "COMPOSE\n\nrender_report\n\n路径、时长\n验证备注", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("publish-label", 1447, 487, 142, 160, "PUBLISH\n\npublish_log\n\n本地 export\n≠ 平台上传\n\nHUMAN GATE", {
      size: 16,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    rect("runtime-lane", 95, 815, 1510, 245, {
      fill: palette.blue,
      stroke: "#58788a",
      opacity: 45,
      role: "section",
    }),
    rect("tool-registry", 135, 875, 285, 120, {
      fill: palette.canvas,
      stroke: "#58788a",
    }),
    rect("external-providers", 470, 875, 265, 120, {
      fill: palette.vermilion,
      stroke: palette.red,
    }),
    rect("checkpoint-state", 785, 875, 300, 120, {
      fill: palette.canvas,
      stroke: "#58788a",
    }),
    rect("cost-ledger", 1135, 875, 210, 120, {
      fill: palette.canvas,
      stroke: "#58788a",
    }),
    rect("validators", 1395, 875, 175, 120, {
      fill: palette.sage,
      stroke: "#5f7f6b",
    }),
    arrow("assistant-to-river", 825, 317, [[0, 0], [0, 88]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("registry-to-river", 277, 875, [[0, 0], [0, -120]], {
      color: "#58788a",
    }),
    arrow("provider-to-assets", 600, 875, [[0, 0], [0, -70], [345, -70], [345, -120]], {
      color: palette.red,
    }),
    arrow("checkpoint-to-river", 935, 875, [[0, 0], [0, -120]], {
      color: "#58788a",
    }),
    arrow("validator-to-compose", 1482, 875, [[0, 0], [0, -60], [-155, -60], [-155, -120]], {
      color: "#5f7f6b",
    }),
    label("runtime-title", 120, 825, 790, 28, "EXECUTION & VERIFICATION LANE · Python 运行确定性机制，外部服务保留不确定副作用", {
      size: 18,
      color: "#385d70",
      weight: 700,
    }),
    label("registry-label", 152, 898, 250, 70, "Python tool registry\nToolResult · selector / fallback\nside_effects · idempotency hints", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("provider-label", 487, 898, 230, 70, "External asset providers\n付费调用 · 版权来源 · 未知结果\ncheckpoint 不能撤销副作用", {
      size: 17,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("checkpoint-label", 802, 896, 266, 76, "Atomic checkpoint JSON\ncompleted / failed / awaiting_human\nprerequisite + approval enforcement\n历史归档 best-effort", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("cost-label", 1150, 898, 180, 70, "Cost ledger\nestimate → reserve\n→ reconcile\n记账 ≠ 回滚", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("validator-label", 1408, 898, 150, 72, "Independent checks\nJSON Schema\nffprobe / lint\n≠ self-review", {
      size: 16,
      align: "center",
      color: "#3f654d",
      weight: 700,
    }),
    label(
      "footer-openmontage",
      100,
      1110,
      1500,
      42,
      "Skill 描述“应该怎样做” · Tool 执行“这一步做了什么” · Artifact 固化交接 · Checkpoint 固化阶段状态 · Validator 证明有限性质 · 人批准不可外包",
      { size: 17, color: palette.muted, align: "center", weight: 700 },
    ),
  ];

  return scene(elements);
}

function tradingAgentsEvidenceDebateGraph() {
  const elements = [
    ...heading(
      "TradingAgents · 多 Agent 证据法庭",
      "角色数量制造观点声部；只有独立来源、时间一致性与外部评测才能证明信息增益",
    ),
    rect("evidence-boundary", 75, 195, 315, 785, {
      fill: palette.blue,
      stroke: "#58788a",
      strokeWidth: 3,
      opacity: 46,
      role: "section",
    }),
    label("evidence-title", 105, 215, 250, 52, "MARKET EVIDENCE\n证据准入与时间截点", {
      size: 20,
      color: "#385d70",
      align: "center",
      weight: 700,
    }),
    rect("price-evidence", 115, 315, 235, 105, {
      fill: palette.canvas,
      stroke: "#58788a",
    }),
    rect("news-evidence", 115, 450, 235, 105, {
      fill: palette.canvas,
      stroke: "#58788a",
    }),
    rect("social-evidence", 115, 585, 235, 105, {
      fill: palette.canvas,
      stroke: "#58788a",
    }),
    rect("fund-evidence", 115, 720, 235, 105, {
      fill: palette.canvas,
      stroke: "#58788a",
    }),
    rect("cutoff-gate", 105, 865, 255, 78, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    label("price-label", 130, 338, 205, 52, "Price / indicators\nverified snapshot", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("news-label", 130, 473, 205, 52, "News / macro / insider\nsource timestamps", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("social-label", 130, 608, 205, 52, "Sentiment sources\nlive data may still move", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("fund-label", 130, 743, 205, 52, "Fundamentals\nfiling period ≤ trade date", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("cutoff-label", 120, 882, 225, 45, "TIME CUTOFF GATE\nfuture evidence = mistrial", {
      size: 17,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    rect("court", 430, 195, 1135, 785, {
      fill: palette.amber,
      stroke: "#9a6c17",
      opacity: 28,
      role: "section",
    }),
    label("court-title", 460, 210, 700, 28, "LANGGRAPH COURT RECORD · release v0.3.1 的 analyst 节点实际串行", {
      size: 19,
      color: "#76510e",
      weight: 700,
    }),
    rect("analyst-market", 465, 285, 210, 92, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("analyst-sentiment", 705, 285, 210, 92, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("analyst-news", 945, 285, 210, 92, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("analyst-fund", 1185, 285, 210, 92, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    arrow("evidence-to-market", 390, 330, [[0, 0], [75, 0]], {
      color: "#58788a",
      strokeWidth: 3,
    }),
    arrow("market-sentiment", 675, 330, [[0, 0], [30, 0]], {
      color: "#9a6c17",
    }),
    arrow("sentiment-news", 915, 330, [[0, 0], [30, 0]], {
      color: "#9a6c17",
    }),
    arrow("news-fund", 1155, 330, [[0, 0], [30, 0]], {
      color: "#9a6c17",
    }),
    label("market-analyst-label", 480, 305, 180, 52, "Market Analyst\nreport + tools", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("sentiment-analyst-label", 720, 305, 180, 52, "Sentiment Analyst\nreport + tools", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("news-analyst-label", 960, 305, 180, 52, "News Analyst\nreport + tools", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("fund-analyst-label", 1200, 305, 180, 52, "Fundamentals Analyst\nreport + tools", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    rect("common-correlation", 510, 405, 840, 72, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 2,
    }),
    label("correlation-label", 530, 421, 800, 42, "COMMON-MODE RISK · 同一 quick model 家族 + 共享报告 + 相同目标与提示风格\n四份意见不等于四份独立证据", {
      size: 17,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    rect("bull", 520, 525, 255, 120, {
      fill: palette.sage,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("bear", 990, 525, 255, 120, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("research-manager", 800, 535, 165, 100, {
      fill: palette.violet,
      stroke: "#695b83",
      strokeWidth: 3,
    }),
    arrow("reports-to-bull", 830, 377, [[0, 0], [-180, 148]], {
      color: "#5f7f6b",
    }),
    arrow("reports-to-bear", 1050, 377, [[0, 0], [65, 148]], {
      color: palette.red,
    }),
    arrow("bull-to-bear", 775, 555, [[0, 0], [215, 0]], {
      color: "#5f7f6b",
    }),
    arrow("bear-to-bull", 990, 615, [[0, 0], [-215, 0]], {
      color: palette.red,
    }),
    arrow("bull-to-manager", 775, 585, [[0, 0], [25, 0]], {
      color: "#695b83",
    }),
    arrow("bear-to-manager", 990, 585, [[0, 0], [-25, 0]], {
      color: "#695b83",
    }),
    label("bull-label", 540, 548, 215, 65, "BULL COUNSEL\n同一 evidence record\n寻找支持面", {
      size: 18,
      align: "center",
      color: "#3f654d",
      weight: 700,
    }),
    label("bear-label", 1010, 548, 215, 65, "BEAR COUNSEL\n同一 evidence record\n寻找反对面", {
      size: 18,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("manager-label", 815, 554, 135, 62, "Research\nManager\nDEEP MODEL", {
      size: 17,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    rect("trader", 800, 690, 165, 90, {
      fill: palette.canvas,
      stroke: palette.ink,
      strokeWidth: 3,
    }),
    arrow("manager-to-trader", 882, 635, [[0, 0], [0, 55]], {
      strokeWidth: 3,
    }),
    label("trader-label", 815, 710, 135, 50, "TRADER\nproposal\nQUICK MODEL", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    rect("risk-aggressive", 510, 835, 215, 92, {
      fill: palette.vermilion,
      stroke: palette.red,
    }),
    rect("risk-neutral", 775, 835, 215, 92, {
      fill: palette.canvas,
      stroke: "#9a6c17",
    }),
    rect("risk-conservative", 1040, 835, 215, 92, {
      fill: palette.sage,
      stroke: "#5f7f6b",
    }),
    arrow("trader-to-aggressive", 800, 735, [[0, 0], [-182, 100]], {
      color: palette.red,
    }),
    arrow("aggressive-neutral", 725, 880, [[0, 0], [50, 0]], {
      color: "#9a6c17",
    }),
    arrow("neutral-conservative", 990, 880, [[0, 0], [50, 0]], {
      color: "#5f7f6b",
    }),
    label("risk-aggressive-label", 525, 855, 185, 52, "AGGRESSIVE\n风险寻求声部", {
      size: 17,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("risk-neutral-label", 790, 855, 185, 52, "NEUTRAL\n中性声部", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("risk-conservative-label", 1055, 855, 185, 52, "CONSERVATIVE\n风险保守声部", {
      size: 17,
      align: "center",
      color: "#3f654d",
      weight: 700,
    }),
    rect("portfolio-judge", 1305, 645, 215, 165, {
      fill: palette.violet,
      stroke: "#695b83",
      strokeWidth: 4,
    }),
    arrow("risk-to-judge", 1255, 880, [[0, 0], [85, 0], [85, -70]], {
      color: "#695b83",
      strokeWidth: 3,
    }),
    label("judge-label", 1325, 674, 175, 105, "PORTFOLIO\nMANAGER\n\nBuy / Overweight\nHold / Underweight / Sell\nDEEP MODEL", {
      size: 17,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    rect("output-boundary", 1590, 565, 0, 335, {
      fill: palette.canvas,
      strokeWidth: 0,
      opacity: 0,
    }),
    arrow("judge-to-output", 1520, 727, [[0, 0], [90, 0]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    rect("research-output", 1610, 650, 0, 150, {
      fill: palette.canvas,
      strokeWidth: 0,
      opacity: 0,
    }),
    label("output-label", 1535, 660, 150, 145, "RESEARCH OUTPUT\n\nrating + rationale\nreport tree\nmemory log\n\nNO BROKER ADAPTER\nNO REAL ORDER", {
      size: 16,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    rect("tests-band", 75, 1025, 1490, 115, {
      fill: palette.blue,
      stroke: "#58788a",
      opacity: 48,
      role: "section",
    }),
    label("tests-label", 105, 1045, 1430, 66, "INDEPENDENCE TESTS · 来源重叠率 · 不同模型/供应商交叉 · 隐藏 counter-evidence · 截点一致性 · 去掉 debate 的消融 · 多次重复分布 · 真实费用/滑点/流动性外部评测", {
      size: 18,
      align: "center",
      color: "#385d70",
      weight: 700,
    }),
    label(
      "footer-tradingagents",
      100,
      1165,
      1500,
      28,
      "观点多样性是一种组织结构 · 证据独立性是一种可测统计属性 · LangGraph 记录谁说了什么，但不会自动让共同错误互相抵消",
      { size: 17, color: palette.muted, align: "center", weight: 700 },
    ),
  ];

  return scene(elements);
}

function openHandsEventSourcedRuntime() {
  const elements = [
    ...heading(
      "OpenHands V1 · Conversation as Database",
      "无状态 step 读取事件投影、提出 action；Conversation 持久化内部事实，但外部副作用仍需要幂等与对账",
    ),
    rect("conversation-boundary", 70, 190, 1115, 770, {
      fill: palette.blue,
      stroke: "#58788a",
      strokeWidth: 3,
      opacity: 34,
      role: "section",
    }),
    label(
      "conversation-title",
      95,
      205,
      720,
      30,
      "CONVERSATION BOUNDARY · lifecycle、event append、base state 与 active branch 的唯一协调者",
      { size: 19, color: "#385d70", weight: 700 },
    ),
    rect("base-state", 105, 280, 270, 150, {
      fill: palette.violet,
      stroke: "#695b83",
      strokeWidth: 2,
    }),
    label(
      "base-state-label",
      125,
      306,
      230,
      98,
      "BASE STATE SNAPSHOT\nbase_state.json\n\nstatus · stats · agent config\nagent_state · secrets metadata\n字段更新会覆盖保存",
      { size: 16, align: "center", color: "#695b83", weight: 700 },
    ),
    rect("projected-view", 430, 280, 300, 150, {
      fill: palette.sage,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    label(
      "projected-view-label",
      450,
      310,
      260,
      88,
      "DERIVED ACTIVE VIEW\n\npath_to_root(leaf)\n增量 replay / branch rebuild\n只读缓存 · 不单独持久化",
      { size: 17, align: "center", color: "#3f654d", weight: 700 },
    ),
    rect("stateless-step", 800, 270, 320, 170, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 4,
    }),
    label(
      "stateless-step-label",
      825,
      301,
      270,
      106,
      "STATELESS AGENT STEP\n\n读取 active event view\ncondense → LLM → tool call\n自身不跨 step 持有可变状态",
      { size: 18, align: "center", color: "#76510e", weight: 700 },
    ),
    arrow("view-to-step", 730, 355, [[0, 0], [70, 0]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    arrow("events-to-view", 580, 590, [[0, 0], [0, -160]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("event-log-band", 105, 535, 1010, 220, {
      fill: palette.canvas,
      stroke: "#58788a",
      strokeWidth: 3,
      role: "section",
    }),
    label(
      "event-log-heading",
      125,
      552,
      730,
      26,
      "APPEND-ONLY TYPED EVENT LOG · events/event-*.json · immutable Pydantic events",
      { size: 18, color: "#385d70", weight: 700 },
    ),
    rect("user-event", 135, 615, 190, 90, {
      fill: palette.blue,
      stroke: "#58788a",
    }),
    rect("action-event", 410, 615, 200, 90, {
      fill: palette.amber,
      stroke: "#9a6c17",
    }),
    rect("observation-event", 695, 615, 220, 90, {
      fill: palette.sage,
      stroke: "#5f7f6b",
    }),
    rect("control-event", 965, 615, 120, 90, {
      fill: palette.violet,
      stroke: "#695b83",
    }),
    label("user-event-label", 150, 637, 160, 50, "1 · MessageEvent\nsource=user", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label("action-event-label", 425, 637, 170, 50, "2 · ActionEvent\nsource=agent", {
      size: 17,
      align: "center",
      weight: 700,
    }),
    label(
      "observation-event-label",
      710,
      637,
      190,
      50,
      "3 · ObservationEvent\nsource=environment",
      { size: 17, align: "center", weight: 700 },
    ),
    label(
      "control-event-label",
      975,
      627,
      100,
      68,
      "state update\npause\ncondensation\nerror",
      { size: 15, align: "center", color: "#695b83", weight: 700 },
    ),
    arrow("user-to-action", 325, 660, [[0, 0], [85, 0]], {
      color: "#58788a",
      strokeWidth: 3,
    }),
    arrow("action-to-observation", 610, 660, [[0, 0], [85, 0]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    arrow("observation-to-control", 915, 660, [[0, 0], [50, 0]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    arrow("step-to-action", 950, 440, [[0, 0], [0, 95], [-440, 95], [-440, 175]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    label(
      "source-role-note",
      135,
      718,
      940,
      26,
      "Event.source 记录来源；LLM role 只决定如何投影给模型。两者不能互相推断。",
      { size: 16, color: palette.muted, align: "center" },
    ),
    rect("local-remote-api", 105, 805, 1010, 115, {
      fill: palette.canvas,
      stroke: "#58788a",
      strokeWidth: 2,
    }),
    label(
      "local-remote-label",
      130,
      829,
      960,
      65,
      "ONE CONVERSATION API\nLocalConversation：同进程 + LocalWorkspace（直接 host access）\nRemoteConversation：HTTP + WebSocket → Agent Server + RemoteWorkspace（容器 / VM 隔离）",
      { size: 18, align: "center", weight: 700 },
    ),
    rect("runtime-boundary", 1230, 190, 400, 770, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 3,
      opacity: 32,
      role: "section",
    }),
    label(
      "runtime-title",
      1260,
      210,
      340,
      52,
      "RUNTIME / SERVICE BOUNDARY\n执行身体与外部世界",
      { size: 20, color: "#76510e", align: "center", weight: 700 },
    ),
    rect("workspace", 1280, 305, 300, 120, {
      fill: palette.canvas,
      stroke: "#9a6c17",
      strokeWidth: 3,
    }),
    label(
      "workspace-label",
      1300,
      330,
      260,
      72,
      "Workspace\nfiles · shell · processes\n\nmutable world state\n不由 event replay 推导",
      { size: 17, align: "center", weight: 700 },
    ),
    rect("external-service", 1280, 485, 300, 115, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    label(
      "external-service-label",
      1300,
      508,
      260,
      70,
      "External service\nGitHub · API · ticket · payment\n\nirreversible / independently mutable",
      { size: 17, align: "center", color: palette.red, weight: 700 },
    ),
    arrow("action-to-workspace", 1115, 625, [[0, 0], [90, 0], [90, -260], [165, -260]], {
      color: "#9a6c17",
      strokeWidth: 3,
    }),
    arrow("action-to-service", 1115, 675, [[0, 0], [70, 0], [70, -132], [165, -132]], {
      color: palette.red,
      strokeWidth: 3,
    }),
    arrow("runtime-to-observation", 1280, 725, [[0, 0], [-95, 0], [-95, -20], [-365, -20]], {
      color: "#5f7f6b",
      strokeWidth: 3,
    }),
    label(
      "runtime-return-label",
      1240,
      760,
      360,
      55,
      "tool result → ObservationEvent\n只有 observation 落盘后，内部历史才知道执行结果",
      { size: 16, align: "center", color: "#3f654d", weight: 700 },
    ),
    rect("crash-window", 1260, 835, 340, 95, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 4,
    }),
    label(
      "crash-window-label",
      1280,
      852,
      300,
      60,
      "CRASH WINDOW\n外部写入成功 → 进程崩溃\n→ ObservationEvent 尚未追加",
      { size: 17, align: "center", color: palette.red, weight: 700 },
    ),
    rect("recovery-band", 70, 1010, 1560, 145, {
      fill: palette.sage,
      stroke: "#5f7f6b",
      strokeWidth: 3,
      opacity: 45,
      role: "section",
    }),
    label(
      "recovery-heading",
      95,
      1025,
      620,
      28,
      "MINIMUM RECOVERY PROTOCOL · event replay 只是第一步",
      { size: 19, color: "#3f654d", weight: 700 },
    ),
    label(
      "recovery-route",
      105,
      1070,
      1500,
      58,
      "1 读 base state + event log → 2 恢复 active branch / derived view → 3 找 orphan ActionEvent → 4 用 operation_id 查询外部世界 → 5 已成功则补 observation，未发生才重试 → 6 人工处理 unknown",
      { size: 17, align: "center", color: "#3f654d", weight: 700 },
    ),
    label(
      "footer-openhands",
      105,
      1175,
      1500,
      28,
      "Append-only log 能恢复 Agent 对过去的认识 · 不能撤销世界已经发生的变化 · optional isolation 也不会自动提供 exactly-once",
      { size: 17, color: palette.muted, align: "center", weight: 700 },
    ),
  ];

  return scene(elements);
}

function agentSystemConstitutionalRoute() {
  const elements = [
    ...heading(
      "Agent 系统设计 · 控制权宪法之河",
      "Agent 不是成熟度等级；每种形态都在重新分配下一步、状态、执行身体、强制边界与产品表面的所有权",
    ),
    rect("constitution-band", 70, 180, 1560, 185, {
      fill: palette.violet,
      stroke: "#695b83",
      opacity: 34,
      role: "section",
    }),
    label("constitution-title", 95, 195, 430, 28, "FIVE CONSTITUTIONAL QUESTIONS", {
      size: 19,
      color: "#695b83",
      weight: 700,
    }),
    rect("axis-control", 100, 250, 270, 85, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("axis-state", 405, 250, 270, 85, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("axis-body", 710, 250, 270, 85, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("axis-policy", 1015, 250, 270, 85, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    rect("axis-surface", 1320, 250, 270, 85, {
      fill: palette.canvas,
      stroke: "#695b83",
    }),
    label("axis-control-label", 115, 268, 240, 50, "1 · 谁控制下一步\nCODE · MODEL · HUMAN", {
      size: 17,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    label("axis-state-label", 420, 268, 240, 50, "2 · 状态在哪里\nRECORD · LOG · WORLD", {
      size: 17,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    label("axis-body-label", 725, 268, 240, 50, "3 · 用什么身体\nFUNCTION · TOOL · COMPUTER", {
      size: 17,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    label("axis-policy-label", 1030, 268, 240, 50, "4 · 哪一层能强制\nSCHEMA · GRAPH · SANDBOX", {
      size: 17,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    label("axis-surface-label", 1335, 268, 240, 50, "5 · 人从哪里协作\nFORM · CANVAS · CLI · CHAT", {
      size: 17,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    rect("river-band", 70, 425, 1560, 375, {
      fill: palette.blue,
      stroke: "#58788a",
      strokeWidth: 3,
      opacity: 42,
      role: "section",
    }),
    label(
      "river-title",
      95,
      442,
      850,
      28,
      "CONSTITUTIONAL ROUTE · 每一段都必须有明确所有者，项目停靠点不是排名",
      { size: 19, color: "#385d70", weight: 700 },
    ),
    rect("stage-intent", 105, 555, 165, 105, {
      fill: palette.canvas,
      stroke: "#58788a",
      strokeWidth: 3,
    }),
    rect("stage-uncertainty", 320, 555, 175, 105, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 3,
    }),
    rect("stage-proposal", 545, 555, 175, 105, {
      fill: palette.amber,
      stroke: "#9a6c17",
      strokeWidth: 3,
    }),
    rect("stage-policy", 770, 520, 220, 175, {
      fill: palette.vermilion,
      stroke: palette.red,
      strokeWidth: 4,
    }),
    rect("stage-mutation", 1040, 555, 175, 105, {
      fill: palette.canvas,
      stroke: palette.red,
      strokeWidth: 3,
    }),
    rect("stage-evidence", 1265, 555, 175, 105, {
      fill: palette.sage,
      stroke: "#5f7f6b",
      strokeWidth: 3,
    }),
    rect("stage-memory", 1490, 555, 110, 105, {
      fill: palette.violet,
      stroke: "#695b83",
      strokeWidth: 3,
    }),
    label("stage-intent-label", 120, 580, 135, 58, "INTENT\nuser / event\nidentity", {
      size: 18,
      align: "center",
      weight: 700,
    }),
    label("stage-uncertainty-label", 335, 580, 145, 58, "UNCERTAINTY\n可写成函数吗\n证据是否足够", {
      size: 17,
      align: "center",
      color: "#76510e",
      weight: 700,
    }),
    label("stage-proposal-label", 560, 580, 145, 58, "EFFECT PROPOSAL\n模型选择下一步\n尚未改变世界", {
      size: 17,
      align: "center",
      color: "#76510e",
      weight: 700,
    }),
    label(
      "stage-policy-label",
      790,
      540,
      180,
      135,
      "POLICY GATE\n\nschema · code edge\napproval · scope\nidempotency · budget\n\nHUMAN / CODE OWNED",
      { size: 16, align: "center", color: palette.red, weight: 700 },
    ),
    label("stage-mutation-label", 1055, 580, 145, 58, "WORLD MUTATION\nshell · browser · API\n真实错误成本", {
      size: 17,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    label("stage-evidence-label", 1280, 580, 145, 58, "ARTIFACT / EVIDENCE\ndiff · report · media\nreceipt · external state", {
      size: 16,
      align: "center",
      color: "#3f654d",
      weight: 700,
    }),
    label("stage-memory-label", 1500, 580, 90, 58, "MEMORY\nEVAL\nSTOP", {
      size: 17,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    arrow("river-intent-uncertainty", 270, 607, [[0, 0], [50, 0]], {
      color: "#58788a",
      strokeWidth: 4,
    }),
    arrow("river-uncertainty-proposal", 495, 607, [[0, 0], [50, 0]], {
      color: "#9a6c17",
      strokeWidth: 4,
    }),
    arrow("river-proposal-policy", 720, 607, [[0, 0], [50, 0]], {
      color: "#9a6c17",
      strokeWidth: 4,
    }),
    arrow("river-policy-mutation", 990, 607, [[0, 0], [50, 0]], {
      color: palette.red,
      strokeWidth: 4,
    }),
    arrow("river-mutation-evidence", 1215, 607, [[0, 0], [50, 0]], {
      color: palette.red,
      strokeWidth: 4,
    }),
    arrow("river-evidence-memory", 1440, 607, [[0, 0], [50, 0]], {
      color: "#5f7f6b",
      strokeWidth: 4,
    }),
    rect("port-openclaw", 90, 480, 210, 50, {
      fill: palette.violet,
      stroke: "#695b83",
    }),
    label("port-openclaw-label", 102, 492, 186, 26, "OpenClaw · identity gateway", {
      size: 14,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    rect("port-taxhacker", 300, 700, 190, 50, {
      fill: palette.sage,
      stroke: "#5f7f6b",
    }),
    label("port-taxhacker-label", 315, 712, 160, 26, "TaxHacker · bounded AI", {
      size: 15,
      align: "center",
      color: "#3f654d",
      weight: 700,
    }),
    rect("port-tradingagents", 315, 480, 190, 50, {
      fill: palette.amber,
      stroke: "#9a6c17",
    }),
    label("port-tradingagents-label", 330, 492, 160, 26, "TradingAgents · debate", {
      size: 15,
      align: "center",
      color: "#76510e",
      weight: 700,
    }),
    rect("port-pi", 535, 480, 120, 50, {
      fill: palette.canvas,
      stroke: palette.ink,
    }),
    label("port-pi-label", 550, 492, 90, 26, "Pi · minimal", {
      size: 15,
      align: "center",
      weight: 700,
    }),
    rect("port-claude", 665, 700, 145, 50, {
      fill: palette.canvas,
      stroke: palette.ink,
    }),
    label("port-claude-label", 677, 712, 121, 26, "Claude Code", {
      size: 15,
      align: "center",
      weight: 700,
    }),
    rect("port-codex", 820, 700, 120, 50, {
      fill: palette.canvas,
      stroke: palette.ink,
    }),
    label("port-codex-label", 835, 712, 90, 26, "Codex", {
      size: 15,
      align: "center",
      weight: 700,
    }),
    rect("port-n8n", 930, 480, 150, 50, {
      fill: palette.vermilion,
      stroke: palette.red,
    }),
    label("port-n8n-label", 945, 492, 120, 26, "n8n · code spine", {
      size: 15,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    rect("port-manus", 1050, 700, 155, 50, {
      fill: palette.canvas,
      stroke: palette.red,
    }),
    label("port-manus-label", 1065, 712, 125, 26, "Manus · computer", {
      size: 15,
      align: "center",
      color: palette.red,
      weight: 700,
    }),
    rect("port-openmontage", 1210, 710, 240, 50, {
      fill: palette.sage,
      stroke: "#5f7f6b",
    }),
    label("port-openmontage-label", 1225, 722, 210, 26, "OpenMontage · artifact line", {
      size: 14,
      align: "center",
      color: "#3f654d",
      weight: 700,
    }),
    rect("port-openhands", 1460, 710, 160, 50, {
      fill: palette.violet,
      stroke: "#695b83",
    }),
    label("port-openhands-label", 1470, 716, 140, 38, "OpenHands · event\nruntime", {
      size: 14,
      align: "center",
      color: "#695b83",
      weight: 700,
    }),
    arrow("dock-openclaw", 195, 530, [[0, 0], [0, 25]], {
      color: "#695b83",
      endArrowhead: null,
    }),
    arrow("dock-tradingagents", 410, 530, [[0, 0], [0, 25]], {
      color: "#9a6c17",
      endArrowhead: null,
    }),
    arrow("dock-pi", 595, 530, [[0, 0], [0, 25]], {
      color: palette.ink,
      endArrowhead: null,
    }),
    arrow("dock-n8n", 1005, 530, [[0, 0], [-120, 0], [-120, 5]], {
      color: palette.red,
      endArrowhead: null,
    }),
    arrow("dock-taxhacker", 395, 700, [[0, 0], [0, -40]], {
      color: "#5f7f6b",
      endArrowhead: null,
    }),
    arrow("dock-claude", 738, 700, [[0, 0], [0, -20], [100, -20]], {
      color: palette.ink,
      endArrowhead: null,
    }),
    arrow("dock-codex", 880, 700, [[0, 0], [0, -20]], {
      color: palette.ink,
      endArrowhead: null,
    }),
    arrow("dock-manus", 1128, 700, [[0, 0], [0, -40]], {
      color: palette.red,
      endArrowhead: null,
    }),
    arrow("dock-openmontage", 1330, 710, [[0, 0], [0, -50]], {
      color: "#5f7f6b",
      endArrowhead: null,
    }),
    arrow("dock-openhands", 1540, 710, [[0, 0], [0, -50]], {
      color: "#695b83",
      endArrowhead: null,
    }),
    label(
      "river-boundary-note",
      110,
      765,
      1490,
      24,
      "共同停止条件：若 world mutation 与 evidence 之间没有 receipt / reconciliation owner，任何 checkpoint、event log 或角色辩论都不能证明任务安全完成。",
      { size: 16, color: palette.muted, align: "center", weight: 700 },
    ),
    rect("decision-band", 70, 850, 1560, 285, {
      fill: palette.sage,
      stroke: "#5f7f6b",
      opacity: 36,
      role: "section",
    }),
    label("decision-title", 95, 867, 850, 28, "SHAPE DECISION TREE · 选择最小成立形态，而不是追求更多自治", {
      size: 19,
      color: "#3f654d",
      weight: 700,
    }),
    rect("shape-function", 100, 930, 220, 145, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    rect("shape-workflow", 345, 930, 220, 145, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    rect("shape-harness", 590, 930, 220, 145, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    rect("shape-event", 835, 930, 220, 145, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    rect("shape-gateway", 1080, 930, 220, 145, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    rect("shape-vertical", 1325, 930, 260, 145, {
      fill: palette.canvas,
      stroke: "#5f7f6b",
    }),
    label("shape-function-label", 115, 952, 190, 100, "BOUND FUNCTION\n\n一次 transformation\nschema + human commit\nTaxHacker", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("shape-workflow-label", 360, 952, 190, 100, "DETERMINISTIC WORKFLOW\n\n代码知道主路径\n模型只处理不确定节点\nn8n", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("shape-harness-label", 605, 952, 190, 100, "MODEL-LED HARNESS\n\n下一步依赖 observation\nPi · Claude Code · Codex", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("shape-event-label", 850, 948, 190, 108, "EVENT PLATFORM\n长任务 · resume\nremote surface\nOpenHands", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("shape-gateway-label", 1095, 952, 190, 100, "GATEWAY / COMPUTER\n\n常驻身份或完整执行身体\nOpenClaw · Manus", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    label("shape-vertical-label", 1340, 952, 230, 100, "VERTICAL ORGANIZATION\n\n领域工件、角色与验收独立\nOpenMontage · TradingAgents", {
      size: 16,
      align: "center",
      weight: 700,
    }),
    arrow("decision-function-workflow", 320, 1002, [[0, 0], [25, 0]], {
      color: "#5f7f6b",
    }),
    arrow("decision-workflow-harness", 565, 1002, [[0, 0], [25, 0]], {
      color: "#5f7f6b",
    }),
    arrow("decision-harness-event", 810, 1002, [[0, 0], [25, 0]], {
      color: "#5f7f6b",
    }),
    arrow("decision-event-gateway", 1055, 1002, [[0, 0], [25, 0]], {
      color: "#5f7f6b",
    }),
    arrow("decision-gateway-vertical", 1300, 1002, [[0, 0], [25, 0]], {
      color: "#5f7f6b",
    }),
    label(
      "footer-synthesis",
      100,
      1170,
      1500,
      42,
      "上一层回答“系统需要哪些 Harness 能力” · 本篇回答“能力交给谁、状态放哪里、哪一层能强制、谁为副作用和验收负责”",
      { size: 17, color: palette.muted, align: "center", weight: 700 },
    ),
  ];

  return scene(elements);
}

const diagrams = {
  "02-pi/pi-minimal-kernel": piMinimalKernel,
  "03-codex/codex-event-control-plane": codexEventControlPlane,
  "04-manus/manus-computer-to-artifact": manusComputerToArtifact,
  "05-n8n/n8n-deterministic-spine": n8nDeterministicSpine,
  "06-openclaw/openclaw-persistent-gateway": openclawPersistentGateway,
  "07-taxhacker/taxhacker-bounded-ai": taxhackerBoundedAi,
  "08-openmontage/openmontage-artifact-production-line": openMontageArtifactProductionLine,
  "09-tradingagents/tradingagents-evidence-debate-graph": tradingAgentsEvidenceDebateGraph,
  "10-openhands/openhands-event-sourced-runtime": openHandsEventSourcedRuntime,
  "11-synthesis/agent-system-constitutional-route": agentSystemConstitutionalRoute,
};

const requested = process.argv[2];

if (!requested || !diagrams[requested]) {
  console.error(
    `Usage: node scripts/build-agent-system-series-diagrams.mjs <${Object.keys(diagrams).join("|")}>`,
  );
  process.exit(2);
}

sequence = 0;
const outputPath = resolve(
  process.cwd(),
  "assets/diagrams/agent-system-series",
  `${requested}.excalidraw`,
);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(diagrams[requested](), null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
