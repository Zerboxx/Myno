import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPlacementHints,
  buildLayout,
  detectElementRoles,
  extractExplicitElementName,
  renderEnsureFoldersScript,
  resolvePlacement,
  safeInstanceName,
} from "./rules.js";

test("safeInstanceName sanitizes and caps length", () => {
  assert.equal(
    safeInstanceName("E2EHelloScript", "Fallback"),
    "E2EHelloScript",
  );
  assert.equal(
    safeInstanceName(" my part ", "BuildArea"),
    "my part",
  );
  assert.equal(
    safeInstanceName(undefined, "DataService"),
    "DataService",
  );
  assert.equal(
    safeInstanceName("  ", "DataService"),
    "DataService",
  );
  assert.equal(
    safeInstanceName(" 1st", "BuildArea"),
    "BuildArea_1st",
  );
});

test("server-data resolves to ServerScriptService.Services with a Script", () => {
  const placement = resolvePlacement("server-data", {
    explicitName: "CoinService",
  });

  assert.equal(placement.root, "ServerScriptService");
  assert.equal(placement.folder, "Services");
  assert.equal(placement.className, "Script");
  assert.equal(
    placement.indexPath,
    "ServerScriptService.Services.CoinService",
  );
});

test("client-controller resolves to StarterPlayerScripts.Controllers as a LocalScript", () => {
  const placement = resolvePlacement("client-controller", {
    explicitName: "UIController",
  });

  assert.equal(
    placement.root,
    "StarterPlayer.StarterPlayerScripts",
  );
  assert.equal(placement.folder, "Controllers");
  assert.equal(placement.className, "LocalScript");
  assert.equal(
    placement.indexPath,
    "StarterPlayer.StarterPlayerScripts.Controllers.UIController",
  );
});

test("shared remotes map create RemoteFunction when a function is requested", () => {
  const event = resolvePlacement("shared-remote");

  assert.equal(event.className, "RemoteEvent");
  assert.equal(
    event.indexPath,
    "ReplicatedStorage.Remotes.GameEvents",
  );

  const fn = resolvePlacement("shared-remote", {
    explicitName: "RequestAsset",
    remoteIsFunction: true,
  });

  assert.equal(fn.className, "RemoteFunction");
  assert.equal(
    fn.indexPath,
    "ReplicatedStorage.Remotes.RequestAsset",
  );
});

test("shared modules land in ReplicatedStorage.Shared", () => {
  const module = resolvePlacement("shared-module", {
    explicitName: "Utils",
  });

  assert.equal(module.root, "ReplicatedStorage");
  assert.equal(module.className, "ModuleScript");
});

test("detectElementRoles: economy keywords pick server-data", () => {
  assert.deepEqual(
    detectElementRoles("build an economy with coins and a leaderboard"),
    ["server-data"],
  );
});

test("detectElementRoles: NPCs and world keywords coexist", () => {
  const roles = detectElementRoles(
    "add zombie NPCs that chase the player inside the map building",
  );

  assert.ok(roles.includes("npc"));
  assert.ok(roles.includes("world"));
});

test("detectElementRoles: Arabic quest/reward detection", () => {
  const roles = detectElementRoles(
    "اعمل مهمات ومكافآت هنعمل عليها متجر",
  );

  assert.ok(roles.includes("server-data"));
});

test("detectElementRoles: UI and input request", () => {
  const roles = detectElementRoles(
    "make a HUD menu with keyboard controls",
  );

  assert.ok(roles.includes("client-ui"));
  assert.ok(roles.includes("client-input"));
});

test("buildLayout produces a full authoritative structure for a multi-element request", () => {
  const layout = buildLayout({
    objective:
      "Build a shop system with coins, saves, and a HUD menu",
    intent: "building",
    domain: "roblox",
    needsRoblox: true,
    requiresBuild: true,
  });

  assert.ok(layout.placements.length >= 3);

  const data = layout.placements.find(
    (p) => p.role === "server-data",
  );
  assert.ok(data);
  assert.equal(data.className, "Script");
  assert.equal(
    data.indexPath,
    "ServerScriptService.Services.DataService",
  );

  const ui = layout.placements.find(
    (p) => p.role === "client-ui",
  );
  assert.ok(ui);
  assert.equal(ui.className, "ScreenGui");
  assert.equal(ui.indexPath, "StarterGui.MainHUD");

  assert.ok(
    layout.folders.includes(
      "ServerScriptService.Services",
    ),
  );
  assert.ok(
    layout.instruction.includes(
      "AUTHORITATIVE PLACEMENT",
    ),
  );
  assert.ok(
    layout.instruction.includes(
      "ServerScriptService.Services.DataService",
    ),
  );
});

test("buildLayout is empty for non-building tasks", () => {
  const layout = buildLayout({
    objective: "explain how teams work",
    intent: "analysis",
    needsRoblox: false,
    requiresBuild: false,
  });

  assert.equal(layout.placements.length, 0);
  assert.equal(layout.instruction, "");
});

