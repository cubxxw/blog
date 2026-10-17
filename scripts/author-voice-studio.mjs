#!/usr/bin/env node
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, mkdir, writeFile, open, unlink } from "node:fs/promises";
import { unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { parseEnv } from "node:util";
import { createAuthorVoice, loadGeminiKey } from "./lib/author-voice.mjs";

const assets = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "author-voice-studio",
);
const equal = (a, b) => {
  const x = Buffer.from(a || ""),
    y = Buffer.from(b || "");
  return x.length === y.length && timingSafeEqual(x, y);
};
export async function lockStudio(root) {
  const file = path.join(root, ".author-voice/studio.lock");
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = await open(file, "wx", 0o600);
      await handle.writeFile(String(process.pid));
      await handle.close();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        try {
          unlinkSync(file);
        } catch {}
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const pid = Number(await readFile(file, "utf8"));
      let alive = true;
      try {
        if (Number.isInteger(pid) && pid > 0) process.kill(pid, 0);
        else throw Error("invalid pid");
      } catch (e) {
        if (e.code === "EPERM") alive = true;
        else alive = false;
      }
      if (alive)
        throw Object.assign(
          Error("已有作者工具正在运行。请使用原窗口，或先停止它。"),
          { public: true },
        );
      await unlink(file);
    }
  }
  throw Error("Cannot acquire author studio lock");
}
async function body(request) {
  let length = 0,
    parts = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 70 * 1024 * 1024) throw Error("录音文件过大。");
    parts.push(chunk);
  }
  return JSON.parse(Buffer.concat(parts).toString() || "{}");
}
export function createStudioServer({ token, service }) {
  return createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    const host = "127.0.0.1:" + res.socket.localPort,
      origin = "http://" + host;
    if (
      req.headers.host !== host ||
      (req.headers.origin && req.headers.origin !== origin)
    ) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const url = new URL(req.url, origin),
      cookie = /authorstudio=([A-Za-z0-9_-]+)/.exec(
        req.headers.cookie || "",
      )?.[1];
    const authorized =
      equal(req.headers["x-author-token"], token) || equal(cookie, token);
    const send = (status, value) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    try {
      if (url.pathname.startsWith("/api/")) {
        if (!authorized) {
          send(403, { error: "请从本机启动时显示的链接进入作者工具。" });
          return;
        }
        if (req.method === "POST") {
          if (
            !String(req.headers["content-type"]).startsWith("application/json")
          ) {
            send(415, { error: "请求格式不支持。" });
            return;
          }
          if (url.pathname === "/api/session") {
            res.setHeader(
              "Set-Cookie",
              "authorstudio=" + token + "; HttpOnly; SameSite=Strict; Path=/",
            );
            send(200, { ready: true });
            return;
          }
          const input = await body(req);
          if (url.pathname === "/api/voice") {
            send(200, await service.createVoice(input));
            return;
          }
          if (url.pathname === "/api/generate") {
            send(202, await service.generate(input));
            return;
          }
          if (url.pathname === "/api/recording") {
            send(202, await service.importRecording(input));
            return;
          }
          if (url.pathname === "/api/publish") {
            send(200, await service.publish(input));
            return;
          }
          if (url.pathname === "/api/cancel") {
            send(200, await service.cancel(input.id));
            return;
          }
        } else if (req.method === "GET") {
          if (url.pathname === "/api/state") {
            send(200, await service.state());
            return;
          }
          if (url.pathname === "/api/articles") {
            send(200, await service.articles());
            return;
          }
          if (url.pathname === "/api/article") {
            send(200, await service.article(url.searchParams.get("file")));
            return;
          }
          const id = /^\/api\/jobs\/([A-Za-z0-9_-]+)$/.exec(url.pathname)?.[1];
          if (id) {
            send(200, await service.job(id));
            return;
          }
          const media = /^\/api\/media\/([A-Za-z0-9_-]+)$/.exec(
            url.pathname,
          )?.[1];
          if (media) {
            const bytes = await service.media(media),
              range = req.headers.range;
            if (range) {
              const m = /^bytes=(\d+)-(\d*)$/.exec(range),
                start = Number(m?.[1]),
                end = m?.[2] ? Number(m[2]) : bytes.length - 1;
              if (
                !m ||
                start > end ||
                start >= bytes.length ||
                end >= bytes.length
              ) {
                res.writeHead(416, {
                  "Content-Range": "bytes */" + bytes.length,
                });
                res.end();
                return;
              }
              res.writeHead(206, {
                "Content-Type": "audio/mpeg",
                "Accept-Ranges": "bytes",
                "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
                "Content-Length": end - start + 1,
              });
              res.end(bytes.subarray(start, end + 1));
              return;
            }
            res.writeHead(200, {
              "Content-Type": "audio/mpeg",
              "Accept-Ranges": "bytes",
              "Content-Length": bytes.length,
            });
            res.end(bytes);
            return;
          }
        }
        send(404, { error: "找不到这个操作。" });
        return;
      }
      const files = {
          "/": ["index.html", "text/html; charset=utf-8"],
          "/studio.js": ["studio.js", "text/javascript; charset=utf-8"],
          "/studio.css": ["studio.css", "text/css; charset=utf-8"],
        },
        file = files[url.pathname];
      if (req.method !== "GET" || !file) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": file[1] });
      res.end(await readFile(path.join(assets, file[0])));
    } catch (error) {
      send(400, {
        error: error.public
          ? error.message
          : "这次操作未完成，请检查输入或重新进入本机作者工具。",
      });
    }
  });
}

