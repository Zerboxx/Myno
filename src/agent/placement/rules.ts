/**
 * Deterministic Roblox placement rules.
 *
 * Converts a requested element (decoded from the task's semantic
 * request, intent, and keyword scan of the objective) into an exact,
 * authoritative Studio location plus instance class — without any
 * model latency. The build phase follows these paths verbatim instead
 * of re-deriving locations, which makes the agent create the correct
 * structure in one deterministic pass.
 */

import type {
  ElementRole,
  EnvironmentLayout,
  EnvironmentPlacement,
  RobloxContainerRoot,
  RobloxInstanceClassName,
} from "./types.js";

interface RoleRule {
  root: RobloxContainerRoot;

  folder?: string;

  className: RobloxInstanceClassName;

  rule: string;
}

/* ============================================================================
 * ROLE → PLACEMENT TABLE (single source of truth for service + script type)
 * ========================================================================== */

const ROLE_RULES: Record<
  ElementRole,
  RoleRule
> = {
  "overhead-player-ui": {
    root: "StarterPlayer.StarterPlayerScripts",

    className: "LocalScript",

    rule:
      "Overhead player UI (a name/nametag shown above a character's head via BillboardGui + TextLabel) is CLIENT presentation, not geometry and not a server system. The authoring artifact is a LocalScript in StarterPlayer.StarterPlayerScripts; the BillboardGui/TextLabel are created at RUNTIME on the character's Head. Never create a Part for it.",
  },

  "server-system": {
    root: "ServerScriptService",

    folder: "Systems",

    className: "Script",

    rule:
      "Server-authoritative gameplay rules (rounds, teams, matchmaking, game state) belong in ServerScriptService.Systems as a Script.",
  },

  "server-data": {
    root: "ServerScriptService",

    folder: "Services",

    className: "Script",

    rule:
      "Server-authoritative data/economy systems (currency, shop purchases, inventory, quests, saves, leaderboards) belong in ServerScriptService.Services as a Script.",
  },

  "server-command": {
    root: "ServerScriptService",

    folder: "Commands",

    className: "Script",

    rule:
      "Server-side command handlers belong in ServerScriptService.Commands as a Script.",
  },

  "client-controller": {
    root: "StarterPlayer.StarterPlayerScripts",

    folder: "Controllers",

    className: "LocalScript",

    rule:
      "Client-side controllers (UI logic, character control, overlay services) belong in StarterPlayer.StarterPlayerScripts.Controllers as a LocalScript.",
  },

  "client-input": {
    root: "StarterPlayer.StarterPlayerScripts",

    folder: "Input",

    className: "LocalScript",

    rule:
      "Client input handling (keyboard/mouse/touch/gamepad) belongs in StarterPlayer.StarterPlayerScripts.Input as a LocalScript.",
  },

  "client-camera": {
    root: "StarterPlayer.StarterPlayerScripts",

    folder: "Camera",

    className: "LocalScript",

    rule:
      "Client camera logic belongs in StarterPlayer.StarterPlayerScripts.Camera as a LocalScript.",
  },

  "client-ui": {
    root: "StarterGui",

    className: "ScreenGui",

    rule:
      "UI layout/containers (HUD, menus, ShopGui, LeaderboardAccessories screens) belong in StarterGui as a ScreenGui.",
  },

  "client-ui-script": {
    root: "StarterGui",

    className: "LocalScript",

    rule:
      "UI behavior scripts belong in StarterGui as a LocalScript (child of the matching ScreenGui).",
  },

  "shared-module": {
    root: "ReplicatedStorage",

    folder: "Shared",

    className: "ModuleScript",

    rule:
      "Shared reusable logic used by both server and clients belongs in ReplicatedStorage.Shared as a ModuleScript.",
  },

  "shared-config": {
    root: "ReplicatedStorage",

    folder: "Config",

    className: "ModuleScript",

    rule:
      "Shared configuration/settings belong in ReplicatedStorage.Config as a ModuleScript.",
  },

  "shared-remote": {
    root: "ReplicatedStorage",

    folder: "Remotes",

    className: "RemoteEvent",

    rule:
      "Network remotes belong in ReplicatedStorage.Remotes (RemoteEvent / RemoteFunction).",
  },

  world: {
    root: "Workspace",

    className: "Part",

    rule:
      "World/environment geometry belongs directly in Workspace as Parts/Models.",
  },

  npc: {
    root: "Workspace",

    className: "Model",

    rule:
      "NPCs/characters belong in Workspace as Models with a Humanoid.",
  },

  template: {
    root: "ServerStorage",

    className: "Model",

    rule:
      "Server-only templates/blueprints for cloning belong in ServerStorage as Models.",
  },

  "character-script": {
    root: "StarterCharacterScripts",

    className: "LocalScript",

    rule:
      "Per-character behavior belongs in StarterCharacterScripts as a LocalScript.",
  },
};

