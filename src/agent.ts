import crypto from "node:crypto";

import type {
  AIMessage,
  AIProvider,
  AIToolCall,
  AIToolDefinition,
  ChatResponse,
} from "./providers/provider.js";

import {
  ModelRouter,
  type ModelCapability,
} from "./router/model-router.js";

import {
  ToolRegistry,
  isStudioDiscoveryTool,
  type ToolGroup,
} from "./tools/registry.js";

import type { ToolResult } from "./tools/types.js";

import type {
  AgentResponse,
  AgentTask,
} from "./agent/types.js";

import {
  extractStudioCandidates,
  findActiveStudioCandidate,
  looksLikeStaleStudioError,
  findStudioIdParameterKey,
  normalizeRobloxToolArguments,
  detectFullReadOnlyIntent,
  detectScopedProtectionTargets,
  type RobloxStudioContext,
  type StudioCandidate,
} from "./agent/studio-context.js";
import {
  createInitialPlan as buildPlan,
  detectBuildIntent as planDetectBuildIntent,
  detectTestingIntent as planDetectTestingIntent,
} from "./agent/plan.js";
import type {
  SemanticRequest,
  SkillSelection,
} from "./agent/skills/types.js";

import {
  buildMemoryPrompt,
  detectUserPreferences,
  tokenizeMemoryText,
} from "./memory/recall.js";
import type { MemoryRecallResult } from "./memory/types.js";
import type { MemoryStore } from "./memory/memory-store.js";

/* ============================================================================
 * CONFIGURATION
 * ========================================================================== */

const MAX_ITERATIONS = 32;
const MAX_TOOL_CALLS_PER_ITERATION = 12;
const MAX_TOTAL_TOOL_CALLS = 100;

const DEFAULT_TEMPERATURE = 0.12;

const MAX_TOOL_RESULT_CHARS = 14000;
const MAX_ERROR_CHARS = 4000;

const MAX_CONSECUTIVE_FAILURES = 4;
const MAX_RECOVERY_ATTEMPTS = 6;

const MAX_HISTORY_MESSAGES = 80;

/* ============================================================================
 * BILINGUAL VERIFICATION TERMS
 *
 * The user works in Arabic and English (frequently mixed), and the model
 * may legitimately report results in Arabic. The verification content
 * gate inspects those reports, so the dictionaries below include both
 * languages. Arabic entries are full phrases (or longer words), never
 * bare radicals — a lone "تم" would match substrings in unrelated words.
 *
 * Failure terms are always evaluated BEFORE success terms: "مش شغال"
 * contains "شغال" (a success word) yet must count as a failure.
 * ========================================================================== */

const VERIFY_FAILURE_TERMS = [
  "not complete",
  "not completed",
  "does not exist",
  "doesn't exist",
  "missing",
  "not found",
  "failed",
  "failure",
  "unable to verify",
  "cannot verify",
  "could not verify",
  "not verified",
  "not working",
  "doesn't work",
  "doesnt work",
  "فشل",
  "فشلت",
  "مش موجود",
  "غير موجود",
  "لا يوجد",
  "غير مكتمل",
  "لم يكتمل",
  "لم ينجح",
  "مش شغال",
  "لا يعمل",
  "مفيش",
  "خطأ",
  "بايظ",
  "لم يتم",
];

const VERIFY_SUCCESS_TERMS = [
  "verified",
  "confirmed",
  "successfully",
  "working",
  "task is complete",
  "task completed",
  "تمت",
  "تم بنجاح",
  "نجحت",
  "اكتملت",
  "انجزت",
  "شغال",
  "يشتغل",
  "التحقق",
];

/* ============================================================================
 * PHASES
 * ========================================================================== */

type AgentPhase =
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

type TaskIntent =
  | "chat"
  | "coding"
  | "building"
  | "refinement"
  | "debugging"
  | "testing"
  | "inspection"
  | "planning"
  | "analysis";

/* ============================================================================
 * PLAN TYPES
 * ========================================================================== */

interface SuccessCriterion {
  id: string;
  description: string;
  required: boolean;
}

interface AgentPlan {
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

  /**
   * True when the user explicitly asked the agent not to modify/build/
   * change/create ANYTHING, unscoped (e.g. "Do not modify anything",
   * "read-only"). This is a hard safety flag, separate from
   * requiresBuild, so it survives even if intent detection elsewhere
   * misfires.
   *
   * Deliberately narrower than earlier versions: a SCOPED protection
   * ("do not modify the existing house") does NOT set this — see
   * `protectedTargets` below. Only an unscoped negation ("anything" /
   * "everything" / bare "read-only") counts as full read-only, so a
   * request that also asks for a real build isn't wrongly blocked
   * wholesale. See detectFullReadOnlyIntent in ./agent/studio-context.ts.
   */
  explicitReadOnly: boolean;

  /**
   * Free-text targets the user asked NOT to be touched, alongside an
   * otherwise-permitted request (e.g. "the existing house" from
   * "build a bed but do not modify the existing house"). This is
   * surfaced to the model as an instruction to respect, not enforced
   * as a hard per-object tool block — the architecture has no way to
   * resolve "the existing house" to a specific Roblox instance without
   * semantic understanding. Documented limitation, not a false
   * guarantee.
   */
  protectedTargets: string[];

  successCriteria: SuccessCriterion[];

  preferredToolGroups: ToolGroup[];

  reason: string;

  /**
   * Language-neutral decoding of the request plus the declarative skill
   * selected for it (both produced by ./agent/plan.ts). Optional for
   * structural compatibility with plan producers that predate the skill
   * layer.
   */
  semanticRequest?: SemanticRequest;
  selectedSkills?: SkillSelection;

  /**
   * True for the "تعديل/تحسين اللي موجود"/"make the existing X better"
   * family. The plan then instructs the model to modify in place and
   * never create a duplicate.
   */
  refinementMode?: boolean;
}

/* ============================================================================
 * EXECUTION TYPES
 * ========================================================================== */

interface ToolExecution {
  id: string;
  name: string;
  input: unknown;

  success: boolean;

  data?: unknown;
  error?: string;

  iteration: number;
  phase: AgentPhase;

  startedAt: string;
  finishedAt: string;
}

interface VerificationCheck {
  id: string;

  description: string;

  passed: boolean;

  evidence: string[];

  sourceTools: string[];
}

interface VerificationState {
  required: boolean;

  attempted: boolean;

  passed: boolean;

  checks: VerificationCheck[];

  evidence: string[];

  reason: string;
}

interface AgentError {
  phase: AgentPhase;

  message: string;

  tool?: string;

  recoverable: boolean;

  timestamp: string;
}

interface AgentState {
  task: AgentTask;

  plan: AgentPlan;

  phase: AgentPhase;

  messages: AIMessage[];

  iterations: number;

  totalToolCalls: number;

  executedTools: ToolExecution[];

  errors: AgentError[];

  verification: VerificationState;

  recoveryAttempts: number;

  /**
   * Counts consecutive iterations where the agent needed the model to
   * take a recovery action (a required evidence category is still
   * unsatisfied) but the model returned no tool call at all — i.e. no
   * actual progress was attempted. Reset to 0 whenever a tool call
   * batch actually executes. Used to fail fast instead of burning
   * through MAX_RECOVERY_ATTEMPTS on iterations that do nothing.
   */
  noProgressRecoveryStreak: number;

  /**
   * Signatures ("toolName:JSON(args)") of tool calls that have already
   * failed with these exact arguments. Used to block verbatim repeats
   * of a known-failing call instead of letting the model retry the
   * same broken input again. Computed from the MODEL-PROVIDED (raw,
   * pre-injection) arguments, so it is unaffected by automatic
   * studio_id injection below.
   */
  failedCallSignatures: Set<string>;

  consecutiveFailures: number;

  completed: boolean;

  failed: boolean;

  finalContent: string;

  /**
   * Deterministic, runtime-owned Roblox Studio session context. The
   * model is never asked to discover or remember studio_id itself —
   * see ensureRobloxStudioContext().
   */
  studioContext: RobloxStudioContext;

  /**
   * Persistent project memory recalled for this task (from the memory
   * store, when configured). Injected into the system prompt so the
   * model prefers existing artifacts and avoids repeating past
   * mistakes across sessions.
   */
  memoryRecall?: MemoryRecallResult;
}

/* ============================================================================
 * AGENT
 * ========================================================================== */

export class Agent {
  private readonly router: ModelRouter;

  private readonly tools: ToolRegistry;

  private readonly sessionId: string;

  private readonly memory?: MemoryStore;

  constructor(
    router: ModelRouter,
    tools: ToolRegistry,
    memory?: MemoryStore,
  ) {
    this.router = router;
    this.tools = tools;
    this.memory = memory;

    /*
     * IMPORTANT:
     * Session IDs belong to the Agent instance, not the module.
     */
    this.sessionId = crypto.randomUUID();
  }

  /* ==========================================================================
   * PUBLIC API
   * ======================================================================== */

