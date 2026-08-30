import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeArtifacts,
  buildSecurityReview,
  classifyRunContext,
  evaluateSecurityGate,
  findingClearedBySources,
} from "./analyze.js";
import {
  buildSecurityDirectiveLines,
  renderSecurityDirective,
  roleSecurityRules,
} from "./directive.js";
import type { SecurityArtifact } from "./types.js";

test("classifyRunContext derives client/server/shared from class + path", () => {
  assert.equal(
    classifyRunContext("Script", "ServerScriptService.Services.SaveSystem"),
    "Server",
  );
  assert.equal(
    classifyRunContext("Script", "ServerStorage.Things.Tool"),
    "Server",
  );
  assert.equal(
    classifyRunContext("LocalScript", "ReplicatedStorage.X"),
    "Client",
  );
  assert.equal(
    classifyRunContext("Script", "StarterGui.UI.Driver"),
    "Client",
  );
  assert.equal(
    classifyRunContext("Script", "StarterPlayer.StarterPlayerScripts.Controller"),
    "Client",
  );
  assert.equal(
    classifyRunContext("ModuleScript", "ReplicatedStorage.Shared.Config"),
    "Shared",
  );
  assert.equal(
    classifyRunContext("ScreenGui", "StarterGui.Whatever"),
    "Client",
  );
});

test("game.Players.LocalPlayer in a server Script is a HIGH authority defect", () => {
  const flaws: SecurityArtifact[] = [
    {
      path: "ServerScriptService.Services.SaveSystem",
      className: "Script",
      source:
        'local player = game.Players.LocalPlayer\nlocal coins = player:FindFirstChild("Coins")',
    },
  ];

  const findings = analyzeArtifacts(flaws);

  const hit = findings.find(
    (f) => f.code === "AUTH-LOCALPLAYER-SERVER",
  );
  assert.ok(hit);
  assert.equal(hit.severity, "HIGH");
  assert.equal(hit.context, "Server");

  const review = buildSecurityReview(flaws);
  assert.deepEqual(
    review.blocking.map((f) => f.code),
    ["AUTH-LOCALPLAYER-SERVER"],
  );
});

test("the same LocalPlayer read in a shared ModuleScript is MEDIUM, not blocking", () => {
  const shared: SecurityArtifact[] = [
    {
      path: "ReplicatedStorage.Shared.Utils",
      className: "ModuleScript",
      source: "return game.Players.LocalPlayer",
    },
  ];

  const findings = analyzeArtifacts(shared);

  const hit = findings.find(
    (f) => f.code === "AUTH-LOCALPLAYER-SERVER",
  );
  assert.ok(hit);
  assert.equal(hit.severity, "MEDIUM");

  const review = buildSecurityReview(shared);
  assert.deepEqual(review.blocking, []);
});

test("DataStoreService in a LocalScript is a HIGH authority defect", () => {
  const clientBank: SecurityArtifact[] = [
    {
      path: "StarterPlayer.StarterPlayerScripts.Shop",
      className: "LocalScript",
      source:
        'local ds = game:GetService("DataStoreService")\nlocal store = ds:GetDataStore("Coins")',
    },
  ];

  const findings = analyzeArtifacts(clientBank);

  const hit = findings.find(
    (f) => f.code === "AUTH-DATASTORE-CLIENT",
  );
  assert.ok(hit);
  assert.equal(hit.severity, "HIGH");
  assert.equal(hit.category, "server-authority");
});

test("DataStoreService on the server is allowed (no finding)", () => {
  const serverData: SecurityArtifact[] = [
    {
      path: "ServerScriptService.Services.SaveSystem",
      className: "Script",
      source:
        'local ds = game:GetService("DataStoreService")\nlocal store = ds:GetDataStore("Coins")\nfor _, player in game:GetService("Players"):GetPlayers() do\n    store:SetAsync(player.UserId, {})\nend',
    },
  ];

  const findings = analyzeArtifacts(serverData);

  assert.deepEqual(findings, []);
});

