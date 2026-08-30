export type AIMessageRole =
  | "system"
  | "user"
  | "assistant"
  | "tool";

export interface AIMessage {
  role: AIMessageRole;

  content: string;

  thinking?: string;

  toolCallId?: string;

  toolCalls?: AIToolCall[];
}

export interface AIToolCall {
  id: string;

  type: "function";

  function: {
    index?: number;

    name: string;

    arguments: Record<string, unknown>;
  };
}

export interface AIToolDefinition {
  type: "function";

  function: {
    name: string;

    description: string;

    parameters: Record<string, unknown>;
  };
}

export interface ChatRequest {
  model: string;

  messages: AIMessage[];

  temperature?: number;

  stream?: boolean;

  tools?: AIToolDefinition[];
}

export interface ChatResponse {
  model: string;

  message: AIMessage;

  done: boolean;

  done_reason?: string;
}

export interface AIProvider {
  readonly name: string;

  listModels(): Promise<string[]>;

  chat(
    request: ChatRequest,
  ): Promise<ChatResponse>;
}