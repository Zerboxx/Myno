import assert from "node:assert/strict";
import test from "node:test";

import {
  estimateTokens,
  jsonByteSize,
  PerfCollector,
  renderPerfReport,
} from "./perf.js";

test("estimateTokens estimates ~1 token per 4 characters", () => {
  assert.equal(estimateTokens(0), 0);
  assert.equal(estimateTokens(4), 1);
  assert.equal(estimateTokens(10), 3);
});

test("jsonByteSize measures the serialized value in UTF-8 bytes", () => {
  assert.ok(jsonByteSize({ a: 1 }) > 0);
  assert.equal(jsonByteSize(undefined), 0);
});

test("PerfCollector records model calls with cumulative stats", () => {
  const collector = new PerfCollector("task-1", "coding");

  collector.recordChat(
    {
      phase: "understand",
      step: "main-loop",
      model: "test-model",
      toolCount: 12,
      toolDefBytes: 2000,
    },
    [
      { content: "hello" },
      { content: " world" },
    ],
    {
      message: {
        content: "ok",
        toolCalls: [{ name: "x" }],
      },
    },
    150,
  );

  const report = collector.finish(4, 5);

  assert.equal(report.taskId, "task-1");
  assert.equal(report.capability, "coding");
  assert.equal(report.iterations, 4);
  assert.equal(report.totalToolCalls, 5);
  assert.equal(report.modelCalls.length, 1);
  assert.equal(report.modelCalls[0].latencyMs, 150);
  assert.equal(report.modelCalls[0].toolCount, 12);
  assert.equal(report.modelCalls[0].toolDefBytes, 2000);
  assert.ok(report.modelCalls[0].inputChars >= 2010);
  assert.ok(report.modelCalls[0].outputChars >= 10);
});

test("PerfCollector records memory and studio milestones", () => {
  const collector = new PerfCollector("task-2", "chat");

  collector.markMemoryRecall(3);
  collector.markStudioBootstrap(400);

  const report = collector.finish(1, 0);

  assert.equal(report.memoryRecallMs, 3);
  assert.equal(report.studioBootstrapMs, 400);
});

test("renderPerfReport renders an honest report with token estimates", () => {
  const collector = new PerfCollector("task-3", "chat");

  collector.recordChat(
    {
      phase: "understand",
      step: "main-loop",
      model: "m",
      toolCount: 5,
      toolDefBytes: 1024,
    },
    [{ content: "x".repeat(4000) }],
    { message: { content: "y".repeat(40) } },
    80,
  );

  const rendered = renderPerfReport(collector.finish(1, 1));

  assert.ok(rendered.includes("[PERF]"));
  assert.ok(rendered.includes("model calls=1"));
  assert.ok(rendered.includes("peak input context approx"));
  assert.match(rendered, /\d+\.\d+ KiB/);
});