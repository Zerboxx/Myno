/**
 * P3.4 — Observation Layer
 *
 * Structured, first-class observations for the Agent runtime.
 * Replaces ad-hoc string logging with typed, queryable observations.
 */

import type { AgentState } from "./state-machine.js";
import type { ToolExecution } from "./execution-types.js";

/** Classification of observation sources */
export type ObservationSource =
  | "workspace"
  | "instance"
  | "script"
  | "console"
  | "playtest"
  | "screenshot"
  | "tool"
  | "model"
  | "memory";

/** Classification of observation kinds */
export type ObservationKind =
  | "fact"
  | "change"
  | "error"
  | "warning"
  | "state"
  | "result"
  | "verification"
  | "recovery";

/** A single structured observation */
export interface Observation {
  id: string;
  taskId: string;
  timestamp: number;

  source: ObservationSource;
  kind: ObservationKind;

  /** Human-readable summary for logging/UI */
  summary: string;

  /** Structured data for programmatic access */
  data?: unknown;

  /** Confidence level 0-1 */
  confidence?: number;

  /** Related plan step if applicable */
  relatedStepId?: string;

  /** Related tool execution if applicable */
  relatedToolExecutionId?: string;

  /** Agent state when observation was made */
  agentState: AgentState;
}

/** Observation store for a task */
export interface ObservationStore {
  /** Add a new observation */
  add(observation: Observation): void;

  /** Get all observations for a task */
  getAll(taskId: string): readonly Observation[];

  /** Get observations by kind */
  getByKind(taskId: string, kind: ObservationKind): readonly Observation[];

  /** Get observations by source */
  getBySource(taskId: string, source: ObservationSource): readonly Observation[];

  /** Get observations for a specific step */
  getByStep(taskId: string, stepId: string): readonly Observation[];

  /** Clear observations for a task */
  clear(taskId: string): void;

  /** Get count of observations */
  size(taskId: string): number;
}

/**
 * Creates an in-memory observation store.
 * For production use, this could be replaced with a persistent store.
 */
export function createObservationStore(): ObservationStore {
  const store = new Map<string, Observation[]>();

  function generateId(): string {
    return `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  return {
    add(observation: Observation) {
      const arr = store.get(observation.taskId) ?? [];
      arr.push(observation);
      store.set(observation.taskId, arr);
    },

    getAll(taskId: string) {
      return store.get(taskId) ?? [];
    },

    getByKind(taskId: string, kind: ObservationKind) {
      return (store.get(taskId) ?? []).filter((o) => o.kind === kind);
    },

    getBySource(taskId: string, source: ObservationSource) {
      return (store.get(taskId) ?? []).filter((o) => o.source === source);
    },

    getByStep(taskId: string, stepId: string) {
      return (store.get(taskId) ?? []).filter((o) => o.relatedStepId === stepId);
    },

    clear(taskId: string) {
      store.delete(taskId);
    },

    size(taskId: string) {
      return (store.get(taskId) ?? []).length;
    },
  };
}

/**
 * Creates an observation from a tool execution result.
 */
export function createToolObservation(
  taskId: string,
  execution: ToolExecution,
  agentState: AgentState,
  relatedStepId?: string,
): Observation {
  const isError = !execution.success;
  const kind: "error" | "result" = isError ? "error" : "result";

  return {
    id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    timestamp: Date.now(),
    source: "tool",
    kind,
    summary: `${execution.name}: ${isError ? "FAILED" : "OK"} - ${execution.error ?? "success"}`,
    data: {
      tool: execution.name,
      input: execution.input,
      output: execution.data,
      error: execution.error,
      errorType: execution.errorType,
      phase: execution.phase,
      iteration: execution.iteration,
    },
    confidence: isError ? 0.9 : 1.0,
    relatedStepId,
    relatedToolExecutionId: execution.id,
    agentState,
  };
}

/**
 * Creates an observation from an inspection result.
 */
export function createInspectionObservation(
  taskId: string,
  target: string,
  result: unknown,
  agentState: AgentState,
  relatedStepId?: string,
): Observation {
  return {
    id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    timestamp: Date.now(),
    source: "instance",
    kind: "fact",
    summary: `Inspected ${target}`,
    data: {
      target,
      result,
    },
    confidence: 1.0,
    relatedStepId,
    agentState,
  };
}

/**
 * Creates an observation from a verification result.
 */
export function createVerificationObservation(
  taskId: string,
  stepId: string,
  passed: boolean,
  checks: readonly { description: string; passed: boolean; evidence: string[] }[],
  agentState: AgentState,
): Observation {
  return {
    id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    timestamp: Date.now(),
    source: "instance",
    kind: "verification",
    summary: `Verification ${passed ? "PASSED" : "FAILED"} for step ${stepId}`,
    data: {
      stepId,
      passed,
      checks: checks.map((c) => ({
        description: c.description,
        passed: c.passed,
        evidence: c.evidence,
      })),
    },
    confidence: passed ? 1.0 : 0.8,
    relatedStepId: stepId,
    agentState,
  };
}

/**
 * Creates an observation for an error/recovery event.
 */
export function createErrorObservation(
  taskId: string,
  error: Error,
  context: string,
  agentState: AgentState,
  relatedStepId?: string,
): Observation {
  return {
    id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    timestamp: Date.now(),
    source: "model",
    kind: "error",
    summary: `Error in ${context}: ${error.message}`,
    data: {
      context,
      error: error.message,
      stack: error.stack,
    },
    confidence: 0.9,
    relatedStepId,
    agentState,
  };
}

/**
 * Creates an observation for a recovery attempt.
 */
export function createRecoveryObservation(
  taskId: string,
  reason: string,
  strategy: string,
  agentState: AgentState,
  relatedStepId?: string,
): Observation {
  return {
    id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    timestamp: Date.now(),
    source: "model",
    kind: "recovery",
    summary: `Recovery attempt: ${reason} - Strategy: ${strategy}`,
    data: {
      reason,
      strategy,
    },
    confidence: 0.7,
    relatedStepId,
    agentState,
  };
}

/**
 * Creates an observation for a state change.
 */
export function createStateObservation(
  taskId: string,
  fromState: string,
  toState: string,
  agentState: AgentState,
): Observation {
  return {
    id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    timestamp: Date.now(),
    source: "model",
    kind: "state",
    summary: `State transition: ${fromState} → ${toState}`,
    data: {
      fromState,
      toState,
    },
    confidence: 1.0,
    agentState,
  };
}

/**
 * Observation query helpers
 */
export function getLatestObservation(
  observations: readonly Observation[],
): Observation | undefined {
  if (observations.length === 0) return undefined;
  return observations.reduce((latest, obs) =>
    obs.timestamp > latest.timestamp ? obs : latest,
  );
}

export function getObservationsSince(
  observations: readonly Observation[],
  since: number,
): readonly Observation[] {
  return observations.filter((o) => o.timestamp >= since);
}

export function getObservationsByKind(
  observations: readonly Observation[],
  kind: ObservationKind,
): readonly Observation[] {
  return observations.filter((o) => o.kind === kind);
}

export function summarizeObservations(
  observations: readonly Observation[],
  maxLength: number = 2000,
): string {
  if (observations.length === 0) return "No observations recorded.";

  const lines = observations
    .slice(-20) // Last 20 observations
    .map((o) => `[${new Date(o.timestamp).toISOString()}] [${o.kind}] ${o.summary}`)
    .join("\n");

  return lines.length > maxLength
    ? lines.slice(0, maxLength) + "\n...[truncated]"
    : lines;
}