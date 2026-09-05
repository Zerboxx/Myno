import { test } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeRobloxPathArgs,
  parseRobloxPath,
  isClientContainerPath,
  isServerServicePath,
  isWorkspacePath,
  toDisplayPathText,
} from "./paths.js";

test("PHASE3: parses service-style StarterPlayerScripts.X (MCP form)", () => {
  const parsed = parseRobloxPath("StarterPlayerScripts.PlayerNametag");
  assert.ok(parsed);
  assert.equal(parsed.service, "StarterPlayerScripts");
  assert.deepEqual(parsed.segments, ["PlayerNametag"]);
  assert.equal(parsed.displayPath, "StarterPlayer.StarterPlayerScripts.PlayerNametag");
  assert.equal(parsed.mcpPath, "StarterPlayerScripts.PlayerNametag");
  assert.equal(parsed.gamePath, "game.StarterPlayer.StarterPlayerScripts.PlayerNametag");
});

test("PHASE3: parses Explorer-style StarterPlayer.StarterPlayerScripts.X", () => {
  const parsed = parseRobloxPath("StarterPlayer.StarterPlayerScripts.PlayerNametag");
  assert.ok(parsed);
  assert.equal(parsed.service, "StarterPlayerScripts");
  assert.deepEqual(parsed.segments, ["PlayerNametag"]);
  assert.equal(parsed.mcpPath, "StarterPlayerScripts.PlayerNametag");
  assert.equal(parsed.displayPath, "StarterPlayer.StarterPlayerScripts.PlayerNametag");
});

test("PHASE3: parses game-prefixed Workspace paths", () => {
  const parsed = parseRobloxPath("game.Workspace.Foo.Bar");
  assert.ok(parsed);
  assert.equal(parsed.service, "Workspace");
  assert.deepEqual(parsed.segments, ["Foo", "Bar"]);
  assert.equal(parsed.mcpPath, "Workspace.Foo.Bar");
  assert.equal(parsed.displayPath, "Workspace.Foo.Bar");
});

test("PHASE3: parses bare service leaves", () => {
  const parsed = parseRobloxPath("Workspace");
  assert.ok(parsed);
  assert.equal(parsed.service, "Workspace");
  assert.deepEqual(parsed.segments, []);
});

test("PHASE3: parses ServerScriptService.Systems.X and ReplicatedStorage.X", () => {
  for (const input of ["ServerScriptService.Systems.GameSystem", "ReplicatedStorage.Shared.SharedModule"]) {
    const parsed = parseRobloxPath(input);
    assert.ok(parsed, input);
    assert.notEqual(parsed.service, "game.");
    assert.notEqual(parsed.mcpPath.indexOf("game."), 0);
  }
});

test("PHASE3: rejects unknown roots and junk", () => {
  assert.equal(parseRobloxPath("TotallyFakeService.Sheep"), undefined);
  assert.equal(parseRobloxPath(""), undefined);
  assert.equal(parseRobloxPath(undefined), undefined);
  assert.equal(parseRobloxPath("  "), undefined);
  assert.equal(parseRobloxPath(123 as never), undefined);
});

test("PHASE3: normalizes args in place by key", () => {
  const args = normalizeRobloxPathArgs({
    file_path: "StarterPlayer.StarterPlayerScripts.PlayerNametag",
    className: "LocalScript",
    note: "StarterPlayerScripts (not a path param must survive)",
  });
  assert.equal(args.file_path, "StarterPlayerScripts.PlayerNametag");
  assert.equal(args.className, "LocalScript");
  assert.equal(args.note, "StarterPlayerScripts (not a path param must survive)");
});

test("PHASE3: normalizes parent + path keys too", () => {
  const args = normalizeRobloxPathArgs({
    parent: "game.Workspace",
    path: "ServerScriptService.Systems.Foo",
  });
  assert.equal(args.parent, "Workspace");
  assert.equal(args.path, "ServerScriptService.Systems.Foo");
});

test("PHASE3: leaves non-path values untouched", () => {
  const original = { source: "print('hi')", enabled: true };
  const result = normalizeRobloxPathArgs(original);
  assert.equal(result, original);
});

test("PHASE3: container/service classification", () => {
  assert.equal(isWorkspacePath("Workspace.PlayerNametag"), true);
  assert.equal(isWorkspacePath("game.Workspace"), true);
  assert.equal(isWorkspacePath("StarterPlayerScripts.X"), false);
  assert.equal(isClientContainerPath("StarterPlayerScripts.RGBNameTag"), true);
  assert.equal(isClientContainerPath("StarterCharacterScripts.X"), true);
  assert.equal(isClientContainerPath("StarterGui.ScreenGui"), true);
  assert.equal(isClientContainerPath("ServerScriptService.X"), false);
  assert.equal(isServerServicePath("ServerScriptService.Systems.GameSystem"), true);
  assert.equal(isServerServicePath("StarterPlayerScripts.X"), false);
});

test("PHASE3: display helper inverts the MCP form", () => {
  assert.equal(toDisplayPathText("StarterPlayerScripts.PlayerNametag"), "StarterPlayer.StarterPlayerScripts.PlayerNametag");
  assert.equal(toDisplayPathText("Workspace.Foo"), "Workspace.Foo");
});