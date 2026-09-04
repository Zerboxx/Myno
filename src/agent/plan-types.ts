/**
 * P3.4 — Structured Plan Types
 *
 * AgentPlan with explicit steps, dependencies, and verification requirements.
 * Replaces the flat AgentPlan with a step-based structure.
 */

import type { ModelCapability } from "../router/model-router.js";
import type { ToolGroup } from "../tools/registry.js";
import type { VerificationObligation } from "./verification-obligation.js";
import type { SemanticRequest, SkillSelection } from "./skills/types.js";
import type { RobloxStudioContext } from "./studio-context.js";
import type { EnvironmentLayout } from "./placement/types.js";
import type { SecurityArtifact, SecurityReview } from "./security/types.js";

export interface AgentPlanStep {
  id: string;
  description: string;
  purpose: string;
  status: "pending" | "active" | "completed" | "failed" | "skipped";
  dependencies: string[];
  /** Tools required for this step */
  requiredTools: string[];
  /** Verification criteria for this step */
  verification: string[];
  /** Expected outcome of this step */
  expectedOutcome: string;
  /** Estimated tool calls for budgeting */
  estimatedToolCalls: number;
  /** Actual tool calls used */
  actualToolCalls: number;
  /** When step was started */
  startedAt?: string;
  /** When step was completed */
  completedAt?: string;
  /** Error if failed */
  error?: string;
}

export interface AgentPlan {
  goal: string;
  steps: AgentPlanStep[];
  successCriteria: SuccessCriterion[];
  /** Legacy fields for compatibility */
  intent: TaskIntent;
  capability: ModelCapability;
  objective: string;
  needsRoblox: boolean;
  needsFiles: boolean;
  needsTerminal: boolean;
  requiresInspection: boolean;
  requiresBuild: boolean;
  requiresTesting: boolean;
  requiresVerification: boolean;
  destructiveRequested: boolean;
  explicitReadOnly: boolean;
  protectedTargets: string[];
  preferredToolGroups: ToolGroup[];
  reason: string;
  verificationObligations?: VerificationObligation[];
  semanticRequest?: SemanticRequest;
  selectedSkills?: SkillSelection;
  placement?: EnvironmentLayout;
  refinementMode?: boolean;
  securityDirective?: string;
}

export interface SuccessCriterion {
  id: string;
  description: string;
  required: boolean;
}

export type TaskIntent =
  | "chat"
  | "coding"
  | "building"
  | "refinement"
  | "debugging"
  | "testing"
  | "inspection"
  | "planning"
  | "analysis";

/**
 * Validates a plan structure.
 * Throws if the plan is malformed.
 */
export function validatePlan(plan: AgentPlan): void {
  if (!plan.goal || plan.goal.trim().length === 0) {
    throw new Error("Plan must have a non-empty goal");
  }

  if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
    throw new Error("Plan must have at least one step");
  }

  const stepIds = new Set<string>();
  const allDependencies = new Set<string>();

  for (const step of plan.steps) {
    // Unique step IDs
    if (!step.id || stepIds.has(step.id)) {
      throw new Error(`Duplicate or missing step ID: ${step.id}`);
    }
    stepIds.add(step.id);

    // Meaningful description
    if (!step.description || step.description.trim().length < 10) {
      throw new Error(`Step ${step.id} must have a meaningful description`);
    }

    // Valid status
    const validStatuses = ["pending", "active", "completed", "failed", "skipped"] as const;
    if (!validStatuses.includes(step.status)) {
      throw new Error(`Step ${step.id} has invalid status: ${step.status}`);
    }

    // Valid dependencies (refer to existing step IDs)
    for (const dep of step.dependencies) {
      if (!stepIds.has(dep)) {
        allDependencies.add(dep);
      }
    }
  }

  // Check for dependency cycles
  const hasCycle = detectCycles(plan.steps);
  if (hasCycle) {
    throw new Error("Plan contains dependency cycles");
  }

  // Check for impossible dependency references
  for (const dep of allDependencies) {
    if (!stepIds.has(dep)) {
      throw new Error(`Step references non-existent dependency: ${dep}`);
    }
  }
}

const stepIds = new Set<string>();

function detectCycles(steps: AgentPlanStep[]): boolean {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const stepMap = new Map(steps.map(s => [s.id, s]));

  function visit(id: string): boolean {
    if (visiting.has(id)) return true; // Cycle detected
    if (visited.has(id)) return false;

    visiting.add(id);
    const step = stepMap.get(id);
    if (step) {
      for (const dep of step.dependencies) {
        if (visit(dep)) return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  for (const step of steps) {
    if (visit(step.id)) return true;
  }
  return false;
}

/**
 * Creates a default plan structure for a task.
 * Used as a starting point before LLM planning.
 */
export function createEmptyPlan(
  goal: string,
  intent: TaskIntent,
  capability: ModelCapability,
  objective: string,
): AgentPlan {
  return {
    goal,
    steps: [],
    successCriteria: [
      { id: "objective", description: objective, required: true },
    ],
    intent,
    capability,
    objective,
    needsRoblox: false,
    needsFiles: false,
    needsTerminal: false,
    requiresInspection: false,
    requiresBuild: false,
    requiresTesting: false,
    requiresVerification: false,
    destructiveRequested: false,
    explicitReadOnly: false,
    protectedTargets: [],
    preferredToolGroups: [],
    reason: "",
  };
}

/**
 * Orders steps by dependencies (topological sort).
 * Returns steps in execution order.
 */
export function orderStepsByDependencies(steps: AgentPlanStep[]): AgentPlanStep[] {
  const stepMap = new Map(steps.map(s => [s.id, s]));
  const visited = new Set<string>();
  const result: AgentPlanStep[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    const step = stepMap.get(id);
    if (!step) return;

    for (const dep of step.dependencies) {
      visit(dep);
    }
    visited.add(id);
    result.push(step);
  }

  for (const step of steps) {
    visit(step.id);
  }

  return result;
}

/**
 * Gets all steps that depend on a given step.
 */
export function getDependentSteps(steps: AgentPlanStep[], stepId: string): AgentPlanStep[] {
  return steps.filter(s => s.dependencies.includes(stepId));
}

/**
 * Gets steps that are ready to execute (all dependencies completed).
 */
export function getReadySteps(
  steps: AgentPlanStep[],
  completedStepIds: Set<string>,
): AgentPlanStep[] {
  return steps.filter(step =>
    step.status === "pending" &&
    step.dependencies.every(dep => completedStepIds.has(dep))
  );
}