/**
 * P3.6-D â€” Context Scope Management
 *
 * Manages context scopes, subtask inheritance, and cross-scope isolation.
 */

import type {
  ContextScope,
  ContextScopeId,
  ReuseDecision,
  ReuseEvaluationInput,
  ContextSelectionStage,
} from "../types.js";

/* ============================================================================
 * SCOPE MANAGER
 * ========================================================================== */

/**
 * Manages context scope hierarchy and isolation.
 */
export class ContextScopeManager {
  private readonly scopes = new Map<ContextScopeId, ContextScope>();
  private readonly children = new Map<ContextScopeId, Set<ContextScopeId>>();
  private scopeCounter = 0;

  /**
   * Create a new top-level scope.
   */
  createScope(input: {
    taskId: string;
    projectId?: string;
  }): ContextScope {
    this.scopeCounter++;
    const scopeId = `scope-${Date.now()}-${this.scopeCounter}` as ContextScopeId;

    const scope: ContextScope = {
      scopeId,
      taskId: input.taskId,
      projectId: input.projectId,
      createdAt: Date.now(),
      lifecycleState: "created",
      generation: 1,
      evidenceIds: [],
    };

    this.scopes.set(scopeId, scope);
    this.children.set(scopeId, new Set());

    return scope;
  }

  /**
   * Create a subtask scope that references parent.
   * Subtask MUST NOT mutate parent context.
   */
  createSubtaskScope(input: {
    taskId: string;
    parentScopeId: ContextScopeId;
    projectId?: string;
  }): ContextScope {
    const parent = this.scopes.get(input.parentScopeId);
    if (!parent) {
      throw new Error(`Parent scope not found: ${input.parentScopeId}`);
    }

    this.scopeCounter++;
    const scopeId = `scope-${Date.now()}-${this.scopeCounter}` as ContextScopeId;

    const scope: ContextScope = {
      scopeId,
      taskId: input.taskId,
      parentScopeId: input.parentScopeId,
      projectId: input.projectId ?? parent.projectId,
      createdAt: Date.now(),
      lifecycleState: "created",
      generation: 1,
      evidenceIds: [],
    };

    this.scopes.set(scopeId, scope);
    this.children.set(scopeId, new Set());

    const parentChildren = this.children.get(input.parentScopeId);
    if (parentChildren) {
      parentChildren.add(scopeId);
    }

    return scope;
  }

  /**
   * Get a scope by ID.
   */
  getScope(scopeId: ContextScopeId): ContextScope | undefined {
    return this.scopes.get(scopeId);
  }

  /**
   * Get all child scopes of a parent.
   */
  getChildren(parentScopeId: ContextScopeId): ContextScope[] {
    const childIds = this.children.get(parentScopeId) ?? new Set();
    return Array.from(childIds).map(id => this.scopes.get(id)!).filter(Boolean);
  }

  /**
   * Get all scopes for a task.
   */
  getScopesForTask(taskId: string): ContextScope[] {
    return Array.from(this.scopes.values()).filter(s => s.taskId === taskId);
  }

  /**
   * Get the root scope for a task (top-level).
   */
  getRootScope(taskId: string): ContextScope | undefined {
    const scopes = this.getScopesForTask(taskId);
    return scopes.find(s => !s.parentScopeId);
  }

  /* ============================================================================
   * SCOPE ISOLATION
   * ============================================================================ */

  /**
   * Verify that two scopes are isolated (no shared mutable state).
   * Returns true if scopes are properly isolated.
   */
  verifyIsolation(scopeIdA: ContextScopeId, scopeIdB: ContextScopeId): boolean {
    const scopeA = this.scopes.get(scopeIdA);
    const scopeB = this.scopes.get(scopeIdB);

    if (!scopeA || !scopeB) return false;

    // Different tasks = isolated
    if (scopeA.taskId !== scopeB.taskId) return true;

    // Same task but different subtrees = isolated if neither is ancestor of other
    return !this.isAncestor(scopeIdA, scopeIdB) && !this.isAncestor(scopeIdB, scopeIdA);
  }

