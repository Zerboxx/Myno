/**
 * P3.6-A — Context Evidence Validation
 *
 * Validates evidence and collections against the canonical schema.
 * Rejects malformed data. Does NOT silently repair.
 */

import type {
  ContextEvidence,
  ContextCollection,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  EvidenceKind,
  SourceType,
  CriticalityLevel,
  PriorityLevel,
  SecurityClassification,
  TrustLevel,
  FreshnessLevel,
  EvidenceStatus,
} from "./types.js";
import {
  VALID_EVIDENCE_KINDS,
  VALID_SOURCE_TYPES,
  VALID_CRITICALITY_LEVELS,
  VALID_PRIORITY_LEVELS,
  VALID_SECURITY_CLASSIFICATIONS,
  VALID_TRUST_LEVELS,
  VALID_FRESHNESS_LEVELS,
  VALID_EVIDENCE_STATUSES,
} from "./types.js";

/* ============================================================================
 * EVIDENCE VALIDATION
 * ========================================================================== */

/**
 * Validate a single ContextEvidence item.
 */
export function validateContextEvidence(evidence: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!evidence || typeof evidence !== "object") {
    return { valid: false, errors: [{ field: "root", message: "Evidence must be a non-null object", severity: "error" }], warnings };
  }

  const e = evidence as Record<string, unknown>;

  // ID
  if (typeof e.id !== "string" || e.id.length === 0) {
    errors.push({ field: "id", message: "Evidence must have a non-empty string id", severity: "error" });
  }

  // Kind
  if (!VALID_EVIDENCE_KINDS.includes(e.kind as EvidenceKind)) {
    errors.push({ field: "kind", message: `Invalid evidence kind: ${e.kind}`, severity: "error" });
  }

  // Source
  if (!e.source || typeof e.source !== "object") {
    errors.push({ field: "source", message: "Evidence must have a source object", severity: "error" });
  } else {
    const src = e.source as Record<string, unknown>;
    if (!VALID_SOURCE_TYPES.includes(src.sourceType as SourceType)) {
      errors.push({ field: "source.sourceType", message: `Invalid source type: ${src.sourceType}`, severity: "error" });
    }
    if (typeof src.sourceId !== "string" || src.sourceId.length === 0) {
      errors.push({ field: "source.sourceId", message: "Source must have a non-empty sourceId", severity: "error" });
    }
    if (typeof src.sourceName !== "string" || src.sourceName.length === 0) {
      errors.push({ field: "source.sourceName", message: "Source must have a non-empty sourceName", severity: "error" });
    }
    if (typeof src.timestamp !== "number" || !isFinite(src.timestamp) || src.timestamp < 0) {
      errors.push({ field: "source.timestamp", message: "Source must have a valid non-negative timestamp", severity: "error" });
    }
  }

  // Content
  if (!e.content || typeof e.content !== "object") {
    errors.push({ field: "content", message: "Evidence must have a content object", severity: "error" });
  } else {
    const c = e.content as Record<string, unknown>;
    if (typeof c.type !== "string") {
      errors.push({ field: "content.type", message: "Content must have a type", severity: "error" });
    }
  }

  // Relevance
  if (typeof e.relevance !== "number" || !isFinite(e.relevance) || e.relevance < 0 || e.relevance > 1) {
    errors.push({ field: "relevance", message: `Relevance must be a finite number between 0 and 1, got: ${e.relevance}`, severity: "error" });
  }

  // Confidence
  if (e.confidence !== "unknown") {
    if (typeof e.confidence !== "number" || !isFinite(e.confidence) || e.confidence < 0 || e.confidence > 1) {
      errors.push({ field: "confidence", message: `Confidence must be "unknown" or a finite number between 0 and 1, got: ${e.confidence}`, severity: "error" });
    }
  }

  // Freshness
  if (!e.freshness || typeof e.freshness !== "object") {
    errors.push({ field: "freshness", message: "Evidence must have a freshness object", severity: "error" });
  } else {
    const f = e.freshness as Record<string, unknown>;
    if (!VALID_FRESHNESS_LEVELS.includes(f.level as FreshnessLevel)) {
      errors.push({ field: "freshness.level", message: `Invalid freshness level: ${f.level}`, severity: "error" });
    }
    if (typeof f.producedAt !== "number" || !isFinite(f.producedAt) || f.producedAt < 0) {
      errors.push({ field: "freshness.producedAt", message: "Freshness must have a valid producedAt timestamp", severity: "error" });
    }
  }

  // Criticality
  if (!VALID_CRITICALITY_LEVELS.includes(e.criticality as CriticalityLevel)) {
    errors.push({ field: "criticality", message: `Invalid criticality: ${e.criticality}`, severity: "error" });
  }

  // Priority
  if (!VALID_PRIORITY_LEVELS.includes(e.priority as PriorityLevel)) {
    errors.push({ field: "priority", message: `Invalid priority: ${e.priority}`, severity: "error" });
  }

  // Token estimate
  if (typeof e.tokenEstimate !== "number" || !isFinite(e.tokenEstimate) || e.tokenEstimate < 0) {
    errors.push({ field: "tokenEstimate", message: `Token estimate must be a non-negative finite number, got: ${e.tokenEstimate}`, severity: "error" });
  }

  // Deduplication key
  if (typeof e.deduplicationKey !== "string" || e.deduplicationKey.length === 0) {
    errors.push({ field: "deduplicationKey", message: "Evidence must have a non-empty deduplicationKey", severity: "error" });
  }

  // Status
  if (!VALID_EVIDENCE_STATUSES.includes(e.status as EvidenceStatus)) {
    errors.push({ field: "status", message: `Invalid status: ${e.status}`, severity: "error" });
  }

  // Security classification
  if (!VALID_SECURITY_CLASSIFICATIONS.includes(e.securityClassification as SecurityClassification)) {
    errors.push({ field: "securityClassification", message: `Invalid security classification: ${e.securityClassification}`, severity: "error" });
  }

  // Trust level
  if (!VALID_TRUST_LEVELS.includes(e.trustLevel as TrustLevel)) {
    errors.push({ field: "trustLevel", message: `Invalid trust level: ${e.trustLevel}`, severity: "error" });
  }

  // Timestamps
  if (typeof e.createdAt !== "number" || !isFinite(e.createdAt) || e.createdAt < 0) {
    errors.push({ field: "createdAt", message: "Evidence must have a valid createdAt timestamp", severity: "error" });
  }
  if (typeof e.updatedAt !== "number" || !isFinite(e.updatedAt) || e.updatedAt < 0) {
    errors.push({ field: "updatedAt", message: "Evidence must have a valid updatedAt timestamp", severity: "error" });
  }

  // Provenance
  if (!e.provenance || typeof e.provenance !== "object") {
    errors.push({ field: "provenance", message: "Evidence must have a provenance object", severity: "error" });
  } else {
    const p = e.provenance as Record<string, unknown>;
    if (!Array.isArray(p.derivedFrom)) {
      errors.push({ field: "provenance.derivedFrom", message: "Provenance must have a derivedFrom array", severity: "error" });
    }
    if (!Array.isArray(p.steps)) {
      errors.push({ field: "provenance.steps", message: "Provenance must have a steps array", severity: "error" });
    }
  }

  // Tags
  if (!Array.isArray(e.tags)) {
    errors.push({ field: "tags", message: "Evidence must have a tags array", severity: "error" });
  }

  // Schema version
  if (typeof e.schemaVersion !== "number" || e.schemaVersion < 1) {
    errors.push({ field: "schemaVersion", message: "Evidence must have a schemaVersion >= 1", severity: "error" });
  }

  // Warnings for suspicious values
  if (typeof e.relevance === "number" && e.relevance === 0) {
    warnings.push({ field: "relevance", message: "Relevance is exactly 0 — evidence may not be useful", severity: "warning" });
  }
  if (e.trustLevel === "external" && e.criticality === "critical") {
    warnings.push({ field: "trustLevel", message: "External evidence marked as critical — verify this is intentional", severity: "warning" });
  }

  return { valid: errors.length === 0, errors, warnings };
}

