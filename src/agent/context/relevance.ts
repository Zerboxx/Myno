/**
 * P3.6-C — Deterministic Relevance Engine
 *
 * Stage-aware, multi-factor relevance scoring.
 * NOT keyword-only — uses structured evidence metadata first.
 */

import type {
  ContextEvidence,
  ContextSelectionStage,
  EvidenceKind,
  TrustLevel,
  FreshnessLevel,
  CriticalityLevel,
  PriorityLevel,
  SecurityClassification,
} from "./types.js";

/* ============================================================================
 * RELEVANCE FACTORS
 * ========================================================================== */

export interface RelevanceFactors {
  taskMatch: number;        // 0-1: how well evidence matches task domain
  stageMatch: number;       // 0-1: relevance for current stage
  priority: number;         // 0-1: from evidence priority
  freshness: number;        // 0-1: from evidence freshness
  confidence: number;       // 0-1: from evidence confidence (or 0.5 for unknown)
  corroboration: number;    // 0-1: from independent source corroboration
  severity: number;         // 0-1: from security/criticality severity
  sourceReliability: number; // 0-1: from trust level
}

export interface RelevanceExplanation {
  evidenceId: string;
  totalScore: number;
  factors: RelevanceFactors;
  weightedFactors: Record<string, number>;
  stage: ContextSelectionStage;
}

/* ============================================================================
 * STAGE-AWARE WEIGHTS
 * ========================================================================== */

// Different stages weight factors differently
const STAGE_WEIGHTS: Record<ContextSelectionStage, Record<keyof RelevanceFactors, number>> = {
  planning: {
    taskMatch: 0.25,
    stageMatch: 0.20,
    priority: 0.15,
    freshness: 0.10,
    confidence: 0.10,
    corroboration: 0.05,
    severity: 0.10,
    sourceReliability: 0.05,
  },
  execution: {
    taskMatch: 0.20,
    stageMatch: 0.25,
    priority: 0.15,
    freshness: 0.15,
    confidence: 0.10,
    corroboration: 0.05,
    severity: 0.05,
    sourceReliability: 0.05,
  },
  verification: {
    taskMatch: 0.15,
    stageMatch: 0.30,
    priority: 0.10,
    freshness: 0.10,
    confidence: 0.15,
    corroboration: 0.10,
    severity: 0.05,
    sourceReliability: 0.05,
  },
  recovery: {
    taskMatch: 0.10,
    stageMatch: 0.25,
    priority: 0.10,
    freshness: 0.15,
    confidence: 0.10,
    corroboration: 0.10,
    severity: 0.15,
    sourceReliability: 0.05,
  },
};

/* ============================================================================
 * KIND → STAGE RELEVANCE MAPPING
 * ========================================================================== */

const KIND_STAGE_RELEVANCE: Record<EvidenceKind, Partial<Record<ContextSelectionStage, number>>> = {
  "project-map": { planning: 0.8, execution: 0.6, verification: 0.4, recovery: 0.5 },
  architecture: { planning: 0.9, execution: 0.7, verification: 0.5, recovery: 0.6 },
  code: { planning: 0.6, execution: 0.8, verification: 0.7, recovery: 0.5 },
  "code-error": { planning: 0.4, execution: 0.7, verification: 0.9, recovery: 0.9 },
  "runtime-error": { planning: 0.3, execution: 0.5, verification: 0.9, recovery: 0.95 },
  security: { planning: 0.95, execution: 0.9, verification: 0.9, recovery: 0.85 },
  "remote-security": { planning: 0.9, execution: 0.85, verification: 0.85, recovery: 0.8 },
  performance: { planning: 0.6, execution: 0.7, verification: 0.7, recovery: 0.5 },
  "world-building": { planning: 0.85, execution: 0.6, verification: 0.4, recovery: 0.3 },
  ui: { planning: 0.7, execution: 0.7, verification: 0.6, recovery: 0.4 },
  gameplay: { planning: 0.8, execution: 0.7, verification: 0.5, recovery: 0.4 },
  knowledge: { planning: 0.5, execution: 0.4, verification: 0.4, recovery: 0.5 },
  lesson: { planning: 0.6, execution: 0.5, verification: 0.5, recovery: 0.8 },
  "failure-pattern": { planning: 0.5, execution: 0.4, verification: 0.4, recovery: 0.9 },
  constitution: { planning: 0.8, execution: 0.7, verification: 0.7, recovery: 0.7 },
  placement: { planning: 0.85, execution: 0.8, verification: 0.5, recovery: 0.4 },
  dependency: { planning: 0.8, execution: 0.75, verification: 0.6, recovery: 0.5 },
  observation: { planning: 0.4, execution: 0.5, verification: 0.4, recovery: 0.5 },
  verification: { planning: 0.3, execution: 0.4, verification: 0.95, recovery: 0.7 },
  "user-input": { planning: 0.9, execution: 0.7, verification: 0.6, recovery: 0.5 },
  constraint: { planning: 0.9, execution: 0.8, verification: 0.7, recovery: 0.6 },
  quality: { planning: 0.5, execution: 0.5, verification: 0.8, recovery: 0.5 },
  responsive: { planning: 0.5, execution: 0.5, verification: 0.5, recovery: 0.3 },
};

