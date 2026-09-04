/**
 * P2.1 — Plan-level verification obligations.
 *
 * Deterministic, machine-checkable enforcement that a modifying plan MUST
 * carry a corresponding verification obligation. This is the "don't trust
 * the model to include verification" guard: it inspects the plan structure
 * (not the model's prose) and, when a required verification obligation is
 * missing, repairs the plan deterministically and reports a diagnostic.
 *
 * It is intentionally a pure function with no Agent/state coupling (same
 * philosophy as ./verify-gating.ts) so the exact class of bug where a
 * mutating plan silently skipped verification can be unit-tested directly.
 *
 * It does NOT bypass the security gate, does NOT create a parallel
 * verification framework, and only touches the existing plan surface
 * (requiresVerification, successCriteria, preferredToolGroups).
 */

import type { AgentPlan } from "./execution-types.js";

/**
 * The Roblox project surface an operation can modify or create. Each maps
 * to a verification obligation that the plan must declare.
 */
export type VerificationTarget =
  | "code" // Roblox code / scripts / modules / Luau source
  | "studio"; // Roblox Studio / DataModel / instance hierarchy
  // | "remote" // Roblox remotes/networking (see REMOTE_KEYWORDS)
  // | "artifact" // Roblox project artifact files on disk
// NOTE: "remote" and "artifact" are intentionally commented out until a
// plan carries a deterministic per-operation signal for them. Today the
// plan surface exposes code + studio modification via requiresBuild +
// needsRoblox + refinementMode, which is the safest, self-contained rule.

export const VERIFICATION_TARGET_LABEL: Record<
  VerificationTarget,
  string
> = {
  code: "Roblox code/script verification",
  studio: "Roblox Studio/DataModel verification",
};

/** Deterministically fabricate a success criterion for each target. */
export function criterionForTarget(
  target: VerificationTarget,
): string {
  switch (target) {
    case "code":
      return "The created/modified Roblox code/scripts/modules actually exist with their intended contents (verified via inspection/runtime).";
    case "studio":
      return "The requested Roblox Studio/DataModel state is actually present (verified via inspection); a successful create is not enough.";
    default:
      return "The modified Roblox content is verified present and correct.";
  }
}

/** An individual verification obligation for one target. */
export interface VerificationObligation {
  target: VerificationTarget;
  /** Whether the modifying plan requires this obligation. */
  required: boolean;
  /** Whether a matching required success criterion exists in the plan. */
  satisfied: boolean;
  /** Human-readable reason derived from the plan structure. */
  explanation: string;
  /** The success-criterion id that satisfies it, when one exists. */
  criterionId?: string;
}

export interface VerificationObligationResult {
  /** True when every required obligation is satisfied. */
  valid: boolean;
  /** The computed obligations, deterministic order. */
  obligations: VerificationObligation[];
  /** Deterministic diagnostics explaining any gap. */
  diagnostics: string[];
  /** True when a repair was applied to make the plan valid. */
  repaired: boolean;
  /**
   * Deterministic target/keyword mapping used to match a required
   * success criterion to an obligation.
   */
  matchedCriteria: Record<string, string>;
}

const STUDIO_KEYWORDS = [
  "studio",
  "workspace",
  "datamodel",
  "instance",
  "object",
  "script",
  "inspect",
  "present",
  "location",
  "created",
  "exists",
];

const CODE_KEYWORDS = [
  "script",
  "code",
  "module",
  "luau",
  "source",
  "content",
];

/**
 * True when the plan performs an operation that can modify or create
 * Roblox code, Studio/DataModel, or project artifacts.
 */
export function planIsModifyingRoblox(plan: AgentPlan): boolean {
  const modifying =
    plan.requiresBuild === true ||
    plan.refinementMode === true ||
    plan.intent === "building" ||
    plan.intent === "refinement" ||
    plan.intent === "coding" ||
    plan.intent === "debugging" ||
    plan.intent === "testing";

  return plan.needsRoblox === true && modifying === true;
}

/**
 * Compute the required verification targets for a plan. Deterministic,
 * derived only from the plan structure. Order is fixed for stable
 * diagnostics.
 */
export function requiredTargetsForPlan(
  plan: AgentPlan,
): VerificationTarget[] {
  if (!planIsModifyingRoblox(plan)) {
    return [];
  }

  // A Roblox modifying plan always modifies the Studio/DataModel
  // hierarchy and typically Roblox code/scripts. Both obligations are
  // therefore required.
  return ["code", "studio"];
}

function keywordsForTarget(
  target: VerificationTarget,
): string[] {
  switch (target) {
    case "code":
      return CODE_KEYWORDS;
    case "studio":
      return STUDIO_KEYWORDS;
    default:
      return [];
  }
}

function targetMatchesCriterion(
  target: VerificationTarget,
  criterionDescription: string,
): boolean {
  const lower = criterionDescription.toLowerCase();
  return keywordsForTarget(target).some((keyword) =>
    lower.includes(keyword),
  );
}

