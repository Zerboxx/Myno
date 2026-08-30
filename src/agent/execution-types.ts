import type { ModelCapability } from "../router/model-router.js";
import type { ToolGroup } from "../tools/registry.js";
import type { ToolFailureCategory } from "../tools/types.js";
import type {
  SemanticRequest,
  SkillSelection,
} from "./skills/types.js";
import type { RobloxStudioContext } from "./studio-context.js";

export type AgentPhase =
  | "understand"
  | "inspect"
  | "plan"
  | "build"
  | "execute"
  | "test"
  | "debug"
  | "verify"
  | "complete"
  | "failed";

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

export type EvidenceType =
  | "STUDIO_DISCOVERED"
  | "STUDIO_INSPECTED"
  | "WORKSPACE_INSPECTED"
  | "SCRIPT_READ"
  | "BUILD_CREATED"
  | "BUILD_VERIFIED"
  | "TEST_PASSED";

export interface Evidence {
  type: EvidenceType;
  sourceTool: string;
  timestamp: number;
  summary: string;
  data?: unknown;
}

export interface SuccessCriterion {
  id: string;
  description: string;
  required: boolean;
}

export interface AgentPlan {
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
  successCriteria: SuccessCriterion[];
  preferredToolGroups: ToolGroup[];
  reason: string;

  /**
   * Language-neutral decoding of what the user actually asked, plus the
   * selected declarative skill(s). Optional so older callers that build
   * an AgentPlan without the semantic layer remain structurally valid.
   */
  semanticRequest?: SemanticRequest;
  selectedSkills?: SkillSelection;

  /**
   * True when the request is the refinement/hardening family ("خليها
   * أحلى" / "make it better" / "عدّل"). The plan prompts the model to
   * modify the existing artifact in place, never to create a duplicate.
   */
  refinementMode?: boolean;
}

export interface ToolExecution {
  id: string;
  name: string;
  input: unknown;
  executedInput?: unknown;
  success: boolean;
  data?: unknown;
  error?: string;
  errorType?: ToolFailureCategory;
  iteration: number;
  phase: AgentPhase;
  startedAt: string;
  finishedAt: string;
}

export interface VerificationCheck {
  id: string;
  description: string;
  passed: boolean;
  evidence: string[];
  sourceTools: string[];
}

export interface VerificationState {
  required: boolean;
  attempted: boolean;
  passed: boolean;
  checks: VerificationCheck[];
  evidence: string[];
  reason: string;
}

export interface AgentError {
  phase: AgentPhase;
  message: string;
  tool?: string;
  recoverable: boolean;
  timestamp: string;
}

export interface AgentExecutionState {
  taskId: string;
  originalRequest: string;
  capability: ModelCapability;
  createdAt: string;
  plan: AgentPlan;
  phase: AgentPhase;
  studioContext: RobloxStudioContext;
  executedTools: ToolExecution[];
  successfulTools: ToolExecution[];
  failedTools: ToolExecution[];
  evidence: Evidence[];
  consecutiveFailures: number;
  noProgressIterations: number;
  noProgressRecoveryStreak: number;
  recoveryAttempts: number;
  iteration: number;
  totalToolCalls: number;
  completed: boolean;
  failed: boolean;
  failedCallSignatures: Set<string>;
  staleRetrySignatures: Set<string>;
  verification: VerificationState;
  errors: AgentError[];
  finalContent: string;
}
