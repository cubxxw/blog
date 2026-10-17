import test from "node:test";
import assert from "node:assert/strict";
import {
  readerSections,
  makeAudioPrompt,
  updateAudioTracks,
} from "./lib/reader-audio.mjs";

test("section ranges follow real Markdown headings, including duplicate titles and fenced examples", () => {
  const body =
    "Intro\n\n## One\nA\n```md\n## Fake\n```\n### Detail\nB\n## One\nC";
  const rows = readerSections(body);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].title, "One");
  assert.match(rows[0].text, /Detail/);
  assert.equal(rows[2].occurrence, 2);
  assert.equal(rows[2].text, "## One\nC");
});
test("draft context is complete, scoped, source-only and in the article language", () => {
  const source = {
    title: "Story",
    body: "## First\nONLY FIRST\n## Second\nONLY SECOND",
    file: "content/en/growth/posts/story.md",
  };
  const section = readerSections(source.body)[1];
  const prompt = makeAudioPrompt(source, {
    kind: "section",
    sectionKey: section.key,
  });
  assert.match(prompt.context, /ONLY SECOND/);
  assert.ok(!prompt.context.includes("ONLY FIRST"));
  assert.match(prompt.instruction, /English/);
  assert.throws(() =>
    makeAudioPrompt(source, { kind: "section", sectionKey: "unknown" }),
  );
});
test("publishing another reader mode retains existing tracks and replaces only the same scope", () => {
  const a = "a".repeat(64),
    b = "b".repeat(64),
    c = "c".repeat(64);
  assert.deepEqual(
    updateAudioTracks(
      [
        { id: a, kind: "summary" },
        { id: b, kind: "section", sectionKey: "s2" },
      ],
      { id: c, kind: "summary" },
    ),
    [c, b],
  );
  assert.throws(() =>
    updateAudioTracks([{ id: "../../bad", kind: "summary" }], {
      id: c,
      kind: "summary",
    }),
  );
});

test("section replacement survives line shifts and does not remove another section at the same old line", () => {
  const a = "a".repeat(64),
    b = "b".repeat(64),
    c = "c".repeat(64);
  const previous = [
    {
      id: a,
      kind: "section",
      sectionKey: "s2",
      sectionTitle: "First",
      sectionOccurrence: 1,
    },
    {
      id: b,
      kind: "section",
      sectionKey: "s4",
      sectionTitle: "Second",
      sectionOccurrence: 1,
    },
  ];
  assert.deepEqual(
    updateAudioTracks(previous, {
      id: c,
      kind: "section",
      sectionKey: "s4",
      sectionTitle: "First",
      sectionOccurrence: 1,
    }),
    [c, b],
  );
});
