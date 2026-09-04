/**
 * P3.6-B — Evidence Prioritization
 *
 * Deterministic priority scoring with explainability.
 * Priority is NOT simply confidence — it considers severity,
 * relevance, trustLevel, freshness, corroboration, and task relevance.
 */

import type {
  ContextEvidence,
  PriorityLevel,
  CriticalityLevel,
  FreshnessLevel,
  SecurityClassification,
  TrustLevel,
} from "./types.js";

/* ============================================================================
 * PRIORITY SCORING
 * ========================================================================== */

export interface PriorityScore {
  /** Final computed score (0.0 → 1.0) */
  score: number;
  /** Assigned priority level */
  level: PriorityLevel;
  /** Human-readable explanation of scoring factors */
  factors: string[];
}

/** Weight constants for priority factors */
const WEIGHTS = {
  criticality: 0.30,
  security: 0.25,
  relevance: 0.20,
  trustLevel: 0.10,
  freshness: 0.10,
  corroboration: 0.05,
} as const;

/** Criticality → numeric score */
const CRITICALITY_SCORE: Record<CriticalityLevel, number> = {
  critical: 1.0,
  important: 0.75,
  relevant: 0.5,
  informational: 0.25,
};

/** Security classification → numeric score */
const SECURITY_SCORE: Record<SecurityClassification, number> = {
  "security-critical": 1.0,
  "security-relevant": 0.6,
  none: 0.0,
};

/** Trust level → numeric score (system > project-data > external > unknown) */
const TRUST_SCORE: Record<TrustLevel, number> = {
  system: 0.9,
  "project-data": 0.7,
  "user-input": 0.5,
  external: 0.4,
  unknown: 0.2,
};

/** Freshness level → numeric score */
const FRESHNESS_SCORE: Record<FreshnessLevel, number> = {
  current: 1.0,
  recent: 0.8,
  stale: 0.3,
  unknown: 0.5,
};

/**
 * Compute deterministic priority score for evidence.
 */
export function computePriority(evidence: ContextEvidence): PriorityScore {
  const factors: string[] = [];

  // Criticality
  const critScore = CRITICALITY_SCORE[evidence.criticality];
  factors.push(`criticality:${evidence.criticality}=${critScore}`);

  // Security
  const secScore = SECURITY_SCORE[evidence.securityClassification];
  factors.push(`security:${evidence.securityClassification}=${secScore}`);

  // Relevance (already 0-1)
  const relScore = evidence.relevance;
  factors.push(`relevance=${relScore}`);

  // Trust
  const trustScore = TRUST_SCORE[evidence.trustLevel];
  factors.push(`trust:${evidence.trustLevel}=${trustScore}`);

  // Freshness
  const freshScore = FRESHNESS_SCORE[evidence.freshness.level];
  factors.push(`freshness:${evidence.freshness.level}=${freshScore}`);

  // Corroboration bonus (based on tag count — multiple sources add tags)
  const tagCount = evidence.tags.length;
  const corroborationScore = Math.min(tagCount / 5, 1.0);
  factors.push(`corroboration(tags=${tagCount})=${corroborationScore}`);

  // Weighted sum
  const score =
    critScore * WEIGHTS.criticality +
    secScore * WEIGHTS.security +
    relScore * WEIGHTS.relevance +
    trustScore * WEIGHTS.trustLevel +
    freshScore * WEIGHTS.freshness +
    corroborationScore * WEIGHTS.corroboration;

  // Clamp
  const clamped = Math.max(0, Math.min(1, score));

  // Map to level
  let level: PriorityLevel;
  if (clamped >= 0.8) level = "critical";
  else if (clamped >= 0.6) level = "high";
  else if (clamped >= 0.35) level = "medium";
  else level = "low";

  return { score: clamped, level, factors };
}

/**
 * Assign priority to evidence based on scoring.
 * Returns new evidence with updated priority field.
 */
export function assignPriority(evidence: ContextEvidence): ContextEvidence {
  const { level } = computePriority(evidence);
  return { ...evidence, priority: level };
}

/**
 * Explain why evidence was ranked at a given priority.
 */
export function explainPriority(evidence: ContextEvidence): string {
  const { score, level, factors } = computePriority(evidence);
  const lines = [
    `Priority: ${level} (score: ${score.toFixed(3)})`,
    `Evidence: ${evidence.id} (${evidence.kind})`,
    `Factors:`,
    ...factors.map(f => `  - ${f}`),
  ];
  return lines.join("\n");
}

/**
 * Compare two evidence items for priority sorting (descending).
 * Returns negative if a should come before b.
 */
export function comparePriority(a: ContextEvidence, b: ContextEvidence): number {
  const scoreA = computePriority(a).score;
  const scoreB = computePriority(b).score;
  return scoreB - scoreA;
}