/**
 * Deterministically validate the plan's verification obligations and, if
 * any required obligation is missing, repair the plan in place so an
 * unverified modifying plan never executes silently.
 *
 * Repair policy (deterministic, smallest change):
 *  - ensure requiresVerification = true,
 *  - append a required success criterion for every unsatisfied required
 *    obligation,
 *  - ensure the Roblox verification tool groups are enabled so the
 *    verify phase has real tools (inspection + execution).
 */
export function applyVerificationObligations(
  plan: AgentPlan,
): VerificationObligationResult {
  const targets = requiredTargetsForPlan(plan);
  const diagnostics: string[] = [];
  const matchedCriteria: Record<string, string> = {};
  let repaired = false;

  const obligations: VerificationObligation[] = targets.map(
    (target) => {
      let satisfied = false;
      let criterionId: string | undefined;

      if (plan.requiresVerification) {
        const match = (plan.successCriteria ?? []).find(
          (criterion) =>
            criterion.required === true &&
            targetMatchesCriterion(target, criterion.description),
        );
        if (match) {
          satisfied = true;
          criterionId = match.id;
        }
      }

      const explanation = satisfied
        ? `Required ${VERIFICATION_TARGET_LABEL[target].toLowerCase()} is satisfied by success criterion "${criterionId}".`
        : `Required ${VERIFICATION_TARGET_LABEL[target].toLowerCase()} is MISSING.`;

      matchedCriteria[target] = criterionId ?? "";

      return {
        target,
        required: true,
        satisfied,
        explanation,
        criterionId,
      };
    },
  );

  for (const obligation of obligations) {
    if (!obligation.satisfied) {
      diagnostics.push(
        `Missing verification obligation: ${VERIFICATION_TARGET_LABEL[obligation.target]}. A modifying ${plan.needsRoblox ? "Roblox" : "project"} plan must include a matching verification step.`,
      );
    }
  }

  const missing = obligations.filter(
    (obligation) => !obligation.satisfied,
  );

  if (missing.length > 0) {
    // Deterministic repair: never silently execute an unverified plan.
    plan.requiresVerification = true;
    repaired = true;

    for (const obligation of missing) {
      const id = `obligation-${obligation.target}`;
      const already =
        plan.successCriteria?.some(
          (criterion) => criterion.id === id,
        ) ?? false;
      if (!already) {
        plan.successCriteria = [
          ...(plan.successCriteria ?? []),
          {
            id,
            description: criterionForTarget(obligation.target),
            required: true,
          },
        ];
      }
      obligation.satisfied = true;
      obligation.criterionId = id;
      matchedCriteria[obligation.target] = id;
      diagnostics.push(
        `Repaired: appended required verification criterion "${id}" (${criterionForTarget(obligation.target)}).`,
      );
    }

    // Ensure the verify phase has real Roblox tools: inspection (for
    // evidence) and execution (for runtime/behavior checks). Folding into
    // preferredToolGroups reflects the existing resolveToolGroups shape.
    const groups = new Set(plan.preferredToolGroups ?? []);
    if (plan.needsRoblox) {
      groups.add("roblox-inspection");
      groups.add("roblox-execution");
    }
    plan.preferredToolGroups = [...groups];
  }

  const valid = obligations.every((obligation) => obligation.satisfied);

  return {
    valid,
    obligations,
    diagnostics,
    repaired,
    matchedCriteria,
  };
}

/**
 * Pure validation (no mutation). Thin projection over
 * applyVerificationObligations that reports the plan's current state
 * without repairing it.
 */
export function validateVerificationObligations(
  plan: AgentPlan,
): VerificationObligationResult {
  const targets = requiredTargetsForPlan(plan);
  const diagnostics: string[] = [];
  const matchedCriteria: Record<string, string> = {};

  const obligations: VerificationObligation[] = targets.map(
    (target) => {
      let satisfied = false;
      let criterionId: string | undefined;

      if (plan.requiresVerification) {
        const match = (plan.successCriteria ?? []).find(
          (criterion) =>
            criterion.required === true &&
            targetMatchesCriterion(target, criterion.description),
        );
        if (match) {
          satisfied = true;
          criterionId = match.id;
        }
      }

      matchedCriteria[target] = criterionId ?? "";

      return {
        target,
        required: true,
        satisfied,
        explanation: satisfied
          ? `Required ${VERIFICATION_TARGET_LABEL[target].toLowerCase()} is satisfied by success criterion "${criterionId}".`
          : `Required ${VERIFICATION_TARGET_LABEL[target].toLowerCase()} is MISSING.`,
        criterionId,
      };
    },
  );

  for (const obligation of obligations) {
    if (!obligation.satisfied) {
      diagnostics.push(
        `Missing verification obligation: ${VERIFICATION_TARGET_LABEL[obligation.target]}. A modifying ${plan.needsRoblox ? "Roblox" : "project"} plan must include a matching verification step.`,
      );
    }
  }

  return {
    valid: obligations.every((obligation) => obligation.satisfied),
    obligations,
    diagnostics,
    repaired: false,
    matchedCriteria,
  };
}
