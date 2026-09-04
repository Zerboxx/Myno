/**
 * P3.6-C — Conflict Detection
 *
 * Detects contradictory evidence and provides deterministic resolution.
 * Never fabricates consensus.
 */

import type {
  ContextEvidence,
  EvidenceKind,
  ContextSelectionStage,
  TrustLevel,
  CriticalityLevel,
  FreshnessLevel,
  SecurityClassification,
} from "./types.js";

/* ============================================================================
 * CONFLICT TYPES
 * ========================================================================== */

export type ContextConflictType =
  | "direct-contradiction"
  | "superseded-information"
  | "competing-recommendation"
  | "freshness-conflict"
  | "trust-conflict";

export type ConflictResolution =
  | "prefer-higher-trust"
  | "prefer-fresher"
  | "prefer-higher-severity"
  | "preserve-both"
  | "require-agent-verification";

export interface ContextConflict {
  conflictId: string;
  evidenceIds: string[];
  type: ContextConflictType;
  severity: "low" | "medium" | "high" | "critical";
  resolution: ConflictResolution;
  description: string;
}

export interface ConflictDetectionResult {
  conflicts: ContextConflict[];
  evidenceToPreserve: string[];    // Evidence IDs to keep
  evidenceToDrop: string[];        // Evidence IDs to drop
  unresolved: string[];            // Evidence IDs with unresolved conflicts
}

/* ============================================================================
 * CONFLICT DETECTION
 * ========================================================================== */

let conflictCounter = 0;

export function detectConflicts(
  evidence: ContextEvidence[],
  stage: ContextSelectionStage,
): ConflictDetectionResult {
  const conflicts: ContextConflict[] = [];
  const evidenceToPreserve = new Set<string>();
  const evidenceToDrop = new Set<string>();
  const unresolved = new Set<string>();

  // Group evidence by kind for comparison
  const byKind = new Map<EvidenceKind, ContextEvidence[]>();
  for (const ev of evidence) {
    const existing = byKind.get(ev.kind) ?? [];
    existing.push(ev);
    byKind.set(ev.kind, existing);
  }

  // Check for conflicts within each kind
  for (const [kind, items] of byKind) {
    if (items.length < 2) continue;

    // Compare each pair
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];

        const conflict = checkPairConflict(a, b, stage);
        if (conflict) {
          conflicts.push(conflict);

          // Apply resolution
          applyResolution(conflict, a, b, evidenceToPreserve, evidenceToDrop, unresolved);
        }
      }
    }
  }

  // All evidence not dropped is preserved by default
  for (const ev of evidence) {
    if (!evidenceToDrop.has(ev.id) && !unresolved.has(ev.id)) {
      evidenceToPreserve.add(ev.id);
    }
  }

  return {
    conflicts,
    evidenceToPreserve: Array.from(evidenceToPreserve),
    evidenceToDrop: Array.from(evidenceToDrop),
    unresolved: Array.from(unresolved),
  };
}

/* ============================================================================
 * PAIRWISE CONFLICT CHECKS
 * ========================================================================== */

function checkPairConflict(
  a: ContextEvidence,
  b: ContextEvidence,
  stage: ContextSelectionStage,
): ContextConflict | null {
  // Same deduplication key = likely duplicate, not conflict
  if (a.deduplicationKey === b.deduplicationKey) return null;

  // Different kinds = not comparable
  if (a.kind !== b.kind) return null;

  // Both text content - check for semantic contradiction
  if (a.content.type === "text" && b.content.type === "text") {
    return checkTextContradiction(a, b);
  }

  // Structured content - check for contradictory fields
  if (a.content.type === "structured" && b.content.type === "structured") {
    return checkStructuredConflict(a, b);
  }

  // Freshness conflict
  if (a.freshness.level === "stale" && b.freshness.level === "current") {
    return createConflict(
      "freshness-conflict",
      [a.id, b.id],
      "medium",
      "prefer-fresher",
      `Stale evidence (${a.id}) contradicted by fresh evidence (${b.id})`,
    );
  }

  // Trust conflict - external critical vs system
  if (a.trustLevel === "external" && a.criticality === "critical" &&
      b.trustLevel === "system" && b.criticality !== "critical") {
    return createConflict(
      "trust-conflict",
      [a.id, b.id],
      "high",
      "preserve-both",
      `External critical evidence conflicts with system evidence`,
    );
  }

  return null;
}

