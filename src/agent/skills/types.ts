import type { ToolGroup } from "../../tools/types.js";

/* ============================================================================
 * SEMANTIC REQUEST — LANGUAGE-NEUTRAL CONTRACT
 *
 * The semantic layer models what a user actually asked, decoded into a
 * language-neutral shape. Skill selection and plan enrichment operate
 * exclusively on this shape. No Arabic/English strings ever reach the
 * selector or the catalog — language is only recorded as metadata (see
 * SemanticRequest.language) so the agent can bias UX/output language, and
 * it never drives skill selection.
 *
 * Intent here is the SUPERSET of TaskIntent: it adds "refinement", which
 * is the semantically distinct request family behind phrases like
 * "خلي اللوحة أحلى" / "make the panel cleaner" / "10x it".
 * ========================================================================== */

export type SemanticIntent =
  | "chat"
  | "coding"
  | "building"
  | "refinement"
  | "debugging"
  | "testing"
  | "inspection"
  | "planning"
  | "analysis";

/**
 * Where the work happens. Domain decides which tool groups exist at all.
 */
export type SemanticDomain =
  | "roblox"
  | "filesystem"
  | "terminal"
  | "general";

/**
 * The narrow action the user wants within an intent family.
 */
export type OperationKind =
  | "create"
  | "modify"
  | "configure"
  | "remove"
  | "refine"
  | "refine-visual"
  | "refine-behavior"
  | "refine-logic"
  | "inspect"
  | "analyze"
  | "test"
  | "debug"
  | "diagnose"
  | "explain"
  | "plan"
  | "chat";

/**
 * How concrete the target artifact reference is.
 *
 * "contextual" means a deictic/pronoun reference ("دي", "ده", "this",
 * "it") that cannot be resolved without memory — that is what triggers
 * the clarify-before-edit rule. "named" (explicit identifier) and
 * "typed" (generic noun like "الزرار" / "the script") can usually be
 * resolved by inspecting, so they are legitimately actionable.
 */
export type TargetKind =
  | "none"
  | "named"
  | "typed"
  | "contextual"
  | "full-scope";

/**
 * How broad a refinement is. "full" is the whole-experience redesign
 * family ("حسن اللعبة كلها" / "make the game 10x better"), which must
 * go through the dedicated full-refinement skill (extensive group
 * coverage and heavy verification), not the surgical refinement skill.
 */
export type RefinementScope =
  | "none"
  | "visual"
  | "behavior"
  | "logic"
  | "full";

export interface TargetReference {
  kind: TargetKind;
  /** Best-effort, opaque free-text description. No instance resolution. */
  label: string;
}

export type ConstraintKind =
  | "explicit-read-only"
  | "scoped-protection"
  | "destructive-requested"
  | "preserve-behavior"
  | "preserve-unrelated";

export interface Constraint {
  kind: ConstraintKind;
  label: string;
}

export type RequestLanguage =
  | "ar"
  | "en"
  | "mixed"
  | "other"
  | "none";

export interface SemanticRequest {
  intent: SemanticIntent;
  domain: SemanticDomain;
  operation: OperationKind;
  scope: RefinementScope;
  target: TargetReference;
  /**
   * True when the wording is under-specified such that guessing could
   * create a duplicate or touch the wrong thing. The plan surfaces this
   * to the model as "inspect first, ask when ambiguous" — never as a
   * silent retrogade default.
   */
  requiresClarification: boolean;
  preserveUnrelated: boolean;
  constraints: Constraint[];
  language: RequestLanguage;
}

/* ============================================================================
 * SKILL DEFINITION — DECLARATIVE CAPABILITY CONTRACT
 *
 * A Skill is a PASSIVE, DECLARATIVE capability/workflow definition. It has
 * NO runtime, NO lifecycle, NO state, and NO execute() method. This is a
 * deliberate architectural boundary: skills are NOT agents, NOT
 * controllers, and NOT a resurrection of the deleted AgentRegistry /
 * AgentOrchestrator / phase-pipeline. They are typed metadata that the
 * pure selector matches against a SemanticRequest and that plan.ts folds
 * into the existing AgentPlan (tool groups, success criteria, prompt
 * guidance). The monolithic Agent still owns all execution.
 * ========================================================================== */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;

  /** Intents this skill is eligible for. */
  intents: SemanticIntent[];

  /** Domains this skill applies to. */
  domains: SemanticDomain[];

  /** Operations this skill governs. */
  operations: OperationKind[];

  /** Refinement scopes handled (empty = not refinement-specific). */
  scopes?: RefinementScope[];

  /**
   * True when a concrete existing target is required — refinement and
   * duplicate-prevention. Creation skills set this false.
   */
  requiresTarget: boolean;

  /**
   * Tool-group posture. requiredGroups must be enabled by the plan;
   * optionalGroups are enabled when the operating domain already
   * enables them anyway.
   */
  requiredGroups: ToolGroup[];
  optionalGroups?: ToolGroup[];

  /**
   * Declarative planning guidance, injected into the system prompt.
   * Small procedural prose, not code.
   */
  planningGuidance: string[];

  /**
   * Verification requirements this skill adds to the plan. Each entry
   * becomes a SuccessCriterion.
   */
  verificationRequirements: {
    description: string;
    required: boolean;
  }[];

  /** Safety posture that reinforces (never bypasses) agent-level gates. */
  safety: {
    mode: "standard" | "destructive" | "read-only" | "refinement-preserve";
    /** True when the skill must never pull destructive tool paths by itself. */
    neverDestructive: boolean;
  };
}

export interface SkillSelection {
  /** The single best matching skill. Always non-null (fallback exists). */
  primary: SkillDefinition;
  /** Other matching skills whose guidance also applies. Usually empty. */
  adjuncts: SkillDefinition[];
  /** Deterministic score in [0,1]. 1 = exact operation match. */
  confidence: number;
  /** Short human-readable selection rationale for logging. */
  rationale: string;
}