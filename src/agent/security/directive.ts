/* ============================================================================
 * SECURITY & SERVER-AUTHORITY DIRECTIVE — deterministic threat model
 *
 * Rendered from the resolved placement layout BEFORE any code is written.
 * This is the doc's "threat model before completion": the agent states, up
 * front, which authority boundary each resolved role lives on and which
 * exploiter paths it must defend. Language-neutral, rule-based, unit-tested.
 * ========================================================================== */

import type { EnvironmentPlacement } from "../placement/types.js";
import type { SecurityDirectiveOptions } from "./types.js";

export function roleSecurityRules(
  role: string,
): string[] {
  if (role === "server-data") {
    return [
      "Server owns authoritative state (currency, inventory, saves, purchases). Never trust client-reported balances, prices, or ownership.",
      "Never read game.Players.LocalPlayer in a server Script — it is nil server-side; iterate game:GetPlayers().",
      "Validate every client request server-side: argument types/ranges, ownership, rate limiting/cooldowns; never mutate player economy without checks.",
      "Guard reward duplication / replay / double-spend: check-then-apply atomically, clamp values, reject negative or non-finite numbers.",
    ];
  }

  if (role === "server-system") {
    return [
      "Server owns game rules and state (rounds, teams, matchmaking, damage, rewards).",
      "Reject illegitimate client claims of state/role and arbitrary Instance references; keep authoritative decisions on the server.",
      "If remotes are involved, validate sender + arguments and rate-limit.",
    ];
  }

  if (role === "server-command") {
    return [
      "Commands are authorized on the server, never granted by a client claim.",
      "Validate the requesting player's actual permission server-side before executing; add rate limiting and audit logging.",
    ];
  }

  if (role.startsWith("client")) {
    return [
      "Client owns UI, input, camera, and presentation ONLY. Clients are never the authority.",
      "Never use DataStoreService in a LocalScript (server-only). Never decide purchases, rewards, or permissions client-side.",
      "Requests go through RemoteEvent/RemoteFunction and the server validates them before acting.",
    ];
  }

  if (role.startsWith("shared")) {
    if (role === "shared-remote") {
      return [
        "Every RemoteEvent/RemoteFunction is a trust boundary: assume arguments are attacker-controlled.",
        "Server handler must validate types, ranges, ownership, cooldowns and be idempotent where it mutates valuable state.",
      ];
    }

    return [
      "Shared ModuleScripts run in multiple contexts — guard LocalPlayer/DataStore usage by where the code actually executes.",
      "Expose data, not authority: pure/shared definitions (items, config) are safe; economic decisions belong to the server caller.",
    ];
  }

  return [
    "Primarily presentation/world content: keep server-side logic authoritative and validate any value that arrives over a Remote.",
  ];
}

export function buildSecurityDirectiveLines(
  placements: EnvironmentPlacement[],
  options: SecurityDirectiveOptions,
): string[] {
  if (!options.needsRoblox || !options.requiresBuild) {
    return [];
  }

  if (placements.length === 0) {
    return [];
  }

  const lines = placements.map(
    (placement, index) => {
      const rules =
        roleSecurityRules(
          placement.role,
        );

      const renderedRules = rules
        .map(
          (rule) =>
            `      - ${rule}`,
        )
        .join("\n");

      return [
        `${index + 1}. [${placement.role}] ${placement.element} (${placement.root}, ${placement.className})`,
        renderedRules,
      ].join("\n");
    },
  );

  return lines;
}

export function renderSecurityDirective(
  lines: string[],
): string {
  if (lines.length === 0) {
    return "";
  }

  return [
    "",
    "==================================================",
    "SECURITY & SERVER-AUTHORITY (deterministic)",
    "==================================================",
    "The client is never trusted. The server owns authoritative gameplay,",
    "economy, and persistence decisions. Apply every applicable role rule.",
    "",
    lines.join("\n\n"),
    "",
  ].join("\n");
}