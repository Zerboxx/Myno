import { FALLBACK_SKILL_ID, SKILL_CATALOG } from "./index.js";
import type { ToolGroup } from "../../tools/types.js";
import type {
  SemanticDomain,
  SemanticIntent,
  SkillDefinition,
  SkillSelection,
  SemanticRequest,
  OperationKind,
} from "./types.js";

/* ============================================================================
 * PURE, DETERMINISTIC SKILL SELECTION
 *
 * selectSkills is a pure function over {intent, domain, operation, scope,
 * target}. It NEVER branches on language, NEVER calls the model, and has
 * no side effects. The same SemanticRequest always yields the same
 * SkillSelection. This keeps the semantic layer testable and predictable —
 * the model only ever gets involved on the outer ambiguity fallback, which
 * plan.ts decides on before any selection happens (requiresClarification).
 *
 * This is explicitly NOT an ML/agentic router and NOT a registry. It is a
 * compile-time catalog plus a scoring filter.
 * ========================================================================== */

interface ScoredSkill {
  skill: SkillDefinition;
  score: number;
  matched: string[];
}

function skillEligible(
  skill: SkillDefinition,
  intent: SemanticIntent,
  domain: SemanticDomain,
): boolean {
  return (
    skill.intents.includes(intent) &&
    domain !== "general" &&
    skill.domains.includes(domain)
  );
}

function scoreSkill(
  skill: SkillDefinition,
  request: SemanticRequest,
  matched: string[],
): number {
  let score = 4;

  const operation: OperationKind = request.operation;

  if (skill.operations.includes(operation)) {
    score += 2;
    matched.push(`operation:${operation}`);
  }

  const scopes = skill.scopes ?? ["none"];

  if (scopes.includes(request.scope)) {
    score += 1;
    matched.push(`scope:${request.scope}`);
  }

  if (request.target.kind !== "none") {
    score += 1;
  }

  return score;
}

export function selectSkills(
  request: SemanticRequest,
  catalog: readonly SkillDefinition[] = SKILL_CATALOG,
): SkillSelection {
  const scored: ScoredSkill[] = [];

  for (const skill of catalog) {
    if (!skillEligible(skill, request.intent, request.domain)) {
      continue;
    }

    const matched: string[] = [];

    const score = scoreSkill(skill, request, matched);

    if (score > 0) {
      scored.push({ skill, score, matched });
    }
  }

  if (scored.length === 0) {
    const fallback =
      catalog.find(
        (skill) => skill.id === FALLBACK_SKILL_ID,
      ) ?? catalog[0];

    if (!fallback) {
      throw new Error(
        "SkillCatalog is empty; a fallback skill is required.",
      );
    }

    return {
      primary: fallback,
      adjuncts: [],
      confidence: 0.5,
      rationale: `Fallback: no catalog skill matched "${request.intent}/${request.domain}/${request.operation}".`,
    };
  }

  /*
   * Deterministic selection: highest score wins; ties resolve to catalog
   * order (stable sort preserves original index order).
   */
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];

  const primary = top.skill;

  const adjuncts = scored
    .slice(1)
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.skill);

  const exactOperation = primary.operations.includes(request.operation);

  const confidence = exactOperation ? 1 : 0.8;

  const incentives =
    top.matched.length > 0
      ? ` (${top.matched.join(", ")})`
      : "";

  const rationale =
    `Selected "${primary.id}" for intent=${request.intent}, ` +
    `domain=${request.domain}, operation=${request.operation}, ` +
    `scope=${request.scope}, target=${request.target.kind} — ` +
    `score ${top.score}${incentives}${adjuncts.length > 0 ? `; adjuncts: ${adjuncts.map((s) => s.id).join(", ")}` : ""}.`;

  return {
    primary,
    adjuncts: adjuncts.slice(0, 1),
    confidence,
    rationale,
  };
}

/**
 * Merges the PRIMARY skill's tool-group posture into the plan's preferred
 * groups. requiredGroups always apply; optionalGroups apply only when the
 * domain already enables them (returned in the plan's base groups) so a
 * surgical visual refinement does not force execution tools.
 *
 * Adjunct skills intentionally contribute NOTHING to tool posture — only
 * the primary skill owns groups. A visual refinement adjacent to a
 * full-redesign must not inherit full-redesign's execution requirements.
 */
export function mergeSkillGroups(
  selection: SkillSelection,
  baseGroups: ToolGroup[],
  domain: SemanticDomain,
): ToolGroup[] {
  const merged = new Set<ToolGroup>(baseGroups);

  const skill = selection.primary;

  if (skill.domains.includes(domain)) {
    for (const group of skill.requiredGroups) {
      merged.add(group);
    }

    for (const group of skill.optionalGroups ?? []) {
      if (baseGroups.includes(group)) {
        merged.add(group);
      }
    }
  }

  return [...merged];
}