async function main() {
  const args = process.argv.slice(2),
    value = (name) => {
      const at = args.indexOf(name);
      return at < 0 ? null : args[at + 1];
    };
  if (args.includes("--help")) {
    console.log(
      "npm run voice -- [--env-file /path/to/leafhour/.env] [--port 8636] [--no-open]\nOnly the Gemini key is read. Configuration paths and generated drafts stay in .author-voice/.",
    );
    return;
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    settingsFile = path.join(root, ".author-voice/settings.json");
  const settings = await readFile(settingsFile, "utf8")
    .then(JSON.parse)
    .catch(() => ({}));
  const local = await readFile(path.join(root, ".env"), "utf8")
    .then(parseEnv)
    .catch(() => ({}));
  const envFile =
    value("--env-file") ||
    process.env.GEMINI_ENV_FILE ||
    settings.geminiEnvFile ||
    local.GEMINI_ENV_FILE ||
    path.join(root, ".env");
  const apiKey = await loadGeminiKey({ env: process.env, envFile });
  if (value("--env-file")) {
    await mkdir(path.dirname(settingsFile), { recursive: true, mode: 0o700 });
    await writeFile(
      settingsFile,
      JSON.stringify({ geminiEnvFile: path.resolve(envFile) }, null, 2) + "\n",
      { mode: 0o600 },
    );
  }
  const release = await lockStudio(root);
  process.once("exit", release);
  const service = await createAuthorVoice({ root, apiKey }),
    token = randomBytes(24).toString("base64url"),
    server = createStudioServer({ service, token }),
    port = Number(value("--port") || 8636);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw Error("请选择 1024–65535 之间的本机端口。");
  server.requestTimeout = 120000;
  server.listen(port, "127.0.0.1", () => {
    const url = "http://127.0.0.1:" + port + "/#" + token;
    console.log(
      "作者声音工具：" + url + "\n仅在本机运行；共享密钥不会发送到浏览器。",
    );
    if (!args.includes("--no-open")) {
      const command =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "explorer"
            : "xdg-open";
      const child = spawn(command, [url], { stdio: "ignore" });
      child.on("error", () => {});
    }
  });
  server.on("error", () => {
    release();
    console.error("本机端口无法使用，请换一个 --port。");
    process.exitCode = 1;
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(
      error.public
        ? error.message
        : "作者工具无法启动，请检查共享环境文件与启动参数。",
    );
    process.exitCode = 1;
  });
