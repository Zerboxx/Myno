import type { AIMessage } from "../providers/provider.js";

export function truncate(
  value: string,
  max: number,
): string {
  if (value.length <= max) {
    return value;
  }

  return (
    value.slice(0, max) +
    "\n...[truncated]"
  );
}

export interface ToolResultLike {
  success: boolean;
  data?: unknown;
  error?: string;
}

export function serializeToolResult(
  result: ToolResultLike,
  maxChars: number,
): string {
  const payload = {
    success: result.success,

    data: result.data,

    error: result.error,
  };

  let serialized =
    JSON.stringify(payload, null, 2);

  if (
    serialized.length >
    maxChars
  ) {
    serialized =
      serialized.slice(
        0,
        maxChars,
      ) +
      "\n...[tool result truncated]";
  }

  return serialized;
}

export function summarizeEvidence(
  data: unknown,
  truncateFn: (
    value: string,
    max: number,
  ) => string = truncate,
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
    return truncateFn(data, 2500);
  }

  try {
    return truncateFn(
      JSON.stringify(data),
      2500,
    );
  } catch {
    return String(data);
  }
}

export function trimToHistory(
  messages: AIMessage[],
  maxTotal: number,
): AIMessage[] {
  if (
    messages.length <=
    maxTotal
  ) {
    return messages;
  }

  const systemMessages =
    messages.filter(
      (message) =>
        message.role ===
        "system",
    );

  const nonSystemMessages =
    messages.filter(
      (message) =>
        message.role !==
        "system",
    );

  const keep =
    maxTotal -
    systemMessages.length;

  return [
    ...systemMessages.slice(
      0,
      1,
    ),

    ...nonSystemMessages.slice(
      -keep,
    ),
  ];
}