test("client-only input services on the server are MEDIUM", () => {
  const serverInput: SecurityArtifact[] = [
    {
      path: "ServerScriptService.Systems.Controller",
      className: "Script",
      source:
        'game:GetService("UserInputService").InputBegan:Connect(function() end)',
    },
  ];

  const findings = analyzeArtifacts(serverInput);

  const hit = findings.find(
    (f) => f.code === "CLIENT-SERVICE-ON-SERVER",
  );
  assert.ok(hit);
  assert.equal(hit.severity, "MEDIUM");
});

test("FireServer from a server Script is a reversal (MEDIUM)", () => {
  const findings = analyzeArtifacts([
    {
      path: "ServerScriptService.Systems.Game",
      className: "Script",
      source: "events.BuyItem:FireServer(self, 5)",
    },
  ]);

  const hit = findings.find(
    (f) => f.code === "REMOTE-DIRECTION-SERVER",
  );
  assert.ok(hit);
  assert.equal(hit.severity, "MEDIUM");
});

test("OnServerEvent wired in a LocalScript is a mismatch (MEDIUM)", () => {
  const findings = analyzeArtifacts([
    {
      path: "StarterPlayer.StarterPlayerScripts.UI",
      className: "LocalScript",
      source:
        "remote.OnServerEvent:Connect(function() end)",
    },
  ]);

  const hit = findings.find(
    (f) => f.code === "REMOTE-HANDLER-MISMATCH",
  );
  assert.ok(hit);
  assert.equal(hit.severity, "MEDIUM");
});

test("unvalidated remote handler mutating state is a HIGH blocking finding", () => {
  const findings = analyzeArtifacts([
    {
      path: "ServerScriptService.Services.Wallet",
      className: "Script",
      source:
        'remote.OnServerEvent:Connect(function(player, amount)\n    local ds = game:GetService("DataStoreService")\n    ds:GetDataStore("C"):SetAsync(player.UserId, amount)\nend)',
    },
  ]);

  const hit = findings.find(
    (f) => f.code === "PAYLOAD-UNVALIDATED",
  );
  assert.ok(hit);
  assert.equal(hit.severity, "HIGH");
  assert.equal(hit.context, "Server");

  const review = buildSecurityReview([
    {
      path: "ServerScriptService.Services.Wallet",
      className: "Script",
      source:
        'remote.OnServerEvent:Connect(function(player, amount) ds:SetAsync(player.UserId, amount) end)',
    },
  ]);
  assert.deepEqual(
    review.blocking.map((f) => f.code),
    ["PAYLOAD-UNVALIDATED"],
  );
});

test("the same unvalidated handler shared is MEDIUM and never blocks", () => {
  const sharedReview = buildSecurityReview([
    {
      path: "ReplicatedStorage.Shared.Wallet",
      className: "ModuleScript",
      source:
        'remote.OnServerEvent:Connect(function(player, amount) ds:GetDataStore("C"):SetAsync(player.UserId, amount) end)',
    },
  ]);

  const hit = sharedReview.findings.find(
    (f) => f.code === "PAYLOAD-UNVALIDATED",
  );
  assert.ok(hit);
  assert.equal(hit.severity, "MEDIUM");
  assert.deepEqual(sharedReview.blocking, []);
});

test("a handler that validates payloads does not raise PAYLOAD-UNVALIDATED", () => {
  const findings = analyzeArtifacts([
    {
      path: "ServerScriptService.Services.Wallet",
      className: "Script",
      source:
        'remote.OnServerEvent:Connect(function(player, amount)\n    amount = tonumber(amount)\n    if typeof(amount) ~= "number" then return end\n    amount = math.clamp(amount, 0, 100000)\n    ds:GetDataStore("C"):SetAsync(player.UserId, amount)\nend)',
    },
  ]);

  const hit = findings.find(
    (f) => f.code === "PAYLOAD-UNVALIDATED",
  );
  assert.equal(hit, undefined);
});

test("findings are deduplicated per rule per artifact", () => {
  const findings = analyzeArtifacts([
    {
      path: "ServerScriptService.X",
      className: "Script",
      source:
        "local a = game.Players.LocalPlayer\nlocal b = Players.LocalPlayer",
    },
  ]);

  const hits = findings.filter(
    (f) => f.code === "AUTH-LOCALPLAYER-SERVER",
  );
  assert.equal(hits.length, 1);
});