  async run(userMessage: string): Promise<AgentResponse> {
    const message = userMessage.trim();

    if (!message) {
      throw new Error(
        "Agent cannot run an empty request.",
      );
    }

    const task: AgentTask = {
      id: crypto.randomUUID(),

      userMessage: message,

      capability: this.detectCapability(message),

      createdAt: new Date().toISOString(),
    };

    const plan = this.createInitialPlan(message);

    task.capability = plan.capability;

    const state: AgentState = {
      task,

      plan,

      phase: "understand",

      messages: [],

      iterations: 0,

      totalToolCalls: 0,

      executedTools: [],

      errors: [],

      verification: {
        required: plan.requiresVerification,

        attempted: false,

        passed: false,

        checks: [],

        evidence: [],

        reason: "",
      },

      recoveryAttempts: 0,

      noProgressRecoveryStreak: 0,

      failedCallSignatures: new Set<string>(),

      consecutiveFailures: 0,

      completed: false,

      failed: false,

      finalContent: "",

      studioContext: {
        status: "not-needed",
      },
    };

    this.printTaskHeader(state);

    /*
     * ================================================================
     * PERSISTENT MEMORY RECALL + PREFERENCE CAPTURE
     * ================================================================
     *
     * Recall relevant durable memories for THIS task and record any
     * user standing rules/language detected in this request. Both are
     * best-effort: a memory I/O failure must never break the task.
     */
    if (this.memory) {
      try {
        state.memoryRecall = await this.memory.recall(message, {
          boostTypes: state.plan.needsRoblox
            ? ["artifact", "fact", "project-state"]
            : undefined,
        });

        for (const preference of detectUserPreferences(message)) {
          await this.memory.remember(preference);
        }
      } catch (error) {
        console.warn(
          `[Memory] recall/preference capture failed: ${this.errorMessage(error)}`,
        );
      }
    }

    const selectedModel =
      this.router.getModel(
        plan.capability,
      );

    const provider = selectedModel.provider;
    const model = selectedModel.model;

    state.messages =
      this.createInitialMessages(state);

    /*
     * ================================================================
     * ROBLOX STUDIO CONTEXT BOOTSTRAP
     * ================================================================
     *
     * Deterministic, runtime-owned session resolution — NOT delegated
     * to the model. Only triggered when the plan actually needs to
     * interact with a live Studio (inspect/build/test), not for plain
     * Roblox-flavored chat that never touches a tool.
     */

    const needsActiveStudio =
      plan.needsRoblox &&
      (
        plan.requiresBuild ||
        plan.requiresTesting ||
        (
          plan.requiresInspection &&
          !this.isStudioDiscoveryOnlyRequest(
            message,
          )
        )
      );

    if (needsActiveStudio) {
      await this.ensureRobloxStudioContext(
        state,
      );

      this.printStudioContext(state);

      if (
        state.studioContext.status ===
        "unavailable"
      ) {
        this.fail(
          state,
          state.studioContext.error ??
            "Roblox Studio context could not be resolved.",
          false,
        );

        state.finalContent =
          this.buildFailureResponse(
            state,
          );

        return {
          taskId: task.id,
          content: state.finalContent,
          model,
          provider: provider.name,
          success: false,
        };
      }
    }

    /*
     * ================================================================
     * MAIN AGENT LOOP
     * ================================================================
     */

    for (
      let iteration = 1;
      iteration <= MAX_ITERATIONS;
      iteration++
    ) {
      state.iterations = iteration;

      this.printIteration(state);

      if (
        state.totalToolCalls >=
        MAX_TOTAL_TOOL_CALLS
      ) {
        this.fail(
          state,
          "Maximum total tool-call budget reached.",
          false,
        );

        break;
      }

      try {
        /*
         * ------------------------------------------------------------
         * PHASE SELECTION
         * ------------------------------------------------------------
         */

        state.phase =
          this.selectNextPhase(state);

        /*
         * ------------------------------------------------------------
         * TOOL SCOPE
         * ------------------------------------------------------------
         */

        const exposedTools =
          this.getToolsForPhase(
            state,
          );

        this.printToolScope(
          state,
          exposedTools,
        );

        /*
         * ------------------------------------------------------------
         * MODEL CALL
         * ------------------------------------------------------------
         */

        const response =
          await this.callModel(
            provider,
            model,
            state.messages,
            exposedTools,
            state.phase,
          );

        const assistantMessage =
          response.message;

        /*
         * Keep the assistant's structured tool
         * call message exactly as returned.
         */
        state.messages.push(
          assistantMessage,
        );

        this.trimMessageHistory(
          state,
        );

        const toolCalls =
          assistantMessage.toolCalls ??
          [];

          
        /*
         * ------------------------------------------------------------
         * TOOL EXECUTION
         * ------------------------------------------------------------
         */

        if (toolCalls.length > 0) {
          state.noProgressRecoveryStreak = 0;

          const limitedCalls =
            toolCalls.slice(
              0,
              MAX_TOOL_CALLS_PER_ITERATION,
            );

          await this.executeToolCalls(
            state,
            limitedCalls,
          );

          /*
           * Never finish directly after a tool call.
           * The model must observe the result first.
           */
          continue;
        }

        /*
         * ------------------------------------------------------------
         * NO TOOL CALL
         * ------------------------------------------------------------
         */

        const content =
          assistantMessage.content
            ?.trim() ?? "";

        if (
          this.requiresEvidenceBeforeCompletion(
            state,
          )
        ) {
          state.finalContent =
            content;

          state.phase = "verify";

          const verification =
            await this.verifyTask(
              state,
              provider,
              model,
            );

          if (verification.passed) {
            state.verification =
              verification;

            state.completed = true;

            state.phase = "complete";

            state.finalContent =
              this.buildSuccessfulResponse(
                state,
                content,
              );

            break;
          }

          state.verification =
            verification;

          state.errors.push({
            phase: "verify",

            message:
              verification.reason,

            recoverable: true,

            timestamp:
              new Date().toISOString(),
          });

          if (
            state.recoveryAttempts <
            MAX_RECOVERY_ATTEMPTS
          ) {
            state.recoveryAttempts++;

            state.phase = "debug";

            state.messages.push({
              role: "user",

              content: `
Verification did not confirm completion.

Reason:
${this.truncate(
  verification.reason,
  MAX_ERROR_CHARS,
)}

Do not claim completion.

Recover from the failure.
Inspect the current state if necessary.
Use another appropriate tool or correct the previous action.
Continue until the user's requested outcome is actually achieved and verifiable.
`,
            });

            continue;
          }

          this.fail(
            state,
            "Verification failed repeatedly.",
            true,
          );

          break;
        }

        /*
         * ------------------------------------------------------------
         * GENERAL "NOT ACTUALLY DONE YET" GATE
         * ------------------------------------------------------------
         *
         * requiresEvidenceBeforeCompletion() above only covers plans
         * that need build/testing/full verification. A plan that only
         * requires inspection (requiresVerification=false) had no gate
         * at all here — the model's plain text was accepted as final
         * the moment it stopped calling tools, even right after the
         * only tool call it made had failed. This closes that gap
         * generically, for any required category, not a specific tool.
         */

        const unsatisfied =
          this.getUnsatisfiedRequirements(
            state,
          );

        if (unsatisfied.length > 0) {
          state.errors.push({
            phase: state.phase,

            message: `Task not yet satisfied: ${unsatisfied.join("; ")}`,

            recoverable: true,

            timestamp:
              new Date().toISOString(),
          });

          state.noProgressRecoveryStreak++;

          /*
           * Two iterations in a row with an outstanding requirement
           * AND no tool call at all means the model is not attempting
           * recovery — stop burning iterations and fail clearly
           * instead of waiting out MAX_RECOVERY_ATTEMPTS.
           */
          if (
            state.noProgressRecoveryStreak >=
              2 ||
            state.recoveryAttempts >=
              MAX_RECOVERY_ATTEMPTS
          ) {
            this.fail(
              state,
              `Stopped without tool-call progress. Unsatisfied: ${unsatisfied.join("; ")}`,
              true,
            );

            break;
          }

          state.recoveryAttempts++;

          state.phase = "debug";

          state.messages.push({
            role: "user",

            content: `
The task is not yet satisfied.

Still missing:
${unsatisfied.map((item) => `- ${item}`).join("\n")}

You returned a text response instead of taking action. Do not give up
after a single failed tool call.

If a tool call failed because required input (such as an ID) was
missing or invalid, look at the tools currently available to you for
one whose purpose is to discover/list that missing value. Call it,
read the value it returns, and then retry the original tool using
that real value — do not guess or invent a placeholder value, and do
not repeat the exact same failed call with the exact same arguments.

Continue working toward the user's requested outcome.
`,
          });

          continue;
        }

        state.finalContent =
          content;

        state.completed = true;

        state.phase = "complete";

        break;
      } catch (error) {
        const message =
          this.errorMessage(error);

        state.errors.push({
          phase: state.phase,

          message,

          recoverable:
            state.recoveryAttempts <
            MAX_RECOVERY_ATTEMPTS,

          timestamp:
            new Date().toISOString(),
        });

        state.recoveryAttempts++;

        console.error(
          `[Agent] ${state.phase} error: ${message}`,
        );

        if (
          state.recoveryAttempts >=
          MAX_RECOVERY_ATTEMPTS
        ) {
          this.fail(
            state,
            message,
            true,
          );

          break;
        }

        state.messages.push({
          role: "user",

          content: `
The previous agent step failed.

Error:
${this.truncate(
  message,
  MAX_ERROR_CHARS,
)}

Do not claim completion.

Recover from the failure.
Inspect the current state if necessary.
Use another appropriate tool or correct the previous action.
Continue until the user's requested outcome is actually achieved and verifiable.
`,
        });
      }
    }

    if (!state.completed) {
      state.failed = true;

      state.phase = "failed";

      state.finalContent =
        this.buildFailureResponse(
          state,
        );
    }

    if (!state.finalContent.trim()) {
      state.finalContent =
        state.completed
          ? "Task completed successfully."
          : this.buildFailureResponse(
              state,
            );
    }

    await this.captureMemory(state);

    return {
  taskId: task.id,
  content: state.finalContent,
  model,
  provider: provider.name,
  success: state.completed && !state.failed,
};
}
 
/* ==========================================================================
 * MEMORY
 * ======================================================================== */

  /**
   * Persists durable knowledge about the task that just finished:
   * a conversation summary every time, an "artifact" entry when a Roblox
   * build/refinement reached verification, and a "lesson" when the task
   * failed — so future sessions can prefer the existing artifact and avoid
   * repeating the failure. Best-effort: never breaks the task result.
   */
  private async captureMemory(
    state: AgentState,
  ): Promise<void> {
    if (!this.memory) {
      return;
    }

    try {
      const source = state.task.id;
      const outcome = state.completed
        ? "completed"
        : state.failed
          ? "failed/blocked"
          : "incomplete";

      const objective = state.plan.objective.trim();

      const objectiveTags = tokenizeMemoryText(
        objective,
      ).slice(0, 8);

      await this.memory.remember({
        type: "conversation",
        content: `Task ${outcome}: ${this.truncate(objective, 280)}`,
        tags: objectiveTags,
        source,
      });

      if (
        state.completed &&
        state.plan.needsRoblox &&
        (
          state.plan.requiresBuild ||
          state.plan.refinementMode
        )
      ) {
        const evidenceNames = [
          ...new Set(
            state.executedTools
              .filter(
                (execution) =>
                  execution.success,
              )
              .map(
                (execution) =>
                  execution.name,
              ),
          ),
        ].slice(0, 8);

        const detail =
          evidenceNames.length > 0
            ? ` (evidence tools: ${evidenceNames.join(", ")})`
            : "";

        await this.memory.remember({
          type: "artifact",
          content: `Roblox artifact (verified in Studio): ${this.truncate(objective, 220)}${detail}`,
          tags: [
            ...objectiveTags,
            "roblox",
            "artifact",
          ],
          source,
        });
      }

      if (state.failed) {
        const reason =
          state.verification.reason ||
          state.errors.at(-1)
            ?.message ||
          "unknown failure";

        await this.memory.remember({
          type: "lesson",
          content: `Lesson (did not succeed): ${this.truncate(reason, 200)}`,
          tags: [
            ...objectiveTags,
            "lesson",
            "failure",
          ],
          source,
        });
      }
    } catch (error) {
      console.warn(
        `[Memory] task capture failed: ${this.errorMessage(error)}`,
      );
    }
  }