/* ============================================================================
 * ROLE DETECTION (keyword scan of the objective — English + Arabic)
 * ========================================================================== */

interface RoleFeatureGroup {
  role: ElementRole;

  patterns: RegExp[];
}

const ROLE_FEATURES: RoleFeatureGroup[] = [
  {
    role: "overhead-player-ui",

    patterns: [
      /\b(name|names?|nametag|name\s?tag|label|labels?)\b[\s\S]{0,80}\b(above|over|on top of|head|heads)\b/i,
      /\b(above|over)\s+(the|his|her|their|\w+)?\s*head(s)?\b/i,
      /\b(nametag|name\s?tag|billboardgui|billboard)\b/i,
      /\b(show|display|print)\b[\s\S]{0,60}\b(name|names?)\b/i,
      /(اسم|الاسم|الأسم|اسمو|اسمه|لافتة)[\s\S]{0,40}(فوق|الراس|الرأس|راسه|على راسه)/u,
      /(فوق|الراس|الرأس|راسه|على راسه)[\s\S]{0,40}(اسم|الاسم|الأسم|اسمو|اسمه|لافتة)/u,
    ],
  },

  {
    role: "server-data",

    patterns: [
      /\b(economy|currency|coins?|money|ro?bux|\bbank\b|balance)\b/i,
      /\b(xp|exp|levels?|experience)\b/i,
      /\b(quests?|missions?|achievements?|rewards?)\b/i,
      /\b(inventory|items?|loot|shop|store|marketplace|trading?|purchases?|buy|buying)\b/i,
      /\b(datastore|data[\s-]?save|save|leaderboard|scores?|stats?|persist|progress)\b/i,
      /\b(money|\$|saver|savings)\b/i,
      /(اقتصاد|عملة|عملات|كوينز|فلوس|اكسبي|مستويات?|مهمات?|مهام|مخزون|احفظ|حفظ|داتا|نقاط|مكافآت?|متجر)/ui,
    ],
  },

  {
    role: "shared-remote",

    patterns: [
      /\bremote(s)?\b/i,
      /\bnetwork(ing|ed)?\b/i,
      /\bserver[\s-]?client\b/i,
      /\bserver[\s-]?event\b/i,
      /\bvip\b/i,
      /(ريموت|نقاط?\s?شبكة)/ui,
    ],
  },

  {
    role: "server-system",

    patterns: [
      /\b(rounds?|matchmaking|teams?|game[\s-]?mode|gamemode|phases?|waves?)\b/i,
      /\b(services?|systems?)\b/i,
      /(جولات?|فرق|طور|موجات?|نظام|أنظمة?)/ui,
    ],
  },

  {
    role: "client-input",

    patterns: [
      /\b(input|keyboard|mouse|touch|gamepad|controls?|keybinds?|dash)\b/i,
      /(مدخلات|كيبورد|ماوس|لمس|أزرار|ازرار)/ui,
    ],
  },

  {
    role: "client-camera",

    patterns: [
      /\b(camera|cinematic|fov|viewmode)\b/i,
      /(كاميرا|سينمائي)/ui,
    ],
  },

  {
    role: "client-ui",

    patterns: [
      /\b(ui|hud|menu|menus|screen|screen[\s-]?gui|\bgui\b|interface)\b/i,
      /(واجهة|قائمة|شاشة|هيد|لافتة|منيو)/ui,
    ],
  },

  {
    role: "client-controller",

    patterns: [
      /\b(controller|overlay|app[\s-]?shell)\b/i,
      /(كنترولر|تحكم)/ui,
    ],
  },

  {
    role: "shared-config",

    patterns: [
      /\b(config|configuration|settings|constants|presets?)\b/i,
      /(إعدادات|اعدادات|تهيئة|ثوابت)/ui,
    ],
  },

  {
    role: "shared-module",

    patterns: [
      /\b(module|lib|shared|util|utility|helper|library)\b/i,
      /(مشترك|مكتبة|أدوات?|helper|هيلبر)/ui,
    ],
  },

  {
    role: "character-script",

    patterns: [
      /\b(character|ragdoll|animation[\s-]?controller)\b/i,
      /(شخصية|حركات)/ui,
    ],
  },

  {
    role: "npc",

    patterns: [
      /\b(npc|enemy|enemies|boss|zombie|zombies|monster|monsters|ghost|raid|spawner|ai)\b/i,
      /(إنبي|عزرا|شبح|زومبي|وحش|عدو|عدوة|بوس|بوت|روبوت)/ui,
    ],
  },

  {
    role: "world",

    patterns: [
      /\b(world|map|terrain|environment|building|house|wall|walls|platform|checkpoint|spawn|door|elevator|road|landscap)\b/i,
      /(عالم|خريطة|تضاريس|بيئة|مبنى|مبني|جدار|حوائط|منصة|منصات|نقطة|سباون|باب|طريق|أرضية|ارضية)/ui,
    ],
  },

  {
    role: "template",

    patterns: [
      /\b(template|blueprint|prefab)\b/i,
      /(قالب|بلوب رينت|بلو برنت)/ui,
    ],
  },

  {
    role: "server-command",

    patterns: [
      /\b(command|commands|admin[\s-]?panel|moderation)\b/i,
      /(أوامر|كوماندز)/ui,
    ],
  },
];

