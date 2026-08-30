import type { SkillDefinition } from "./types.js";

/* ============================================================================
 * SKILL CATALOG
 *
 * Deliberately NOT a SkillRegistry. This is a static, typed, readonly
 * catalog of declarative capability definitions plus a pure selector in
 * ./select.ts. There is no SkillRegistry service, no skill instances, no
 * lifecycle, no state. Every skill below is passive metadata that plan.ts
 * folds into the AgentPlan. Distinct from the deleted P1.3 AgentRegistry,
 * which orchestrated specialist agent instances.
 *
 * Granularity rule: intent/domain pair = one skill (family); nuance is
 * carried by operation/scope/target on the SemanticRequest. This keeps
 * the catalog small enough to stay deterministic and broad enough that
 * ANY Roblox request ("everything and anything in Roblox Studio") maps
 * onto exactly one primary skill — especially the single encompassing
 * roblox-build skill for world/environment, UI, behavior/scripting,
 * NPC/AI, combat, systems, networking, and data work alike.
 *
 * TIE-BREAK RULE: catalog order below is the deterministic tie-break.
 * Do not reorder entries casually.
 * ========================================================================== */

export const SKILL_CATALOG: readonly SkillDefinition[] = [
  {
    id: "roblox-inspection",
    name: "Roblox Inspection",
    description:
      "Observing and reporting the current live Roblox Studio / Workspace / ReplicatedStorage state without changing it.",
    intents: ["inspection", "planning", "analysis"],
    domains: ["roblox"],
    operations: [
      "inspect",
      "analyze",
      "plan",
      "diagnose",
      "explain",
    ],
    requiresTarget: false,
    requiredGroups: ["roblox-inspection"],
    optionalGroups: ["general"],
    planningGuidance: [
      "The live Studio is the source of truth, not source code on disk.",
      "Prefer inspection (list/discover/inspect/search) before claiming anything about state.",
      "Report findings truthfully; never invent objects the tools did not return.",
    ],
    verificationRequirements: [
      {
        description:
          "The inspected Roblox Studio state was actually observed via tools and reported.",
        required: true,
      },
    ],
    safety: {
      mode: "read-only",
      neverDestructive: true,
    },
  },

  {
    id: "roblox-build",
    name: "Roblox Build",
    description:
      "Creating, configuring, or extending Roblox content: world/environment (parts, terrain, spawns), UI (ScreenGui, buttons, HUD), behavior/scripting (Luau servers/clients/modules), NPC/AI, combat/weapons/tools, systems (economy, inventory, quests, saving), and networking (Remotes, validation).",
    intents: ["building", "coding"],
    domains: ["roblox"],
    operations: ["create", "modify", "configure"],
    requiresTarget: false,
    requiredGroups: [
      "roblox-inspection",
      "roblox-building",
      "roblox-execution",
    ],
    planningGuidance: [
      "Inspect the existing Studio hierarchy before building; reuse compatible existing objects and systems instead of creating duplicates.",
      "Work in the correct service location (Workspace, ReplicatedStorage, ServerScriptService, StarterPlayer, StarterGui, ServerStorage).",
      "Create EXACTLY what was asked and nothing else. Never produce scaffolding, defaults, placeholders, or prototypes: no unnamed default parts, no empty scripts, no unused models/sub-assemblies, no test geometry. Every created instance must be part of the requested outcome, fully configured (name, properties, parent) in its FIRST and only creation call.",
      "Never create or modify anything during inspection/understanding phases. Create only in the build phase, exactly once; if you need to check existence, use search/inspect tools, never a trial creation.",
      "Consult PROJECT MEMORY recall for artifacts and facts from earlier tasks: prefer and reuse what already exists. If the user asks to modify or rename an EXISTING artifact, modify it IN PLACE by its exact known name — never create a sibling copy and rename that; if an old duplicate shell from a previous attempt exists, remove it so only one artifact remains.",
      "Author a complex build as a SINGLE verified Luau that creates every object fully configured (exact name, properties, parent) on its FIRST and only creation. There is no cleanup pass for a duplicate you decided to rename later; rename means editing the one true object.",
      "Persist run-time behavior in real Script / LocalScript / ModuleScript instances with their Source set, placed in the correct service. Never implement run-time logic with Edit-mode-only signal connections or variables scoped to the studio session — those die the instant play starts.",
      "To create or edit a script/instance with roblox_multi_edit use EXACTLY this contract: datamodel_type must be 'Edit' (never a service name like ServerScriptService), file_path is unprefixed (e.g. ServerScriptService.GreeterScript), className (e.g. 'Script') is REQUIRED when creating a NEW script, and edits is a list such as [{ \"old_string\": \"\", \"new_string\": \"<source>\" }]. Once roblox_multi_edit reports SUCCESS, do NOT re-issue the same edit — go straight to inspection verification. An initial bad call (wrong datamodel_type or missing className) fails and is a normal correction, not a reason to give up.",
      "For simple geometry (parts, walls, platforms, basic builds) create canonical Primitives/Parts — e.g. Instance.new('Part') via execute_luau or insert_asset — instead of AI mesh generation. Reserve generate_mesh/generate_procedural_model for genuinely complex or sculpted shapes the user asked for.",
      "Insert instances through execute_luau by parenting directly: create the instance, set EVERY property BEFORE parenting (Name, Size, Color, Position, and Anchored=true for any static geometry so it doesn't fall), then assign Parent, e.g. `local p = Instance.new('Part'); p.Name='X'; p.Size=Vector3.new(4,4,4); p.Anchored=true; p.Parent=game.Workspace`. NEVER use Workspace:InsertObject, Workspace:InsertFirstChild, or game.Workspace.ChildName = instance — those are not valid members of Workspace when creating new instances.",
      "Inspection paths (roblox_inspect_instance / roblox_search_game_tree) use in-place paths WITHOUT the game. prefix: Workspace.MainPart, StarterGui.LeaderboardGui, ReplicatedStorage.Things, ServerScriptService.X. A game.-prefixed path like game.Workspace.X fails even when the object exists.",
      "After parenting, verify with roblox_inspect_instance on the unprefixed path and do not declare success until that inspection confirms the object and its key properties.",
      "If a Luau execution fails mid-script, roll back (remove) any partial objects it may already have created before retrying, so failed attempts never leave orphans in the workspace.",
      "Server scripts own authoritative gameplay decisions; client scripts own input and presentation.",
      "Validate client-sent remote traffic server-side.",
      "A created part/script is not proof of working behavior — verify live Studio state with inspection and test behavior at runtime.",
      "Make the smallest safe change; leave unrelated content untouched.",
    ],
    verificationRequirements: [
      {
        description:
          "The requested Roblox Studio objects/scripts actually exist in the correct location (verified via inspection).",
        required: true,
      },
      {
        description:
          "No unintended extra artifacts were created — no stray default parts, empty scripts, prototype models, or other objects the user did not ask for (verified in the affected services).",
        required: true,
      },
      {
        description:
          "Behaviorally-relevant builds were re-checked after creation (runtime/output evidence when the build has behavior).",
        required: false,
      },
    ],
    safety: {
      mode: "standard",
      neverDestructive: false,
    },
  },

  {
    id: "roblox-refinement",
    name: "Roblox Refinement",
    description:
      "Surgically improving an existing Roblox artifact the user already has in mind — nicer visuals, added behavior, cleaned-up logic — while preserving everything else.",
    intents: ["refinement"],
    domains: ["roblox"],
    operations: [
      "refine",
      "refine-visual",
      "refine-behavior",
      "refine-logic",
      "modify",
      "configure",
    ],
    scopes: ["visual", "behavior", "logic"],
    requiresTarget: true,
    requiredGroups: ["roblox-inspection", "roblox-building"],
    optionalGroups: ["roblox-execution"],
    planningGuidance: [
      "REFINEMENT MODE: the user is referring to an EXISTING artifact. NEVER create a duplicate.",
      "Resolve the referenced artifact FIRST from PROJECT MEMORY recall (durable memory of what was built and verified in Studio), then confirm by live inspection — do not rely on names alone.",
      "Inspect first to locate the referenced artifact; do not guess blindly.",
      "Change ONLY the referenced artifact: no new parts, no extra scripts, no hidden helpers, no leftover temporary objects — if the change needs a helper object, remove it as part of the same task.",
      "For simple geometry edits prefer canonical Part/Primitive property changes over re-generating meshes.",
      "Change only what the user asked to improve; preserve all unrelated content and existing behavior unless the user explicitly asked to change that behavior.",
      "If the target cannot be resolved from inspection and memory, ASK which artifact you meant instead of acting on a guess.",
    ],
    verificationRequirements: [
      {
        description:
          "The referenced existing artifact was modified in place and no duplicate was created.",
        required: true,
      },
      {
        description:
          "Everything not requested to change was left untouched.",
        required: true,
      },
    ],
    safety: {
      mode: "refinement-preserve",
      neverDestructive: true,
    },
  },

  {
    id: "roblox-full-refinement",
    name: "Roblox Full Redesign",
    description:
      "Whole-experience refinement: the user wants the entire game/experience reworked and improved (e.g. 'make the whole game 10x better'), not one surgical artifact.",
    intents: ["refinement"],
    domains: ["roblox"],
    operations: ["refine", "refine-visual", "refine-behavior", "refine-logic"],
    scopes: ["full"],
    requiresTarget: true,
    requiredGroups: [
      "roblox-inspection",
      "roblox-building",
      "roblox-execution",
    ],
    planningGuidance: [
      "FULL REDESIGN MODE: the whole experience is the target. Inspect its current state comprehensively first.",
      "Keep the experience's identity/core loop; rework presentation, behavior, and quality coherently.",
      "Every object you add must be part of the redesign the user asked for — no scaffolding, placeholder, or junk instances; remove temporary helpers before finishing.",
      "Never delete or replace the experience wholesale unless the user explicitly authorized destructive changes.",
      "Re-test behavior at runtime after the redesign and verify the result in live Studio.",
    ],
    verificationRequirements: [
      {
        description:
          "The whole experience was reworked coherently; unrelated or unauthorized content was not deleted.",
        required: true,
      },
      {
        description:
          "Key behavior was runtime tested after the redesign.",
        required: true,
      },
    ],
    safety: {
      mode: "refinement-preserve",
      neverDestructive: true,
    },
  },

  {
    id: "roblox-debug",
    name: "Roblox Debugging",
    description:
      "Diagnosing and fixing runtime/script failures in Roblox (errors, crashes, broken behavior, non-working systems).",
    intents: ["debugging"],
    domains: ["roblox"],
    operations: ["debug", "diagnose"],
    requiresTarget: false,
    requiredGroups: ["roblox-inspection", "roblox-execution"],
    optionalGroups: ["roblox-building"],
    planningGuidance: [
      "Reproduce the failure first and read the ACTUAL output/error, not guesses.",
      "Trace to the root cause; make the smallest fix that resolves it.",
      "Re-test after the fix to confirm the original problem is gone.",
    ],
    verificationRequirements: [
      {
        description:
          "The reported error/failure was resolved and re-tested (no reproduction in fresh output).",
        required: true,
      },
    ],
    safety: {
      mode: "standard",
      neverDestructive: false,
    },
  },

  {
    id: "roblox-test",
    name: "Roblox Playtest / Test",
    description:
      "Running the experience in Studio playtest/execution and confirming or rejecting the requested behavior.",
    intents: ["testing"],
    domains: ["roblox"],
    operations: ["test"],
    requiresTarget: false,
    requiredGroups: ["roblox-execution"],
    optionalGroups: ["roblox-inspection"],
    planningGuidance: [
      "Actually run the requested test/playtest instead of reasoning about it.",
      "Report the real outcome, including failures, without overclaiming.",
    ],
    verificationRequirements: [
      {
        description:
          "The requested behavior passed a real runtime test, or a genuine failure was reported.",
        required: true,
      },
    ],
    safety: {
      mode: "standard",
      neverDestructive: true,
    },
  },

  {
    id: "filesystem-ops",
    name: "Filesystem Code Work",
    description:
      "Reading, writing, editing, searching, and reasoning about project source files (Luau/TS modules, config, tests) outside Roblox.",
    intents: [
      "coding",
      "building",
      "refinement",
      "inspection",
      "planning",
      "analysis",
    ],
    domains: ["filesystem"],
    operations: [
      "create",
      "modify",
      "refine",
      "inspect",
      "analyze",
      "plan",
      "configure",
      "explain",
    ],
    requiresTarget: false,
    requiredGroups: ["filesystem"],
    planningGuidance: [
      "Inspect the existing module layout and conventions before writing; reuse the existing architecture instead of duplicating it.",
      "Make focused edits; preserve unrelated code, formatting, and imports.",
      "Run typecheck/tests after meaningful changes when available.",
    ],
    verificationRequirements: [
      {
        description:
          "Requested source files exist with the intended contents.",
        required: true,
      },
    ],
    safety: {
      mode: "standard",
      neverDestructive: false,
    },
  },

  {
    id: "terminal-ops",
    name: "Terminal Commands",
    description:
      "Executing developer commands (npm, node, git, shell utilities) and interpreting their output.",
    intents: ["coding", "testing", "debugging", "analysis", "planning"],
    domains: ["terminal"],
    operations: ["test", "debug", "diagnose", "configure", "plan", "analyze"],
    requiresTarget: false,
    requiredGroups: ["terminal"],
    planningGuidance: [
      "Execute the requested command and report its real output.",
      "Do not pretend a command ran when it was not invoked.",
    ],
    verificationRequirements: [
      {
        description: "Requested command executed successfully.",
        required: true,
      },
    ],
    safety: {
      mode: "standard",
      neverDestructive: false,
    },
  },

  {
    id: "general-chat",
    name: "General Conversation / Fallback",
    description:
      "Generic conversation, conceptual explanation, or planning that does not target Roblox, files, or the terminal.",
    intents: ["chat", "planning", "analysis"],
    domains: ["general", "roblox", "filesystem", "terminal"],
    operations: ["chat", "explain", "plan", "analyze"],
    requiresTarget: false,
    requiredGroups: ["general"],
    planningGuidance: [
      "Plain conversational intent: answer directly, no unnecessary tool work.",
      "If the user seems to want Roblox work, suggest a concrete buildable outcome rather than a tutorial.",
    ],
    verificationRequirements: [],
    safety: {
      mode: "standard",
      neverDestructive: true,
    },
  },
] as const;

/**
 * Fallback when nothing else can possibly match (never expected, but the
 * selector must always return a primary).
 */
export const FALLBACK_SKILL_ID = "general-chat";

export function getSkillById(
  id: string,
): SkillDefinition | undefined {
  return SKILL_CATALOG.find((skill) => skill.id === id);
}