  /* ==========================================================================
   * ROBLOX STUDIO CONTEXT
   * ======================================================================== */

  /**
   * Resolves (or reuses) the active Roblox Studio session, deterministically,
   * using the discovery tool the tool registry exposes — never by asking the
   * model to figure it out. See ./agent/studio-context.ts for the pure
   * parsing helpers this delegates to.
   */
  private async ensureRobloxStudioContext(
    state: AgentState,
  ): Promise<void> {
    if (!state.plan.needsRoblox) {
      state.studioContext = {
        status: "not-needed",
      };

      return;
    }

    if (
      state.studioContext.status ===
        "resolved" &&
      state.studioContext.studioId
    ) {
      return;
    }

    const discoveryTool =
      this.findStudioDiscoveryToolName();

    if (!discoveryTool) {
      state.studioContext = {
        status: "unresolved",
        error:
          "TOOL_NOT_FOUND: No Roblox Studio discovery tool is registered.",
      };

      return;
    }

    const result =
      await this.tools.execute(
        discoveryTool,
        {},
        {
          sessionId:
            this.sessionId,
        },
      );

    this.printStudioDiscoveryAttempt(
      discoveryTool,
      result,
    );

    if (!result.success) {
      const message =
        result.error ??
        "Studio discovery failed.";
      const code = /not connected|mcp/i.test(
        message,
      )
        ? "MCP_NOT_CONNECTED"
        : "TOOL_EXECUTION_ERROR";

      state.studioContext = {
        status: "unavailable",
        error: `${code}: ${message}`,
      };

      return;
    }

    let candidates =
      extractStudioCandidates(
        result.data,
      );

    if (candidates.length === 0) {
      const stateTool = this.tools
        .list()
        .find((tool) =>
          /get_studio_state/i.test(tool.name),
        );

      if (stateTool) {
        const stateResult = await this.tools.execute(
          stateTool.name,
          {},
          { sessionId: this.sessionId },
        );

        this.printStudioDiscoveryAttempt(
          stateTool.name,
          stateResult,
        );

        if (stateResult.success) {
          candidates = extractStudioCandidates(stateResult.data);
        }
      }
    }

    if (candidates.length === 0) {
      const payloadPreview = this.truncate(
        this.summarizeEvidence(result.data),
        800,
      );

      state.studioContext = {
        status: "unavailable",
        availableStudios: [],
        error:
          "NO_CONNECTED_STUDIO: No connected Roblox Studio instance was found. " +
          `Discovery tool ${discoveryTool} succeeded but returned no parseable studio_id. Payload: ${payloadPreview}`,
      };

      return;
    }

    if (candidates.length === 1) {
      state.studioContext = {
        status: "resolved",
        studioId: candidates[0].id,
        studioName:
          candidates[0].name,
        availableStudios:
          candidates,
      };

      return;
    }

    /*
     * Multiple Studios open. Do not guess — look for an explicit
     * active/focused/current signal in the raw discovery result
     * before giving up and asking the user to disambiguate.
     */
    const active =
      findActiveStudioCandidate(
        result.data,
        candidates,
      );

    if (active) {
      state.studioContext = {
        status: "resolved",
        studioId: active.id,
        studioName: active.name,
        availableStudios:
          candidates,
      };

      return;
    }

    state.studioContext = {
      status: "unavailable",
      availableStudios: candidates,
    error: `STUDIO_NOT_FOUND: Multiple Roblox Studio instances are open (${candidates.length}) and none is marked active/focused. Ask the user which one to use.`,
    };
  }

  /**
   * Finds the registered tool responsible for listing/discovering open
   * Roblox Studio instances, by name pattern rather than a single
   * hardcoded literal — so a differently-named but equivalent MCP tool
   * is still found.
   */
  private findStudioDiscoveryToolName():
    | string
    | null {
    const candidates =
      this.tools.getAIDefinitions([
        "roblox-inspection",
      ]);

    const match = candidates.find((definition) =>
      isStudioDiscoveryTool(definition.function.name),
    );

    if (match) {
      return match.function.name;
    }

    const fallback = this.tools
      .getAIDefinitions()
      .find((definition) =>
        isStudioDiscoveryTool(definition.function.name),
      );

    return fallback?.function.name ?? null;
  }

  /**
   * Schema-driven studio_id injection: looks at the ACTUAL registered
   * tool's JSON schema for a studio_id-shaped property, rather than a
   * hardcoded list of tool names. Never overwrites a valid value the
   * model already supplied.
   */
  private normalizeToolArguments(
    toolName: string,
    args: Record<string, unknown>,
    state: AgentState,
  ): {
    normalized: Record<string, unknown>;
    studioIdInjected: boolean;
  } {
    if (
      state.studioContext.status !==
        "resolved" ||
      !state.studioContext.studioId
    ) {
      return {
        normalized: args,
        studioIdInjected: false,
      };
    }

    if (
      toolName ===
      this.findStudioDiscoveryToolName()
    ) {
      return {
        normalized: args,
        studioIdInjected: false,
      };
    }

    const group =
      this.tools.getGroup(toolName);

    if (
      !group ||
      !group.startsWith("roblox")
    ) {
      return {
        normalized: args,
        studioIdInjected: false,
      };
    }

    const definition = this.tools
      .getAIDefinitions()
      .find(
        (item) =>
          item.function.name ===
          toolName,
      );

    const properties = (
      definition?.function
        .parameters as
        | {
            properties?: Record<
              string,
              unknown
            >;
          }
        | undefined
    )?.properties;

    const studioIdKey =
      findStudioIdParameterKey(
        properties,
      );

    return normalizeRobloxToolArguments(
      args,
      studioIdKey,
      state.studioContext.studioId,
    );
  }

  /* ==========================================================================
   * PLAN
   * ======================================================================== */

private createInitialPlan(
    message: string,
  ): AgentPlan {
    return buildPlan(message);
  }

  private isStudioDiscoveryOnlyRequest(
    message: string,
  ): boolean {
    const text = message.toLowerCase();

    /*
     * Multilingual detection: the plan layer already classifies
     * Arabic/English build and test requests ("اعمل NPC", "اختبر
     * اللعبة"). Using those detectors here keeps Arabic build requests
     * from being fast-pathed as mere Studio-discovery lookups, which
     * would have starved them of build tools.
     */
    if (
      planDetectBuildIntent(text) ||
      planDetectTestingIntent(text)
    ) {
      return false;
    }

    return (
      /\b(list|which|connected)\b/.test(text) &&
      /\b(studio|studios|instances)\b/.test(text)
    );
  }

  /* ==========================================================================
   * PHASE ENGINE
   * ======================================================================== */

  private selectNextPhase(
    state: AgentState,
  ): AgentPhase {
    if (state.completed) {
      return "complete";
    }

    if (state.failed) {
      return "failed";
    }

    /*
     * ------------------------------------------------------------
     * ORDERING NOTE (bug fix, kept from the previous review):
     *
     * "verify" used to be checked FIRST, gated only by
     * `hasPotentiallyCompletedWork` — which is just
     * `executedTools.length > 0`. That meant once a single tool call
     * happened (success OR failure), this condition stayed true for
     * the rest of the task, permanently starving "inspect"/"build"/
     * "test"/"debug" below of ever being reached again. Phase-specific
     * readiness is now checked first, matching the documented
     * lifecycle. No phase was removed; this is a reordering only.
     * ------------------------------------------------------------
     */

    if (
      state.consecutiveFailures >
      0
    ) {
      return "debug";
    }

    if (
      state.plan.requiresInspection &&
      !this.hasInspectionEvidence(
        state,
      )
    ) {
      return "inspect";
    }

    if (
      state.plan.requiresBuild &&
      !this.hasBuildEvidence(state)
    ) {
      return "build";
    }

    if (
      state.plan.requiresTesting &&
      !this.hasTestingEvidence(
        state,
      )
    ) {
      return "test";
    }

    if (
      state.plan.requiresVerification &&
      this.hasPotentiallyCompletedWork(
        state,
      )
    ) {
      return "verify";
    }

    return "execute";
  }

  /* ==========================================================================
   * MODEL
   * ======================================================================== */

  private async callModel(
    provider: AIProvider,
    model: string,
    messages: AIMessage[],
    tools: AIToolDefinition[],
    phase: AgentPhase,
  ): Promise<ChatResponse> {
    const phaseInstruction =
      this.buildPhaseInstruction(
        phase,
      );

    const modelMessages =
      this.injectPhaseInstruction(
        messages,
        phaseInstruction,
      );

    return provider.chat({
      model,

      messages: modelMessages,

      temperature:
        phase === "verify"
          ? 0
          : DEFAULT_TEMPERATURE,

      stream: false,

      tools:
        tools.length > 0
          ? tools
          : undefined,
    });
  }

  private injectPhaseInstruction(
    messages: AIMessage[],
    instruction: string,
  ): AIMessage[] {
    if (
      messages.length === 0
    ) {
      return messages;
    }

    const first =
      messages[0];

    if (
      first.role !== "system"
    ) {
      return [
        {
          role: "system",

          content: instruction,
        },

        ...messages,
      ];
    }

    return [
      {
        ...first,

        content:
          `${first.content}\n\n${instruction}`,
      },

      ...messages.slice(1),
    ];
  }

