/**
 * Shared types used across the Roblox AI Studio project.
 */

export type JSONPrimitive =
  | string
  | number
  | boolean
  | null;

export type JSONValue =
  | JSONPrimitive
  | JSONObject
  | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONArray = JSONValue[];

/**
 * Generic result returned by async operations.
 */
export interface Result<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Basic message format used by AI providers and agents.
 */
export interface ChatMessage {
  role:
    | "system"
    | "user"
    | "assistant"
    | "tool";

  content: string;

  name?: string;

  toolCallId?: string;
}

/**
 * Represents a tool call requested by a model.
 */
export interface ToolCall {
  id?: string;

  name: string;

  arguments: Record<
    string,
    unknown
  >;
}

/**
 * Result of an AI generation request.
 */
export interface AIResponse {
  content: string;

  toolCalls?: ToolCall[];

  model: string;

  provider: string;

  finishReason?: string;
}

/**
 * Basic task metadata.
 */
export interface TaskMetadata {
  id: string;

  createdAt: number;

  userRequest: string;
}

/**
 * Agent execution response.
 */
export interface AgentResponse {
  content: string;

  model: string;

  provider: string;

  taskId: string;
}