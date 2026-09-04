/**
 * P3.6-B — Freshness System
 *
 * Classifies evidence freshness based on collection time,
 * evidence kind, project mutation state, and TTL.
 */

import type {
  ContextEvidence,
  ContextFreshness,
  FreshnessLevel,
  EvidenceKind,
} from "./types.js";

/* ============================================================================
 * FRESHNESS POLICIES
 * ========================================================================== */

interface FreshnessPolicy {
  /** Base TTL in milliseconds (0 = no expiry) */
  baseTtlMs: number;
  /** How quickly this evidence kind ages */
  agingMultiplier: number;
  /** Whether project mutation should invalidate this evidence */
  invalidatedByMutation: boolean;
}

/** Kind-aware freshness policies */
const FRESHNESS_POLICIES: Record<string, FreshnessPolicy> = {
  // Project structure: invalidated by mutation
  "project-map": { baseTtlMs: 300_000, agingMultiplier: 1.0, invalidatedByMutation: true },
  architecture: { baseTtlMs: 600_000, agingMultiplier: 0.8, invalidatedByMutation: true },
  placement: { baseTtlMs: 300_000, agingMultiplier: 1.0, invalidatedByMutation: true },
  dependency: { baseTtlMs: 300_000, agingMultiplier: 1.0, invalidatedByMutation: true },

  // Code evidence
  code: { baseTtlMs: 120_000, agingMultiplier: 0.5, invalidatedByMutation: true },
  "code-error": { baseTtlMs: 120_000, agingMultiplier: 0.5, invalidatedByMutation: true },
  "runtime-error": { baseTtlMs: 60_000, agingMultiplier: 0.3, invalidatedByMutation: false },

  // Security: relatively stable but invalidated by mutation
  security: { baseTtlMs: 600_000, agingMultiplier: 0.7, invalidatedByMutation: true },
  "remote-security": { baseTtlMs: 600_000, agingMultiplier: 0.7, invalidatedByMutation: true },

  // Performance: moderately stable
  performance: { baseTtlMs: 300_000, agingMultiplier: 0.6, invalidatedByMutation: false },

  // User input: doesn't expire unless superseded
  "user-input": { baseTtlMs: 0, agingMultiplier: 0.0, invalidatedByMutation: false },
  constraint: { baseTtlMs: 0, agingMultiplier: 0.0, invalidatedByMutation: false },

  // Lessons and knowledge: historical, slow aging
  lesson: { baseTtlMs: 0, agingMultiplier: 0.1, invalidatedByMutation: false },
  knowledge: { baseTtlMs: 0, agingMultiplier: 0.1, invalidatedByMutation: false },
  "failure-pattern": { baseTtlMs: 0, agingMultiplier: 0.1, invalidatedByMutation: false },

  // Runtime diagnostics: short-lived
  "world-building": { baseTtlMs: 120_000, agingMultiplier: 0.5, invalidatedByMutation: true },
  ui: { baseTtlMs: 120_000, agingMultiplier: 0.5, invalidatedByMutation: true },
  gameplay: { baseTtlMs: 300_000, agingMultiplier: 0.6, invalidatedByMutation: false },
  quality: { baseTtlMs: 300_000, agingMultiplier: 0.5, invalidatedByMutation: false },
  responsive: { baseTtlMs: 120_000, agingMultiplier: 0.5, invalidatedByMutation: true },

  // Verification: stable historically
  verification: { baseTtlMs: 0, agingMultiplier: 0.2, invalidatedByMutation: false },

  // Constitution: stable
  constitution: { baseTtlMs: 0, agingMultiplier: 0.0, invalidatedByMutation: false },

  // Observations: short-lived
  observation: { baseTtlMs: 60_000, agingMultiplier: 0.3, invalidatedByMutation: false },
};

const DEFAULT_POLICY: FreshnessPolicy = {
  baseTtlMs: 120_000,
  agingMultiplier: 0.5,
  invalidatedByMutation: false,
};

/* ============================================================================
 * FRESHNESS CLASSIFICATION
 * ========================================================================== */

/**
 * Classify evidence freshness based on age and kind.
 */
export function classifyFreshness(
  evidence: ContextEvidence,
  now: number = Date.now(),
): FreshnessLevel {
  const policy = FRESHNESS_POLICIES[evidence.kind] ?? DEFAULT_POLICY;
  const age = now - evidence.freshness.producedAt;

  // If no TTL, evidence doesn't expire by age
  if (policy.baseTtlMs === 0) {
    return "current";
  }

  const effectiveTtl = policy.baseTtlMs * policy.agingMultiplier;

  if (effectiveTtl === 0) return "current";

  if (age < effectiveTtl * 0.5) return "current";
  if (age < effectiveTtl) return "recent";
  if (age < effectiveTtl * 2) return "stale";
  return "stale"; // Beyond TTL = stale
}

/**
 * Evaluate freshness for a collection of evidence.
 * Returns updated evidence with current freshness levels.
 */
export function evaluateFreshness(
  evidence: ContextEvidence[],
  projectFingerprintChanged: boolean,
  previousFingerprint?: string,
  currentFingerprint?: string,
  now: number = Date.now(),
): { evidence: ContextEvidence[]; staleCount: number } {
  let staleCount = 0;
  const updated = evidence.map(item => {
    const policy = FRESHNESS_POLICIES[item.kind] ?? DEFAULT_POLICY;
    const level = classifyFreshness(item, now);

    // If project fingerprint changed and this evidence kind is invalidated by mutation
    const mutatedAway = projectFingerprintChanged && policy.invalidatedByMutation;

    const newLevel: FreshnessLevel = mutatedAway ? "stale" : level;

    if (newLevel === "stale") staleCount++;

    return {
      ...item,
      freshness: {
        ...item.freshness,
        level: newLevel,
        validatedAt: now,
      },
    };
  });

  return { evidence: updated, staleCount };
}

/**
 * Check if an evidence kind is invalidated by project mutation.
 */
export function isInvalidatedByMutation(kind: EvidenceKind): boolean {
  const policy = FRESHNESS_POLICIES[kind] ?? DEFAULT_POLICY;
  return policy.invalidatedByMutation;
}

/**
 * Get the freshness policy for a given evidence kind.
 */
export function getFreshnessPolicy(kind: EvidenceKind): FreshnessPolicy {
  return FRESHNESS_POLICIES[kind] ?? DEFAULT_POLICY;
}
