/**
 * P3.6-C — Token Budget Allocation
 *
 * Controls LLM context budgets separately from P3.5.1 intelligence budgets.
 * Allocates tokens across evidence categories with explicit priority ordering.
 */

import type {
  ContextEvidence,
  ContextCollection,
  ContextSelectionStage,
} from "./types.js";
import { getBudget, type IntelligenceBudget, type TaskComplexity } from "../intelligence/budget.js";

/* ============================================================================
 * BUDGET PROFILES
 * ========================================================================== */

export interface ContextBudgetProfile {
  maxContextTokens: number;
  minSecurityTokens: number;
  minTaskTokens: number;
  minExecutionTokens: number;
  minVerificationTokens: number;
  compressionThreshold: number; // When to start compressing (0-1)
}

const BUDGET_PROFILES: Record<TaskComplexity, ContextBudgetProfile> = {
  fast: {
    maxContextTokens: 2000,
    minSecurityTokens: 500,
    minTaskTokens: 300,
    minExecutionTokens: 200,
    minVerificationTokens: 100,
    compressionThreshold: 0.7,
  },
  standard: {
    maxContextTokens: 6000,
    minSecurityTokens: 1000,
    minTaskTokens: 500,
    minExecutionTokens: 500,
    minVerificationTokens: 300,
    compressionThreshold: 0.6,
  },
  deep: {
    maxContextTokens: 12000,
    minSecurityTokens: 2000,
    minTaskTokens: 1000,
    minExecutionTokens: 1000,
    minVerificationTokens: 500,
    compressionThreshold: 0.5,
  },
};

/* ============================================================================
 * ALLOCATION CATEGORIES
 * ========================================================================== */

export type AllocationCategory =
  | "security-critical"
  | "task-direct"
  | "execution-state"
  | "verification"
  | "architecture-constraints"
  | "dependency-constraints"
  | "lessons"
  | "supporting-knowledge"
  | "background";

export interface CategoryAllocation {
  category: AllocationCategory;
  maxTokens: number;
  minTokens: number;
  priority: number; // Lower = higher priority
  evidenceIds: string[];
}

export interface BudgetAllocationResult {
  allocations: CategoryAllocation[];
  totalAllocated: number;
  budget: ContextBudgetProfile;
  remainingTokens: number;
  mandatoryMet: boolean;
  warnings: string[];
}

/* ============================================================================
 * EVIDENCE CATEGORIZATION
 * ========================================================================== */

function categorizeEvidence(evidence: ContextEvidence): AllocationCategory {
  // Security-critical always first
  if (evidence.securityClassification === "security-critical") {
    return "security-critical";
  }

  // User task requirements
  if (evidence.kind === "user-input" || evidence.kind === "constraint") {
    return "task-direct";
  }

  // Execution state
  if (evidence.kind === "placement" || evidence.kind === "dependency" ||
      evidence.kind === "code" || evidence.kind === "observation") {
    return "execution-state";
  }

  // Verification
  if (evidence.kind === "verification" || evidence.kind === "runtime-error" ||
      evidence.kind === "code-error") {
    return "verification";
  }

  // Architecture constraints
  if (evidence.kind === "architecture" || evidence.kind === "constitution") {
    return "architecture-constraints";
  }

  // (dependency already handled in execution-state above)

  // Lessons
  if (evidence.kind === "lesson" || evidence.kind === "failure-pattern") {
    return "lessons";
  }

  // Supporting knowledge
  if (evidence.kind === "knowledge" || evidence.kind === "project-map") {
    return "supporting-knowledge";
  }

  return "background";
}

/* ============================================================================
 * MAIN ALLOCATION
 * ========================================================================== */