/* ============================================================================
 * MAIN RELEVANCE SCORING
 * ========================================================================== */

export function computeRelevance(
  evidence: ContextEvidence,
  taskDomain: string,
  stage: ContextSelectionStage,
  allEvidence: ContextEvidence[],
): RelevanceExplanation {
  const factors = computeFactors(evidence, taskDomain, stage, allEvidence);
  const weights = STAGE_WEIGHTS[stage];

  const weightedFactors: Record<string, number> = {};
  let totalScore = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const k = key as keyof RelevanceFactors;
    const value = factors[k];
    const weighted = value * weight;
    weightedFactors[key] = weighted;
    totalScore += weighted;
  }

  // Clamp
  totalScore = Math.max(0, Math.min(1, totalScore));

  return {
    evidenceId: evidence.id,
    totalScore,
    factors,
    weightedFactors,
    stage,
  };
}

/* ============================================================================
 * FACTOR COMPUTATION
 * ========================================================================== */

function computeFactors(
  evidence: ContextEvidence,
  taskDomain: string,
  stage: ContextSelectionStage,
  allEvidence: ContextEvidence[],
): RelevanceFactors {
  return {
    taskMatch: computeTaskMatch(evidence, taskDomain),
    stageMatch: computeStageMatch(evidence, stage),
    priority: computePriorityFactor(evidence),
    freshness: computeFreshnessFactor(evidence),
    confidence: computeConfidenceFactor(evidence),
    corroboration: computeCorroborationFactor(evidence, allEvidence),
    severity: computeSeverityFactor(evidence),
    sourceReliability: computeSourceReliabilityFactor(evidence),
  };
}

/**
 * Task domain match using evidence kind, tags, and source.
 * NOT keyword-only substring matching.
 */
function computeTaskMatch(evidence: ContextEvidence, taskDomain: string): number {
  // Exact tag match
  const domainLower = taskDomain.toLowerCase();
  if (evidence.tags.some(t => t.toLowerCase() === domainLower)) return 1.0;

  // Kind matches domain
  const domainKindMap: Record<string, EvidenceKind[]> = {
    "world-building": ["world-building", "placement", "world-building"],
    "gameplay": ["gameplay", "ui", "responsive"],
    "ui": ["ui", "responsive", "placement"],
    "performance": ["performance", "dependency"],
    "architecture": ["architecture", "dependency", "placement"],
    "security": ["security", "remote-security"],
    "general": ["constraint", "user-input", "constitution"],
  };

  const relevantKinds = domainKindMap[domainLower] ?? [];
  if (relevantKinds.includes(evidence.kind)) return 0.8;

  // Tag contains domain
  if (evidence.tags.some(t => t.toLowerCase().includes(domainLower))) return 0.6;

  // Universal kinds always have some relevance
  const universal: EvidenceKind[] = ["security", "remote-security", "constraint", "user-input"];
  if (universal.includes(evidence.kind)) return 0.5;

  return 0.2;
}

/**
 * Stage-specific relevance for this evidence kind.
 */
function computeStageMatch(evidence: ContextEvidence, stage: ContextSelectionStage): number {
  const kindRelevance = KIND_STAGE_RELEVANCE[evidence.kind];
  if (kindRelevance && kindRelevance[stage] !== undefined) {
    return kindRelevance[stage]!;
  }
  // Default moderate relevance
  return 0.5;
}

