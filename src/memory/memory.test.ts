import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildMemoryPrompt,
  detectUserPreferences,
  normalizeMemoryText,
  rankMemories,
  searchMemories,
  tokenizeMemoryText,
} from "./recall.js";
import { MemoryStore } from "./memory-store.js";
import type { MemoryEntry } from "./types.js";

function memory(partial: Partial<MemoryEntry>): MemoryEntry {
  const now = new Date().toISOString();

  return {
    id: partial.id ?? "m1",
    type: partial.type ?? "conversation",
    content: partial.content ?? "some content",
    tags: partial.tags ?? [],
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    hitCount: partial.hitCount ?? 0,
    source: partial.source ?? "test",
  };
}

test("tokenizeMemoryText handles Arabic + English, dedups, drops stop words", () => {
  const tokens = tokenizeMemoryText(
    "حسّن لوحة المتصدرين leaderboard اللي في StarterGui",
  );

  assert.ok(tokens.includes("حسّن"));
  assert.ok(tokens.includes("لوحة"));
  assert.ok(tokens.includes("المتصدرين"));
  assert.ok(tokens.includes("leaderboard"));
  assert.ok(tokens.includes("startergui"));
  assert.ok(!tokens.includes("في"));
  assert.ok(!tokens.includes("اللي"));
  assert.equal(new Set(tokens).size, tokens.length);
});

test("normalizeMemoryText lowercases and collapses whitespace", () => {
  assert.equal(
    normalizeMemoryText("  Make  The Panel\tCleaner  "),
    "make the panel cleaner",
  );
});

test("rankMemories returns only overlapping entries, relevance first", () => {
  const leaderboard = memory({
    id: "lead",
    type: "artifact",
    content: "Roblox artifact: leaderboard in StarterGui verified in Studio.",
    tags: ["leaderboard", "roblox", "startergui", "لوحة المتصدرين"],
  });
  const house = memory({
    id: "house",
    type: "conversation",
    content: "built a house in workspace",
  });

  const ranked = rankMemories("حسّن لوحة المتصدرين leaderboard", [house, leaderboard]);

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, "lead");
});

test("rankMemories boosts requested types and respects the limit", () => {
  const entries = [
    memory({
      id: "a",
      type: "artifact",
      content: "leaderboard ui in StarterGui",
      tags: ["leaderboard"],
    }),
    memory({
      id: "b",
      type: "conversation",
      content: "leaderboard was mentioned in chat",
      tags: ["leaderboard"],
    }),
    memory({
      id: "c",
      type: "artifact",
      content: "camera rig in Workspace",
      tags: ["camera"],
    }),
  ];

  const ranked = rankMemories("leaderboard", entries, {
    boostTypes: ["artifact"],
    limit: 1,
  });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, "a");
});

test("rankMemories ignores non-overlapping queries", () => {
  const entries = [
    memory({
      id: "a",
      content: "quest system with rewards",
      tags: ["quest"],
    }),
  ];

  assert.deepEqual(rankMemories("unrelated thing", entries), []);
});

test("searchMemories substring-matches content and sorts newest first", () => {
  const old = memory({
    id: "old",
    content: "older leaderboard note",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });
  const fresh = memory({
    id: "fresh",
    content: "leaderboard points fixed",
    updatedAt: "2025-02-01T00:00:00.000Z",
  });

  const found = searchMemories("leaderboard", [old, fresh]);

  assert.deepEqual(
    found.map((entry) => entry.id),
    ["fresh", "old"],
  );
});

test("buildMemoryPrompt renders rows or empty string", () => {
  assert.equal(buildMemoryPrompt([], "x"), "");

  const prompt = buildMemoryPrompt(
    [memory({ type: "preference", content: "do exactly what is asked" })],
    "الزو",
  );

  assert.ok(prompt.includes("PROJECT MEMORY"));
  assert.ok(prompt.includes("preference"));
  assert.ok(prompt.includes("do exactly what is asked"));
});

test("detectUserPreferences catches the standing exactness rule and Arabic", () => {
  const arExact = detectUserPreferences("متلمسش أي حاجة تانية، اعمل بالظبط اللي طلبته");

  assert.ok(arExact.some((p) => p.type === "preference"));
  assert.ok(arExact.some((p) => p.type === "preference" && /بالعربية/.test(p.content)));

  const enExact = detectUserPreferences(
    "do exactly what I ask and nothing else",
  );

  assert.ok(enExact.some((p) => p.type === "preference"));

  assert.deepEqual(detectUserPreferences("build the thing"), []);
});

test("MemoryStore persists, dedups, and evicts oldest entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mem-test-"));

  const storePath = join(dir, "memory.json");
  const store = new MemoryStore(storePath, 32);

  const first = await store.remember({
    type: "artifact",
    content: "LeaderboardGui in StarterGui",
    tags: ["leaderboard"],
  });

  assert.ok(first);

  const second = await store.remember({
    type: "artifact",
    content: "  leaderboardGUI in StarterGui  ",
    tags: ["roblox"],
  });

  assert.equal(second?.id, first?.id);
  assert.equal(second?.hitCount, 2);
  assert.ok(second?.tags.includes("roblox"));

  assert.equal(await store.count(), 1);

  const reloaded = new MemoryStore(storePath, 32);

  assert.equal((await reloaded.count()), 1);
  assert.equal((await reloaded.search("leaderboard")).length, 1);
});

test("MemoryStore respects its entry cap", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mem-cap-"));

  const store = new MemoryStore(join(dir, "memory.json"), 3);

  for (let i = 0; i < 10; i++) {
    await store.remember({
      type: "conversation",
      content: `task number ${i} done`,
      tags: [`t${i}`],
    });
  }

  assert.equal(await store.count(), 3);
});

test("MemoryStore disabled mode is a no-op", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mem-disabled-"));

  const store = new MemoryStore(join(dir, "memory.json"));

  store.setEnabled(false);

  assert.equal(
    await store.remember({ type: "fact", content: "x" }),
    null,
  );

  assert.equal((await store.recall("x")).entries.length, 0);
  assert.equal(await store.count(), 0);
  assert.equal((await store.clear()), 0);
});

test("MemoryStore recovers from a corrupt file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mem-corrupt-"));
  const storePath = join(dir, "memory.json");

  const { writeFile } = await import("node:fs/promises");

  await writeFile(storePath, "{ definitely not json", "utf8");

  const store = new MemoryStore(storePath);

  assert.equal(await store.count(), 0);

  await store.remember({ type: "fact", content: "recovered fine" });

  const files = await readdir(dir);

  assert.ok(files.some((file) => file.startsWith("memory.json.corrupt-")));

  const raw = await readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as { entries: unknown[] };

  assert.equal(parsed.entries.length, 1);
});