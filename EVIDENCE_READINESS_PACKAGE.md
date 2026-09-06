# MYNO — P3.6-CERTIFIED Evidence Readiness Package

**Date:** 2026-09-06
**Owner:** P3.6-Certification & Evidence Closure Agent
**Related:** `P3_6_CERTIFICATION_RESULT.md`, `P3_6_CERTIFICATION_FINAL.md`

## 1. Purpose

Every certification blocker that cannot be closed deterministically inside this
repository requires an **Evidence Readiness Package**: the exact environment,
setup, scenarios, inputs, expected outputs, evidence artifacts, and pass/fail
criteria that will turn that blocker into a `PASS` or `FAIL` when the required
environment resource is provided. This document is the single source for all
such packages. Nothing here is a substitute for execution; providing this
package does not move `BLOCKED` to `PASS`.

Blocker classes used throughout:

- **A** — closable in-repo with deterministic tests (no package needed; see
  `P3_6_CERTIFICATION_FINAL.md` §4).
- **B** — requires a real execution environment (Studio, provider, real load).
- **C** — requires a system that does not exist yet (financial, admin plane).
- **D** — requires an explicit architecture/engineering decision upstream.
- **E** — requires evidence reconciliation (freshness/version scoping).

## 2. Blocker → Readiness Matrix

| Blocker | Class | Package required |
| --- | --- | --- |
| C2 mutation-gate artifactSpec coverage | A | — (closed with tests) |
| C3 AUTH-LOCALPLAYER-SERVER spacing/case | A | — (closed with tests) |
| C9 run_command execution path | A | — (closed with tests) |
| C10 mutation-transaction / action-journal | A | — (closed with tests) |
| Real Roblox Studio E2E + runtime evidence | B | §3.1 |
| Live provider reliability/failover evidence | B | §3.2 |
| Real concurrency + resource-exhaustion evidence | B | §3.3 |
| Real rollback/recovery execution | B | §3.4 |
| Coverage-guided fuzzing | B/D | §3.5 |
| Financial/credit/ledger/payment systems | C/D | §3.6 |
| Admin control plane / RBAC / durable audit | C/D | §3.7 |
| Runtime-verification freshness (Track A header) | E | §3.8 |

## 3. Packages

### 3.1 Real Roblox Studio E2E + runtime evidence (B)

**Objective.** Prove that a mutation authorized by the deterministic gate is
actually applied to the real Studio DataModel, observable post-mutation, with
fidelity to the artifactSpec and to the mutation-transaction journal — under a
bounded, budgeted, authorized task.

**Environment**
- Windows host (same host family as `src/desktop/roblox-studio-service.ts` targets).
- Roblox Studio version pinned (record `Build.Version` used).
- DevKit MCP server running and reachable.
- Provider (LLM) key available for the agent execution leg.
- Node.js v24.x (`node --version` recorded), repo at a pinned commit, `npm run build` executed.

**Setup**
1. `npm ci`; `npm run build`; `npx tsc --noEmit` (expect exit 0).
2. Launch Studio with a blank Baseplate place; record Studio PID.
3. Start DevKit MCP; verify tool discovery returns the 29+ `roblox_*` tools.
4. Configure a single bounded task with a small task budget and artifactSpec
   declaring `Workspace/Generated/*`.

**Scenarios (each = one authorized task, fresh Studio state)**
1. Create `Workspace.Generated.Part` (create → inspect → verify committed).
2. Set property on an owned instance (update → inspect → verify + journal entry).
3. Edit a Script's source to a deliberately broken line → expect compile/verify
   failure to be observed, then compensated rollback of the source.
4. Delete an owned instance via `roblox_multi_edit` Delete → verify deletion.
5. Cross-Studio attempt: second Studio ID used → must fail closed with
   authorization denial and an audit record (expect `Authz` deny, no mutation).
6. Over-budget attempt: exhaust task budget mid-task → expect fail-closed stop.

**Inputs / expected outputs.** Each scenario ships a request JSON (tool name,
bound `studio_id`, `file_path`/`path`, args). Expected: tool result `success`,
DataModel tree snapshot after the mutation, gate log line, mutation-transaction
summary (COMMITTED / ROLLED-BACK / ROLLBACK-UNAVAILABLE), journal entry with
LIFO rollback ordering on failure paths.

**Evidence artifacts.** Session transcript (JSONL), pre/post Studio tree
snapshots, timestamps, PID, budget ledger lines, severity of any failure.

**Pass criteria.** All scenarios reach the expected status with matching
artifacts; cross-Studio and budget scenarios fail closed with audit entries.
**Fail criteria.** Any unauthorized mutation succeeds; any authorized mutation
is unobservable post-mutation; rollback claims without observable restoration.

### 3.2 Live provider reliability / failover (B)

**Objective.** Execute the deterministic provider classification under live
transport conditions and verify effective-model truthfulness.

**Environment.** Provider key(s) in env (never committed); network with the
ability to induce 429/5xx/timeout where possible or via provider sandbox.