/**
 * Priority factor (critical=1.0, high=0.75, medium=0.5, low=0.25)
 */
function computePriorityFactor(evidence: ContextEvidence): number {
  const priorityMap: Record<PriorityLevel, number> = {
    critical: 1.0,
    high: 0.75,
    medium: 0.5,
    low: 0.25,
  };
  return priorityMap[evidence.priority] ?? 0.5;
}

/**
 * Freshness factor (current=1.0, recent=0.8, unknown=0.5, stale=0.3)
 */
function computeFreshnessFactor(evidence: ContextEvidence): number {
  const freshnessMap: Record<FreshnessLevel, number> = {
    current: 1.0,
    recent: 0.8,
    unknown: 0.5,
    stale: 0.3,
  };
  return freshnessMap[evidence.freshness.level] ?? 0.5;
}

/**
 * Confidence factor. UNKNOWN confidence = 0.5 (NOT fabricated to 0.5, explicitly 0.5).
 * This is a deliberate design choice: unknown = neutral, not high or low.
 */
function computeConfidenceFactor(evidence: ContextEvidence): number {
  if (evidence.confidence === "unknown") return 0.5;
  return evidence.confidence;
}

/**
 * Corroboration factor based on independent sources.
 * Counts distinct source IDs supporting similar findings.
 */
function computeCorroborationFactor(evidence: ContextEvidence, allEvidence: ContextEvidence[]): number {
  const sameKind = allEvidence.filter(e =>
    e.kind === evidence.kind &&
    e.id !== evidence.id &&
    e.content.type === evidence.content.type
  );

  // Check for semantic similarity (same dedup key or similar content)
  const similar = sameKind.filter(e => {
    if (e.deduplicationKey === evidence.deduplicationKey) return true;
    if (e.content.type === "text" && evidence.content.type === "text") {
      // Simple word overlap check
      const wordsA = new Set(evidence.content.value.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const wordsB = new Set(e.content.value.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const overlap = [...wordsA].filter(w => wordsB.has(w)).length;
      return overlap >= 2;
    }
    return false;
  });

  const corroborationCount = similar.length;
  if (corroborationCount === 0) return 0.0;
  if (corroborationCount === 1) return 0.5;
  return 0.8; // 2+ independent sources
}

/**
 * Severity factor from security classification and criticality.
 */
function computeSeverityFactor(evidence: ContextEvidence): number {
  // Security-critical always high
  if (evidence.securityClassification === "security-critical") return 1.0;
  if (evidence.securityClassification === "security-relevant") return 0.7;

  // Criticality
  const critMap: Record<CriticalityLevel, number> = {
    critical: 1.0,
    important: 0.75,
    relevant: 0.5,
    informational: 0.25,
  };
  return critMap[evidence.criticality] ?? 0.5;
}

/**
 * Source reliability from trust level.
 */
function computeSourceReliabilityFactor(evidence: ContextEvidence): number {
  const trustMap: Record<TrustLevel, number> = {
    system: 1.0,
    "project-data": 0.8,
    "user-input": 0.6,
    external: 0.4,
    unknown: 0.3,
  };
  return trustMap[evidence.trustLevel] ?? 0.5;
}

/* ============================================================================
 * BATCH RELEVANCE
 * ========================================================================== */

export function computeRelevanceBatch(
  evidence: ContextEvidence[],
  taskDomain: string,
  stage: ContextSelectionStage,
): RelevanceExplanation[] {
  return evidence.map(e => computeRelevance(e, taskDomain, stage, evidence));
}

/* ============================================================================
 * EXPLAINABILITY HELPER
 * ========================================================================== */

export function formatRelevanceExplanation(explanation: RelevanceExplanation): string {
  const lines = [
    `Evidence: ${explanation.evidenceId}`,
    `Stage: ${explanation.stage}`,
    `Total Score: ${explanation.totalScore.toFixed(3)}`,
    "Factors:",
  ];

  for (const [key, value] of Object.entries(explanation.factors)) {
    const weight = STAGE_WEIGHTS[explanation.stage][key as keyof RelevanceFactors];
    const weighted = explanation.weightedFactors[key];
    lines.push(`  ${key}: ${value.toFixed(2)} × ${weight.toFixed(2)} = ${weighted.toFixed(3)}`);
  }

  return lines.join("\n");
}