import "dotenv/config";

import type {
  AIMessage,
  AIProvider,
  AIToolCall,
  ChatRequest,
  ChatResponse,
} from "./provider.js";

interface OllamaToolCall {
  id?: string;

  function: {
    index?: number;
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface OllamaMessage {
  role: "assistant" | "user" | "system" | "tool";

  content?: string;

  thinking?: string;

  tool_calls?: OllamaToolCall[];
}

interface OllamaChatResponse {
  model: string;

  message: OllamaMessage;

  done: boolean;

  done_reason?: string;
}

interface OllamaStreamDatum {
  model?: string;

  message?: {
    role?: string;

    content?: string;

    thinking?: string;

    tool_calls?: OllamaToolCall[];
  };

  done?: boolean;

  done_reason?: string;
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";

  private readonly baseUrl: string;

  constructor(
    baseUrl =
      process.env.OLLAMA_BASE_URL ??
      "http://127.0.0.1:11434",
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(
      `${this.baseUrl}/api/tags`,
    );

    if (!response.ok) {
      throw new Error(
        `Ollama listModels failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      models?: Array<{
        name: string;
      }>;
    };

    return (
      data.models?.map(
        (model) => model.name,
      ) ?? []
    );
  }

  async chat(
    request: ChatRequest,
  ): Promise<ChatResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/chat`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: request.model,

          messages: this.toOllamaMessages(
            request.messages,
          ),

          stream: request.stream ?? false,

          tools: request.tools,

          options: {
            temperature:
              request.temperature ?? 0.2,

            num_ctx:
              request.contextLength ?? 32768,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `Ollama chat failed: ${response.status} ${response.statusText}\n${errorText}`,
      );
    }

    if (
      request.stream &&
      request.onToken
    ) {
      return this.readStreamingResponse(
        response,
        request,
      );
    }

    const data =
      (await response.json()) as OllamaChatResponse;

    return this.normalizeResponse(data);
  }

  private async readStreamingResponse(
    response: Response,
    request: ChatRequest,
  ): Promise<ChatResponse> {
    const reader =
      response.body?.getReader();

    if (!reader) {
      throw new Error(
        "Ollama streaming response has no readable body.",
      );
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let toolCalls:
      | OllamaToolCall[]
      | undefined;
    let doneReason:
      | string
      | undefined;

    for (;;) {
      const { done, value } =
        await reader.read();

      if (done) {
        break;
      }

      buffer +=
        decoder.decode(value, {
          stream: true,
        });

      let newline: number;

      while (
        (newline = buffer.indexOf("\n")) !==
        -1
      ) {
        const line =
          buffer
            .slice(0, newline)
            .trim();

        buffer = buffer.slice(newline + 1);

        if (!line) {
          continue;
        }

        let datum: OllamaStreamDatum;

        try {
          datum =
            JSON.parse(line) as OllamaStreamDatum;
        } catch {
          continue;
        }

        const delta =
          datum.message?.content;

        if (
          typeof delta === "string" &&
          delta.length > 0
        ) {
          fullContent += delta;

          request.onToken?.(delta);
        }

        if (
          datum.message?.tool_calls &&
          datum.message.tool_calls.length > 0
        ) {
          toolCalls =
            datum.message.tool_calls;
        }

        if (
          datum.done === true
        ) {
          doneReason =
            datum.done_reason;
        }
      }
    }

    return this.normalizeResponse({
      model: request.model,

      message: {
        role: "assistant",

        content: fullContent,

        tool_calls: toolCalls,
      },

      done: true,

      done_reason: doneReason,
    });
  }

  private normalizeResponse(
    data: OllamaChatResponse,
  ): ChatResponse {
    const message: AIMessage = {
      role: data.message.role,

      content:
        data.message.content ?? "",

      thinking:
        data.message.thinking,
    };

    /*
     * ---------------------------------------------------------------
     * PRIMARY PATH
     * Native Ollama tool calls.
     * ---------------------------------------------------------------
     */
    if (
      data.message.tool_calls &&
      data.message.tool_calls.length > 0
    ) {
      message.toolCalls =
        data.message.tool_calls.map(
          (
            toolCall,
            index,
          ): AIToolCall => ({
            id:
              toolCall.id ??
              `ollama-call-${index}`,

            type: "function",

            function: {
              index:
                toolCall.function.index,

              name:
                toolCall.function.name,

              arguments:
                toolCall.function.arguments ?? {},
            },
          }),
        );
    }

    /*
     * ---------------------------------------------------------------
     * FALLBACK PATH
     *
     * Some smaller/local models occasionally output a tool call as
     * JSON inside normal message content instead of Ollama's native
     * tool_calls field.
     *
     * Example:
     *
     * {
     *   "name": "roblox_execute_luau",
     *   "arguments": {
     *     "code": "..."
     *   }
     * }
     *
     * Convert that into a real AIToolCall so the agent loop can
     * execute it normally.
     * ---------------------------------------------------------------
     */
    if (
      (!message.toolCalls ||
        message.toolCalls.length === 0) &&
      message.content
    ) {
      const fallbackToolCalls =
        this.extractToolCallsFromContent(
          message.content,
        );

      if (
        fallbackToolCalls &&
        fallbackToolCalls.length > 0
      ) {
        message.toolCalls =
          fallbackToolCalls;

        /*
         * Clear the raw JSON from the visible assistant response.
         * The agent loop should treat this as a tool call, not text.
         */
        message.content = "";
      }
    }

    return {
      model: data.model,

      message,

      done: data.done,

      done_reason:
        data.done_reason,
    };
  }

  /*
   * -----------------------------------------------------------------
   * TOOL CALL CONTENT FALLBACK PARSER
   * -----------------------------------------------------------------
   *
   * Attempts to detect tool calls emitted as JSON text.
   *
   * Supported formats:
   *
   * 1.
   * {
   *   "name": "tool_name",
   *   "arguments": {}
   * }
   *
   * 2.
   * [
   *   {
   *     "name": "tool_one",
   *     "arguments": {}
   *   },
   *   {
   *     "name": "tool_two",
   *     "arguments": {}
   *   }
   * ]
   *
   * 3.
   * ```json
   * {
   *   "name": "tool_name",
   *   "arguments": {}
   * }
   * ```
   */
  private extractToolCallsFromContent(
    content: string,
  ): AIToolCall[] | undefined {
    if (
      !content ||
      typeof content !== "string"
    ) {
      return undefined;
    }

    const trimmed =
      content.trim();

    /*
     * Remove markdown JSON fences if the model used them.
     */
    const cleaned =
      this.removeMarkdownCodeFence(
        trimmed,
      );

    /*
     * ---------------------------------------------------------------
     * ATTEMPT 1
     * Parse the entire response as JSON.
     * ---------------------------------------------------------------
     */
    const directResult =
      this.parseToolCallJSON(
        cleaned,
      );

    if (
      directResult &&
      directResult.length > 0
    ) {
      return directResult;
    }

    /*
     * ---------------------------------------------------------------
     * ATTEMPT 2
     * Find a JSON object embedded inside normal text.
     * ---------------------------------------------------------------
     */
    const objectMatch =
      cleaned.match(
        /\{[\s\S]*\}/,
      );

    if (objectMatch) {
      const result =
        this.parseToolCallJSON(
          objectMatch[0],
        );

      if (
        result &&
        result.length > 0
      ) {
        return result;
      }
    }

    /*
     * ---------------------------------------------------------------
     * ATTEMPT 3
     * Find a JSON array embedded inside normal text.
     * ---------------------------------------------------------------
     */
    const arrayMatch =
      cleaned.match(
        /\[[\s\S]*\]/,
      );

    if (arrayMatch) {
      const result =
        this.parseToolCallJSON(
          arrayMatch[0],
        );

      if (
        result &&
        result.length > 0
      ) {
        return result;
      }
    }

    return undefined;
  }

  /*
   * Parse JSON and determine whether it represents one or more
   * tool calls.
   */
  private parseToolCallJSON(
    json: string,
  ): AIToolCall[] | undefined {
    try {
      const parsed:
        unknown = JSON.parse(json);

      /*
       * Single tool call.
       */
      if (
        this.isToolCallObject(
          parsed,
        )
      ) {
        return [
          this.createFallbackToolCall(
            parsed,
            0,
          ),
        ];
      }

      /*
       * Multiple tool calls.
       */
      if (
        Array.isArray(parsed)
      ) {
        const calls =
          parsed
            .filter(
              (
                item,
              ) =>
                this.isToolCallObject(
                  item,
                ),
            )
            .map(
              (
                item,
                index,
              ) =>
                this.createFallbackToolCall(
                  item,
                  index,
                ),
            );

        if (
          calls.length > 0
        ) {
          return calls;
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /*
   * Check whether an unknown JSON value looks like:
   *
   * {
   *   name: string,
   *   arguments?: object
   * }
   */
  private isToolCallObject(
    value: unknown,
  ): value is {
    id?: unknown;
    name: unknown;
    arguments?: unknown;
  } {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return false;
    }

    const object =
      value as Record<
        string,
        unknown
      >;

    return (
      typeof object.name ===
      "string"
    );
  }

  /*
   * Convert fallback JSON into our internal AIToolCall format.
   */
  private createFallbackToolCall(
    value: {
      id?: unknown;
      name: unknown;
      arguments?: unknown;
    },
    index: number,
  ): AIToolCall {
    const argumentsValue =
      value.arguments;

    const safeArguments =
      argumentsValue &&
      typeof argumentsValue ===
        "object" &&
      !Array.isArray(
        argumentsValue,
      )
        ? (
            argumentsValue as Record<
              string,
              unknown
            >
          )
        : {};

    return {
      id:
        typeof value.id === "string"
          ? value.id
          : `content-tool-call-${index}`,

      type: "function",

      function: {
        name:
          value.name as string,

        arguments:
          safeArguments,
      },
    };
  }

  /*
   * Remove:
   *
   * ```json
   * {...}
   * ```
   *
   * or:
   *
   * ```
   * {...}
   * ```
   */
  private removeMarkdownCodeFence(
    content: string,
  ): string {
    const match =
      content.match(
        /^```(?:json)?\s*([\s\S]*?)\s*```$/i,
      );

    if (match?.[1]) {
      return match[1].trim();
    }

    return content;
  }

  private toOllamaMessages(
    messages: AIMessage[],
  ): unknown[] {
    return messages.map(
      (message) => {
        const result: Record<
          string,
          unknown
        > = {
          role: message.role,

          content:
            message.content,
        };

        if (
          message.thinking
        ) {
          result.thinking =
            message.thinking;
        }

        if (
          message.toolCallId
        ) {
          result.tool_call_id =
            message.toolCallId;
        }

        if (
          message.toolCalls &&
          message.toolCalls.length > 0
        ) {
          result.tool_calls =
            message.toolCalls.map(
              (
                toolCall,
              ) => ({
                id:
                  toolCall.id,

                type:
                  "function",

                function: {
                  index:
                    toolCall.function
                      .index,

                  name:
                    toolCall.function
                      .name,

                  arguments:
                    toolCall.function
                      .arguments,
                },
              }),
            );
        }

        return result;
      },
    );
  }
}