**Scenarios.** Craft requests that hit: valid 429 with Retry-After, sustained
rate limit, 5xx, transport timeout, malformed/empty model output, then a
fallback-compatible model. Record configured vs effective model per call.

**Evidence.** Provider-health/cost log; backoff timing; terminate-on-quota path.

**Pass.** `classifyHttpFailure` outcome matches the induced condition in every
scenario; effective model is reported truthfully (never the configured model
when fallback ran); no unbounded retry (bounded by `maxAttempts` + cooldown).
**Fail.** Misclassification, unmetered retry, or false effective-model claims.

### 3.3 Concurrency + resource exhaustion (B)

**Objective.** Prove budget/cancel/emergency-stop behavior holds under ≥2
concurrent bounded tasks sharing the Studio bridge and agent loop.

**Scenarios.** (a) Two tasks mutate disjoint artifacts concurrently; (b) one task
monopolizes a per-Studio lease while a second attempts same-target mutation
(stale-state rejection expected); (c) a task loop that exhausts its budget under
retries (fail-closed); (d) watchdog memory growth over 10 minutes with heap
snapshots.

**Pass.** No cross-task mutation, no duplicated/overlapping edits, budgets fail
closed, memory growth bounded by snapshot evidence, emergency-stop honored
in-loop. **Fail.** Any mutation outside the task's own artifactSpec, or any
controlled budget bypass.

### 3.4 Real rollback/recovery execution (B)

**Objective.** After C10 wiring, execute the deterministic rollback primitives
against the live Studio bridge on induced failures.

**Scenarios.** Create-then-fail-execution; script-edit-then-verify-failure;
property-edit-then-reject. Expect compensating `roblox_multi_edit` /
`roblox_set_instance` / `roblox_delete_instance` calls and observable state
restoration. Also: success path → no rollback attempted (journal shows
committed only).

**Pass.** Journal rollback order is strict LIFO; offending tool results prove
restoration in the Studio tree; `rollback-unavailable` is reported honestly
with no fabricated restoration claim.

### 3.5 Coverage-guided fuzzing (B/D)

**Decision required (D):** adopt an instrumentation approach for the Luau
security analyzer (`src/agent/security/analyze.ts`). Options: (a) JS coverage
fuzzer over the compiled analyzer; (b) seeded corpus + mutation engine with
branch-coverage reporting; (c) Luau-language-aware corpus generator.

**Package spec.** Seed corpus = the committed security fixtures plus discovered
bypass variants. Harness = `analyzeArtifacts` + a decorator that classifies
inputs and crashes. Oracle = rule registry; pass = no crash, no false negative
on the known-bypass corpus, observed branch coverage ≥ documented floor (to be
set with the decision), findings stable under shuffling (no order dependence).

**Evidence.** Corpus size, coverage % per rule, triaged "new finding" log,
regression count.

### 3.6 Financial / credit / ledger / payments (C/D)

**Design decision required (D), then system must exist (C).** No financial code
exists today (resource-envelope budgets only). The future subsystem must, per
AGENTS.md §25, be server-authoritative, idempotent, atomic, reconcilable, and
auditable. This package defines the **evidence contract** the subsystem must
meet before certification:

- Idempotent entitlement issuance (replay-safe, duplicates rejected).
- Negative-balance prevention; purchased vs daily/ promotional credits
  distinguishable; authoritative server time for daily credits.
- Authenticated webhooks; refund/chargeback; reconciliation; tamper-resistant
  ledger; race protection; multi-account farming resistance.
- Produces per-operation audit records (who/what/when/why/authz/result).

**Pass** requires all scenarios exercising each contract with a durable ledger
after the mandatory design gate.

### 3.7 Admin control plane / RBAC / durable audit (C/D)

**Design decision required (D), then system must exist (C).** Requires
least-privilege identities, real RBAC, tenant isolation management, external
emergency-stop/kill switch (not in-loop only), durable audit log (not in-memory
events), usage/credit review, provider health/quotas, break-glass, incident and
support tooling. **Pass** = credential/entitlement matrix execution + proof
that emergency stop cannot be overridden by model or agent.

### 3.8 Runtime-verification freshness reconciliation (E)

The dated live probe in `P3_6_RUNTIME_FINAL_REPORT.md` (Studio PID 5548, 29
tools, single `inspect_instance`) is **supporting provenance only** — not fresh,
reproducible evidence. **Reconciliation plan:** re-execute §3.1 scenario 1–2 on
the pinned environment, timestamped, and link the evidence chain
(intent → plan → mutation → observation → verification → decision) for the new
run; supersede the old probe record in the report.

## 4. Execution Ownership

Executing any package requires: explicit user authorization, a bounded task
budget, a fresh pinned reproduction record, and post-run report updates to
`P3_6_CERTIFICATION_FINAL.md`. No package execution implies activation of
`P3.7`. `P3.7 = NOT AUTHORIZED` until the defined P3.6 gate outcome changes
with evidence.