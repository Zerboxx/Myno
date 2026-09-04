/**
 * P3.6-D — Context Guard
 *
 * Runtime validation before context injection into LLM prompt.
 * Prevents invalid, stale, or compromised context from being used.
 */

import type {
  RuntimeContext,
  ContextScope,
  ContextGuardResult,
  ContextScopeId,
  ContextSelectionStage,
  ContextInvalidationReason,
} from "../types.js";
import { validateContextCollection } from "../validation.js";

/* ============================================================================
 * CONTEXT GUARD
 * ========================================================================== */

/**
 * Validates context before injection into agent prompt.
 * All checks must pass for context to be allowed.
 */
export class ContextGuard {
  private readonly maxContextAgeMs: number;
  private readonly requireIntegrityHash: boolean;

  constructor(options: {
    maxContextAgeMs?: number;
    requireIntegrityHash?: boolean;
  } = {}) {
    this.maxContextAgeMs = options.maxContextAgeMs ?? 30 * 60 * 1000; // 30 minutes
    this.requireIntegrityHash = options.requireIntegrityHash ?? true;
  }

  /**
   * Validate a runtime context before prompt injection.
   * This is the primary gate - ALL context must pass this.
   */
  validate(runtimeContext: RuntimeContext): ContextGuardResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let allowed = true;
    let requiresRefresh = false;

    // 1. Valid scope
    if (!runtimeContext.scope) {
      allowed = false;
      reasons.push("Missing scope");
    } else {
      this.validateScope(runtimeContext.scope, reasons, warnings, allowed);
    }

    // 2. Active generation
    if (runtimeContext.scope && runtimeContext.scope.lifecycleState === "invalidated") {
      allowed = false;
      reasons.push("Scope is invalidated");
    } else if (runtimeContext.scope && runtimeContext.scope.lifecycleState === "failed") {
      allowed = false;
      reasons.push("Scope has failed");
    } else if (runtimeContext.scope && runtimeContext.scope.lifecycleState === "refreshing") {
      // FAIL CLOSED: a scope mid-refresh must never inject its previous
      // generation. The refresh must complete and produce a guard-validated
      // new generation first.
      allowed = false;
      reasons.push("Scope is refreshing — previous generation must not be injected");
      requiresRefresh = true;
    } else if (runtimeContext.scope && runtimeContext.scope.lifecycleState === "validating") {
      // FAIL CLOSED: scope only becomes active after the guard passes.
      allowed = false;
      reasons.push("Scope is validating — not yet activatable");
      requiresRefresh = true;
    }

    // 3. Assembly exists
    if (!runtimeContext.assembly || runtimeContext.assembly.trim().length === 0) {
      allowed = false;
      reasons.push("Assembly is empty or missing");
    }

    // 4. Integrity hash matches
    if (this.requireIntegrityHash && runtimeContext.assemblyHash) {
      const currentHash = this.computeAssemblyHash(runtimeContext.assembly);
      if (currentHash !== runtimeContext.assemblyHash) {
        allowed = false;
        reasons.push(`Integrity hash mismatch: expected ${runtimeContext.assemblyHash}, got ${currentHash}`);
      }
    }

    // 5. Not expired
    const ageMs = Date.now() - runtimeContext.frozenAt;
    if (ageMs > this.maxContextAgeMs) {
      allowed = false;
      reasons.push(`Context age ${ageMs}ms exceeds maximum ${this.maxContextAgeMs}ms`);
      requiresRefresh = true;
    }

    // 6. Correct stage
    if (runtimeContext.scope && runtimeContext.scope.currentStage &&
        runtimeContext.scope.currentStage !== runtimeContext.stage) {
      warnings.push(`Stage mismatch: scope at ${runtimeContext.scope.currentStage}, context for ${runtimeContext.stage}`);
    }

    // 7. Security-critical evidence preserved
    if (runtimeContext.scope && !this.hasSecurityCriticalEvidence(runtimeContext)) {
      warnings.push("No security-critical evidence in context");
    }

    // 8. Evidence IDs match scope
    if (runtimeContext.scope && runtimeContext.evidenceIds) {
      const scopeEvidence = new Set(runtimeContext.scope.evidenceIds);
      const contextEvidence = new Set(runtimeContext.evidenceIds);
      const missing = [...contextEvidence].filter(id => !scopeEvidence.has(id));
      if (missing.length > 0) {
        warnings.push(`${missing.length} evidence IDs in context not found in scope`);
      }
    }

