import type { ModelCapability } from "../router/model-router.js";

export interface AgentTask {
  id: string;
  userMessage: string;
  capability: ModelCapability;
  createdAt: string;
}

/**
 * FIX: this file previously declared `AgentResponse` TWICE — once as
 * `{ taskId, content, model, provider }` (the shape `agent.ts` actually
 * uses) and once, immediately after, as a generic
 * `AgentResponse<T> = { success, message?, data?, error? }`. Two
 * interfaces with the same name in one module is a hard TypeScript
 * compile error (duplicate identifier), so nothing importing from this
 * file — including agent.ts — could have compiled as-is.
 *
 * The second declaration's shape is already covered by
 * `AgentExecutionResult` in `agent-types.ts` (the multi-agent
 * scaffold), so it was dead/duplicate content here, not a second type
 * that needed a new name. Removed rather than renamed.
 */
export interface AgentResponse {
  taskId: string;
  content: string;
  model: string;
  provider: string;
  success: boolean;
}