  private buildPhaseInstruction(
    phase: AgentPhase,
  ): string {
    switch (phase) {
      case "inspect":
        return `
CURRENT AGENT PHASE: INSPECT

Your priority is to understand the existing Roblox/project state.

Use inspection tools before making significant changes.

Do not create duplicates.
Do not assume names, parents, scripts, or objects.
Use actual inspection results as the source of truth.
`;

      case "build":
        return `
CURRENT AGENT PHASE: BUILD

Your priority is to perform the requested change.

Use real tools.
Do not merely describe code that could perform the change.
Do not write fake JSON tool calls.
Prefer Roblox tools for Roblox changes.

After every important operation, use the returned tool result to decide what happens next.
`;

      case "test":
        return `
CURRENT AGENT PHASE: TEST

Your priority is runtime validation.

Start or run the appropriate Roblox test/playtest when available.
Inspect runtime output and errors.
Do not claim the feature works just because a script was created.
`;

      case "debug":
        return `
CURRENT AGENT PHASE: DEBUG

Something did not satisfy the task.

Inspect the current state and diagnose the actual failure.
Make the smallest safe correction.
Then test or inspect again.

Do not simply repeat the exact failed operation.
`;

      case "verify":
        return `
CURRENT AGENT PHASE: VERIFY

You must establish concrete evidence that the requested outcome exists.

Do not treat your own previous response as evidence.
Use inspection/runtime tools.

A sentence such as "it should work" is not verification.
Only actual tool results count as evidence.
`;
      case "plan":
        return `
CURRENT AGENT PHASE: PLAN

Break the user's objective into concrete executable steps.

Prefer existing project structures.
Avoid unnecessary changes.
The plan must lead to actual tool execution when tools are required.
`;

      case "understand":
        return `
CURRENT AGENT PHASE: UNDERSTAND

Understand the user's exact objective, constraints, and expected final state.

If the task is actionable, proceed toward execution rather than giving a tutorial.
`;

      case "complete":
        return `
The task has passed its required completion checks.
Return a concise factual result based only on the evidence collected.
`;

      default:
        return "";
    }
  }

  /* ==========================================================================
   * TOOL SELECTION
   * ======================================================================== */

  private getToolsForPhase(
    state: AgentState,
  ): AIToolDefinition[] {
    const plan = state.plan;

    /*
     * preferredToolGroups is the plan's source of truth. Previously this
     * method rebuilt groups from phase flags and fell back to ["general"]
     * whenever needsRoblox was true but requiresInspection/build/testing
     * were false (or the phase was understand/execute). That hid every
     * Roblox MCP tool — including roblox_list_roblox_studios — behind
     * get_system_info, even for operational Studio requests.
     *
     * capability === "chat" must not hide Roblox tools when needsRoblox.
     */
    const groups = new Set<ToolGroup>(plan.preferredToolGroups);

    if (plan.needsRoblox) {
      groups.add("roblox-inspection");

      if (plan.requiresBuild) {
        groups.add("roblox-building");
        groups.add("roblox-execution");
      }

      if (
        plan.requiresTesting ||
        plan.requiresVerification ||
        state.phase === "test" ||
        state.phase === "verify"
      ) {
        groups.add("roblox-execution");
      }

      groups.delete("general");
    }

    if (plan.needsFiles) {
      groups.add("filesystem");
    }

    if (plan.needsTerminal) {
      groups.add("terminal");
    }

    if (groups.size === 0) {
      groups.add("general");
    }

    const definitions =
      this.tools.getAIDefinitions(
        [...groups],
        {
          includeDescriptions: true,

          sort: true,

          maxTools: 64,
        },
      );

    if (
      state.phase === "verify"
    ) {
      return definitions.filter(
        (definition) => {
          const name =
            definition.function.name
              .toLowerCase();

          return (
            !name.includes(
              "create",
            ) &&
            !name.includes(
              "delete",
            ) &&
            !name.includes(
              "destroy",
            ) &&
            !name.includes(
              "remove",
            ) &&
            !name.includes(
              "modify",
            ) &&
            !name.includes(
              "update",
            ) &&
            !name.includes(
              "set_",
            ) &&
            !name.includes(
              "move_",
            ) &&
            !name.includes(
              "rename_",
            )
          );
        },
      );
    }

    return definitions;
  }

  /* ==========================================================================
   * TOOL EXECUTION
   * ======================================================================== */

  private async executeToolCalls(
    state: AgentState,
    toolCalls: AIToolCall[],
  ): Promise<void> {
    for (
      const toolCall of toolCalls
    ) {
      if (
        state.totalToolCalls >=
        MAX_TOTAL_TOOL_CALLS
      ) {
        break;
      }

      const name =
        toolCall.function.name;

      const input =
        (toolCall.function.arguments ??
          {}) as Record<
          string,
          unknown
        >;

      state.totalToolCalls++;

      const executionId =
        crypto.randomUUID();

      const startedAt =
        new Date().toISOString();

      this.printToolCall(
        name,
        input,
        state.phase,
      );

      if (
        !this.tools.has(name)
      ) {
        const error =
          `Unknown tool: ${name}`;

        this.recordToolFailure(
          state,
          executionId,
          name,
          input,
          error,
          startedAt,
        );

        state.messages.push({
          role: "tool",

          content:
            JSON.stringify({
              success: false,

              error,
            }),

          toolCallId:
            toolCall.id,
        });

        continue;
      }

      /*
       * Block a verbatim repeat of a call that already failed with the
       * exact same MODEL-PROVIDED arguments (pre-injection). This is
       * generic — it applies to any tool, not a specific one.
       */
      const signature =
        `${name}:${this.stableStringify(
          input,
        )}`;

      if (
        state.failedCallSignatures.has(
          signature,
        )
      ) {
        const error =
          `Tool "${name}" was blocked because it already failed with these exact same arguments. Do not repeat a failed call unchanged — use a discovery tool to obtain any missing/incorrect value, then retry with corrected arguments.`;

        this.recordToolFailure(
          state,
          executionId,
          name,
          input,
          error,
          startedAt,
        );

        state.messages.push({
          role: "tool",

          content:
            JSON.stringify({
              success: false,

              error,

              blocked:
                "duplicate-failed-call",
            }),

          toolCallId:
            toolCall.id,
        });

        continue;
      }

      /*
       * Hard safety gate for an explicit, UNSCOPED "do not modify/
       * build/change anything" instruction. Independent of intent
       * classification (requiresBuild) so it still holds even if that
       * classification is ever wrong — the user's explicit words are
       * the final authority here, not a keyword heuristic. A scoped
       * protection (plan.protectedTargets) does NOT trigger this gate
       * — see the system prompt for how that's surfaced instead.
       */
      if (
        state.plan.explicitReadOnly &&
        (
          this.tools.getGroup(name) ===
            "roblox-building" ||
          this.tools.isDestructiveTool(
            name,
          ) ||
          name === "write_file"
        )
      ) {
        const error =
          `Tool "${name}" was blocked because the user explicitly requested no modifications ("do not modify anything" or equivalent).`;

        this.recordToolFailure(
          state,
          executionId,
          name,
          input,
          error,
          startedAt,
        );

        state.messages.push({
          role: "tool",

          content:
            JSON.stringify({
              success: false,

              error,

              blocked:
                "explicit-read-only-policy",
            }),

          toolCallId:
            toolCall.id,
        });

        continue;
      }

      if (
        this.tools.isDestructiveTool(
          name,
        ) &&
        !state.plan.destructiveRequested
      ) {
        const error =
          `Destructive tool "${name}" was blocked because the user's request did not explicitly authorize destructive changes.`;

        this.recordToolFailure(
          state,
          executionId,
          name,
          input,
          error,
          startedAt,
        );

        state.messages.push({
          role: "tool",

          content:
            JSON.stringify({
              success: false,

              error,

              blocked:
                "destructive-operation-policy",
            }),

          toolCallId:
            toolCall.id,
        });

        continue;
      }

      /*
       * ------------------------------------------------------------
       * NORMALIZE + EXECUTE, WITH ONE STALE-SESSION RETRY
       * ------------------------------------------------------------
       */

      const attempt =
        await this.executeWithStaleRecovery(
          state,
          name,
          input,
        );

      const result = attempt.result;

      const finishedAt =
        new Date().toISOString();

      const execution: ToolExecution =
        {
          id: executionId,

          /*
           * Stored as the model's original request for readability in
           * execution history / evidence text; the actually-executed,
           * normalized arguments are logged separately (see
           * printNormalizedArguments) and used for the real call.
           */
          name,

          input,

          success:
            result.success,

          data:
            result.data,

          error:
            result.error,

          iteration:
            state.iterations,

          phase:
            state.phase,

          startedAt,

          finishedAt,
        };

      state.executedTools.push(
        execution,
      );

      if (
        result.success
      ) {
        state.consecutiveFailures = 0;
      } else {
        state.consecutiveFailures++;

        state.failedCallSignatures.add(
          signature,
        );
      }

      const serialized =
        this.serializeToolResult(
          result,
        );

      state.messages.push({
        role: "tool",

        content:
          serialized,

        toolCallId:
          toolCall.id,
        });

      this.printToolResult(
        name,
        result,
      );

      if (
        state.consecutiveFailures >=
        MAX_CONSECUTIVE_FAILURES
      ) {
        state.phase =
          "debug";

        state.messages.push({
          role: "user",

          content: `
Multiple tool executions have failed consecutively.

Do not repeat the same operation blindly.

Switch to diagnosis:
1. Inspect the current state.
2. Determine why the operation failed.
3. Choose a different or corrected approach.
4. Retry only after understanding the failure.
`,
        });

        break;
      }
    }
  }

  /**
   * Normalize (auto-inject studio_id) and execute a tool call, with ONE
   * automatic stale-session recovery: when a Roblox tool fails because
   * the cached studio session went stale, invalidate the context,
   * rediscover the studio deterministically, and retry once against the
   * freshly resolved studio_id.
   *
   * Shared by BOTH the main execution loop and the verification engine so
   * a stale session mid-task (or during post-build verification) cannot
   * turn a perfectly good build into a false failure. Returns the final
   * ToolResult plus logging metadata.
   */
  private async executeWithStaleRecovery(
    state: AgentState,
    name: string,
    modelInput: Record<string, unknown>,
  ): Promise<{
    result: ToolResult;

    executedInput: Record<string, unknown>;

    studioIdInjected: boolean;

    staleRecoveryAttempted: boolean;

    staleRecoverySucceeded: boolean;
  }> {
    const discoveryToolName =
      this.findStudioDiscoveryToolName();

    const firstAttempt =
      this.normalizeToolArguments(
        name,
        modelInput,
        state,
      );

    let executedInput: Record<
      string,
      unknown
    > = firstAttempt.normalized;

    let studioIdInjected =
      firstAttempt.studioIdInjected;

    this.printNormalizedArguments(
      name,
      modelInput,
      executedInput,
      studioIdInjected,
    );

    let result =
      await this.tools.execute(
        name,
        executedInput,
        {
          sessionId:
            this.sessionId,
        },
      );

    let staleRecoveryAttempted = false;
    let staleRecoverySucceeded =
      false;

    const isRobloxTool =
      (
        this.tools.getGroup(
          name,
        ) ?? ""
      ).startsWith("roblox");

    if (
      !result.success &&
      isRobloxTool &&
      name !== discoveryToolName &&
      looksLikeStaleStudioError(
        result.error,
      )
    ) {
      staleRecoveryAttempted = true;

      this.printStaleStudioRecoveryAttempt(
        name,
        result.error,
      );

      state.studioContext = {
        status: "unresolved",
      };

      await this.ensureRobloxStudioContext(
        state,
      );

      if (
        state.studioContext
          .status ===
          "resolved" &&
        state.studioContext.studioId
      ) {
        const retryAttempt =
          this.normalizeToolArguments(
            name,
            modelInput,
            state,
          );

        executedInput =
          retryAttempt.normalized;

        studioIdInjected =
          retryAttempt.studioIdInjected;

        result =
          await this.tools.execute(
            name,
            executedInput,
            {
              sessionId:
                this.sessionId,
            },
          );

        staleRecoverySucceeded =
          result.success;
      }

      this.printStaleStudioRecoveryResult(
        staleRecoverySucceeded,
      );
    }

    return {
      result,
      executedInput,
      studioIdInjected,
      staleRecoveryAttempted,
      staleRecoverySucceeded,
    };
  }