  /**
   * Check if scopeA is an ancestor of scopeB.
   */
  private isAncestor(ancestorId: ContextScopeId, descendantId: ContextScopeId): boolean {
    let current: ContextScopeId | undefined = descendantId;
    const visited = new Set<ContextScopeId>();

    while (current) {
      if (current === ancestorId) return true;
      if (visited.has(current)) break; // Cycle protection
      visited.add(current);

      const scope = this.scopes.get(current);
      current = scope?.parentScopeId;
    }

    return false;
  }

  /**
   * Get all ancestor scopes up to root.
   */
  getAncestors(scopeId: ContextScopeId): ContextScope[] {
    const ancestors: ContextScope[] = [];
    let current = this.scopes.get(scopeId)?.parentScopeId;

    while (current) {
      const scope = this.scopes.get(current);
      if (scope) ancestors.push(scope);
      current = scope?.parentScopeId;
    }

    return ancestors;
  }

  /* ============================================================================
   * CROSS-SCOPE REUSE
   * ============================================================================ */

  /**
   * Evaluate whether context from one scope can be reused in another.
   * Must be deterministic.
   */
  evaluateReuse(input: ReuseEvaluationInput): ReuseDecision {
    const source = this.scopes.get(input.sourceScopeId);
    const target = this.scopes.get(input.targetScopeId);

    if (!source || !target) return "REJECT";

    // Same scope = always reuse
    if (source.scopeId === target.scopeId) return "REUSE";

    // Different projects = reject unless explicitly allowed
    if (!input.sameProject) return "REJECT";

    // Parent to child = allowed with refresh
    if (this.isAncestor(input.sourceScopeId, input.targetScopeId)) {
      return "REUSE_WITH_REFRESH";
    }

    // Child to parent = reference only (parent already has broader context)
    if (this.isAncestor(input.targetScopeId, input.sourceScopeId)) {
      return "REFERENCE_ONLY";
    }

    // Sibling scopes = reference only (share parent but not each other's evidence)
    const sourceAncestors = this.getAncestors(input.sourceScopeId);
    const targetAncestors = this.getAncestors(input.targetScopeId);
    const commonAncestor = sourceAncestors.find(a => targetAncestors.some(t => t.scopeId === a.scopeId));

    if (commonAncestor) {
      return "REFERENCE_ONLY";
    }

    // Unrelated scopes in same project = reject
    return "REJECT";
  }

  /**
   * Get evidence IDs that can be inherited from parent scope.
   * Only returns IDs if reuse decision allows it.
   */
  getInheritableEvidence(scopeId: ContextScopeId): string[] {
    const scope = this.scopes.get(scopeId);
    if (!scope || !scope.parentScopeId) return [];

    const parent = this.scopes.get(scope.parentScopeId);
    if (!parent) return [];

    // Only allow inheritance if parent is in a valid state
    if (parent.lifecycleState !== "active" && parent.lifecycleState !== "frozen") {
      return [];
    }

    return [...parent.evidenceIds];
  }

  /* ============================================================================
   * CLEANUP
   * ============================================================================ */

  /**
   * Remove a scope and all its children.
   */
  removeScope(scopeId: ContextScopeId): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) return;

    // Remove all children first
    const children = this.children.get(scopeId) ?? new Set();
    for (const childId of children) {
      this.removeScope(childId);
    }

    // Remove from parent's children
    if (scope.parentScopeId) {
      const parentChildren = this.children.get(scope.parentScopeId);
      if (parentChildren) {
        parentChildren.delete(scopeId);
      }
    }

    this.children.delete(scopeId);
    this.scopes.delete(scopeId);
  }

/**
 * Get all active scopes (for monitoring).
 */
  getActiveScopes(): ContextScope[] {
    return Array.from(this.scopes.values()).filter(
      s => s.lifecycleState === "active" || s.lifecycleState === "frozen"
    );
  }
}

