import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { createStudioServer, lockStudio } from "./author-voice-studio.mjs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("a second studio cannot interrupt the first instance by recovering its jobs", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "voice-lock-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const release = await lockStudio(root);
  try {
    await assert.rejects(lockStudio(root), /已有作者工具/);
  } finally {
    release();
  }
  const next = await lockStudio(root);
  next();
});

test("the local studio rejects foreign hosts, origins and unauthenticated calls before any operation", async (t) => {
  let calls = 0;
  const server = createStudioServer({
    token: "local-fixture-token",
    service: {
      state: async () => ({ configured: true }),
      createVoice: async () => {
        calls++;
        return {};
      },
    },
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port,
    base = "http://127.0.0.1:" + port;
  assert.equal((await fetch(base + "/api/state")).status, 403);
  const foreignHost = await new Promise((resolve) => {
    const r = request(
      base + "/api/state",
      {
        headers: {
          "x-author-token": "local-fixture-token",
          Host: "evil.example",
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    r.end();
  });
  assert.equal(foreignHost, 403);
  assert.equal(
    (
      await fetch(base + "/api/voice", {
        method: "POST",
        headers: {
          "x-author-token": "local-fixture-token",
          Origin: "https://evil.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/voice", {
        method: "POST",
        headers: {
          "x-author-token": "wrong",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(calls, 0);
  const r = await fetch(base + "/api/session", {
    method: "POST",
    headers: {
      "x-author-token": "local-fixture-token",
      Origin: base,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie"), /HttpOnly/);
  const cookie = r.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await fetch(base + "/api/state", { headers: { cookie } })).status,
    200,
  );
  assert.equal(calls, 0);
  assert.equal(
    (await fetch(base + "/.env", { headers: { cookie } })).status,
    404,
  );
  assert.equal(
    (
      await fetch(base + "/scripts/lib/author-voice.mjs", {
        headers: { cookie },
      })
    ).status,
    404,
  );
});
