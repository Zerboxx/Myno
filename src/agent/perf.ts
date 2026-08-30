/*
 * Lightweight, opt-in performance instrumentation.
 *
 * The agent collects NOTHING unless PERF_LOGGING === "1" (or the test
 * harness forces it on). Instrumented runs emit a single [PERF] summary
 * block at task completion with honest measured numbers:
 *
 *   - how many model calls a request actually made (main loop + verify)
 *   - per-call latency and the context payload that was actually sent
 *   - tool-definition bytes, per-call token estimates, peak context
 *
 * All token values are ESTIMATES (chars / 4) because Ollama does not
 * return prompt_eval_count on the streaming path we use. They are
 * labelled as estimates in the report.
 *
 * This module intentionally has zero dependencies on the provider layer.
 */

export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

export function jsonByteSize(value: unknown): number {
  try {
    return Buffer.byteLength(
      JSON.stringify(value),
      "utf8",
    );
  } catch {
    return 0;
  }
}

export interface ModelCallSample {
  phase: string;

  step: "main-loop" | "verify";

  model: string;

  contextLength?: number;

  latencyMs: number;

  inputChars: number;

  outputChars: number;

  toolCount: number;

  toolDefBytes: number;

  startedAt: string;
}

export interface PerfReport {
  taskId: string;

  capability: string;

  startedAt: string;

  finishedAt: string;

  durationMs: number;

  iterations: number;

  totalToolCalls: number;

  memoryRecallMs?: number;

  studioBootstrapMs?: number;

  modelCalls: ModelCallSample[];
}

function estimateMessageChars(
  messages: Array<{
    content?: string;

    thinking?: string;
  }>,
): number {
  let total = 0;

  for (const message of messages) {
    total +=
      message.content?.length ?? 0;

    total +=
      message.thinking?.length ?? 0;
  }

  return total;
}

export class PerfCollector {
  readonly taskId: string;

  readonly capability: string;

  readonly startedAt = new Date().toISOString();

  private readonly startedMs = Date.now();

  private readonly modelCalls: ModelCallSample[] = [];

  private memoryRecallMs: number | undefined;

  private studioBootstrapMs: number | undefined;

  constructor(
    taskId: string,
    capability: string,
  ) {
    this.taskId = taskId;

    this.capability = capability;
  }

  markMemoryRecall(ms: number): void {
    this.memoryRecallMs = ms;
  }

  markStudioBootstrap(ms: number): void {
    this.studioBootstrapMs = ms;
  }

  recordModelCall(
    sample: ModelCallSample,
  ): void {
    this.modelCalls.push(sample);
  }

  recordChat(
    base: {
      phase: string;
      step: "main-loop" | "verify";
      model: string;
      contextLength?: number;
      toolCount: number;
      toolDefBytes: number;
    },
    messages: Array<{
      content?: string;

      thinking?: string;
    }>,
    response: {
      message?: {
        content?: string;

        thinking?: string;

        toolCalls?: unknown[];
      };
    },
    latencyMs: number,
  ): void {
    const responseMessage = response.message;

    const outputChars =
      (responseMessage?.content?.length ?? 0) +
      (responseMessage?.thinking?.length ?? 0) +
      (responseMessage?.toolCalls?.length ?? 0) * 48;

    this.modelCalls.push({
      phase: base.phase,

      step: base.step,

      model: base.model,

      contextLength: base.contextLength,

      latencyMs,

      inputChars:
        estimateMessageChars(messages) +
        base.toolDefBytes,

      outputChars,

      toolCount: base.toolCount,

      toolDefBytes: base.toolDefBytes,

      startedAt: new Date().toISOString(),
    });
  }

  finish(
    iterations: number,
    totalToolCalls: number,
  ): PerfReport {
    return {
      taskId: this.taskId,

      capability: this.capability,

      startedAt: this.startedAt,

      finishedAt: new Date().toISOString(),

      durationMs: Date.now() - this.startedMs,

      iterations,

      totalToolCalls,

      memoryRecallMs: this.memoryRecallMs,

      studioBootstrapMs: this.studioBootstrapMs,

      modelCalls: this.modelCalls,
    };
  }
}

export function renderPerfReport(
  report: PerfReport,
): string {
  const calls = report.modelCalls;

  const totalInputChars = calls.reduce(
    (sum, call) => sum + call.inputChars,
    0,
  );

  const totalOutputChars = calls.reduce(
    (sum, call) => sum + call.outputChars,
    0,
  );

  const totalToolBytes = calls.reduce(
    (sum, call) => sum + call.toolDefBytes,
    0,
  );

  const totalLatencyMs = calls.reduce(
    (sum, call) => sum + call.latencyMs,
    0,
  );

  const peakInputChars = calls.reduce(
    (max, call) => Math.max(max, call.inputChars),
    0,
  );

  const lines: string[] = [];

  lines.push(
    `\n[PERF] task=${report.taskId.slice(0, 8)} capability=${report.capability} duration=${report.durationMs}ms`,
  );

  lines.push(
    `[PERF] model calls=${calls.length} iterations=${report.iterations} tool calls=${report.totalToolCalls}`,
  );

  if (report.memoryRecallMs !== undefined) {
    lines.push(
      `[PERF] memory recall=${report.memoryRecallMs}ms`,
    );
  }

  if (report.studioBootstrapMs !== undefined) {
    lines.push(
      `[PERF] studio bootstrap=${report.studioBootstrapMs}ms`,
    );
  }

  lines.push(
    `[PERF] peak input context approx ${estimateTokens(peakInputChars)} tok (${peakInputChars} ch), avg per call approx ${estimateTokens(totalInputChars / Math.max(1, calls.length))} tok`,
  );

  lines.push(
    `[PERF] total input approx ${estimateTokens(totalInputChars)} tok, output approx ${estimateTokens(totalOutputChars)} tok`,
  );

  lines.push(
    `[PERF] tool defs re-sent ${totalToolBytes} bytes across ${calls.length} calls (${(totalToolBytes / 1024).toFixed(1)} KiB)`,
  );

  lines.push(
    `[PERF] model latency total=${totalLatencyMs}ms avg=${Math.round(totalLatencyMs / Math.max(1, calls.length))}ms`,
  );

  calls.forEach((call, index) => {
    lines.push(
      `[PERF]   #${index + 1} ${call.step}:${call.phase} latency=${call.latencyMs}ms input≈${estimateTokens(call.inputChars)}tok(${call.inputChars}ch) output≈${estimateTokens(call.outputChars)}tok tools=${call.toolCount} defs=${Math.round(call.toolDefBytes / 1024)}KiB model=${call.model}`,
    );
  });

  return lines.join("\n");
}