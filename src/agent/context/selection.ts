/**
 * P3.6-C — Context Selection
 *
 * Hard eligibility filtering + atomic evidence selection with detail levels.
 * Separated from soft relevance scoring.
 */

import type {
  ContextEvidence,
  ContextCollection,
  ContextSelectionStage,
  ContextSelectionReason,
  ContextDropReason,
  EvidenceDetailLevel,
  SelectedContextEvidence,
  DroppedContextEvidence,
  ContextSelectionResult,
  ContextSelectionMetrics,
  SecurityClassification,
  TrustLevel,
  FreshnessLevel,
  EvidenceStatus,
  PriorityLevel,
  CriticalityLevel,
} from "./types.js";
import { validateContextEvidence } from "./validation.js";

/* ============================================================================
 * ELIGIBILITY FILTER
 * ========================================================================== */

export interface EligibilityInput {
  evidence: ContextEvidence;
  taskDomain: string;
  stage: ContextSelectionStage;
  trustBoundary: "strict" | "permissive";
}

export interface EligibilityResult {
  eligible: boolean;
  dropReason?: ContextDropReason;
  reasons: string[];
}

/**
 * Hard eligibility filter — deterministic rules that exclude evidence
 * before relevance scoring.
 */
export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const { evidence, taskDomain, stage, trustBoundary } = input;
  const reasons: string[] = [];

  // 1. Validation
  const validation = validateContextEvidence(evidence);
  if (!validation.valid) {
    return { eligible: false, dropReason: "irrelevant", reasons: ["validation failed"] };
  }

  // 2. Status check
  if (evidence.status === "superseded") {
    return { eligible: false, dropReason: "superseded", reasons: ["evidence marked superseded"] };
  }

  // 3. Freshness check (only for mutation-sensitive kinds)
  if (evidence.freshness.level === "stale") {
    // Security-critical evidence is never dropped for staleness alone
    if (evidence.securityClassification !== "security-critical") {
      return { eligible: false, dropReason: "stale", reasons: ["evidence is stale"] };
    }
    reasons.push("stale but security-critical — retained");
  }

  // 4. Trust boundary check
  if (trustBoundary === "strict") {
    if (evidence.trustLevel === "external" && evidence.criticality === "critical") {
      // External evidence marked critical is suspicious
      reasons.push("external critical — flagged but retained");
    }
  }

  // 5. Task domain relevance (hard filter for completely unrelated evidence)
  // Only applies to non-critical, non-security evidence
  if (evidence.criticality !== "critical" && evidence.securityClassification === "none") {
    const domainMismatch = isDomainMismatch(evidence, taskDomain);
    if (domainMismatch) {
      return { eligible: false, dropReason: "irrelevant", reasons: [`domain mismatch: ${taskDomain}`] };
    }
  }

  return { eligible: true, reasons };
}

/**
 * Check if evidence is completely unrelated to task domain.
 * Uses evidence metadata (kind, tags) not just keyword matching.
 */
function isDomainMismatch(evidence: ContextEvidence, taskDomain: string): boolean {
  // Evidence kinds that are always domain-relevant
  const universalKinds: Set<string> = new Set([
    "security",
    "remote-security",
    "constraint",
    "user-input",
    "runtime-error",
    "code-error",
  ]);

  if (universalKinds.has(evidence.kind)) return false;

  // Check if task domain matches evidence tags
  if (evidence.tags.some(tag => tag.toLowerCase().includes(taskDomain.toLowerCase()))) {
    return false;
  }

  // Check if task domain matches kind
  const domainKindMap: Record<string, string[]> = {
    "world-building": ["world-building", "placement", "terrain"],
    "gameplay": ["gameplay", "ui", "responsive"],
    "ui": ["ui", "responsive", "placement"],
    "performance": ["performance", "dependency"],
    "architecture": ["architecture", "dependency", "placement"],
    "security": ["security", "remote-security"],
  };

  const relevantKinds = domainKindMap[taskDomain] ?? [];
  if (relevantKinds.length > 0 && relevantKinds.includes(evidence.kind)) {
    return false;
  }

  // If no domain mapping and no tag match, it's a soft mismatch (not hard drop)
  return false;
}

/* ============================================================================
 * ATOMIC SELECTION WITH DETAIL LEVELS
 * ========================================================================== */

export interface SelectionInput {
  evidence: ContextEvidence[];
  taskDomain: string;
  stage: ContextSelectionStage;
  tokenBudget: number;
  trustBoundary: "strict" | "permissive";
  conflictResolver?: ConflictResolver;
}

export interface ConflictResolver {
  resolve(evidence: ContextEvidence[]): ContextEvidence[];
}

