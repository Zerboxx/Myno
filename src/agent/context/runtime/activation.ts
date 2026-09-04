/**
 * P3.6-D — Context Activation Service
 *
 * Makes context (re)activation atomic and guard-enforced:
 *
 *   INVALIDATED/REFRESHING
 *     → refresh (bump generation, enter REFRESHING)
 *     → re-evaluate freshness (mutated evidence is dropped from eligibility)
 *     → reselect evidence for the stage
 *     → apply the explicit trust boundary (allow/deny)
 *     → assemble a NEW runtime context for the NEW generation
 *     → ContextGuard validates the new generation
 *     → activate ONLY if the guard passes
 *
 * The caller (Agent) is responsible for atomically swapping the
 * model-visible context (runtimeContext + assembly + system prompt) with
 * the returned runtime context, and for failing the task when activation
 * fails.
 */

import type {
  ContextCollection,
  ContextEvidence,
  ContextScopeId,
  ContextSelectionResult,
  ContextSelectionStage,
  RuntimeContext,
} from "../types.js";
import { evaluateFreshness } from "../freshness.js";
import { selectContext } from "../selection.js";
import { ContextGuard } from "./guard.js";
import { ContextLifecycleManager } from "./lifecycle.js";
import {
  ContextIsolationManager,
  TrustBoundaryEnforcer,
  type TrustDestination,
} from "./isolation.js";

/* ============================================================================
 * RESULT TYPES
 * ========================================================================== */

export interface ActivationFailure {
  message: string;
  reasons: string[];
}

export interface ActivationOk {
  ok: true;
  runtimeContext: RuntimeContext;
  /** Evidence denied by the trust policy during this activation. */
  removedByTrustPolicy: ContextEvidence[];
}

export interface ActivationFailed {
  ok: false;
  failure: ActivationFailure;
}

export type ActivationResult = ActivationOk | ActivationFailed;

/* ============================================================================
 * INPUT TYPES
 * ========================================================================== */

export interface ScopeEvidenceSet {
  scopeId: ContextScopeId;
  taskId: string;
  /** Full evidence pool collected for this task. */
  evidence: ContextEvidence[];
  /** Stage being (re)assembled. */
  stage: ContextSelectionStage;
  /** Task domain used for relevance filtering. */
  taskDomain: string;
  /** Assembly token budget. */
  tokenBudget: number;
  /** Current project fingerprint (mutation detection). */
  projectFingerprint: string;
  /**
   * True when the scope was invalidated by a project mutation / recovery
   * since the last activation. When true, mutation-sensitive evidence is
   * conservatively dropped from eligibility (never re-injected stale).
   * Pure expiry-driven refreshes pass false and keep structural evidence.
   */
  mutationSinceRefresh: boolean;
  /** Reason for this refresh (audit trail). */
  refreshReason: string;
  /**
   * Trust destination for the assembled context.
   * Instruction context = system + project-data only.
   */
  destination: TrustDestination;
}

/* ============================================================================
 * ACTIVATION SERVICE
 * ========================================================================== */

export class ContextActivationService {
  constructor(
    private readonly deps: {
      lifecycle: ContextLifecycleManager;
      guard: ContextGuard;
      isolation?: ContextIsolationManager;
    },
  ) {}

  get lifecycle(): ContextLifecycleManager {
    return this.deps.lifecycle;
  }