  private recordToolFailure(
    state: AgentState,
    executionId: string,
    name: string,
    input: unknown,
    error: string,
    startedAt: string,
  ): void {
    state.failedCallSignatures.add(
      `${name}:${this.stableStringify(
        input,
      )}`,
    );

    state.executedTools.push({
      id: executionId,

      name,

      input,

      success: false,

      error,

      iteration:
        state.iterations,

      phase:
        state.phase,

      startedAt,

      finishedAt:
        new Date().toISOString(),
    });

    state.consecutiveFailures++;

    state.errors.push({
      phase:
        state.phase,

      message:
        error,

      tool:
        name,

      recoverable: true,

      timestamp:
        new Date().toISOString(),
    });

    this.printToolResult(
      name,
      {
        success: false,
        error,
      },
    );
  }

  /* ==========================================================================
   * VERIFICATION ENGINE
   * ======================================================================== */

  private async verifyTask(
    state: AgentState,
    provider: AIProvider,
    model: string,
  ): Promise<VerificationState> {
    state.verification.attempted =
      true;

    const verificationTools =
      this.tools.getAIDefinitions(
        [
          "roblox-inspection",
          "roblox-execution",
        ],
        {
          includeDescriptions: true,

          sort: true,

          maxTools: 40,
        },
      );

    if (
      verificationTools.length === 0
    ) {
      return {
        required: true,

        attempted: true,

        passed: false,

        checks: [],

        evidence: [],

        reason:
          "No Roblox verification tools are available.",
      };
    }

    const verificationMessages:
      AIMessage[] = [
        {
          role: "system",

          content: `
You are the verification engine for an autonomous Roblox development agent.

You are NOT a normal chatbot.

Your job is to actually accomplish the user's objective using the tools available to you.

==================================================
CORE RULES
==================================================

1. ACT, DON'T JUST EXPLAIN.
   If a tool can perform the requested operation, use it.

2. NEVER FAKE TOOL CALLS.
   JSON written inside assistant content is not a tool call.

3. NEVER CLAIM SUCCESS WITHOUT EVIDENCE.
   Creating a file is not proof that Roblox changed.
   A successful create operation is not automatically proof of final functionality.
   A model's own statement is never sufficient evidence.

4. INSPECT BEFORE SIGNIFICANT CHANGES.
   Understand existing project structure before modifying it.

5. AVOID DUPLICATES.
   Reuse appropriate existing objects/systems when possible.

6. PREFER ROBLOX TOOLS FOR ROBLOX WORK.
   Filesystem operations are not a substitute for changing Roblox Studio.

7. TEST WHEN RUNTIME BEHAVIOR MATTERS.

8. VERIFY BEFORE FINISHING.
   Required success criteria must have concrete supporting evidence.

9. RECOVER FROM FAILURES.
   Diagnose tool errors instead of repeating the same failed operation blindly.

10. MAKE THE SMALLEST SAFE CHANGE.
    Do not restructure unrelated parts of the project.

==================================================
ROBLOX RULES
==================================================

For Roblox tasks:

- Roblox Studio is the target environment.
- Use inspection tools to understand the current state.
- Use building tools to make actual Studio changes.
- Use execution/playtest tools to validate behavior.
- Use output/error tools to diagnose runtime failures.
- Never assume an object exists.
- Never assume a script executed correctly.
- Never confuse source code on disk with live Roblox state.
- studio_id is handled automatically by the runtime — you do not need
  to discover, remember, or pass it yourself.

==================================================
DESTRUCTIVE OPERATIONS
==================================================

Destructive operations include deleting, destroying, wiping, clearing, resetting, replacing, or shutting down project content.

Only perform destructive operations when the user's request clearly authorizes them.

Do not interpret a general request such as "build X" as permission to delete unrelated content.

==================================================
CURRENT TASK
==================================================

Intent:
${state.plan.intent}

Capability:
${state.plan.capability}

Objective:
${state.plan.objective}

Needs Roblox:
${state.plan.needsRoblox}

Needs Build:
${state.plan.requiresBuild}

Needs Testing:
${state.plan.requiresTesting}

Needs Verification:
${state.plan.requiresVerification}

Needs Files:
${state.plan.needsFiles}

Needs Terminal:
${state.plan.needsTerminal}

Explicit Read-Only (do not modify/build/create anything):
${state.plan.explicitReadOnly}
${
  state.plan.protectedTargets.length >
  0
    ? `\nProtected (do not modify, everything else is allowed):\n${state.plan.protectedTargets
        .map(
          (target) => `- ${target}`,
        )
        .join("\n")}\n`
    : ""
}
Roblox Studio Context:
${this.describeStudioContext(
  state,
)}

==================================================
SUCCESS CRITERIA
==================================================

${state.plan.successCriteria
  .map(
    (criterion) =>
      `- ${criterion.required ? "[REQUIRED]" : "[OPTIONAL]"} ${criterion.id}: ${criterion.description}`,
  )
  .join("\n")}

==================================================
ALREADY ESTABLISHED IN THIS SESSION
==================================================

The main agent already ran the following tool calls before reaching
verification. Their results are real evidence — reuse concrete values
(such as IDs) from them instead of re-deriving or re-guessing. Only
call a tool again if the current state may genuinely have changed
since it ran.

${
  state.executedTools.filter(
    (execution) => execution.success,
  ).length > 0
    ? state.executedTools
        .filter(
          (execution) =>
            execution.success,
        )
        .map(
          (execution) =>
            `- ${execution.name} → ${this.summarizeEvidence(
              execution.data,
            )}`,
        )
        .join("\n")
    : "(no successful tool calls yet)"
}

==================================================
EXECUTION STRATEGY
==================================================

Follow this lifecycle when appropriate:

UNDERSTAND
→ INSPECT
→ PLAN
→ BUILD
→ EXECUTE
→ TEST
→ DEBUG
→ VERIFY
→ COMPLETE

Do not skip verification merely because the last tool returned success.

Do not provide a tutorial unless the user explicitly asks for instructions.

If the requested task is possible with available tools, perform it.
`,
        },

        {
          role: "user",

          content:
            "Verify the task now, using the already-established results above wherever they are still sufficient.",
        },
      ];

    const firstResponse =
      await provider.chat({
        model,

        messages:
          verificationMessages,

        temperature: 0,

        stream: false,

        tools:
          verificationTools,
      });

    const firstMessage =
      firstResponse.message;

    const calls =
      firstMessage.toolCalls ??
      [];

    const evidence: string[] =
      state.executedTools
        .filter(
          (execution) =>
            execution.success,
        )
        .map(
          (execution) =>
            `${execution.name}: ${this.summarizeEvidence(execution.data)}`,
        );

    const sourceTools: string[] =
      state.executedTools
        .filter(
          (execution) =>
            execution.success,
        )
        .map(
          (execution) =>
            execution.name,
        );

    for (
      const toolCall of calls
    ) {
      const toolName =
        toolCall.function.name;

      if (
        !verificationTools.some(
          (definition) =>
            definition.function.name ===
            toolName,
        )
      ) {
        continue;
      }

      const rawArgs =
        (toolCall.function
          .arguments ??
          {}) as Record<
          string,
          unknown
        >;

      /*
       * Same normalization + single stale-session retry the main loop
       * uses. Without it, an inspection tool that hits a stale cached
       * studio session during post-build verification would surface as a
       * false "FAILED" and sink an otherwise successful build.
       */
      const attempt =
        await this.executeWithStaleRecovery(
          state,
          toolName,
          rawArgs,
        );

      const result = attempt.result;

      sourceTools.push(
        toolName,
      );

      if (
        result.success
      ) {
        evidence.push(
          `${toolName}: ${this.summarizeEvidence(result.data)}`,
        );

        state.executedTools.push({
          id: crypto.randomUUID(),
          name: toolName,
          input: rawArgs,
          success: true,
          data: result.data,
          iteration: state.iterations,
          phase: "verify",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        });
      } else {
        evidence.push(
          `${toolName}: FAILED - ${this.truncate(
            result.error ??
              "Unknown error",
            2000,
          )}`,
        );
      }

      verificationMessages.push({
        role: "assistant",

        content:
          firstMessage.content ??
          "",

        toolCalls: [
          toolCall,
        ],
      });

      verificationMessages.push({
        role: "tool",

        content:
          this.serializeToolResult(
            result,
          ),

        toolCallId:
          toolCall.id,
      });
    }

    let finalResponse =
      firstResponse;

    if (
      calls.length > 0
    ) {
      finalResponse =
        await provider.chat({
          model,

          messages:
            verificationMessages,

          temperature: 0,

          stream: false,

          tools:
            verificationTools,
        });
    }

    const finalContent =
      finalResponse.message.content
        ?.trim() ?? "";

    const checks =
      this.extractVerificationChecks(
        state,
        finalContent,
        evidence,
        sourceTools,
      );

    const requiredCriteria =
      state.plan.successCriteria.filter(
        (criterion) =>
          criterion.required,
      );

    const missingCriteria =
      requiredCriteria.filter(
        (criterion) =>
          !checks.some(
            (check) =>
              check.id ===
                criterion.id &&
              check.passed,
          ),
      );

    const postBuildMissing =
      state.plan.requiresBuild &&
      !this.hasPostBuildInspection(state);

    const passed =
      !postBuildMissing &&
      (requiredCriteria.length > 0
        ? missingCriteria.length === 0 &&
          this.hasConcreteEvidence(evidence)
        : this.interpretVerificationWithEvidence(
            finalContent,
            evidence,
          ));

    const reason = postBuildMissing
      ? "VERIFICATION_FAILED: A successful create/execute is not enough. Inspect Studio after the change and confirm the requested object exists."
      : passed
        ? "All required completion criteria have concrete supporting evidence."
        : missingCriteria.length > 0
          ? `VERIFICATION_FAILED: Missing or unproven criteria: ${missingCriteria
              .map((criterion) => criterion.id)
              .join(", ")}`
          : finalContent ||
            "VERIFICATION_FAILED: Verification did not produce sufficient evidence.";

    return {
      required: true,

      attempted: true,

      passed,

      checks,

      evidence,

      reason,
    };
  }