function checkTextContradiction(a: ContextEvidence, b: ContextEvidence): ContextConflict | null {
  if (a.content.type !== "text" || b.content.type !== "text") return null;
  const textA = a.content.value.toLowerCase();
  const textB = b.content.value.toLowerCase();

  // Check for direct negation patterns
  const negationPairs = [
    ["must", "must not"],
    ["should", "should not"],
    ["recommended", "not recommended"],
    ["required", "not required"],
    ["valid", "invalid"],
    ["secure", "insecure"],
    ["safe", "unsafe"],
    ["enable", "disable"],
    ["allow", "deny"],
    ["true", "false"],
    ["yes", "no"],
  ];

  for (const [pos, neg] of negationPairs) {
    if (textA.includes(pos) && textB.includes(neg)) {
      // Check if they're talking about the same subject
      const subjectWordsA = extractSubjectWords(textA);
      const subjectWordsB = extractSubjectWords(textB);
      const overlap = subjectWordsA.filter(w => subjectWordsB.includes(w));

      if (overlap.length >= 2) {
        return createConflict(
          "direct-contradiction",
          [a.id, b.id],
          "high",
          "require-agent-verification",
          `Contradictory recommendations: "${truncate(a.content.value, 60)}" vs "${truncate(b.content.value, 60)}"`,
        );
      }
    }
  }

  // Competing recommendations (both positive but different)
  const recKeywords = ["recommend", "suggest", "should", "prefer", "use", "avoid"];
  const aIsRec = recKeywords.some(k => textA.includes(k));
  const bIsRec = recKeywords.some(k => textB.includes(k));

  if (aIsRec && bIsRec) {
    // Different recommendations for same topic
    const subjectWordsA = extractSubjectWords(textA);
    const subjectWordsB = extractSubjectWords(textB);
    const overlap = subjectWordsA.filter(w => subjectWordsB.includes(w));

    if (overlap.length >= 2) {
      return createConflict(
        "competing-recommendation",
        [a.id, b.id],
        "medium",
        "preserve-both",
        `Competing recommendations for ${overlap.join(", ")}`,
      );
    }
  }

  return null;
}

function checkStructuredConflict(a: ContextEvidence, b: ContextEvidence): ContextConflict | null {
  if (a.content.type !== "structured" || b.content.type !== "structured") return null;
  const valA = a.content.value;
  const valB = b.content.value;

  // Check for contradictory boolean fields
  for (const key of Object.keys(valA)) {
    if (key in valB) {
      const vA = valA[key];
      const vB = valB[key];

      if (typeof vA === "boolean" && typeof vB === "boolean" && vA !== vB) {
        return createConflict(
          "direct-contradiction",
          [a.id, b.id],
          "high",
          "require-agent-verification",
          `Structured evidence contradicts on field "${key}": ${vA} vs ${vB}`,
        );
      }

      // Numeric thresholds
      if (typeof vA === "number" && typeof vB === "number") {
        const diff = Math.abs(vA - vB) / Math.max(Math.abs(vA), Math.abs(vB), 1);
        if (diff > 0.5) {
          return createConflict(
            "competing-recommendation",
            [a.id, b.id],
            "medium",
            "preserve-both",
            `Significantly different values for "${key}": ${vA} vs ${vB}`,
          );
        }
      }
    }
  }

  return null;
}

/* ============================================================================
 * RESOLUTION APPLICATION
 * ========================================================================== */

function applyResolution(
  conflict: ContextConflict,
  a: ContextEvidence,
  b: ContextEvidence,
  preserve: Set<string>,
  drop: Set<string>,
  unresolved: Set<string>,
): void {
  switch (conflict.resolution) {
    case "prefer-higher-trust": {
      const trustOrder: Record<TrustLevel, number> = { system: 5, "project-data": 4, "user-input": 3, external: 2, unknown: 1 };
      const trustA = trustOrder[a.trustLevel] ?? 0;
      const trustB = trustOrder[b.trustLevel] ?? 0;
      if (trustA > trustB) {
        preserve.add(a.id);
        drop.add(b.id);
      } else if (trustB > trustA) {
        preserve.add(b.id);
        drop.add(a.id);
      } else {
        unresolved.add(a.id);
        unresolved.add(b.id);
      }
      break;
    }

    case "prefer-fresher": {
      if (a.freshness.producedAt > b.freshness.producedAt) {
        preserve.add(a.id);
        drop.add(b.id);
      } else if (b.freshness.producedAt > a.freshness.producedAt) {
        preserve.add(b.id);
        drop.add(a.id);
      } else {
        unresolved.add(a.id);
        unresolved.add(b.id);
      }
      break;
    }

    case "prefer-higher-severity": {
      const sevOrder: Record<SecurityClassification, number> = { "security-critical": 3, "security-relevant": 2, none: 1 };
      const sevA = sevOrder[a.securityClassification] ?? 0;
      const sevB = sevOrder[b.securityClassification] ?? 0;
      if (sevA > sevB) {
        preserve.add(a.id);
        drop.add(b.id);
      } else if (sevB > sevA) {
        preserve.add(b.id);
        drop.add(a.id);
      } else {
        unresolved.add(a.id);
        unresolved.add(b.id);
      }
      break;
    }

    case "preserve-both":
      preserve.add(a.id);
      preserve.add(b.id);
      break;

    case "require-agent-verification":
      unresolved.add(a.id);
      unresolved.add(b.id);
      break;
  }
}

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function createConflict(
  type: ContextConflictType,
  evidenceIds: string[],
  severity: ContextConflict["severity"],
  resolution: ConflictResolution,
  description: string,
): ContextConflict {
  conflictCounter++;
  return {
    conflictId: `conflict-${Date.now()}-${conflictCounter}`,
    evidenceIds,
    type,
    severity,
    resolution,
    description,
  };
}

function extractSubjectWords(text: string): string[] {
  // Extract noun-like words (capitalized or technical terms)
  const words = text.split(/\s+/)
    .map(w => w.replace(/[^\w]/g, "").toLowerCase())
    .filter(w => w.length > 3);
  return [...new Set(words)];
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
}