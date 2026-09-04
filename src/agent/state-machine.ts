/**
 * P3.4 — Agent State Machine
 *
 * Deterministic, typed state machine for Agent task execution.
 * All state transitions are explicit and validated.
 * Illegal transitions are rejected at the type level where possible.
 */

export type AgentState =
  | "IDLE"
  | "THINKING"
  | "INSPECTING"
  | "PLANNING"
  | "EXECUTING"
  | "VERIFYING"
  | "RECOVERING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type AgentStateTransition =
  | { from: "IDLE"; to: "THINKING" }
  | { from: "THINKING"; to: "INSPECTING" }
  | { from: "THINKING"; to: "PLANNING" }
  | { from: "INSPECTING"; to: "PLANNING" }
  | { from: "PLANNING"; to: "EXECUTING" }
  | { from: "EXECUTING"; to: "VERIFYING" }
  | { from: "EXECUTING"; to: "RECOVERING" }
  | { from: "VERIFYING"; to: "COMPLETED" }
  | { from: "VERIFYING"; to: "RECOVERING" }
  | { from: "RECOVERING"; to: "EXECUTING" }
  | { from: "RECOVERING"; to: "PLANNING" }
  | { from: "IDLE" | "THINKING" | "INSPECTING" | "PLANNING" | "EXECUTING" | "VERIFYING" | "RECOVERING"; to: "CANCELLED" }
  | { from: "FAILED"; to: "IDLE" }; // New task creation

/** All terminal states */
export const TERMINAL_STATES: readonly AgentState[] = [
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

/** All active (non-terminal) states */
export const ACTIVE_STATES: readonly AgentState[] = [
  "IDLE",
  "THINKING",
  "INSPECTING",
  "PLANNING",
  "EXECUTING",
  "VERIFYING",
  "RECOVERING",
] as const;

/**
 * Validates that a state transition is legal.
 * Throws if the transition is not allowed.
 */
export function validateTransition(
  from: AgentState,
  to: AgentState,
): void {
  const allowed: Record<AgentState, readonly AgentState[]> = {
    IDLE: ["THINKING"],
    THINKING: ["INSPECTING", "PLANNING"],
    INSPECTING: ["PLANNING"],
    PLANNING: ["EXECUTING"],
    EXECUTING: ["VERIFYING", "RECOVERING"],
    VERIFYING: ["COMPLETED", "RECOVERING"],
    RECOVERING: ["EXECUTING", "PLANNING"],
    COMPLETED: [],
    FAILED: ["IDLE"],
    CANCELLED: [],
  };

  const validTargets = allowed[from];
  if (!validTargets.includes(to)) {
    throw new Error(
      `Illegal state transition: ${from} → ${to}. ` +
        `Valid transitions from ${from}: ${validTargets.join(", ")}`,
    );
  }

  // Additional terminal state protection
  if (TERMINAL_STATES.includes(from) && from !== "FAILED") {
    throw new Error(
      `Cannot transition from terminal state ${from} to ${to}. ` +
        `Create a new task instead.`,
    );
  }
}

/**
 * State machine for a single task.
 * Encapsulates state and enforces valid transitions.
 */
export class TaskStateMachine {
  private state: AgentState = "IDLE";
  private previousState: AgentState | null = null;
  private transitionLog: { from: AgentState; to: AgentState; timestamp: string }[] = [];

  constructor() {}

  get current(): AgentState {
    return this.state;
  }

  get isTerminal(): boolean {
    return TERMINAL_STATES.includes(this.state);
  }

  get isActive(): boolean {
    return ACTIVE_STATES.includes(this.state);
  }

  get history(): readonly { from: AgentState; to: AgentState; timestamp: string }[] {
    return this.transitionLog;
  }

  /**
   * Attempts to transition to a new state.
   * Returns true on success, throws on invalid transition.
   */
  transition(to: AgentState): void {
    validateTransition(this.state, to);
    this.previousState = this.state;
    this.state = to;
    this.transitionLog.push({
      from: this.previousState,
      to: this.state,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Forces transition to CANCELLED from any active state.
   * Used for cooperative cancellation.
   */
  cancel(): void {
    if (this.isTerminal) {
      return; // Already terminal, no-op
    }
    this.transition("CANCELLED");
  }

  /**
   * Resets to IDLE for a new task (only from FAILED).
   */
  resetForNewTask(): void {
    if (this.state !== "FAILED") {
      throw new Error(`Can only reset for new task from FAILED, not ${this.state}`);
    }
    this.transition("IDLE");
  }
}

/**
 * Maps AgentPhase (legacy) to AgentState (new) for compatibility.
 */
export function legacyPhaseToState(phase: string): AgentState {
  const map: Record<string, AgentState> = {
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