test("buildLayout uses the explicit artifact name when present", () => {
  const layout = buildLayout({
    objective:
      "Create a Script named E2EHelloScript and run it",
    intent: "coding",
    domain: "roblox",
    needsRoblox: true,
    requiresBuild: true,
  });

  const primary = layout.placements[0];
  assert.ok(primary);
  assert.equal(
    primary.element,
    "E2EHelloScript",
  );
  assert.ok(
    primary.indexPath.endsWith("E2EHelloScript"),
  );
});

test("extractExplicitElementName picks the trailing identifier", () => {
  assert.equal(
    extractExplicitElementName(
      "Create a Script named GreeterScript",
    ),
    "GreeterScript",
  );
  assert.equal(
    extractExplicitElementName(
      "make it better",
    ),
    undefined,
  );
});

test("class-aware cues map each named artifact to its matching role", () => {
  const layout = buildLayout({
    objective:
      "Create a ModuleScript called ShopLib that lists prices, and a server Script called ShopServer that validates purchases using ShopLib",
    intent: "building",
    domain: "roblox",
    needsRoblox: true,
    requiresBuild: true,
  });

  const lib = layout.placements.find(
    (p) => p.role === "shared-module",
  );
  assert.ok(lib);
  assert.equal(lib.element, "ShopLib");
  assert.equal(
    lib.indexPath,
    "ReplicatedStorage.Shared.ShopLib",
  );
  assert.equal(lib.className, "ModuleScript");

  const server = layout.placements.find(
    (p) => p.role === "server-data",
  );
  assert.ok(server);
  assert.equal(server.element, "ShopServer");
  assert.equal(
    server.indexPath,
    "ServerScriptService.Services.ShopServer",
  );
  assert.equal(server.className, "Script");
});

test("applyPlacementHints does nothing without a layout", () => {
  const result = applyPlacementHints(
    "roblox_multi_edit",
    {
      file_path: "ServerScriptService.Services.ShopServer",
    },
    undefined,
  );

  assert.deepEqual(result.normalized, {
    file_path: "ServerScriptService.Services.ShopServer",
  });
  assert.deepEqual(result.applied, []);
});

test("applyPlacementHints only touches roblox_multi_edit", () => {
  const layout = buildLayoutForShop();
  const result = applyPlacementHints(
    "roblox_execute_luau",
    {
      file_path: "ReplicatedStorage.Shared.ShopLib",
    },
    layout,
  );

  assert.deepEqual(result.applied, []);
});

test("applyPlacementHints injects className and datamodel_type on match", () => {
  const layout = buildLayoutForShop();
  const result = applyPlacementHints(
    "roblox_multi_edit",
    {
      file_path:
        "ServerScriptService.Services.ShopServer",
    },
    layout,
  );

  assert.equal(result.normalized.className, "Script");
  assert.equal(result.normalized.datamodel_type, "Edit");
  assert.deepEqual(result.applied, [
    "className",
    "datamodel_type",
  ]);
});

test("applyPlacementHints never overrides a provided className", () => {
  const layout = buildLayoutForShop();
  const result = applyPlacementHints(
    "roblox_multi_edit",
    {
      file_path:
        "ReplicatedStorage.Shared.ShopLib",
      className: "ModuleScript",
      datamodel_type: "Edit",
    },
    layout,
  );

  assert.equal(result.normalized.className, "ModuleScript");
  assert.deepEqual(result.applied, []);
});

test("applyPlacementHints ignores paths outside the layout", () => {
  const layout = buildLayoutForShop();
  const result = applyPlacementHints(
    "roblox_multi_edit",
    {
      file_path: "Workspace.Whatever",
    },
    layout,
  );

  assert.deepEqual(result.applied, []);
});

test("renderEnsureFoldersScript emits one chain per role folder", () => {
  const code = renderEnsureFoldersScript([
    "ServerScriptService.Services",
    "ReplicatedStorage.Shared",
    "StarterPlayer.StarterPlayerScripts.Controllers",
  ]);

  assert.match(code, /ServerScriptService/);
  assert.match(code, /"Services"/);
  assert.match(code, /"ReplicatedStorage"/);
  assert.match(code, /"Shared"/);
  assert.match(code, /"Controllers"/);
  assert.match(code, /Instance\.new\("Folder"\)/);
  assert.ok(!code.includes("-- TODO"));
});

test("renderEnsureFoldersScript dedupes paths and returns empty for none", () => {
  assert.equal(renderEnsureFoldersScript([]), "");
  assert.equal(
    renderEnsureFoldersScript(
      [
        "ServerScriptService.Services",
        "ServerScriptService.Services",
      ],
    ),
    renderEnsureFoldersScript([
      "ServerScriptService.Services",
    ]),
  );
  assert.equal(
    renderEnsureFoldersScript(["ServerScriptService"]),
    "",
  );
});

function buildLayoutForShop() {
  return buildLayout({
    objective:
      "Create a ModuleScript called ShopLib that lists prices, and a server Script called ShopServer that validates purchases using ShopLib",
    intent: "building",
    domain: "roblox",
    needsRoblox: true,
    requiresBuild: true,
  });
}