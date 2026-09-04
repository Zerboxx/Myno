/**
 * P3.6-C — Progressive Disclosure
 *
 * Manages deferred evidence references.
 * No fake retrieval tools — honestly represents availability.
 */

import type {
  ContextEvidence,
  ContextReference,
  ContextSelectionStage,
} from "./types.js";

/* ============================================================================
 * REFERENCE CREATION
 * ========================================================================== */

export interface DeferralInput {
  evidence: ContextEvidence;
  reason: "budget-exceeded" | "low-priority" | "stage-inappropriate" | "reference-only";
  stage: ContextSelectionStage;
  availableNow: boolean;
  retrievalMechanism: "none" | "tool" | "follow-up" | "internal";
}

/**
 * Create a deferred reference for evidence that couldn't be included.
 * No fake retrieval — honestly represents availability.
 */
export function createReference(input: DeferralInput): ContextReference {
  const { evidence, reason, stage, availableNow, retrievalMechanism } = input;

  let availability: ContextReference["availability"];
  let retrievalHint: string;

  switch (retrievalMechanism) {
    case "tool":
      availability = "deferred-but-retrievable";
      retrievalHint = `Use 'get_context_evidence' tool with evidenceId: ${evidence.id}`;
      break;
    case "follow-up":
      availability = "deferred-but-retrievable";
      retrievalHint = `Request in follow-up: "Show me ${evidence.kind} evidence for ${evidence.source.sourceName}"`;
      break;
    case "internal":
      availability = "available-now";
      retrievalHint = "Already in context pipeline — accessible via internal query";
      break;
    case "none":
    default:
      availability = "deferred-not-currently-exposed";
      retrievalHint = "Not currently retrievable — would require re-running context collection";
      break;
  }

  // Generate summary based on evidence content
  let summary: string;
  if (evidence.content.type === "text") {
    summary = truncate(evidence.content.value, 120);
  } else if (evidence.content.type === "structured") {
    const keys = Object.keys(evidence.content.value).slice(0, 3);
    summary = `${evidence.kind}: ${keys.join(", ")}`;
  } else {
    summary = `${evidence.kind} evidence from ${evidence.source.sourceName}`;
  }

  return {
    evidenceId: evidence.id,
    kind: evidence.kind,
    summary,
    reasonDeferred: reason,
    retrievalHint,
    availability,
  };
}

/**
 * Create references for all deferred evidence.
 */
export function createReferences(
  evidence: ContextEvidence[],
  deferredIds: string[],
  stage: ContextSelectionStage,
): ContextReference[] {
  const deferredMap = new Map(evidence.filter(e => deferredIds.includes(e.id)).map(e => [e.id, e]));

  return deferredIds.map(id => {
    const ev = deferredMap.get(id);
    if (!ev) {
      return {
        evidenceId: id,
        kind: "unknown",
        summary: "Evidence not found",
        reasonDeferred: "budget-exceeded" as const,
        retrievalHint: "",
        availability: "deferred-not-currently-exposed" as const,
      };
    }

    // Determine deferral reason and retrieval mechanism
    let reason: DeferralInput["reason"] = "budget-exceeded";
    let retrievalMechanism: DeferralInput["retrievalMechanism"] = "none";
    let availableNow = false;

    if (ev.securityClassification === "security-critical") {
      reason = "budget-exceeded";
      retrievalMechanism = "tool";
    } else if (ev.criticality === "critical") {
      reason = "budget-exceeded";
      retrievalMechanism = "follow-up";
    } else if (ev.kind === "lesson" || ev.kind === "knowledge") {
      reason = "low-priority";
      retrievalMechanism = "internal";
    } else if (stage === "planning" && (ev.kind === "observation" || ev.kind === "verification")) {
      reason = "stage-inappropriate";
      retrievalMechanism = "follow-up";
    }

    return createReference({
      evidence: ev,
      reason,
      stage,
      availableNow,
      retrievalMechanism,
    });
  });
}

/* ============================================================================
 * REFERENCE RENDERING
 * ========================================================================== */

export interface ReferenceRenderOptions {
  includeRetrievalHint: boolean;
  groupByAvailability: boolean;
}

export function renderReferences(
  references: ContextReference[],
  options: ReferenceRenderOptions = { includeRetrievalHint: false, groupByAvailability: false },
): string {
  if (references.length === 0) return "";

  const lines = ["", "=== DEFERRED EVIDENCE ==="];

  if (options.groupByAvailability) {
    const byAvailability = new Map<ContextReference["availability"], ContextReference[]>();
    for (const ref of references) {
      const existing = byAvailability.get(ref.availability) ?? [];
      existing.push(ref);
      byAvailability.set(ref.availability, existing);
    }

    for (const [availability, refs] of byAvailability) {
      const label = formatAvailabilityLabel(availability);
      lines.push(`\n--- ${label} ---`);
      for (const ref of refs) {
        lines.push(`[${ref.kind}] ${ref.summary}`);
        if (options.includeRetrievalHint && ref.retrievalHint) {
          lines.push(`  → ${ref.retrievalHint}`);
        }
      }
    }
  } else {
    for (const ref of references) {
      lines.push(`[${ref.kind}] ${ref.summary} (deferred: ${ref.reasonDeferred})`);
      if (options.includeRetrievalHint && ref.retrievalHint) {
        lines.push(`  → ${ref.retrievalHint}`);
      }
    }
  }

  return lines.join("\n");
}

function formatAvailabilityLabel(availability: ContextReference["availability"]): string {
  switch (availability) {
    case "available-now": return "AVAILABLE NOW";
    case "deferred-but-retrievable": return "DEFERRED - RETRIEVABLE";
    case "deferred-not-currently-exposed": return "DEFERRED - NOT RETRIEVABLE";
    default: return "UNKNOWN";
  }
}

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
}

/* ============================================================================
 * PROGRESSIVE DISCLOSURE METADATA FOR ASSEMBLY
 * ========================================================================== */

export interface ProgressiveDisclosureMetadata {
  totalEvidence: number;
  includedEvidence: number;
  deferredEvidence: number;
  deferredByReason: Record<string, number>;
  retrievableCount: number;
  notRetrievableCount: number;
}

export function computeDisclosureMetadata(
  references: ContextReference[],
): ProgressiveDisclosureMetadata {
  const byReason: Record<string, number> = {};
  let retrievable = 0;
  let notRetrievable = 0;

  for (const ref of references) {
    byReason[ref.reasonDeferred] = (byReason[ref.reasonDeferred] ?? 0) + 1;
    if (ref.availability === "deferred-but-retrievable" || ref.availability === "available-now") {
      retrievable++;
    } else {
      notRetrievable++;
    }
  }

  return {
    totalEvidence: 0, // Set by caller
    includedEvidence: 0, // Set by caller
    deferredEvidence: references.length,
    deferredByReason: byReason,
    retrievableCount: retrievable,
    notRetrievableCount: notRetrievable,
  };
}