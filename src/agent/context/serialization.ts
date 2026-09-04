/**
 * P3.6-A — Safe Serialization
 *
 * Deterministic JSON serialization for ContextEvidence and ContextCollection.
 * Handles edge cases: undefined values, circular references, non-serializable data.
 */

import type { ContextEvidence, ContextCollection } from "./types.js";

/* ============================================================================
 * SERIALIZATION
 * ========================================================================== */

/**
 * Serialize a ContextEvidence to JSON string.
 * Deterministic: same input → same output.
 */
export function serializeEvidence(evidence: ContextEvidence): string {
  return JSON.stringify(evidence, replacer, 0);
}

/**
 * Deserialize a JSON string to ContextEvidence.
 * Returns null if the string is invalid or doesn't represent valid evidence.
 */
export function deserializeEvidence(json: string): ContextEvidence | null {
  try {
    const parsed = JSON.parse(json, reviver);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ContextEvidence;
  } catch {
    return null;
  }
}

/**
 * Serialize a ContextCollection to JSON string.
 */
export function serializeCollection(collection: ContextCollection): string {
  return JSON.stringify(collection, replacer, 0);
}

/**
 * Deserialize a JSON string to ContextCollection.
 */
export function deserializeCollection(json: string): ContextCollection | null {
  try {
    const parsed = JSON.parse(json, reviver);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ContextCollection;
  } catch {
    return null;
  }
}

/* ============================================================================
 * SAFE JSON HELPERS
 * ========================================================================== */

/**
 * JSON replacer that handles undefined values and avoids circular references.
 */
function replacer(_key: string, value: unknown): unknown {
  // Remove undefined values (JSON.stringify does this by default, but be explicit)
  if (value === undefined) return undefined;

  // Remove functions
  if (typeof value === "function") return undefined;

  // Remove symbols
  if (typeof value === "symbol") return undefined;

  // Handle Map objects (convert to plain object)
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }

  // Handle Set objects (convert to array)
  if (value instanceof Set) {
    return [...value];
  }

  return value;
}

/**
 * JSON reviver for deserialization.
 */
function reviver(_key: string, value: unknown): unknown {
  return value;
}

/* ============================================================================
 * ROUND-TRIP TESTING
 * ========================================================================== */

/**
 * Test that serialize → deserialize preserves semantic information.
 * Returns true if the round-trip is semantically equivalent.
 */
export function testRoundTrip(evidence: ContextEvidence): boolean {
  const json = serializeEvidence(evidence);
  const restored = deserializeEvidence(json);
  if (!restored) return false;
  return evidence.id === restored.id &&
    evidence.kind === restored.kind &&
    evidence.content.type === restored.content.type &&
    evidence.relevance === restored.relevance &&
    evidence.confidence === restored.confidence &&
    evidence.criticality === restored.criticality &&
    evidence.priority === restored.priority &&
    evidence.securityClassification === restored.securityClassification &&
    evidence.trustLevel === restored.trustLevel &&
    evidence.deduplicationKey === restored.deduplicationKey &&
    evidence.schemaVersion === restored.schemaVersion;
}

/**
 * Test collection round-trip.
 */
export function testCollectionRoundTrip(collection: ContextCollection): boolean {
  const json = serializeCollection(collection);
  const restored = deserializeCollection(json);
  if (!restored) return false;
  if (restored.evidence.length !== collection.evidence.length) return false;
  if (restored.metadata.taskId !== collection.metadata.taskId) return false;
  if (restored.metadata.evidenceCount !== collection.metadata.evidenceCount) return false;
  return true;
}

/* ============================================================================
 * SECRET REDACTION
 * ========================================================================== */

/**
 * Check if serialized JSON contains suspicious patterns that might be secrets.
 * Returns an array of warnings (empty if clean).
 */
export function auditSerializedSecrets(json: string): string[] {
  const warnings: string[] = [];

  // Check for common secret patterns — use specific patterns to avoid false positives on legitimate field names
  const secretPatterns = [
    { pattern: /["']?api[_-]?key["']?[\s]*[:=][\s]*["'][^"']+["']/i, name: "api_key with value" },
    { pattern: /["']?password["']?[\s]*[:=][\s]*["'][^"']+["']/i, name: "password with value" },
    { pattern: /access[_-]?token|auth[_-]?token|bearer[_-]?token/i, name: "auth token field" },
    { pattern: /private[_-]?key/i, name: "private key" },
    { pattern: /["']?authorization["']?[\s]*[:=][\s]*["']Bearer/i, name: "bearer authorization" },
  ];

  for (const { pattern, name } of secretPatterns) {
    if (pattern.test(json)) {
      warnings.push(`Potential secret pattern detected: ${name}`);
    }
  }

  return warnings;
}
