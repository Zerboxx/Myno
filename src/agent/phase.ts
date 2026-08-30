import type { AIMessage } from "../providers/provider.js";
import type { AgentPhase } from "./execution-types.js";

/**
 * Risky, repeated prompt-shaping helpers moved out of the agent loop so
 * the phase guidance lives in one testable place.
 */

export function injectPhaseInstruction(
  messages: AIMessage[],
  instruction: string,
): AIMessage[] {
  if (messages.length === 0) {
    return messages;
  }

  const first = messages[0];

  if (first.role !== "system") {
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

export function buildPhaseInstruction(
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