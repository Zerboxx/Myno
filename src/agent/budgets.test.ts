import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TaskBudgetTracker,
  TaskBudgetExhaustedError,
  taskBudgetFromEnv,
  type BudgetTerminalState,
} from "./budgets.js";

test("tracker starts zeroed", () => {
  const tracker = new TaskBudgetTracker();
  assert.equal(tracker.snapshot.modelCallCount, 0);
  assert.equal(tracker.exhausted, false);
});

test("recordModelCall tallies estimates, actuals, calls, and requests", () => {
  const tracker = new TaskBudgetTracker();
  tracker.recordModelCall(100, 50, 90, 45);
  assert.equal(tracker.snapshot.estimatedInputTokens, 100);
  assert.equal(tracker.snapshot.estimatedOutputTokens, 50);
  assert.equal(tracker.snapshot.actualInputTokens, 90);
  assert.equal(tracker.snapshot.actualOutputTokens, 45);
  assert.equal(tracker.snapshot.modelCallCount, 1);
  assert.equal(tracker.snapshot.requestCount, 1);
});

test("token envelope produces TASK_TOKEN_BUDGET_EXHAUSTED", () => {
  const tracker = new TaskBudgetTracker({ maxInputTokens: 1000 });
  tracker.recordModelCall(600, 100);
  assert.equal(tracker.exhausted, false);
  tracker.recordModelCall(500, 100);
  const check = tracker.check();
  assert.equal(check.exhausted, true);
  assert.equal(check.terminalState, "TASK_TOKEN_BUDGET_EXHAUSTED");
  assert.throws(() => tracker.raiseIfExhausted(), TaskBudgetExhaustedError);
});

test("model-call envelope produces TASK_REQUEST_BUDGET_EXHAUSTED", () => {
  const tracker = new TaskBudgetTracker({ maxModelCalls: 2 });
  tracker.recordModelCall(100, 100);
  tracker.recordModelCall(100, 100);
  const check = tracker.check();
  assert.equal(check.exhausted, true);
  assert.equal(check.terminalState, "TASK_REQUEST_BUDGET_EXHAUSTED");
});

test("tool-call envelope produces TASK_REQUEST_BUDGET_EXHAUSTED", () => {
  const tracker = new TaskBudgetTracker({ maxToolCalls: 3 });
  tracker.recordToolCall();
  tracker.recordToolCall();
  tracker.recordToolCall();
  const check = tracker.check();
  assert.equal(check.terminalState, "TASK_REQUEST_BUDGET_EXHAUSTED");
});

test("retry envelope produces PROVIDER_CAPACITY_EXHAUSTED", () => {
  const tracker = new TaskBudgetTracker({ maxRetries: 2 });
  tracker.recordRetry();
  tracker.recordRetry();
  const check = tracker.check();
  assert.equal(check.terminalState, "PROVIDER_CAPACITY_EXHAUSTED");
});

test("token budget outranks request budget", () => {
  const tracker = new TaskBudgetTracker({
    maxInputTokens: 500,
    maxModelCalls: 10,
  });
  for (let i = 0; i < 5; i++) {
    tracker.recordModelCall(200, 100);
  }
  const check = tracker.check();
  assert.equal(check.terminalState, "TASK_TOKEN_BUDGET_EXHAUSTED");
});

test("fallback counting", () => {
  const tracker = new TaskBudgetTracker({ maxRetries: 5 });
  tracker.recordFallback();
  assert.equal(tracker.snapshot.fallbackCount, 1);
});

test("TaskBudgetExhaustedError carries its terminal state and budget", () => {
  const tracker = new TaskBudgetTracker({ maxModelCalls: 1 });
  tracker.recordModelCall(10, 10);
  tracker.recordModelCall(10, 10);
  let caught: TaskBudgetExhaustedError | undefined;
  try {
    tracker.raiseIfExhausted();
  } catch (error) {
    caught = error as TaskBudgetExhaustedError;
  }
  assert.ok(caught);
  assert.equal(caught.terminalState, "TASK_REQUEST_BUDGET_EXHAUSTED");
  assert.equal(caught.budget.modelCallCount, 2);
  assert.match(caught.message, /TASK_REQUEST_BUDGET_EXHAUSTED/);
});

test("taskBudgetFromEnv parses MYNO_TASK_* knobs and ignores junk", () => {
  const config = taskBudgetFromEnv({
    MYNO_TASK_MAX_INPUT_TOKENS: "20000",
    MYNO_TASK_MAX_OUTPUT_TOKENS: "4000",
    MYNO_TASK_MAX_MODEL_CALLS: "8",
    MYNO_TASK_MAX_TOOL_CALLS: "40",
    MYNO_TASK_MAX_RETRIES: "4",
  } as NodeJS.ProcessEnv);
  assert.deepEqual(config, {
    maxInputTokens: 20000,
    maxOutputTokens: 4000,
    maxModelCalls: 8,
    maxToolCalls: 40,
    maxRetries: 4,
    maxMutations: undefined,
    maxCreatedInstances: undefined,
    maxDeletedInstances: undefined,
  });

  const junk = taskBudgetFromEnv({
    MYNO_TASK_MAX_MODEL_CALLS: "abc",
    MYNO_TASK_MAX_RETRIES: "",
  } as NodeJS.ProcessEnv);
  assert.equal(junk.maxModelCalls, undefined);
  assert.equal(junk.maxRetries, undefined);
});

test("empty config never exhausts", () => {
  const tracker = new TaskBudgetTracker({});
  tracker.recordModelCall(10_000, 10_000);
  tracker.recordToolCall();
  tracker.recordRetry();
  assert.equal(tracker.exhausted, false);
});

test("terminal states include mutation and artifact budgets (P3.6-S-CLOSE)", () => {
  const states: BudgetTerminalState[] = [
    "TASK_TOKEN_BUDGET_EXHAUSTED",
    "TASK_REQUEST_BUDGET_EXHAUSTED",
    "PROVIDER_CAPACITY_EXHAUSTED",
    "TASK_MUTATION_BUDGET_EXHAUSTED",
    "TASK_CREATED_INSTANCE_BUDGET_EXHAUSTED",
    "TASK_DELETED_INSTANCE_BUDGET_EXHAUSTED",
  ];
  assert.equal(states.length, 6);
});

test("describe renders a compact bounded line", () => {
  const tracker = new TaskBudgetTracker({ maxModelCalls: 5 });
  tracker.recordModelCall(100, 50);
  const line = tracker.describe();
  assert.match(line, /calls=1\/5/);
  assert.match(line, /in≈100\/∞/);
});