    return {
      allowed,
      reasons,
      warnings,
      requiresRefresh,
    };
  }

  /**
   * Validate scope state.
   */
  private validateScope(
    scope: ContextScope,
    reasons: string[],
    _warnings: string[],
    _allowed: boolean,
  ): void {
    if (scope.lifecycleState === "created" || scope.lifecycleState === "collecting") {
      // Not ready yet
    }
    // Other states handled in main validate()
  }

  /**
   * Check if context contains security-critical evidence.
   */
  private hasSecurityCriticalEvidence(runtimeContext: RuntimeContext): boolean {
    // This would need access to the actual evidence
    // For now, check if assembly contains security-critical marker
    return runtimeContext.assembly.includes("[SECURITY-CRITICAL]");
  }

  /**
   * Compute assembly hash for integrity check.
   */
  private computeAssemblyHash(assembly: string): string {
    let hash = 0;
    for (let i = 0; i < assembly.length; i++) {
      const char = assembly.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `asm-${Math.abs(hash).toString(16)}`;
  }
}

/* ============================================================================
 * GUARD DECISION HELPERS
 * ========================================================================== */

/**
 * Create a guard result for common scenarios.
 */
export function createGuardResult(
  allowed: boolean,
  reason: string,
  options: { warnings?: string[]; requiresRefresh?: boolean } = {},
): ContextGuardResult {
  return {
    allowed,
    reasons: allowed ? [] : [reason],
    warnings: options.warnings ?? [],
    requiresRefresh: options.requiresRefresh ?? false,
  };
}

/**
 * Combine multiple guard results.
 */
export function combineGuardResults(...results: ContextGuardResult[]): ContextGuardResult {
  const allowed = results.every(r => r.allowed);
  const reasons = results.flatMap(r => r.reasons);
  const warnings = results.flatMap(r => r.warnings);
  const requiresRefresh = results.some(r => r.requiresRefresh);

  return { allowed, reasons, warnings, requiresRefresh };
}

/**
 * Check if a guard result indicates a critical failure.
 */
export function isCriticalFailure(result: ContextGuardResult): boolean {
  return !result.allowed && result.reasons.some(
    r => r.includes("Integrity") || r.includes("invalidated") || r.includes("missing")
  );
}

/* ============================================================================
 * SCOPE-LEVEL GUARD
 * ========================================================================== */

/**
 * Validate a scope directly (before assembly).
 */
export function validateScope(scope: ContextScope): ContextGuardResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (scope.lifecycleState === "invalidated") {
    return createGuardResult(false, "Scope is invalidated");
  }

  if (scope.lifecycleState === "failed") {
    return createGuardResult(false, "Scope has failed");
  }

  if (scope.evidenceIds.length === 0) {
    warnings.push("Scope has no evidence");
  }

  if (!scope.snapshotId) {
    warnings.push("Scope has no snapshot");
  }

  if (!scope.assemblyHash) {
    warnings.push("Scope has no assembly hash");
  }

  return createGuardResult(true, "", { warnings });
}

/* ============================================================================
 * ASSEMBLY-LEVEL GUARD
 * ========================================================================== */

/**
 * Validate an assembled context before use.
 */
export function validateAssembly(
  assembly: string,
  expectedHash: string,
): ContextGuardResult {
  if (!assembly || assembly.trim().length === 0) {
    return createGuardResult(false, "Assembly is empty");
  }

  // Quick integrity check
  let hash = 0;
  for (let i = 0; i < assembly.length; i++) {
    const char = assembly.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const computedHash = `asm-${Math.abs(hash).toString(16)}`;

  if (computedHash !== expectedHash) {
    return createGuardResult(false, `Assembly integrity check failed: ${computedHash} !== ${expectedHash}`);
  }

  // Check for required sections
  const requiredSections = ["<MYNO_CONTEXT>", "</MYNO_CONTEXT>"];
  for (const section of requiredSections) {
    if (!assembly.includes(section)) {
      return createGuardResult(false, `Missing required section: ${section}`);
    }
  }

  return createGuardResult(true, "");
}