  /**
   * (Re)activate a scope for the given stage.
   *
   * This method is the SINGLE place where invalidation transitions to a
   * newly validated generation. It never returns a runtime context that
   * has not passed the ContextGuard, and it never leaves the scope in a
   * state where an old generation could be injected while "refreshing".
   */
  async reassembleAndValidate(
    input: ScopeEvidenceSet,
  ): Promise<ActivationResult> {
    const { lifecycle, guard, isolation } = this.deps;

    const scope = lifecycle.getScope(input.scopeId);
    if (!scope) {
      return {
        ok: false,
        failure: {
          message: "Context activation failed: scope not found",
          reasons: ["scope-not-found"],
        },
      };
    }

    if (scope.lifecycleState === "failed" || scope.lifecycleState === "completed") {
      return {
        ok: false,
        failure: {
          message: `Context activation failed: scope is ${scope.lifecycleState}`,
          reasons: [`scope-${scope.lifecycleState}`],
        },
      };
    }

    // ---- 1. Bump generation once and enter REFRESHING. -------------------
    // The invalidation hook leaves the scope INVALIDATED; the sole owner of
    // the INVALIDATED -> REFRESHING -> VALIDATING -> ACTIVE transition is
    // this service.
    if (scope.lifecycleState !== "refreshing") {
      lifecycle.refreshScope(input.scopeId, input.refreshReason);
    }

    const previousFingerprint = lifecycle.getProjectFingerprint(input.scopeId);
    lifecycle.setProjectFingerprint(input.scopeId, input.projectFingerprint);

    // ---- 2. Re-evaluate freshness. ----------------------------------------
    // When the invalidating event was a project mutation (or recovery), all
    // mutation-sensitive evidence is conservatively dropped from eligibility.
    // Unknown mutations are never treated as "no mutation". Expiry-driven
    // refreshes (mutationSinceRefresh=false) keep structural evidence.
    const { evidence: freshEvidence } = evaluateFreshness(
      input.evidence,
      input.mutationSinceRefresh,
      previousFingerprint,
      input.projectFingerprint,
    );

    // ---- 3. Reselect for the stage. ---------------------------------------
    const selection = selectContext({
      collection: {
        evidence: freshEvidence,
        metadata: {
          taskId: input.taskId,
          estimatedTokens: input.evidence.length,
        },
      } as ContextCollection,
      taskDomain: input.taskDomain,
      stage: input.stage,
      tokenBudget: input.tokenBudget,
      trustBoundary: "strict",
    });

    // ---- 4. Explicit trust boundary (allow/deny). --------------------------
    const fullSelectedEvidence = selection.selected
      .map(s => freshEvidence.find(e => e.id === s.evidenceId))
      .filter((e): e is ContextEvidence => e !== undefined);

    const { filtered: trustedFullEvidence, removed } =
      TrustBoundaryEnforcer.enforceBoundary(
        fullSelectedEvidence,
        input.destination,
      );

    if (removed.length > 0) {
      lifecycle.recordAuditEvent(
        input.scopeId,
        input.taskId,
        scope.generation,
        "trust-boundary-filtered",
        { removedCount: removed.length, removedKinds: removed.map(e => e.kind) },
      );
    }

    const trustedSelectionObj: ContextSelectionResult = {
      ...selection,
      selected: trustedFullEvidence.map(e => {
        const original = selection.selected.find(s => s.evidenceId === e.id);
        return original
          ? { ...original, evidenceId: e.id }
          : {
              evidenceId: e.id,
              score: 0,
              reasons: [],
              estimatedTokens: 0,
              detailLevel: "full" as const,
            };
      }),
    };

    // ---- 5. Isolation: record which evidence belongs to this scope. --------
    isolation?.registerScope(input.taskId, input.scopeId);
    isolation?.registerEvidence(
      input.scopeId,
      trustedSelectionObj.selected.map(s => s.evidenceId),
    );

    // ---- 6. Assemble the NEW generation. -----------------------------------
    // assembleForStage transitions REFRESHING -> VALIDATING. Activity is not
    // reached until the guard passes (steps 7-8).
    let runtimeContext: RuntimeContext;
    try {
      runtimeContext = await lifecycle.assembleForStage({
        scopeId: input.scopeId,
        collection: {
          evidence: freshEvidence as unknown as Array<{
            id: string;
            [key: string]: unknown;
          }>,
          metadata: {
            taskId: input.taskId,
            estimatedTokens: input.evidence.length,
          },
        },
        selection: trustedSelectionObj,
        stage: input.stage,
        projectFingerprint: input.projectFingerprint,
      });
    } catch (error) {
      lifecycle.failScope(
        input.scopeId,
        `Context assembly failed during activation: ${String(error)}`,
      );
      lifecycle.recordAuditEvent(
        input.scopeId,
        input.taskId,
        scope.generation,
        "guard-rejected",
        { reason: "assembly-failure" },
      );
      return {
        ok: false,
        failure: {
          message: "Context activation failed: assembly error",
          reasons: ["assembly-failure"],
        },
      };
    }

    // ---- 7. Attempt activation (VALIDATING -> ACTIVE). ---------------------
    lifecycle.completeRefresh(input.scopeId);

    // ---- 8. Guard validates the NEW generation before it is usable. --------
    // A guard rejection here fails the scope: the caller must NOT use the
    // returned context, and MUST fail closed.
    const guardResult = guard.validate(runtimeContext);

    if (!guardResult.allowed) {
      lifecycle.failScope(
        input.scopeId,
        `Context guard rejected new generation: ${guardResult.reasons.join(", ")}`,
      );
      lifecycle.recordAuditEvent(
        input.scopeId,
        input.taskId,
        runtimeContext.generation,
        "guard-rejected",
        { reasons: guardResult.reasons },
      );
      return {
        ok: false,
        failure: {
          message: "Context activation failed: guard rejected new generation",
          reasons: guardResult.reasons,
        },
      };
    }

    lifecycle.recordAuditEvent(
      input.scopeId,
      input.taskId,
      runtimeContext.generation,
      "activated",
      { generation: runtimeContext.generation, stage: input.stage },
    );

    return {
      ok: true,
      runtimeContext,
      removedByTrustPolicy: removed,
    };
  }
}