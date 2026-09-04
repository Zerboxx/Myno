/**
 * P3.6-A — Evidence Construction
 *
 * Factory functions for creating ContextEvidence items.
 * Ensures all required fields are populated with sensible defaults.
 */

import type {
  ContextEvidence,
  ContextEvidenceId,
  EvidenceKind,
  ContextSource,
  ContextContent,
  ContextRelevance,
  ContextConfidence,
  ContextFreshness,
  CriticalityLevel,
  PriorityLevel,
  TokenEstimate,
  DeduplicationKey,
  EvidenceStatus,
  SecurityClassification,
  TrustLevel,
  ProvenanceChain,
  CONTEXT_SCHEMA_VERSION,
} from "./types.js";

/* ============================================================================
 * ID GENERATION
 * ========================================================================== */

let idCounter = 0;

/**
 * Generate a stable evidence ID.
 * Uses timestamp + counter for uniqueness.
 * NOT based on array position.
 */
export function generateEvidenceId(): ContextEvidenceId {
  idCounter++;
  return `ctx-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ============================================================================
 * TOKEN ESTIMATION
 * ========================================================================== */

/**
 * Estimate token count from text content.
 * Uses a rough heuristic (~4 chars per token for English text).
 * NOT a provider-specific tokenizer — this is an approximation.
 */
export function estimateTokens(text: string): TokenEstimate {
  if (!text || text.length === 0) return 0;
  // Rough heuristic: ~4 characters per token for English
  // Plus overhead for formatting
  return Math.ceil(text.length / 4) + 2;
}

/**
 * Estimate tokens for structured content.
 */
export function estimateStructuredTokens(data: Record<string, unknown>): TokenEstimate {
  const json = JSON.stringify(data);
  return estimateTokens(json);
}

/* ============================================================================
 * DEDUPLICATION KEY GENERATION
 * ========================================================================== */

/**
 * Generate a deterministic deduplication key from evidence properties.
 * Same semantic fact → same key, regardless of source or ID.
 */
export function generateDeduplicationKey(
  kind: EvidenceKind,
  content: ContextContent,
  sourceContext?: string,
): DeduplicationKey {
  const contentStr = content.type === "text"
    ? content.value
    : content.type === "structured"
      ? JSON.stringify(sortedKeys(content.value))
      : content.type === "code"
        ? content.value
        : content.type === "error"
          ? content.message
          : content.type === "reference"
            ? `${content.targetKind}:${content.targetId}`
            : "";

  // Normalize: lowercase, collapse whitespace, trim
  const normalized = contentStr
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  // Include kind and optional source context for semantic grouping
  const parts = [kind, normalized];
  if (sourceContext) parts.push(sourceContext.toLowerCase().replace(/\s+/g, " ").trim());

  return parts.join("::");
}

/**
 * Sort object keys deterministically for consistent serialization.
 */
function sortedKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

/* ============================================================================
 * EVIDENCE CONSTRUCTION
 * ========================================================================== */

export interface EvidenceInput {
  kind: EvidenceKind;
  source: ContextSource;
  content: ContextContent;
  relevance?: ContextRelevance;
  confidence?: ContextConfidence;
  freshness?: ContextFreshness;
  criticality?: CriticalityLevel;
  priority?: PriorityLevel;
  tokenEstimate?: TokenEstimate;
  deduplicationKey?: DeduplicationKey;
  status?: EvidenceStatus;
  securityClassification?: SecurityClassification;
  trustLevel?: TrustLevel;
  provenance?: ProvenanceChain;
  tags?: string[];
}

/**
 * Create a ContextEvidence item with sensible defaults.
 * All required fields are populated.
 */
export function createEvidence(input: EvidenceInput): ContextEvidence {
  const now = Date.now();
  const content = input.content;

  // Auto-estimate tokens if not provided
  const tokenEstimate = input.tokenEstimate ?? (
    content.type === "text"
      ? estimateTokens(content.value)
      : content.type === "structured"
        ? estimateStructuredTokens(content.value)
        : content.type === "code"
          ? estimateTokens(content.value)
          : content.type === "error"
            ? estimateTokens(content.message)
            : 10
  );

  // Auto-generate dedup key if not provided
  const deduplicationKey = input.deduplicationKey ?? generateDeduplicationKey(
    input.kind,
    content,
    input.source.sourceName,
  );

  return {
    id: generateEvidenceId(),
    kind: input.kind,
    source: input.source,
    content,
    relevance: input.relevance ?? 0.5,
    confidence: input.confidence ?? "unknown",
    freshness: input.freshness ?? { level: "current", producedAt: now },
    criticality: input.criticality ?? "informational",
    priority: input.priority ?? "medium",
    tokenEstimate,
    deduplicationKey,
    status: input.status ?? "valid",
    securityClassification: input.securityClassification ?? "none",
    trustLevel: input.trustLevel ?? "project-data",
    createdAt: now,
    updatedAt: now,
    provenance: input.provenance ?? { derivedFrom: [], steps: ["created"] },
    tags: input.tags ?? [],
    schemaVersion: 1,
  };
}

/**
 * Create derived evidence from original evidence.
 * Preserves provenance chain and security classification.
 */
export function createDerivedEvidence(
  original: ContextEvidence,
  input: Omit<EvidenceInput, "source"> & { source?: ContextSource },
): ContextEvidence {
  const now = Date.now();
  const source: ContextSource = input.source ?? {
    sourceType: "generated-summary",
    sourceId: "derived",
    sourceName: `Derived from ${original.id}`,
    timestamp: now,
  };

  // Security classification is the MAXIMUM of original and new
  const securityClassification: SecurityClassification =
    original.securityClassification === "security-critical"
      ? "security-critical"
      : original.securityClassification === "security-relevant" || input.securityClassification === "security-relevant"
        ? "security-relevant"
        : input.securityClassification ?? "none";

  // Criticality is the MAXIMUM
  const criticalityOrder = { informational: 0, relevant: 1, important: 2, critical: 3 };
  const maxCriticality = Math.max(
    criticalityOrder[original.criticality],
    criticalityOrder[input.criticality ?? "informational"],
  );
  const criticality: CriticalityLevel = (["informational", "relevant", "important", "critical"] as const)[maxCriticality];

  // Provenance chain includes original
  const provenance: ProvenanceChain = {
    derivedFrom: [original.id, ...(original.provenance?.derivedFrom ?? [])],
    steps: [...(original.provenance?.steps ?? []), `derived from ${original.id}`],
  };

  const content = input.content;

  const tokenEstimate = input.tokenEstimate ?? (
    content.type === "text"
      ? estimateTokens(content.value)
      : content.type === "structured"
        ? estimateStructuredTokens(content.value)
        : 10
  );

  const deduplicationKey = input.deduplicationKey ?? generateDeduplicationKey(
    input.kind,
    content,
    source.sourceName,
  );

  return {
    id: generateEvidenceId(),
    kind: input.kind,
    source,
    content,
    relevance: input.relevance ?? original.relevance,
    confidence: input.confidence ?? original.confidence,
    freshness: input.freshness ?? { level: "current", producedAt: now },
    criticality,
    priority: input.priority ?? original.priority,
    tokenEstimate,
    deduplicationKey,
    status: input.status ?? "valid",
    securityClassification,
    trustLevel: input.trustLevel ?? original.trustLevel,
    createdAt: now,
    updatedAt: now,
    provenance,
    tags: [...new Set([...original.tags, ...(input.tags ?? [])])],
    schemaVersion: 1,
  };
}
