/**
 * P3.4 — Task Context
 *
 * Strongly typed context for a single task execution.
 * Contains all information needed for planning, execution, verification,
 * and recovery. Designed to be passed through the execution pipeline
 * without global mutable state.
 */

import type { AgentState } from "./state-machine.js";
export type { AgentState } from "./state-machine.js";
import type { AgentPhase } from "./execution-types.js";
import type { AgentPlan, AgentPlanStep } from "./plan-types.js";
import type { Evidence, ToolExecution, AgentError, VerificationState } from "./execution-types.js";
import type { Observation } from "./observation.js";
import type { RobloxStudioContext } from "./studio-context.js";

/** Reason categories for recovery */
export type RecoveryReasonCategory =
  | "VALIDATION"
  | "TRANSIENT"
  | "TOOL_EXECUTION"
  | "TIMEOUT"
  | "MODEL"
  | "MCP"
  | "SECURITY"
  | "CANCELLATION"
  | "FATAL";

/** Task context passed through the execution pipeline */
export interface TaskContext {
  /** Unique task identifier */
  taskId: string;
  /** Original user request */
  userRequest: string;
  /** Current agent state */
  state: AgentState;
  /** Current phase (legacy, for compatibility) */
  phase: AgentPhase;
  /** When the task was created */
  createdAt: string;
  /** The execution plan */
  plan: AgentPlan;
  /** Current step being executed */
  currentStep?: AgentPlanStep;
  /** Completed step IDs */
  completedSteps: string[];
  /** Failed step IDs */
  failedSteps: string[];
  /** Current iteration number */
  iteration: number;
  /** Total tool calls made */
  totalToolCalls: number;
  /** Maximum allowed tool calls */
  maxToolCalls: number;
  /** Maximum allowed iterations */
  maxIterations: number;
  /** Maximum recovery attempts */
  maxRecoveryAttempts: number;
  /** Recovery attempts used */
  recoveryAttempts: number;
  /** Maximum recovery attempts allowed */
  maxRecovery: number;
  /** Tool executions in order */
  toolExecutions: ToolExecution[];
  /** Observations/evidence collected */
  observations: ContextObservation[];
  /** Evidence for verification */
  evidence: Evidence[];
  /** Errors encountered */
  errors: AgentError[];
  /** Verification state */
  verification: VerificationState;
  /** Roblox Studio context */
  studioContext: RobloxStudioContext;
  /** Memory recall for this task */
  memoryRecall?: MemoryRecall;
  /** Timestamps */
  timestamps: TaskTimestamps;
  /** Cancellation signal */
  cancelled: boolean;
  /** Final content/response */
  finalContent: string;
  /** Final outcome when terminal */
  outcome?: TaskOutcome;
}

/** Additional observation type for context */
export interface ContextObservation {
  id: string;
  timestamp: string;
  type: "TOOL_RESULT" | "INSPECTION" | "USER_INPUT" | "RECOVERY" | "VERIFICATION";
  source: string;
  summary: string;
  data?: unknown;
  relatedStepId?: string;
}

/** Task timestamps */
export interface TaskTimestamps {
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  lastToolCallAt?: string;
}

/** Memory recall result */
export interface MemoryRecall {
  relevantArtifacts: string[];
  relevantFacts: string[];
  standingRules: string[];
}

/** Task outcome when terminal */
export type TaskOutcome =
  | { success: true; summary: string }
  | { success: false; error: string; recoverable: boolean };

/** Legacy phase compatibility */
export function stateToLegacyPhase(state: AgentState): AgentPhase {
  const map: Record<AgentState, AgentPhase> = {
    IDLE: "understand",
    THINKING: "understand",
    INSPECTING: "inspect",
    PLANNING: "plan",
    EXECUTING: "execute",
    VERIFYING: "verify",
    RECOVERING: "debug",
    COMPLETED: "complete",
    FAILED: "failed",
    CANCELLED: "failed",
  };
  return map[state] ?? "understand";
}

export function legacyPhaseToState(phase: AgentPhase): AgentState {
  const map: Record<AgentPhase, AgentState> = {
    understand: "THINKING",
    inspect: "INSPECTING",
    plan: "PLANNING",
    build: "EXECUTING",
    execute: "EXECUTING",
    test: "EXECUTING",
    debug: "RECOVERING",
    verify: "VERIFYING",
    complete: "COMPLETED",
    failed: "FAILED",
  };
  return map[phase] ?? "THINKING";
}