export function allocateBudget(
  evidence: ContextEvidence[],
  taskComplexity: TaskComplexity,
  stage: ContextSelectionStage,
): BudgetAllocationResult {
  const profile = BUDGET_PROFILES[taskComplexity];
  const warnings: string[] = [];

  // Categorize all evidence
  const byCategory = new Map<AllocationCategory, ContextEvidence[]>();
  for (const ev of evidence) {
    const cat = categorizeEvidence(ev);
    const existing = byCategory.get(cat) ?? [];
    existing.push(ev);
    byCategory.set(cat, existing);
  }

  // Priority order (lower number = higher priority)
  const categoryOrder: AllocationCategory[] = [
    "security-critical",
    "task-direct",
    "execution-state",
    "verification",
    "architecture-constraints",
    "dependency-constraints",
    "lessons",
    "supporting-knowledge",
    "background",
  ];

  // Stage-specific adjustments
  const stageAdjustedOrder = adjustForStage(categoryOrder, stage);

  // Minimum token requirements per category
  const minTokens: Record<AllocationCategory, number> = {
    "security-critical": profile.minSecurityTokens,
    "task-direct": profile.minTaskTokens,
    "execution-state": profile.minExecutionTokens,
    "verification": profile.minVerificationTokens,
    "architecture-constraints": 300,
    "dependency-constraints": 300,
    "lessons": 200,
    "supporting-knowledge": 200,
    "background": 100,
  };

  // Allocate
  const allocations: CategoryAllocation[] = [];
  let remaining = profile.maxContextTokens;
  let mandatoryMet = true;

  for (const category of stageAdjustedOrder) {
    const items = byCategory.get(category) ?? [];
    if (items.length === 0) continue;

    // Sort items by priority within category
    items.sort((a, b) => {
      const critOrder: Record<string, number> = { critical: 0, important: 1, relevant: 2, informational: 3 };
      return (critOrder[a.criticality] ?? 3) - (critOrder[b.criticality] ?? 3);
    });

    const minRequired = minTokens[category] ?? 100;
    const categoryBudget = Math.max(minRequired, Math.floor(remaining * 0.3)); // Max 30% per category

    let allocated = 0;
    const evidenceIds: string[] = [];

    for (const ev of items) {
      if (allocated + ev.tokenEstimate <= categoryBudget) {
        allocated += ev.tokenEstimate;
        evidenceIds.push(ev.id);
      } else if (allocated < minRequired) {
        // Must include even if over budget (mandatory)
        allocated += ev.tokenEstimate;
        evidenceIds.push(ev.id);
        mandatoryMet = false;
        warnings.push(`Mandatory ${category} evidence exceeded budget`);
      } else {
        break;
      }
    }

    if (allocated > 0 || evidenceIds.length > 0) {
      allocations.push({
        category,
        maxTokens: categoryBudget,
        minTokens: minRequired,
        priority: stageAdjustedOrder.indexOf(category),
        evidenceIds,
      });
    }

    remaining -= allocated;
    if (remaining <= 0) break;
  }

  // Calculate totals
  const totalAllocated = allocations.reduce((sum, a) => sum + a.evidenceIds.length > 0
    ? evidence.filter(e => a.evidenceIds.includes(e.id)).reduce((s, e) => s + e.tokenEstimate, 0)
    : 0, 0);

  return {
    allocations,
    totalAllocated,
    budget: profile,
    remainingTokens: Math.max(0, remaining),
    mandatoryMet,
    warnings,
  };
}

/* ============================================================================
 * STAGE-ADJUSTED PRIORITY
 * ========================================================================== */

function adjustForStage(
  baseOrder: AllocationCategory[],
  stage: ContextSelectionStage,
): AllocationCategory[] {
  const adjusted = [...baseOrder];

  switch (stage) {
    case "execution":
      // Move execution-state up
      moveToFront(adjusted, "execution-state", 1);
      break;
    case "verification":
      // Move verification up
      moveToFront(adjusted, "verification", 1);
      break;
    case "recovery":
      // Move lessons and failure-pattern up
      moveToFront(adjusted, "lessons", 2);
      break;
    case "planning":
    default:
      // Architecture constraints higher
      moveToFront(adjusted, "architecture-constraints", 2);
      break;
  }

  return adjusted;
}

function moveToFront(arr: AllocationCategory[], item: AllocationCategory, position: number): void {
  const idx = arr.indexOf(item);
  if (idx > -1) {
    arr.splice(idx, 1);
    arr.splice(position, 0, item);
  }
}

/* ============================================================================
 * COMPRESSION DECISION
 * ========================================================================== */

export function shouldCompress(
  currentUsage: number,
  budget: ContextBudgetProfile,
): boolean {
  return currentUsage / budget.maxContextTokens >= budget.compressionThreshold;
}

export function getCompressionRatio(
  evidence: ContextEvidence,
  detailLevel: "full" | "compressed" | "reference",
): number {
  switch (detailLevel) {
    case "full": return 1.0;
    case "compressed": return 0.4;
    case "reference": return 0.15;
    default: return 1.0;
  }
}

/* ============================================================================
 * COMPATIBILITY: Get budget from P3.5.1
 * ========================================================================== */

export function getContextBudget(task: { taskId: string; userRequest: string; intent: string; domain: string; needsRoblox: boolean; requiresBuild: boolean; requiresTesting: boolean; requiresVerification: boolean; studioId?: string; workspaceRoot?: string }): ContextBudgetProfile {
  const complexity = classifyTask(task);
  return BUDGET_PROFILES[complexity];
}

/**
 * Task classification using P3.5.1 logic.
 * Inline to avoid circular deps.
 */
function classifyTask(task: {
  taskId: string;
  userRequest: string;
  intent: string;
  domain: string;
  needsRoblox: boolean;
  requiresBuild: boolean;
  requiresTesting: boolean;
  requiresVerification: boolean;
}): TaskComplexity {
  const request = task.userRequest.toLowerCase();
  const intent = task.intent.toLowerCase();

  // FAST triggers
  const fastKeywords = ["typo", "fix", "rename", "update", "change", "small", "minor", "quick"];
  if (fastKeywords.some(k => request.includes(k)) || fastKeywords.some(k => intent.includes(k))) {
    return "fast";
  }

  // DEEP triggers
  const deepKeywords = ["system", "architecture", "refactor", "redesign", "overhaul", "migrate", "build", "create", "implement"];
  if (deepKeywords.some(k => request.includes(k)) && (task.requiresBuild || task.requiresVerification)) {
    return "deep";
  }

  return "standard";
}