  private extractVerificationChecks(
    state: AgentState,
    content: string,
    evidence: string[],
    sourceTools: string[],
  ): VerificationCheck[] {
    const normalized =
      content.toLowerCase();

    return state.plan.successCriteria.map(
      (criterion) => {
        const relevantEvidence =
          evidence.filter(
            (item) =>
              this.evidenceRelevantToCriterion(
                item,
                criterion,
              ),
          );

        const textClaimsSuccess =
          this.textClaimsCriterionPassed(
            normalized,
            criterion,
          );

        const passed =
          relevantEvidence.length > 0 &&
          textClaimsSuccess;

        return {
          id:
            criterion.id,

          description:
            criterion.description,

          passed,

          evidence:
            relevantEvidence,

          sourceTools,
        };
      },
    );
  }

  private evidenceRelevantToCriterion(
    evidence: string,
    criterion: SuccessCriterion,
  ): boolean {
    const lowered =
      `${evidence} ${criterion.description}`
        .toLowerCase();

    if (
      /: failed/i.test(evidence) ||
      lowered.includes(
        "failed -",
      ) ||
      lowered.includes("no data")
    ) {
      return false;
    }

    const toolName = this.evidenceToolName(
      evidence,
    );

    if (!toolName) {
      return false;
    }

    const group =
      this.tools.getGroup(
        toolName,
      );

    if (!group) {
      return false;
    }

    const expectedGroups =
      this.groupsForCriterion(
        criterion,
      );

    if (
      expectedGroups.length > 0 &&
      !expectedGroups.includes(group)
    ) {
      return false;
    }

    return true;
  }

  private evidenceToolName(
    evidence: string,
  ): string | undefined {
    const match =
      evidence.match(
        /^([a-z0-9_-]+)\s*:\s*/i,
      );

    return match?.[1];
  }

  private groupsForCriterion(
    criterion: SuccessCriterion,
  ): ToolGroup[] {
    switch (
      criterion.id
    ) {
      case "roblox-state":
        return [
          "roblox-inspection",
        ];

      case "runtime":
        return [
          "roblox-execution",
        ];

      case "files":
        return [
          "filesystem",
        ];

      case "commands":
        return [
          "terminal",
        ];

      case "objective":
      default:
        return [];
    }
  }

  private textClaimsCriterionPassed(
    normalizedContent: string,
    criterion: SuccessCriterion,
  ): boolean {
    const id =
      criterion.id.toLowerCase();

    const description =
      criterion.description.toLowerCase();

    const relevant =
      normalizedContent.includes(id) ||
      normalizedContent.includes(
        description,
      );

    if (
      relevant &&
      VERIFY_FAILURE_TERMS.some((term) =>
        normalizedContent.includes(term),
      )
    ) {
      return false;
    }

    return (
      relevant ||
      VERIFY_SUCCESS_TERMS.some((term) =>
        normalizedContent.includes(term),
      )
    );
  }

  private hasConcreteEvidence(
    evidence: string[],
  ): boolean {
    return evidence.some(
      (item) => {
        const lowered = item.toLowerCase();

        return (
          item.trim().length > 0 &&
          !lowered.includes("failed") &&
          !VERIFY_FAILURE_TERMS.some((term) =>
            lowered.includes(term),
          )
        );
      },
    );
  }

  private interpretVerificationWithEvidence(
    content: string,
    evidence: string[],
  ): boolean {
    if (
      !this.hasConcreteEvidence(
        evidence,
      )
    ) {
      return false;
    }

    const normalized =
      content.toLowerCase();

    if (
      VERIFY_FAILURE_TERMS.some((term) =>
        normalized.includes(term),
      )
    ) {
      return false;
    }

    return VERIFY_SUCCESS_TERMS.some((term) =>
      normalized.includes(term),
    );
  }

  /* ==========================================================================
   * COMPLETION / RECOVERY
   * ======================================================================== */

  private requiresEvidenceBeforeCompletion(
    state: AgentState,
  ): boolean {
    return (
      state.plan.requiresVerification ||
      state.plan.requiresBuild ||
      state.plan.requiresTesting
    );
  }

  /**
   * General, plan-driven check for whether the task's own required
   * categories (inspection/build/testing/verification) actually have
   * evidence yet — independent of which specific tool the model chose.
   * This is what closes the gap where a plan with
   * requiresVerification=false (e.g. a pure inspection task) had no
   * gate at all preventing completion right after a single failed
   * tool call and an empty model response.
   *
   * Reuses the existing hasInspectionEvidence/hasBuildEvidence/
   * hasTestingEvidence checks — no new evidence logic, no tool-specific
   * reasoning.
   */
  private getUnsatisfiedRequirements(
    state: AgentState,
  ): string[] {
    const unsatisfied: string[] = [];

    if (
      state.plan.requiresInspection &&
      !this.hasInspectionEvidence(
        state,
      )
    ) {
      unsatisfied.push(
        "inspection evidence (no successful inspection tool call yet)",
      );
    }

    if (
      state.plan.requiresBuild &&
      !this.hasBuildEvidence(state)
    ) {
      unsatisfied.push(
        "build evidence (no successful build tool call yet)",
      );
    }

    if (
      state.plan.requiresBuild &&
      this.hasBuildEvidence(state) &&
      !this.hasPostBuildInspection(state)
    ) {
      unsatisfied.push(
        "build verification (created object has not been inspected in Studio)",
      );
    }

    if (
      state.plan.requiresTesting &&
      !this.hasTestingEvidence(
        state,
      )
    ) {
      unsatisfied.push(
        "testing evidence (no successful runtime test yet)",
      );
    }

    return unsatisfied;
  }

  private hasPotentiallyCompletedWork(
    state: AgentState,
  ): boolean {
    return (
      state.executedTools.length >
      0
    );
  }

  private hasInspectionEvidence(
    state: AgentState,
  ): boolean {
    return state.executedTools.some(
      (execution) =>
        execution.success &&
        execution.name
          .toLowerCase()
          .match(
            /inspect|find|get|list|read|search|tree|output|error/,
          ) !== null,
    );
  }

  private hasBuildEvidence(
    state: AgentState,
  ): boolean {
    return state.executedTools.some(
      (execution) =>
        execution.success &&
        this.isBuildEvidenceTool(execution.name),
    );
  }

  private isBuildEvidenceTool(name: string): boolean {
    const group = this.tools.getGroup(name);

    if (group === "roblox-building") {
      return true;
    }

    const lower = name.toLowerCase();

    if (
      /create|build|insert|modify|update|set_|move_|clone_|duplicate_/.test(
        lower,
      )
    ) {
      return true;
    }

    /*
     * Official Studio MCP often mutates via execute_luau / generate_*
     * rather than a dedicated create_part tool.
     */
    return (
      lower.includes("execute_luau") ||
      lower.includes("execute_code") ||
      lower.includes("run_luau") ||
      lower.includes("generate_procedural") ||
      lower.includes("generate_mesh")
    );
  }

  private hasPostBuildInspection(
    state: AgentState,
  ): boolean {
    let lastBuildIndex = -1;

    for (let index = 0; index < state.executedTools.length; index++) {
      const execution = state.executedTools[index];

      if (
        execution.success &&
        this.isBuildEvidenceTool(execution.name)
      ) {
        lastBuildIndex = index;
      }
    }

    if (lastBuildIndex < 0) {
      return false;
    }

    return state.executedTools
      .slice(lastBuildIndex + 1)
      .some(
        (execution) =>
          execution.success &&
          this.tools.getGroup(execution.name) === "roblox-inspection" &&
          !isStudioDiscoveryTool(execution.name),
      );
  }

  private hasTestingEvidence(
    state: AgentState,
  ): boolean {
    return state.executedTools.some(
      (execution) =>
        execution.success &&
        (
          this.tools.getGroup(
            execution.name,
          ) ===
            "roblox-execution" ||
          execution.name
            .toLowerCase()
            .match(
              /playtest|test|run_game|start_play|get_output|get_errors/,
            ) !== null
        ),
    );
  }

  private buildRecoveryMessage(
    state: AgentState,
    verification: VerificationState,
  ): string {
    return `
VERIFICATION FAILED.

Reason:
${verification.reason}

Evidence collected:
${verification.evidence.join("\n") || "No usable evidence."}

Required success criteria:
${state.plan.successCriteria
  .filter(
    (criterion) =>
      criterion.required,
  )
  .map(
    (criterion) =>
      `- ${criterion.id}: ${criterion.description}`,
  )
  .join("\n")}

Do not claim completion.

Recover autonomously:
1. Inspect the current state.
2. Identify exactly what is missing or incorrect.
3. Make the smallest safe correction.
4. Test it when necessary.
5. Verify it again.

Do not repeat a failed operation without diagnosing why it failed.
`;
  }

  private buildSuccessfulResponse(
    state: AgentState,
    fallbackContent: string,
  ): string {
    const criteria =
      state.plan.successCriteria
        .filter(
          (criterion) =>
            criterion.required,
        )
        .map(
          (criterion) => {
            const check =
              state.verification.checks.find(
                (item) =>
                  item.id ===
                  criterion.id,
              );

            return check?.passed
              ? `✓ ${criterion.description}`
              : `✗ ${criterion.description}`;
          },
        );

    if (
      criteria.length === 0
    ) {
      return (
        fallbackContent ||
        "Task completed and verified."
      );
    }

    return `
Task completed and verified.

${criteria.join("\n")}
`;
  }