test("clearance requires inspected source that no longer triggers the rule", () => {
  const defect: SecurityArtifact = {
    path: "ServerScriptService.Services.SaveSystem",
    className: "Script",
    source: "local p = game.Players.LocalPlayer",
  };

  const review = buildSecurityReview([defect]);
  const blocking = review.blocking[0];
  assert.ok(blocking);

  const sameBrokenSource = [
    {
      path: "ServerScriptService.Services.SaveSystem",
      className: "Script",
      source: "local p = game.Players.LocalPlayer",
    },
  ];
  assert.equal(
    findingClearedBySources(blocking, sameBrokenSource),
    false,
  );

  const fixedSource = [
    {
      path: "ServerScriptService.Services.SaveSystem",
      className: "Script",
      source:
        'for _, player in game:GetService("Players"):GetPlayers() do end',
    },
  ];
  assert.equal(
    findingClearedBySources(blocking, fixedSource),
    true,
  );
});

test("evaluateSecurityGate blocks until every HIGH finding is cleared", () => {
  const defect: SecurityArtifact = {
    path: "ServerScriptService.Services.Wallet",
    className: "Script",
    source: "local p = game.Players.LocalPlayer",
  };

  const review = buildSecurityReview([defect]);

  const gateBlocked = evaluateSecurityGate(review, []);
  assert.equal(gateBlocked.satisfied, false);
  assert.equal(gateBlocked.unresolved.length, 1);

  const gateCleared = evaluateSecurityGate(review, [
    {
      path: "ServerScriptService.Services.Wallet",
      className: "Script",
      source: "for _, p in game:GetService('Players'):GetPlayers() do end",
    },
  ]);
  assert.equal(gateCleared.satisfied, true);
  assert.deepEqual(gateCleared.unresolved, []);
});

test("evaluateSecurityGate passes immediately with no blocking findings", () => {
  const clean: SecurityArtifact = {
    path: "ServerScriptService.Services.Wallet",
    className: "Script",
    source:
      'local pcallGuard = pcall(function() return game:GetService("Players"):GetPlayers() end)',
  };

  const review = buildSecurityReview([clean]);
  assert.deepEqual(review.blocking, []);

  const gate = evaluateSecurityGate(review, []);
  assert.equal(gate.satisfied, true);
});

test("directive: server-data rules forbid LocalPlayer and mandate validation", () => {
  const rules = roleSecurityRules("server-data");

  assert.ok(
    rules.some((r) => r.includes("game.Players.LocalPlayer")),
  );
  assert.ok(
    rules.some((r) => r.toLowerCase().includes("never trust")),
  );
});

test("directive: client roles forbid DataStoreService on the client", () => {
  assert.ok(
    roleSecurityRules("client-controller").some((r) =>
      r.includes("DataStoreService"),
    ),
  );
  assert.ok(
    roleSecurityRules("client-ui-script").some((r) =>
      r.includes("never the authority"),
    ),
  );
});

test("directive lines are empty unless the task actually builds in Roblox", () => {
  const placement = {
    element: "SaveSystem",
    role: "server-data" as const,
    root: "ServerScriptService" as const,
    className: "Script" as const,
    indexPath: "ServerScriptService.Services.SaveSystem",
    rule: "x",
  };

  assert.deepEqual(
    buildSecurityDirectiveLines([placement], {
      needsRoblox: true,
      requiresBuild: false,
    }),
    [],
  );
  assert.deepEqual(
    buildSecurityDirectiveLines([placement], {
      needsRoblox: false,
      requiresBuild: true,
    }),
    [],
  );

  const lines = buildSecurityDirectiveLines([placement], {
    needsRoblox: true,
    requiresBuild: true,
  });
  assert.ok(lines.length >= 1);
  assert.ok(lines[0].includes("server-data"));
  assert.ok(lines[0].includes("SaveSystem"));

  const rendered = renderSecurityDirective(lines);
  assert.ok(rendered.includes("SECURITY & SERVER-AUTHORITY"));
  assert.ok(
    renderSecurityDirective([]) === "",
  );
});