const DEFAULT_ELEMENT_NAMES: Record<
  ElementRole,
  string
> = {
  "overhead-player-ui": "PlayerNametag",

  "server-system": "GameSystem",

  "server-data": "DataService",

  "server-command": "CommandHandler",

  "client-controller": "AppController",

  "client-input": "InputController",

  "client-camera": "CameraController",

  "client-ui": "MainHUD",

  "client-ui-script": "HUDLogic",

  "shared-module": "SharedModule",

  "shared-config": "GameConfig",

  "shared-remote": "GameEvents",

  world: "BuildArea",

  npc: "NPC",

  template: "CreatureTemplate",

  "character-script": "CharacterController",
};

/* ============================================================================
 * DETERMINISTIC STRUCTURE: idempotent role-folder creation
 *
 * Generates a canonical, idempotent Luau script that walks every role
 * folder path from the layout (e.g. "ServerScriptService.Services") and
 * creates any missing Folder so the agent's build edits always land in a
 * folder that already exists. Never renames, deletes, or overwrites an
 * existing instance — it strictly creates what is missing.
 * ========================================================================== */

function luauStringLiteral(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function rootTabPath(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function renderEnsureFoldersScript(
  folders: readonly string[],
): string {
  const unique = [
    ...new Set(folders).values(),
  ]

  if (unique.length === 0) {
    return "";
  }

  const chains = unique
    .map((path) =>
      path
        .split(".")
        .filter(
          (segment) =>
            segment.length > 0,
        ),
    )
    .filter(
      (segments) =>
        segments.length >= 2,
    );

  if (chains.length === 0) {
    return "";
  }

  const tableRows = chains
    .map((segments) => {
      const literals = segments.map(
        luauStringLiteral,
      );
      return `  { ${literals.join(", ")} },`;
    })
    .join("\n");

  const tab = rootTabPath(
    chains[0][0] ?? "structure",
  );

  return `--[[ deterministic structure ensure: created by the agent runtime ]]
local ensureFolders = {
${tableRows}
}

for _, segments in ipairs(ensureFolders) do
	local current = game
	for _, name in ipairs(segments) do
		local existing = current:FindFirstChild(name)
		if existing then
			current = existing
		elseif name ~= "StarterPlayerScripts" and name ~= "ReplicatedFirst" and name ~= "ReplicatedStorage" and name ~= "ServerScriptService" and name ~= "ServerStorage" and name ~= "StarterGui" and name ~= "Workspace" and name ~= "Lighting" and name ~= "StarterCharacterScripts" then
			local folder = Instance.new("Folder")
			folder.Name = name
			folder.Parent = current
			current = folder
		end
	end
end

print("agent_structure_ensure:ok:${tab}")`;
}

export function safeInstanceName(
  name: string | undefined,
  fallback: string,
): string {
  const cleaned = (name ?? "")
    .trim()
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .replace(/\s{2,}/g, " ");

  if (cleaned.length === 0) {
    return fallback;
  }

  if (/^[0-9]/.test(cleaned)) {
    return `${fallback}_${cleaned}`;
  }

  return cleaned.slice(0, 62);
}

/* ============================================================================
 * ROLE DETECTION
 * ========================================================================== */

/**
 * Spaces out camelCase/PascalCase concatenations ("ShopServer" →
 * "Shop Server", "ShopLib" → "Shop Lib") so word-boundary keyword
 * patterns match identifiers built from feature words. Detection runs
 * on this normalized text; cue extraction keeps using the original.
 */
export function normalizeForDetection(
  text: string,
): string {
  return text
    .replace(
      /([a-z0-9])([A-Z])/g,
      "$1 $2",
    );
}

export function detectElementRoles(
  text: string,
): ElementRole[] {
  const normalized =
    normalizeForDetection(
      text,
    );

  const found: ElementRole[] = [];

  for (const group of ROLE_FEATURES) {
    if (
      group.patterns.some(
        (pattern) =>
          pattern.test(normalized),
      )
    ) {
      found.push(group.role);
    }
  }

  return [...new Set(found)];
}

export function resolvePlacement(
  role: ElementRole,
  options?: {
    explicitName?: string;

    remoteIsFunction?: boolean;
  },
): EnvironmentPlacement {
  const rule = ROLE_RULES[role];

  const element =
    safeInstanceName(
      options?.explicitName,
      DEFAULT_ELEMENT_NAMES[role],
    );

  const className: RobloxInstanceClassName =
    role === "shared-remote" &&
    options?.remoteIsFunction
      ? "RemoteFunction"
      : rule.className;

  const indexPath = [
    rule.root,
    ...(rule.folder
      ? [rule.folder]
      : []),
    element,
  ].join(".");

  return {
    element,

    role,

    root: rule.root,

    folder: rule.folder,

    className,

    indexPath,

    rule: rule.rule,
  };
}

/* ============================================================================
 * KEYWORD → explicit element name (best-effort, non-authoritative)
 *
 * Only uses a name when the user EXPLICITLY named the artifact, and the
 * class hint right before it ("ModuleScript called X") is matched to
 * the placement that actually produces that class. A bare capitalized
 * word in a multi-element request (e.g. "HUD" in "build a shop with
 * coins and a HUD menu") is NOT a reliable artifact name and is ignored.
 * ========================================================================== */

export interface NamedCue {
  name: string;

  classHint?: string;
}

const CLASS_HINT_PREFIX =
  "(?:LocalScript|ModuleScript|ScreenGui|RemoteEvent|RemoteFunction|Script|Gui|Part|Model|Folder|Instance)";

const NAMED_CUE_PATTERN = new RegExp(
  `\\b${CLASS_HINT_PREFIX}\\b\\s+(?:named|called|called as)\\s+([A-Za-z][A-Za-z0-9_]{1,62})\\b`,
  "gi",
);

const GENERIC_NAME_PATTERN =
  /\b(?:named|called|اسمه|اسمو|تسمية)\s+([A-Za-z][A-Za-z0-9_]{1,62})\b/i;

export function extractNamedCues(
  text: string,
): NamedCue[] {
  const cues: NamedCue[] = [];

  const classMapped =
    new RegExp(
      NAMED_CUE_PATTERN.source,
      "gi",
    );

  let match: RegExpExecArray | null;

  while (
    (match =
      classMapped.exec(
        text,
      )) !== null
  ) {
    cues.push({
      name: match[1],

      classHint: match[0]
        .split(
          /\s+/,
        )[0],
    });
  }

  let generic: RegExpExecArray | null;

  const genericRe =
    new RegExp(
      GENERIC_NAME_PATTERN.source,
      "gi",
    );

  while (
    (generic =
      genericRe.exec(
        text,
      )) !== null
  ) {
    if (
      !cues.some(
        (cue) =>
          cue.name ===
          generic![1],
      )
    ) {
      cues.push({
        name: generic![1],
      });
    }
  }

  return cues;
}

export function extractExplicitElementName(
  text: string,
): string | undefined {
  return (
    extractNamedCues(
      text,
    )[0]?.name ??
    undefined
  );
}

/* ============================================================================
 * LAYOUT BUILDING (from the plan)
 * ========================================================================== */

export interface LayoutPlanSource {
  objective: string;

  intent?: string;

  domain?: string;

  needsRoblox?: boolean;

  requiresBuild?: boolean;
}

function isScriptFacingIntent(
  intent: string | undefined,
): boolean {
  return (
    intent === "building" ||
    intent === "coding"
  );
}

export function buildLayout(
  plan: LayoutPlanSource,
): EnvironmentLayout {
  const text =
    plan.objective ??
    "";

  /*
   * Only produce a build layout when the task actually requires a
   * build. Analysis/inspection/chat requests must not imply one.
   */
  if (
    !plan.requiresBuild
  ) {
    return {
      placements: [],

      folders: [],

      instruction: "",
    };
  }

  let roles =
    detectElementRoles(text);

  if (
    plan.needsRoblox &&
    roles.length === 0
  ) {
    roles = isScriptFacingIntent(
      plan.intent,
    )
      ? ["server-system"]
      : ["world"];
  }

  if (roles.length === 0) {
    return {
      placements: [],

      folders: [],

      instruction: "",
    };
  }

  const cues =
    extractNamedCues(
      text,
    );

  const usedCues = new Set<number>();

  const placements =
    roles.map((role) => {
      const remoteIsFunction =
        /\b(function|request|invoke)\b/i.test(
          text,
        );

      const placement =
        resolvePlacement(role, {
          remoteIsFunction,
        });

      /*
       * Assign an explicitly-named artifact only when its class hint
       * matches this placement's class (a "ModuleScript called ShopLib"
       * forces the shared-module element name, not some other role).
       */
      const cueIndex =
        cues.findIndex(
          (cue, index) => {
            if (
              usedCues.has(
                index,
              )
            ) {
              return false;
            }

            if (!cue.classHint) {
              return false;
            }

            return (
              cue.classHint ===
              placement.className
            );
          },
        );

      if (cueIndex >= 0) {
        placement.element =
          safeInstanceName(
            cues[cueIndex]
              .name,
            placement.element,
          );

        placement.indexPath =
          [
            placement.root,

            ...(placement
              .folder
              ? [
                  placement
                    .folder,
                ]
              : []),

            placement.element,
          ].join(".");

        usedCues.add(
          cueIndex,
        );
      }

      return placement;
    });

  const folderSet = new Set<string>();

  for (
    const placement
    of placements
  ) {
    if (placement.folder) {
      folderSet.add(
        `${placement.root}.${placement.folder}`,
      );
    }
  }

  return {
    placements,

    folders: [...folderSet],

    instruction:
      renderLayoutInstruction(
        placements,
      ),
  };
}

/* ============================================================================
 * RUNTIME HINTS: fill in placement-derived arguments the model forgot
 * ========================================================================== */

export interface PlacementHintResult {
  normalized: Record<string, unknown>;

  applied: string[];
}

/**
 * Deterministically patches a Roblox tool call using the resolved
 * placement layout. Currently applies to roblox_multi_edit: when the
 * call targets a known placement path and omitted className (the #1
 * first-attempt failure), the placement's own class is injected, and
 * datamodel_type is pinned to "Edit" when absent. Zero model latency.
 */
export function applyPlacementHints(
  toolName: string,
  args: Record<string, unknown>,
  layout?: EnvironmentLayout,
): PlacementHintResult {
  const normalized = {
    ...args,
  };

  const applied: string[] = [];

  if (
    !layout ||
    toolName !== "roblox_multi_edit"
  ) {
    return {
      normalized,

      applied,
    };
  }

  const filePath =
    typeof args.file_path ===
    "string"
      ? (args.file_path as string)
      : undefined;

  if (!filePath) {
    return {
      normalized,

      applied,
    };
  }

  const placement =
    layout.placements.find(
      (item) =>
        item.indexPath ===
        filePath,
    );

  if (!placement) {
    return {
      normalized,

      applied,
    };
  }

  const hasClassName =
    typeof args.className ===
      "string" &&
    (args.className as string)
      .trim().length > 0;

  if (!hasClassName) {
    normalized.className =
      placement.className;

    applied.push("className");
  }

  if (
    !normalized.datamodel_type ||
    normalized.datamodel_type ===
      "File"
  ) {
    normalized.datamodel_type =
      "Edit";

    applied.push(
      "datamodel_type",
    );
  }

  return {
    normalized,

    applied,
  };
}

/* ============================================================================
 * PROMPT RENDERING (deterministic, authoritative)
 * ========================================================================== */

export function renderLayoutInstruction(
  placements: EnvironmentPlacement[],
): string {
  if (
    placements.length === 0
  ) {
    return "";
  }

  const lines = placements.map(
    (placement, index) =>
      `${index + 1}. [${placement.role}] ${placement.element}\n` +
      `   ${placement.indexPath}\n` +
      `   Class: ${placement.className}\n` +
      `   Rule: ${placement.rule}`,
  );

  const folders = [
    ...new Set(
      placements
        .filter(
          (placement) =>
            placement.folder,
        )
        .map(
          (placement) =>
            `${placement.root}.${placement.folder}`,
        ),
    ),
  ];

  return `
==================================================
AUTHORITATIVE PLACEMENT & STRUCTURE (deterministic)
==================================================

Resolved automatically. Follow these locations and script types EXACTLY.
Do not re-derive, guess, or relocate any element.
If an instance already exists at its path, modify it IN PLACE instead of creating a duplicate.

${lines.join("\n")}

${folders.length > 0
  ? `Create these folders if they do not exist yet:
${folders.map((folder) => `- ${folder}`).join("\n")}`
  : ""}
`;
}