  private buildFailureResponse(
    state: AgentState,
  ): string {
    const failedTools =
      state.executedTools
        .filter(
          (execution) =>
            !execution.success,
        )
        .map(
          (execution) =>
            execution.name,
        );

    const uniqueFailedTools =
      [...new Set(
        failedTools,
      )];

    const reason =
      state.studioContext.status ===
        "unavailable" &&
      state.studioContext.error
        ? state.studioContext.error
        : state.verification.reason ||
          state.errors.at(-1)
            ?.message ||
          "Insufficient evidence.";

    return `
I could not honestly verify that the requested task was completed.

Reason:
${this.truncate(
  reason,
  MAX_ERROR_CHARS,
)}
${
  uniqueFailedTools.length > 0
    ? `\nFailed tools: ${uniqueFailedTools.join(", ")}`
    : ""
}

No completion claim was made because the required result was not sufficiently verified.
`;
  }

  private fail(
    state: AgentState,
    reason: string,
    recoverable: boolean,
  ): void {
    state.failed = true;

    state.phase = "failed";

    state.errors.push({
      phase:
        state.phase,

      message:
        reason,

      recoverable,

      timestamp:
        new Date().toISOString(),
    });
  }

  /* ==========================================================================
   * INTENT DETECTION
   *
   * These are now FALLBACK hints only.
   * The execution engine does not trust them as
   * proof of completion.
   * ======================================================================== */

  private detectCapability(
  message: string,
): ModelCapability {
  const normalized = message.toLowerCase();

  if (this.detectDebuggingIntent(normalized)) {
    return "debugging";
  }

  if (this.detectBuildIntent(normalized)) {
    return "coding";
  }

  if (this.detectPlanningIntent(normalized)) {
    return "planning";
  }

  if (this.detectAnalysisIntent(normalized)) {
    return "analysis";
  }

  if (this.detectTestingIntent(normalized)) {
    return "analysis";
  }

  if (this.detectInspectionIntent(normalized)) {
    return "analysis";
  }

  return "chat";
}

  private detectRobloxIntent(
    text: string,
  ): boolean {
    const patterns = [
      "roblox",
      "roblox studio",
      "studio",
      "workspace",
      "player",
      "character",
      "npc",
      "gui",
      "screen gui",
      "startergui",
      "serverscriptservice",
      "replicatedstorage",
      "serverstorage",
      "localscript",
      "local script",
      "luau",
      "lua",
      "remoteevent",
      "remote event",
      "remotefunction",
      "remote function",
      "terrain",
      "gamepass",
      "obby",
      "part",
      "model",
      "instance",
      "spawn",
    ];

    const buildVerbs = [
      "build ",
      "create ",
      "make ",
      "add ",
      "generate ",
      "construct ",
      "place ",
      "spawn ",
      "insert ",
      "modify ",
      "change ",
      "update ",
      "design ",
    ];

    return (
      patterns.some(
        (pattern) =>
          text.includes(pattern),
      ) ||
      buildVerbs.some(
        (verb) =>
          text.startsWith(verb),
      )
    );
  }