export interface SelectionResult {
  selected: SelectedContextEvidence[];
  dropped: DroppedContextEvidence[];
  deferred: string[];
  totalTokens: number;
  metrics: {
    eligible: number;
    droppedBudget: number;
    droppedConflict: number;
    deferredBudget: number;
    deferredReference: number;
  };
}

/**
 * Atomic evidence selection with detail-level fallback.
 * Never truncates arbitrary strings — uses full/compressed/reference.
 */
export function selectEvidence(input: SelectionInput): SelectionResult {
  const { evidence, taskDomain, stage, tokenBudget, trustBoundary } = input;

  // Phase 1: Eligibility
  const eligibilityResults = evidence.map(e => ({
    evidence: e,
    eligibility: checkEligibility({ evidence: e, taskDomain, stage, trustBoundary }),
  }));

  const eligible = eligibilityResults
    .filter(r => r.eligibility.eligible)
    .map(r => r.evidence);

  // Phase 2: Resolve conflicts (placeholder — full implementation in conflicts.ts)
  const postConflict = input.conflictResolver
    ? input.conflictResolver.resolve(eligible)
    : eligible;

  // Phase 3: Sort by selection priority (deterministic)
  const sorted = sortForSelection(postConflict, stage);

  // Phase 4: Token budget allocation with detail levels
  let remainingBudget = tokenBudget;
  const selected: SelectedContextEvidence[] = [];
  const dropped: DroppedContextEvidence[] = [];
  const deferred: string[] = [];

  let droppedBudget = 0;
  let deferredBudget = 0;
  let deferredReference = 0;

  for (const ev of sorted) {
    const fullTokens = ev.tokenEstimate;
    const compressedTokens = estimateCompressedTokens(ev);
    const referenceTokens = estimateReferenceTokens(ev);

    let detailLevel: EvidenceDetailLevel;
    let tokensUsed: number;

    if (remainingBudget >= fullTokens) {
      detailLevel = "full";
      tokensUsed = fullTokens;
    } else if (remainingBudget >= compressedTokens && compressedTokens > 0) {
      detailLevel = "compressed";
      tokensUsed = compressedTokens;
    } else if (remainingBudget >= referenceTokens && referenceTokens > 0) {
      detailLevel = "reference";
      tokensUsed = referenceTokens;
      deferred.push(ev.id);
      deferredReference++;
    } else {
      // No budget for even a reference
      dropped.push({
        evidenceId: ev.id,
        reason: "budget-exceeded",
        score: 0,
      });
      droppedBudget++;
      continue;
    }

    // Determine selection reasons
    const reasons = getSelectionReasons(ev, stage);

    selected.push({
      evidenceId: ev.id,
      score: 0, // Will be filled by relevance engine
      reasons,
      estimatedTokens: tokensUsed,
      detailLevel,
    });

    remainingBudget -= tokensUsed;
  }

  // Any remaining eligible but unprocessed evidence gets dropped
  const selectedIds = new Set(selected.map(s => s.evidenceId));
  for (const ev of sorted) {
    if (!selectedIds.has(ev.id) && !deferred.includes(ev.id)) {
      dropped.push({
        evidenceId: ev.id,
        reason: "budget-exceeded",
        score: 0,
      });
      droppedBudget++;
    }
  }

  return {
    selected,
    dropped,
    deferred,
    totalTokens: tokenBudget - remainingBudget,
    metrics: {
      eligible: eligible.length,
      droppedBudget,
      droppedConflict: 0,
      deferredBudget,
      deferredReference,
    },
  };
}

/**
 * Deterministic sort for selection.
 * Priority: severity → priority → relevance → freshness → evidenceId
 */
function sortForSelection(evidence: ContextEvidence[], stage: ContextSelectionStage): ContextEvidence[] {
  const severityOrder: Record<string, number> = {
    "security-critical": 0,
    "critical": 1,
    "high": 2,
    "important": 3,
    "relevant": 4,
    "informational": 5,
    "medium": 6,
    "low": 7,
    "none": 8,
  };

  const priorityOrder: Record<PriorityLevel, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const criticalityOrder: Record<CriticalityLevel, number> = {
    critical: 0,
    important: 1,
    relevant: 2,
    informational: 3,
  };

  const freshnessOrder: Record<FreshnessLevel, number> = {
    current: 0,
    recent: 1,
    unknown: 2,
    stale: 3,
  };

  return [...evidence].sort((a, b) => {
    // Security classification first
    const secA = severityOrder[a.securityClassification] ?? 8;
    const secB = severityOrder[b.securityClassification] ?? 8;
    if (secA !== secB) return secA - secB;

    // Priority
    const priA = priorityOrder[a.priority];
    const priB = priorityOrder[b.priority];
    if (priA !== priB) return priA - priB;

    // Criticality
    const critA = criticalityOrder[a.criticality];
    const critB = criticalityOrder[b.criticality];
    if (critA !== critB) return critA - critB;

    // Stage-specific relevance boost (soft, for tie-breaking)
    const relA = a.relevance;
    const relB = b.relevance;
    if (Math.abs(relA - relB) > 0.01) return relB - relA;

    // Freshness
    const freshA = freshnessOrder[a.freshness.level];
    const freshB = freshnessOrder[b.freshness.level];
    if (freshA !== freshB) return freshA - freshB;

    // Deterministic tie-breaker: evidenceId
    return a.id.localeCompare(b.id);
  });
}