/* ============================================================================
 * COLLECTION VALIDATION
 * ========================================================================== */

/**
 * Validate a ContextCollection.
 */
export function validateContextCollection(collection: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!collection || typeof collection !== "object") {
    return { valid: false, errors: [{ field: "root", message: "Collection must be a non-null object", severity: "error" }], warnings };
  }

  const c = collection as Record<string, unknown>;

  // Evidence array
  if (!Array.isArray(c.evidence)) {
    errors.push({ field: "evidence", message: "Collection must have an evidence array", severity: "error" });
  } else {
    // Validate each evidence item
    for (let i = 0; i < c.evidence.length; i++) {
      const result = validateContextEvidence(c.evidence[i]);
      if (!result.valid) {
        for (const err of result.errors) {
          errors.push({ field: `evidence[${i}].${err.field}`, message: err.message, severity: "error" });
        }
      }
      for (const warn of result.warnings) {
        warnings.push({ field: `evidence[${i}].${warn.field}`, message: warn.message, severity: "warning" });
      }
    }

    // Check for duplicate IDs
    const ids = new Set<string>();
    for (let i = 0; i < c.evidence.length; i++) {
      const id = (c.evidence[i] as any)?.id;
      if (id && ids.has(id)) {
        errors.push({ field: `evidence[${i}].id`, message: `Duplicate evidence ID: ${id}`, severity: "error" });
      }
      if (id) ids.add(id);
    }
  }

  // Metadata
  if (!c.metadata || typeof c.metadata !== "object") {
    errors.push({ field: "metadata", message: "Collection must have a metadata object", severity: "error" });
  } else {
    const m = c.metadata as Record<string, unknown>;
    if (typeof m.taskId !== "string" || m.taskId.length === 0) {
      errors.push({ field: "metadata.taskId", message: "Metadata must have a non-empty taskId", severity: "error" });
    }
    if (typeof m.evidenceCount !== "number" || m.evidenceCount < 0) {
      errors.push({ field: "metadata.evidenceCount", message: "Metadata must have a non-negative evidenceCount", severity: "error" });
    }
    if (typeof m.estimatedTokens !== "number" || m.estimatedTokens < 0) {
      errors.push({ field: "metadata.estimatedTokens", message: "Metadata must have a non-negative estimatedTokens", severity: "error" });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