  private detectBuildIntent(
    text: string,
  ): boolean {
    const patterns = [
      "build ",
      "create ",
      "make ",
      "add ",
      "generate ",
      "construct ",
      "place ",
      "spawn ",
      "insert ",
      "modify ",
      "change ",
      "update ",
      "design ",
      "implement ",
      "setup ",
      "set up ",
      "implement a system",
      "create a system",
      "build a system",
    ];

    return patterns.some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  private detectTestingIntent(
    text: string,
  ): boolean {
    const patterns = [
      "test",
      "playtest",
      "play test",
      "run the game",
      "run game",
      "start game",
      "start play",
      "stop play",
      "test the game",
      "check if it works",
      "does it work",
      "verify",
      "validate",
    ];

    return patterns.some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  private detectDebuggingIntent(
    text: string,
  ): boolean {
    const patterns = [
      "fix",
      "debug",
      "bug",
      "error",
      "broken",
      "not working",
      "doesn't work",
      "doesnt work",
      "failed",
      "failure",
      "issue",
      "problem",
      "repair",
      "crash",
      "exception",
    ];

    return patterns.some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  private detectInspectionIntent(
    text: string,
  ): boolean {
    const patterns = [
      "inspect",
      "check",
      "look at",
      "find",
      "search",
      "show me",
      "what exists",
      "review",
      "analyze the current",
      "existing structure",
    ];

    return patterns.some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  private detectPlanningIntent(
    text: string,
  ): boolean {
    return [
      "plan",
      "roadmap",
      "architecture",
      "design the system",
      "how should we structure",
    ].some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  private detectAnalysisIntent(
    text: string,
  ): boolean {
    return [
      "analyze",
      "analyse",
      "analysis",
      "review",
      "evaluate",
      "explain",
    ].some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  private detectFileIntent(
    text: string,
  ): boolean {
    const patterns = [
      "file",
      "folder",
      "directory",
      "filesystem",
      "source code",
      "package.json",
      "tsconfig",
      ".ts",
      ".js",
      ".lua",
      "write code",
      "edit code",
      "read code",
    ];

    return patterns.some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  private detectTerminalIntent(
    text: string,
  ): boolean {
    const patterns = [
      "run command",
      "terminal",
      "powershell",
      "npm ",
      "node ",
      "git ",
      "install ",
      "execute command",
      "shell",
    ];

    return patterns.some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  private detectDestructiveIntent(
    text: string,
  ): boolean {
    const patterns = [
      "delete",
      "destroy",
      "remove",
      "wipe",
      "clear",
      "purge",
      "reset",
      "shutdown",
      "replace everything",
      "replace all",
      "start over",
      "remove all",
      "delete all",
      "destroy all",
    ];

    return patterns.some(
      (pattern) =>
        text.includes(pattern),
    );
  }

  /* ==========================================================================
   * INITIAL PROMPT
   * ======================================================================== */

  private createInitialMessages(
    state: AgentState,
  ): AIMessage[] {
    return [
      {
        role: "system",

        content:
          this.buildSystemPrompt(
            state,
          ),
      },

      {
        role: "user",

        content:
          state.task.userMessage,
      },
    ];
  }

  private buildSystemPrompt(
    state: AgentState,
  ): string {
    return `
You are an autonomous software engineering agent operating a local Roblox development environment.

You are NOT a normal chatbot.

Your job is to actually accomplish the user's objective using the tools available to you.

==================================================
CORE RULES
==================================================

1. ACT, DON'T JUST EXPLAIN.
   If a tool can perform the requested operation, use it.

2. NEVER FAKE TOOL CALLS.
   JSON written inside assistant content is not a tool call.

3. NEVER CLAIM SUCCESS WITHOUT EVIDENCE.
   Creating a file is not proof that Roblox changed.
   A successful create operation is not automatically proof of final functionality.
   A model's own statement is never sufficient evidence.

4. INSPECT BEFORE SIGNIFICANT CHANGES.
   Understand existing project structure before modifying it.

5. AVOID DUPLICATES.
   Reuse appropriate existing objects/systems when possible.

6. PREFER ROBLOX TOOLS FOR ROBLOX WORK.
   Filesystem operations are not a substitute for changing Roblox Studio.

7. TEST WHEN RUNTIME BEHAVIOR MATTERS.

8. VERIFY BEFORE FINISHING.
   Required success criteria must have concrete supporting evidence.

9. RECOVER FROM FAILURES.
   Diagnose tool errors instead of repeating the same failed operation blindly.

10. MAKE THE SMALLEST SAFE CHANGE.
    Do not restructure unrelated parts of the project.

==================================================
ROBLOX STUDIO SESSION
==================================================

studio_id is resolved and supplied automatically by the runtime for
Roblox tools that need it. Call Roblox tools without worrying about
studio_id — you do not need to discover it, remember it, or pass it
yourself. If a Roblox tool still fails, the failure is about something
else (bad arguments, the operation itself, etc.), not a missing
session.

Current status: ${this.describeStudioContext(state)}

==================================================
ROBLOX RULES
==================================================

For Roblox tasks:

- Roblox Studio is the target environment.
- Use inspection tools to understand the current state.
- Use building tools to make actual Studio changes.
- Use execution/playtest tools to validate behavior.
- Use output/error tools to diagnose runtime failures.
- Never assume an object exists.
- Never assume a script executed correctly.
- Never confuse source code on disk with live Roblox state.

${
  state.memoryRecall &&
  state.memoryRecall.entries.length > 0
    ? `
==================================================
PROJECT MEMORY CONTEXT
==================================================
${buildMemoryPrompt(
  state.memoryRecall.entries,
  state.memoryRecall.query,
)}
`
    : ""
}
==================================================
DESTRUCTIVE OPERATIONS
==================================================

Destructive operations include deleting, destroying, wiping, clearing, resetting, replacing, or shutting down project content.

Only perform destructive operations when the user's request clearly authorizes them.

Do not interpret a general request such as "build X" as permission to delete unrelated content.

==================================================
CURRENT TASK
==================================================

Intent:
${state.plan.intent}

Capability:
${state.plan.capability}

Objective:
${state.plan.objective}

Needs Roblox:
${state.plan.needsRoblox}

Needs Build:
${state.plan.requiresBuild}

Needs Testing:
${state.plan.requiresTesting}

Needs Verification:
${state.plan.requiresVerification}

Needs Files:
${state.plan.needsFiles}

Needs Terminal:
${state.plan.needsTerminal}

Explicit Read-Only (do not modify/build/create anything):
${state.plan.explicitReadOnly}
${
  state.plan.protectedTargets.length >
  0
    ? `\nProtected (do not modify, everything else is allowed):\n${state.plan.protectedTargets
        .map(
          (target) => `- ${target}`,
        )
        .join("\n")}\n`
    : ""
}
${
  state.plan.refinementMode
    ? `
==================================================
REFINEMENT MODE — IMPROVE AN EXISTING ARTIFACT
==================================================

The user is referring to an artifact that ALREADY EXISTS in the project.

Hard rules:

1. NEVER create a duplicate of the referenced artifact.
2. Inspect first to locate it; never guess blindly.
3. Change only what the user asked to improve. Preserve everything
   else, including existing behavior, unless the user explicitly asked
   to change that behavior.
4. If you cannot identify the exact target after inspecting, ASK which
   artifact was meant instead of acting on a guess.
`
    : ""
}
${
  state.plan.semanticRequest
    ? `
==================================================
SELECTED SKILL & CONSTRAINTS
==================================================

Selected skill: ${state.plan.selectedSkills?.primary.name ?? "general-chat"}
Skill description: ${state.plan.selectedSkills?.primary.description ?? "none"}

User language:
${state.plan.semanticRequest.language}

Reply in the language the user wrote in (Arabic replies to Arabic and
mixed requests).

Constraints:
${
  state.plan.semanticRequest.constraints.length > 0
    ? state.plan.semanticRequest.constraints
        .map((constraint) => `- ${constraint.label}`)
        .join("\n")
    : "- None."
}

Planning guidance (follow it):
${
  state.plan.selectedSkills &&
  state.plan.selectedSkills.primary.planningGuidance.length > 0
    ? state.plan.selectedSkills.primary.planningGuidance
        .map((guidance) => `- ${guidance}`)
        .join("\n")
    : "- None."
}
`
    : ""
}
==================================================
SUCCESS CRITERIA
==================================================

${state.plan.successCriteria
  .map(
    (criterion) =>
      `- ${criterion.required ? "[REQUIRED]" : "[OPTIONAL]"} ${criterion.id}: ${criterion.description}`,
  )
  .join("\n")}

==================================================
EXECUTION STRATEGY
==================================================

Follow this lifecycle when appropriate:

UNDERSTAND
→ INSPECT
→ PLAN
→ BUILD
→ EXECUTE
→ TEST
→ DEBUG
→ VERIFY
→ COMPLETE

Do not skip verification merely because the last tool returned success.

Do not provide a tutorial unless the user explicitly asks for instructions.

If the requested task is possible with available tools, perform it.
`;
  }

  /* ==========================================================================
   * UTILITIES
   * ======================================================================== */

  private describeStudioContext(
    state: AgentState,
  ): string {
    const context =
      state.studioContext;

    switch (context.status) {
      case "not-needed":
        return "Not needed for this task.";

      case "resolved":
        return `Resolved — studio_id=${context.studioId}${
          context.studioName
            ? ` (${context.studioName})`
            : ""
        }.`;

      case "unavailable":
        return `Unavailable — ${
          context.error ??
          "unknown reason"
        }`;

      case "unresolved":
      default:
        return "Not yet resolved.";
    }
  }

  private serializeToolResult(
    result: {
      success: boolean;

      data?: unknown;

      error?: string;
    },
  ): string {
    const payload = {
      success:
        result.success,

      data:
        result.data,

      error:
        result.error,
    };

    let serialized =
      JSON.stringify(
        payload,
        null,
        2,
      );

    if (
      serialized.length >
      MAX_TOOL_RESULT_CHARS
    ) {
      serialized =
        serialized.slice(
          0,
          MAX_TOOL_RESULT_CHARS,
        ) +
        "\n...[tool result truncated]";
    }

    return serialized;
  }

  private summarizeEvidence(
    data: unknown,
  ): string {
    if (
      data === undefined ||
      data === null
    ) {
      return "tool returned success with no data";
    }

    if (
      typeof data === "string"
    ) {
      return this.truncate(
        data,
        2500,
      );
    }

    try {
      return this.truncate(
        JSON.stringify(data),
        2500,
      );
    } catch {
      return String(data);
    }
  }

  private trimMessageHistory(
    state: AgentState,
  ): void {
    if (
      state.messages.length <=
      MAX_HISTORY_MESSAGES
    ) {
      return;
    }

    const systemMessages =
      state.messages.filter(
        (message) =>
          message.role ===
          "system",
      );

    const nonSystemMessages =
      state.messages.filter(
        (message) =>
          message.role !==
          "system",
      );

    const keep =
      MAX_HISTORY_MESSAGES -
      systemMessages.length;

    state.messages = [
      ...systemMessages.slice(
        0,
        1,
      ),

      ...nonSystemMessages.slice(
        -keep,
      ),
    ];
  }

  /**
   * Deterministic JSON.stringify (object keys sorted) so the same
   * logical arguments always produce the same failed-call signature,
   * regardless of key order.
   */
  private stableStringify(
    value: unknown,
  ): string {
    const sort = (
      input: unknown,
    ): unknown => {
      if (
        Array.isArray(input)
      ) {
        return input.map(sort);
      }

      if (
        input &&
        typeof input === "object"
      ) {
        return Object.keys(
          input as Record<
            string,
            unknown
          >,
        )
          .sort()
          .reduce(
            (
              accumulator: Record<
                string,
                unknown
              >,
              key,
            ) => {
              accumulator[key] =
                sort(
                  (
                    input as Record<
                      string,
                      unknown
                    >
                  )[key],
                );

              return accumulator;
            },
            {},
          );
      }

      return input;
    };

    try {
      return JSON.stringify(
        sort(value),
      );
    } catch {
      return String(value);
    }
  }

  private truncate(
    value: string,
    max: number,
  ): string {
    if (
      value.length <= max
    ) {
      return value;
    }

    return (
      value.slice(
        0,
        max,
      ) +
      "\n...[truncated]"
    );
  }

  private errorMessage(
    error: unknown,
  ): string {
    if (
      error instanceof Error
    ) {
      return error.message;
    }

    return String(error);
  }

  /* ==========================================================================
   * LOGGING
   * ======================================================================== */

  private printTaskHeader(
    state: AgentState,
  ): void {
    console.log(
      `\n🤖 Agent Task: ${state.task.id}`,
    );

    console.log(
      `🎯 Capability: ${state.plan.capability}`,
    );

    console.log(
      `📌 Intent: ${state.plan.intent}`,
    );

    if (state.plan.selectedSkills) {
      console.log(
        `🧠 Skill: ${state.plan.selectedSkills.primary.id} (confidence ${state.plan.selectedSkills.confidence})`,
      );
    }

    if (state.plan.refinementMode) {
      console.log(
        `🔒 REFINEMENT MODE (improve existing artifact — no duplicates)`,
      );
    }

    if (
      state.plan.semanticRequest &&
      state.plan.semanticRequest.target.kind !== "none"
    ) {
      console.log(
        `🎯 Target: ${state.plan.semanticRequest.target.kind} — ${state.plan.semanticRequest.target.label}`,
      );
    }

    console.log(
      `📝 Request: ${state.task.userMessage}`,
    );

    console.log(
      "\n🧭 PLAN",
    );

    console.log(
      JSON.stringify(
        state.plan,
        null,
        2,
      ),
    );
  }

  private printIteration(
    state: AgentState,
  ): void {
    console.log(
      `\n🔄 ITERATION ${state.iterations}/${MAX_ITERATIONS}`,
    );

    console.log(
      `📍 Phase: ${state.phase}`,
    );

    console.log(
      `🔧 Tool calls: ${state.totalToolCalls}/${MAX_TOTAL_TOOL_CALLS}`,
    );
  }

  private printToolScope(
    state: AgentState,
    definitions: AIToolDefinition[],
  ): void {
    const groups =
      new Set<string>();

    for (
      const definition of definitions
    ) {
      const group =
        this.tools.getGroup(
          definition.function.name,
        );

      if (group) {
        groups.add(group);
      }
    }

    console.log(
      `🧰 Scope: ${[...groups].join(", ") || "none"}`,
    );

    console.log(
      `🛠️ Tools exposed: ${definitions.length}`,
    );

    console.log(
      `🛠️ Tool names: ${definitions
        .map((definition) => definition.function.name)
        .join(", ") || "(none)"}`,
    );
  }

  private printToolCall(
    name: string,
    input: unknown,
    phase: AgentPhase,
  ): void {
    console.log(
      `🔧 [${phase}] ${name}`,
    );

    console.log(
      "📥 Model-provided input:",
    );

    console.log(
      JSON.stringify(
        input,
        null,
        2,
      ),
    );
  }

  private printNormalizedArguments(
    name: string,
    original: Record<
      string,
      unknown
    >,
    normalized: Record<
      string,
      unknown
    >,
    studioIdInjected: boolean,
  ): void {
    if (!studioIdInjected) {
      return;
    }

    console.log(
      `🧩 ${name}: studio_id injected automatically`,
    );

    console.log(
      "📤 Executed arguments:",
    );

    console.log(
      JSON.stringify(
        normalized,
        null,
        2,
      ),
    );
  }

  private printStudioContext(
    state: AgentState,
  ): void {
    console.log(
      "\n🎬 ROBLOX CONTEXT",
    );

    console.log(
      `   needsRoblox: ${state.plan.needsRoblox}`,
    );

    console.log(
      `   status: ${state.studioContext.status}`,
    );

    if (state.studioContext.studioId) {
      console.log(
        `   studio_id: ${state.studioContext.studioId}`,
      );

      console.log(
        `   studio_name: ${state.studioContext.studioName ?? "(unnamed)"}`,
      );
    }

    if (
      state.studioContext
        .availableStudios &&
      state.studioContext
        .availableStudios.length > 1
    ) {
      console.log(
        `   available studios: ${state.studioContext.availableStudios.length}`,
      );
    }

    if (state.studioContext.error) {
      console.log(
        `   error: ${state.studioContext.error}`,
      );
    }
  }

  private printStudioDiscoveryAttempt(
    toolName: string,
    result: {
      success: boolean;
      error?: string;
      data?: unknown;
    },
  ): void {
    console.log(
      `\n🔎 Studio discovery via ${toolName}: ${
        result.success
          ? "SUCCESS"
          : "FAILED"
      }`,
    );

    if (!result.success) {
      console.log(
        `   ${result.error}`,
      );
      return;
    }

    console.log(
      `   payload: ${this.truncate(
        this.summarizeEvidence(result.data),
        800,
      )}`,
    );
  }

  private printStaleStudioRecoveryAttempt(
    toolName: string,
    error: string | undefined,
  ): void {
    console.log(
      `\n♻️ Stale Studio session detected for ${toolName}: ${error}`,
    );

    console.log(
      "   Invalidating context and rediscovering...",
    );
  }

  private printStaleStudioRecoveryResult(
    succeeded: boolean,
  ): void {
    console.log(
      `   Retry after rediscovery: ${
        succeeded ? "SUCCESS" : "still failed"
      }`,
    );
  }

  private printToolResult(
    name: string,
    result: {
      success: boolean;

      data?: unknown;

      error?: string;
    },
  ): void {
    console.log(
      `📤 ${name}: ${
        result.success
          ? "SUCCESS"
          : "FAILED"
      }`,
    );

    if (
      result.success
    ) {
      console.log(
        JSON.stringify(
          result.data,
          null,
          2,
        ),
      );
    } else {
      console.error(
        result.error,
      );
    }
  }
}