/**
 * Get selection reasons for an evidence item.
 */
function getSelectionReasons(evidence: ContextEvidence, stage: ContextSelectionStage): ContextSelectionReason[] {
  const reasons: ContextSelectionReason[] = [];

  if (evidence.securityClassification === "security-critical") {
    reasons.push("security-critical");
  }
  if (evidence.criticality === "critical") {
    reasons.push("required-by-policy");
  }
  if (evidence.priority === "critical" || evidence.priority === "high") {
    reasons.push("high-priority");
  }
  if (evidence.freshness.level === "current") {
    reasons.push("fresh-evidence");
  }
  if (evidence.tags.length >= 3) {
    reasons.push("corroborated");
  }
  // Stage-specific
  if (stage === "verification" && evidence.kind === "verification") {
    reasons.push("verification-required");
  }
  if (stage === "execution" && (evidence.kind === "placement" || evidence.kind === "dependency")) {
    reasons.push("execution-dependency");
  }
  if (stage === "planning" && (evidence.kind === "architecture" || evidence.kind === "constraint")) {
    reasons.push("task-direct-match");
  }

  return reasons.length > 0 ? reasons : ["high-priority"];
}

/* ============================================================================
 * TOKEN ESTIMATION FOR DETAIL LEVELS
 * ========================================================================== */

function estimateCompressedTokens(evidence: ContextEvidence): number {
  // Compressed: ~40% of original (summary + key fields)
  return Math.ceil(evidence.tokenEstimate * 0.4);
}

function estimateReferenceTokens(evidence: ContextEvidence): number {
  // Reference: ~15% of original (kind + summary + reason)
  return Math.ceil(evidence.tokenEstimate * 0.15);
}

/* ============================================================================
 * MAIN SELECTION ENTRY POINT
 * ========================================================================== */

export interface SelectContextInput {
  collection: ContextCollection;
  taskDomain: string;
  stage: ContextSelectionStage;
  tokenBudget: number;
  trustBoundary: "strict" | "permissive";
}

export function selectContext(input: SelectContextInput): ContextSelectionResult {
  const startTime = Date.now();

  const selection = selectEvidence({
    evidence: input.collection.evidence,
    taskDomain: input.taskDomain,
    stage: input.stage,
    tokenBudget: input.tokenBudget,
    trustBoundary: input.trustBoundary,
  });

  // Generate deterministic hash of selection
  const hashInput = `${input.stage}|${input.tokenBudget}|${selection.selected.map(s => s.evidenceId).join(",")}|${selection.dropped.map(d => d.evidenceId).join(",")}|${selection.deferred.join(",")}`;
  const deterministicHash = hashString(hashInput);

  const selectionDurationMs = Date.now() - startTime;

  return {
    selected: selection.selected,
    dropped: selection.dropped,
    deferred: selection.deferred,
    totalEstimatedTokens: selection.totalTokens,
    tokenBudget: input.tokenBudget,
    stage: input.stage,
    deterministicHash,
    metrics: {
      evidenceCollected: input.collection.evidence.length,
      evidenceEligible: selection.metrics.eligible,
      evidenceSelected: selection.selected.length,
      evidenceDropped: selection.dropped.length,
      evidenceDeferred: selection.deferred.length,
      conflictsDetected: 0,
      conflictsUnresolved: 0,
      estimatedTokensBefore: input.collection.metadata.estimatedTokens,
      estimatedTokensAfter: selection.totalTokens,
      compressionRatio: input.collection.metadata.estimatedTokens > 0
        ? selection.totalTokens / input.collection.metadata.estimatedTokens
        : 0,
      selectionDurationMs,
      assemblyDurationMs: 0,
      budgetUtilization: input.tokenBudget > 0
        ? selection.totalTokens / input.tokenBudget
        : 0,
    },
  };
}

/**
 * Simple deterministic hash for selection reproducibility.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sel-${Math.abs(hash).toString(16)}`;
}