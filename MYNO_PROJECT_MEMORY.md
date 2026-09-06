# MYNO — Project Memory & Engineering Constitution

> Canonical long-term project memory.
> This document is the source of truth for MYNO's vision, architecture, roadmap,
> invariants, security, product direction, engineering philosophy, and
> future-proofing rules.
> Any AI agent, coding agent, engineer, or maintainer MUST read this before
> architectural changes.

---

# 1. WHAT MYNO IS

MYNO is intended to become a **Universal Roblox Engineering Intelligence Platform**.

The target is not "AI that writes Luau".

The target is:

> AI that understands, designs, builds, tests, verifies, repairs, optimizes,
> secures, and evolves complete Roblox systems.

MYNO should eventually understand a Roblox project as a complete engineering
system spanning code, architecture, assets, environment, gameplay, UI/UX,
networking, persistence, testing, performance, security, organization, release,
and live evolution.

The long-term promise is bounded by real capabilities and evidence. "Universal"
means broad technical coverage and extensibility, not a literal guarantee of
solving every possible problem.

---

# 2. ULTIMATE USER EXPERIENCE

A user should eventually be able to describe a technically executable Roblox goal
in natural language.

MYNO should be able to understand intent, extract requirements and constraints,
inspect the existing project, understand architecture, build an Architecture
Graph, decompose the goal, determine ownership/placement/dependencies, create a
mutation plan, enforce policy, implement, test, observe runtime behavior, verify
semantic correctness, diagnose and repair failures, re-test, review architecture
and experience quality, preserve project integrity, report evidence, and persist
useful project memory.

The user should not need to know which script belongs where. MYNO should
understand that.

---

# 3. CORE PRINCIPLE

**LLM proposes. Deterministic systems decide.**

The model may reason, plan, explain, and propose.

Deterministic systems control authorization, placement, mutation scope, Studio
identity, tenant identity, security policy, budgets, tool access, destructive
operations, verification, rollback/recovery, lifecycle, and resource consumption.

The model is never the final security authority.

---

# 4. CANONICAL ENGINEERING PIPELINE

```text
USER REQUEST
  ↓
SEMANTIC INTENT
  ↓
TASK CLASSIFICATION
  ↓
RELEVANT INTELLIGENCE ENGINES
  ↓
RAW INTELLIGENCE
  ↓
DECISION SYNTHESIS
  ↓
ARCHITECTURE GRAPH
  ↓
ARTIFACT DECOMPOSITION
  ↓
PLACEMENT / OWNERSHIP
  ↓
DEPENDENCY + COMMUNICATION GRAPH
  ↓
MUTATION PLAN
  ↓
POLICY / AUTHORIZATION
  ↓
EXECUTION
  ↓
OBSERVATION
  ↓
VERIFICATION
  ↓
SELF-CORRECTION
  ↓
ROLLBACK / RECOVERY WHEN NEEDED
  ↓
GOLDEN ARCHITECTURE REVIEW
  ↓
FINAL ENGINEERING REVIEW
  ↓
EXPERIENCE / LESSONS
  ↓
PERSISTENT PROJECT MEMORY
```

A plan is not execution. Execution is not verification. Verification is not
certification.

---

# 5. ENGINEERING STATES

Keep these states distinct:

`Designed ≠ Implemented ≠ Verified ≠ Certified`

Evidence must identify what state is actually supported.

Never claim full security, rollback, authorization, runtime correctness,
capability, or certification without evidence.

---

# 6. CURRENT ARCHITECTURAL DIRECTION

MYNO is designed around:

- TypeScript / Node.js backend
- Electron desktop shell
- provider abstraction
- Provider Registry
- Provider Gateway
- Model Router
- Reliability Router
- cloud-first inference
- Roblox Studio MCP integration
- autonomous task state machine
- structured plans
- dependency-aware execution
- observation and verification
- recovery
- context engineering
- security lifecycle controls
- Roblox placement intelligence
- Artifact Intelligence
- path normalization
- mutation planning
- artifact contracts
- artifact reconciliation
- TPM preflight/enforcement
- model failover
- action journaling
- metadata-driven skills

The architecture must remain provider-neutral.

Ollama was intentionally removed because local inference caused unacceptable
resource consumption for the target environment.

Current strategy is cloud-first and multi-provider capable. Groq is a current
primary strategy with OpenAI optional; provider selection remains replaceable.

No provider-specific logic should leak deeply into the agent architecture.

---

# 7. FUTURE-PROOFING PRINCIPLE

**Everything we build today is allowed to evolve tomorrow.**

Do not treat today's provider, model, Roblox API, Studio MCP schema, tool
capability, database, payment provider, pricing model, UI, storage format,
artifact representation, game design, or deployment topology as permanent.

Prefer stable interfaces, capability discovery, adapters, versioned contracts,
migrations, deprecation paths, compatibility layers, feature flags, and
replaceable components.

For every important architectural decision, distinguish:

1. stable invariant
2. replaceable implementation
3. versioned contract
4. migration path
5. deprecation path
6. evidence that could justify a future change

Do not over-engineer every hypothetical future. Build extension points where
change is reasonably foreseeable.

---

# 8. MULTI-STUDIO / MULTI-TENANT IDENTITY

Roblox Studio identity is explicit.

**Every Roblox MCP call MUST use the correct `studio_id`.**

There must be no global active-Studio assumption.

Production must model tenant/customer/session identity explicitly. Cross-Studio
and cross-tenant access must fail closed and be auditable.

---

# 9. P3.6-S — UNIVERSAL ROBLOX INTELLIGENCE

Canonical subsystems:

- S.1 Artifact Intelligence
- S.2 Architecture Graph
- S.3 Placement Intelligence
- S.4 Dependency / Communication
- S.5 Architecture Mutation
- S.6 Architecture Verification
- S.7 Systems Engineering
- S.8 Environment / Terrain
- S.9 Asset / Spatial Construction
- S.10 Visual Intelligence
- S.11 Gameplay / Interaction
- S.12 NPC / AI
- S.13 UI / UX
- S.14 Animation / VFX / Audio
- S.15 Data / Persistence
- S.16 Multiplayer / Replication
- S.17 Performance
- S.18 Autonomous Testing
- S.19 Migration / Refactoring
- S.20 Project Hygiene
- S.21 Roblox Security Architecture
- S.22 Design Systems
- S.23 Project Memory / Design Intent
- S.24 Novel / Unknown Problem Solver
- S.25 Golden Architecture / Self-Review

**LEI is cross-cutting P3.6-S capability, not S.26.**

P3.6-S is not a checklist of disconnected features. Each subsystem integrates
with the Architecture Graph, contracts, verification, security, evidence, and
project memory.

---

# 10. S.1 — ARTIFACT INTELLIGENCE

Understand Roblox artifacts semantically, not merely by class name. This includes
scripts, remotes, bindables, folders, models, parts, meshes, attachments, UI,
animation, sound, VFX, terrain, lighting, NPC structures, configuration, data
systems, and future artifact types.

Artifact understanding includes purpose, owner, runtime, lifecycle, placement,
dependencies, security, and verification criteria.

---

# 11. S.2 — ARCHITECTURE GRAPH

The Architecture Graph is the backbone of project understanding.

It represents artifacts, systems, ownership, runtime side, placement,
dependencies, communication, persistence, security boundaries, lifecycle,
responsibilities, contracts, versions, migrations, feature flags, and evidence.

Before high-impact mutations, MYNO should perform change-impact analysis over
the graph.

---

# 12. S.3 — PLACEMENT INTELLIGENCE

Placement is determined by semantic role, runtime ownership, replication,
lifecycle, security, dependencies, and performance.

Typical locations include ServerScriptService, ServerStorage, ReplicatedStorage,
StarterPlayerScripts, StarterCharacterScripts, StarterGui, Workspace, Lighting,
SoundService, Terrain, and other current/future Roblox containers.

Do not blindly use remembered locations when current Roblox behavior or project
architecture requires something else.

---

# 13. S.4 — DEPENDENCY / COMMUNICATION

Understand require relationships, RemoteEvents/RemoteFunctions, Bindables/signals,
listeners, shared/replicated state, service/data/runtime dependencies,
serialization boundaries, Actor/cross-thread communication, and network ownership.

Detect broken dependency direction, cycles, missing contracts, unsafe
communication, and lifecycle hazards before runtime where possible.

---

# 14. S.5 — ARCHITECTURE MUTATION

Mutations are structured plans, not blind edits.

A mutation plan should capture target, operation, owner, scope, preconditions,
dependencies, expected result, risk, policy requirements, verification
requirements, rollback/compensation, idempotency, and concurrency/version
expectations.

---

# 15. S.6 — ARCHITECTURE VERIFICATION

Verification must go beyond "Instance exists".

Verify when applicable artifact, class, location, source, ownership, runtime,
dependencies, communication, lifecycle, security boundary, semantic behavior,
runtime behavior, architecture, performance/resource behavior, and player-facing
result.

Observations must be freshness-aware and scoped to a known project/Studio/version
context.

---

# 16. S.7 — SYSTEMS ENGINEERING

Understand complete systems such as quests, inventory, economy, shops,
progression, combat, spawning, matchmaking, missions, delivery systems, jobs,
rewards, achievements, player profiles, admin systems, social systems, analytics,
telemetry, and live events.

The target is system engineering, not isolated scripts.

---

# 17. S.8 — ENVIRONMENT / TERRAIN

Understand terrain, biomes, roads, zones, buildings, world layout, lighting,
atmosphere, landmarks, navigation spaces, gameplay areas, and streaming-aware
spatial design.

---

# 18. S.9 — ASSET / SPATIAL CONSTRUCTION

Understand models, meshes, procedural structures, props, buildings, roads,
delivery locations, NPC locations, interactables, ownership, purpose, placement,
performance, and asset provenance.

Prefer reusable content primitives over uncontrolled duplication.

---

# 19. S.10 — VISUAL INTELLIGENCE

Reason about composition, visual hierarchy, readability, contrast, color harmony,
lighting, materials, scale consistency, prop density, landmarks, focal points,
repetition/dead space, player guidance, and environmental storytelling.

Use evidence loops such as `BUILD → CAPTURE → CRITIQUE → REPAIR → RE-CAPTURE →
COMPARE → POLISH`.

---

# 20. S.11 — GAMEPLAY / INTERACTION

Core loop:

`INPUT → STATE → ACTION → FEEDBACK → REWARD → PROGRESSION`

Construct and verify interaction systems and their player experience, not just
their code.

---

# 21. S.12 — NPC / AI

Understand NPC state machines, navigation, behavior trees, perception, combat AI,
dialogue, task AI, utility AI, spawning, despawning, performance, and
multiplayer implications.

---

# 22. S.13 — UI / UX

Understand ScreenGui, BillboardGui, SurfaceGui, hierarchy, responsive layouts,
interaction, feedback, accessibility/readability, navigation, design systems,
and device/platform differences.

---

# 23. S.14 — ANIMATION / VFX / AUDIO

Understand animation state, particles, beams, trails, sound, spatial audio, VFX,
timing, readability, and feedback systems.

---

# 24. S.15 — DATA / PERSISTENCE

Understand player profiles, DataStore, MemoryStore, configuration, secrets,
persistence, recovery, schema evolution, migrations, validation, data integrity,
quotas/limits, retries, and concurrency.

Durable state, temporary distributed state, configuration, secrets, and session
memory are different classes and must not be conflated.

Never test destructive persistence behavior against live production data.

---

# 25. S.16 — MULTIPLAYER / REPLICATION

Understand server authority, client authority boundaries, replication, remotes,
validation, rate limits, race conditions, network ownership, serialization,
replication cost, streaming implications, and cross-server state.

Client-originated state changes must be server validated.

---

# 26. S.17 — PERFORMANCE

Reason about memory, CPU, rendering, network, script execution, object count,
replication, streaming, event frequency, allocations, GC, physics, expensive
loops, asset cost, and server/client work.

Performance decisions are evidence-driven: profile → identify bottleneck →
change → measure.

Parallel Luau, Actors, native-code paths, streaming, and future engine features
are capability-dependent options, not permanent assumptions.

---

# 27. S.18 — AUTONOMOUS TESTING

Long-term loop:

`BUILD → RUN → OBSERVE → DIAGNOSE → REPAIR → RE-RUN → REGRESSION CHECK`

MYNO should eventually generate and execute tests, enter Play Mode, inspect
runtime and console output, simulate interactions, capture evidence, diagnose
failures, repair, and re-run.

---

# 28. S.19 — MIGRATION / REFACTORING

Safely handle renaming, moving, restructuring, API migration, architecture
migration, legacy cleanup, dependency updates, schema migrations, and
compatibility transitions.

Refactoring must preserve behavior and include dependency discovery, migration
sequencing, regression verification, and cleanup only after references are
proven migrated.

---

# 29. S.20 — PROJECT HYGIENE

Maintain naming, folder organization, unused artifact detection, duplicate
detection, stale artifact cleanup, documentation, configuration hygiene,
dependency hygiene, and consistent architecture.

---

# 30. S.21 — ROBLOX SECURITY ARCHITECTURE

Security is architectural.

Important areas include client/server trust boundaries, remote validation,
authorization, prompt injection, indirect injection, malicious project content,
malicious tool output, tool abuse, malicious arguments, path traversal, Studio
isolation, tenant isolation, privilege boundaries, secret leakage, context
poisoning, memory poisoning, model manipulation, resource exhaustion,
destructive mutations, verification bypass, stale-state exploitation, and
provider failure abuse.

Security policy must be deterministic and auditable.

---

# 31. S.22 — DESIGN SYSTEMS

MYNO should learn and preserve project style: colors, typography, spacing, UI
patterns, naming, visual language, interaction conventions, world-building
conventions, and asset conventions.

Design systems must be versionable and evolvable.

---

# 32. S.23 — PROJECT MEMORY / DESIGN INTENT

Remember architecture decisions, design decisions, conventions, goals,
constraints, previous failures, successful patterns, intentional exceptions,
compatibility assumptions, migrations, deprecations, and evidence.

Memory must be provenance-aware and must not become an unquestioned source of
truth. Memory can become stale or poisoned and must be validated against current
project/runtime evidence.

---

# 33. S.24 — NOVEL / UNKNOWN PROBLEM SOLVER

Strategy:

`DETECT NOVELTY → DECOMPOSE → SEARCH/RETRIEVE → HYPOTHESIZE → BUILD SMALL EXPERIMENT → OBSERVE → VALIDATE → UPDATE KNOWLEDGE → IMPLEMENT → VERIFY`

Unknown behavior must not be filled with confident invention. Novel solutions
remain bounded by deterministic policy and evidence.

---

# 34. S.25 — GOLDEN ARCHITECTURE / SELF-REVIEW

Before declaring meaningful work complete, review architecture fit, dependency
direction, security, placement, runtime correctness, persistence, performance,
maintainability, extensibility, player experience, project consistency, and
evidence coverage.

The final question is not "does the code run?" but "does the implementation
belong in the project and survive its intended lifecycle?"

---

# 35. LEI — LUAU / ROBLOX ENGINEERING INTELLIGENCE

LEI is cross-cutting P3.6-S capability.

Coverage:

- Luau syntax and semantics
- scope, closures, tables, metatables/metamethods, coroutines, iterators, modules, errors, runtime behavior, coercion, evaluation order
- `--!strict`, inference, annotations, unions/intersections, generics, function/table types, narrowing, casts, structural typing, exported types, evolving type-solver behavior
- Roblox services, Instances, DataModel, Script/LocalScript/ModuleScript, lifecycle, signals, Player/Character lifecycle
- UI, physics, animation, DataStore/MemoryStore/configuration/secrets, networking, replication, streaming, Actors, parallel execution, current engine APIs
- server/client authority and exploit-resistant architecture
- performance and profiling
- syntax/type/runtime/logical/lifecycle/replication/state/memory/performance debugging
- architecture, coupling, cohesion, dependency direction, APIs, extensibility, maintainability, scalability
- security, remote validation, authorization, server authority
- refactoring and migrations
- code review

LEI structure:

`Knowledge → Examples → Anti-patterns → Tests → Challenges → Failure Cases → Benchmarks → Runtime Evidence → Mastery Level`

Target:

`Understand → Design → Generate → Review → Test → Debug → Optimize → Secure → Refactor → Invent`

LEI must know when it may be wrong and seek Studio/runtime evidence.

---

# 36. MYNO MASTERY FRAMEWORK

The **MYNO Mastery Framework** is a cross-cutting capability above individual S
systems.

Every important capability should eventually have:

1. Knowledge
2. Provenance
3. Examples
4. Anti-patterns
5. Tests
6. Failure cases
7. Challenges
8. Benchmarks
9. Runtime evidence
10. Review criteria
11. Confidence
12. Mastery level
13. Known capability gaps
14. Regression corpus

Mastery is demonstrated by repeated correct behavior across new cases, not by
one successful example.

---

# 37. ENGINEERING INTELLIGENCE LAYERS

MYNO's intelligence should remain layered: project understanding, architecture,
implementation, verification, runtime behavior, experience quality, and learning.
No single model output should be treated as a replacement for these layers.

---

# 38. TASK RESOURCE BUDGETS

Task budgets must survive retries and recovery and should cover model calls,
tool calls, runtime, mutations, asset operations, observations, retries,
recovery attempts, concurrency, output size, and provider/financial cost where
applicable.

---

# 39. EMERGENCY STOP

Emergency stop/kill-switch behavior is outside model authority and must fail
closed. It must remain available during autonomous work and recovery.

---

# 40. MUTATION TRANSACTIONS

High-risk changes should be transactional where possible, with explicit target,
scope, preconditions, authorization, bounded execution, observation,
verification, audit, and recoverability.

---

# 41. CURRENT P3.6-S SECURITY/CORRECTNESS LESSONS

Important lessons from P3.6-S work:

- Semantic artifact classification is required.
- Path formats must be normalized.
- Script placement must be deterministic.
- Workspace geometry must not be confused with player UI artifacts.
- Duplicate observation should be controlled.
- Stale artifacts require ownership-aware reconciliation.
- Effective model tracking must be honest.
- TPM reductions must actually affect future requests.
- Verification must be semantic, not structure-only.
- Context freshness must be tracked.
- Context security boundaries must be enforced.
- Unknown tools should fail conservatively.
- Multi-Studio identity must be explicit.
- Destructive mutations require deterministic policy.
- Security evidence must have a canonical registry.
- P3.6-S certification cannot be inferred from subsystem tests alone.

---

# 42. P3.6 STATUS

Previously completed foundations include:

- autonomous agent state machine
- structured planning
- dependency execution
- observation
- verification
- recovery
- cancellation
- action journaling
- provider abstraction
- context engineering
- context security lifecycle
- placement intelligence foundation
- artifact intelligence foundation
- Roblox path normalization
- script placement policy
- mutation plan validation
- artifact contract verification
- artifact reconciliation
- TPM preflight/enforcement
- model failover
- effective model tracking

P3.6 is NOT considered globally certified merely because individual
subsystems pass tests.

Certification must be based on the complete final gate and evidence.

Any prior report that calls a subsystem or partial phase "certified" must not be
interpreted as global P3.6 certification unless the final gate below has actually
been passed and evidenced.

---

# 43. CANONICAL ROADMAP

The agreed complete roadmap is:

P3.6-S
    ↓
Complete S.1 → S.25 + LEI
    ↓
P3.6-R
Runtime Stabilization
    ↓
P3.6-RT
Full Red Team
    ↓
P3.6-CERTIFIED
    ↓
P3.7
Autonomous Execution
    ↓
P3.8
Production Engineering Platform
    ↓
P3.9
Beta Readiness
    ↓
P4.0
Luau + Roblox Mastery
    ↓
PRE-BETA PRODUCTION GATES
    ↓
INTERNAL ALPHA
    ↓
PRIVATE BETA
    ↓
LIMITED CUSTOMER BETA
    ↓
LIVE CUSTOMER BETA
    ↓
STABILIZATION
    ↓
PUBLIC RELEASE DECISION

No later gate may be used to excuse a failed earlier gate.

---

# 44. P3.6-R — RUNTIME STABILIZATION

P3.6-R focuses on:

- runtime correctness
- real Roblox execution
- execution reliability
- MCP reliability
- observation reliability
- verification reliability
- recovery reliability
- resource controls
- concurrency
- cancellation
- Studio lifecycle
- real-world E2E behavior
- stale-state handling
- provider degradation/failover
- queue/backlog behavior

Evidence must include real execution where the capability requires it, not only
mocks or static tests.

---

# 45. P3.6-RT — FULL RED TEAM

P3.6-RT is the hostile security phase for the entire engineering system.

Canonical registry must cover at minimum:

1. Direct prompt injection
2. Indirect prompt injection
3. Malicious project content
4. Malicious tool outputs
5. Tool misuse
6. Malicious tool arguments
7. Path traversal
8. Secret leakage
9. Privilege escalation
10. Authorization bypass
11. Cross-Studio access
12. Tenant isolation failure
13. Destructive operation abuse
14. Verification bypass
15. Budget bypass
16. Retry storms
17. Recovery loops
18. Context poisoning
19. Memory poisoning
20. Stale-state exploitation
21. Provider/model failure abuse
22. Resource exhaustion
23. Payment abuse
24. Credit manipulation
25. Replay attacks
26. Race-condition abuse
27. Multi-account/daily-credit farming
28. Supply-chain/dependency attacks
29. Deployment/update abuse
30. Emergency-stop/rollback bypass

The registry is canonical. Older reports with different vector counts must be
reconciled into this registry rather than treated as separate standards.

Every discovered issue follows:

REPRODUCE
→ CLASSIFY
→ FIX
→ TEST
→ RE-ATTACK
→ PASS / BLOCK

---

# 46. P3.6-CERTIFIED

Certification means the defined P3.6 scope has passed, with evidence:

- correctness tests
- security tests
- runtime tests
- integration tests
- adversarial tests
- build gates
- verification gates
- architecture review
- real Roblox E2E where required
- resource/concurrency controls
- destructive-operation controls
- recovery/rollback evidence where promised
- canonical security registry

Certification is scope-bound.

It does not mean:

"MYNO can never fail."

It means:

"The defined tested system satisfies its defined invariants with the defined
evidence."

---

# 47. P3.7 — AUTONOMOUS EXECUTION

P3.7 begins only after P3.6 certification.

Target:

MYNO can autonomously execute multi-step engineering tasks.

Canonical loop:

UNDERSTAND
→ PLAN
→ BUILD
→ TEST
→ OBSERVE
→ DIAGNOSE
→ REPAIR
→ VERIFY
→ REVIEW
→ COMPLETE

The agent should be able to continue until:

SUCCESS

or

SAFE STOP / HUMAN REVIEW

---

# 48. P3.8 — PRODUCTION ENGINEERING PLATFORM

P3.8 covers production-grade service, deployment, observability, tenancy,
provider reliability, cost controls, admin controls, and operational safety.

Production architecture must remain provider-neutral and auditable.

---

# 49. P3.9 — BETA READINESS

P3.9 prepares MYNO for controlled real-world customer use. It includes
production readiness, customer safety, supportability, economics, scale,
security, and operational evidence.

---

# 50. PRODUCTION SOURCE / IP PROTECTION

Production direction includes least privilege, secret management, dependency
control, vulnerability monitoring, provenance/SBOM where appropriate, secure
builds, controlled releases, environment separation, and deployment auditability.

---

# 51. PAYMENT SECURITY

Payment flows must use server-side verification, authenticated webhooks,
idempotency, reconciliation, duplicate protection, refunds/chargebacks,
atomic entitlement issuance, and auditability.

---

# 52. CREDIT SECURITY

Credits are entitlements and must be protected by authoritative server-side
accounting, atomic debit/credit, replay/race protection, negative-balance
prevention, reconciliation, and auditability.

Daily credits use authoritative server time. Purchased and promotional/daily
credits remain distinguishable.

---

# 53. ANTI-MULTI-ACCOUNT / CREDIT FARMING

Anti-abuse controls must be layered, lawful, privacy-aware, and resilient to
shared devices and false positives. Do not rely on a single fingerprinting
signal.

---

# 54. MULTI-TENANCY / PRIVACY / DATA GOVERNANCE

Customer/project data requires explicit rules for collection, purpose,
retention, deletion, access, export, isolation, backups, logging, support access,
and incident handling.

---

# 55. OBSERVABILITY / SRE

Production systems should maintain structured logs, metrics, traces, task
history, security events, mutation journals, provider health, cost/usage data,
and incident evidence as appropriate.

Observability must avoid leaking secrets or unnecessary customer/project data.

---

# 56. SCALE / LOAD / CONCURRENCY

Production readiness must cover many simultaneous users, burst and sustained
load, concurrent jobs, provider degradation, database/cache pressure, rate
limits, queue/backlog behavior, and recovery.

---

# 57. BETA HARD GATES

## Engineering

- Luau mastery / LEI evaluation
- Roblox architecture
- placement
- dependencies
- runtime execution
- autonomous debugging
- regression
- performance
- multiplayer/replication
- real E2E

## Security

- full-project red team
- injection/tool abuse
- traversal/secret leakage
- authorization and privilege boundaries
- Studio/tenant isolation
- resource exhaustion
- destructive controls
- emergency stop
- rollback/recovery
- payment/credit/account abuse
- supply chain

## Product

- website
- end-user program
- onboarding
- dashboard
- authentication
- UX/error recovery
- support
- usage/credits
- payment
- provider failover
- telemetry/diagnostics
- complete admin control plane

## Infrastructure / Scale

- many simultaneous users
- burst and sustained load
- concurrent jobs
- provider degradation
- database/cache pressure
- rate limits
- queue/backlog behavior
- recovery
- deployment/rollback

## Economy

- real purchases
- real provider/infrastructure costs
- legitimate free-tier optimization
- unit economics
- revenue/margin measurement

## Customer Safety

- deterministic dangerous-operation boundaries
- no uncontrolled destructive mutations
- audit trail
- recoverability
- backup/version strategy

---

# 58. BETA LADDER

`INTERNAL ALPHA → PRIVATE BETA → LIMITED CUSTOMER BETA → LIVE CUSTOMER BETA → STABILIZATION → PUBLIC RELEASE DECISION`

---

# 59. BETA ECONOMIC OPTIMIZATION

During Beta, optimize legitimate free-tier/provider usage where it improves unit
economics without degrading customer experience or system integrity.

Never trade away performance, reliability, security, data integrity,
payment/credit integrity, tenant isolation, or recoverability.

Free tiers are an economic optimization layer, not the sole reliability
foundation.

---

# 60. ADMIN CONTROL PLANE

Production admin tooling must be least-privilege and auditable and may
 eventually manage, as authorized:

- users
- tenants
- sessions
- credits/ledger
- purchases
- refunds
- chargebacks
- usage
- provider health/quotas/costs
- infrastructure health
- security events
- abuse/risk
- rate limits
- feature flags
- emergency stop
- incidents
- audit logs
- support
- controlled emergency operations

---

# 61. PRE-BETA SECURITY SCOPE

Before customer exposure, security evidence must cover the full agent boundary,
including Roblox Studio integration, tools, project content, providers,
credentials/secrets, tenant isolation, persistence, payments/credits, and
recovery controls.

---

# 62. LONG-TERM FUTURE

The long-term architecture may expand into richer design intelligence,
autonomous playtesting, simulation, content generation, LiveOps, stronger
provider routing, and broader production automation.

Future capabilities remain subordinate to deterministic safety, evidence,
roadmap gates, and human creative intent.

---

# 63. GIT SAFETY

Never blindly run `git add .`, `git reset --hard`, `git clean`, mass deletion,
or mass overwrite.

Before commit/review inspect status, diff, filenames, staged changes, secrets,
and scope. Never push unless explicitly requested.

---

# 64. SECRETS

Secrets must not be committed to source, logs, prompts, memory, artifacts,
reports, screenshots, or generated outputs unless explicitly designed and
protected by the appropriate secret-handling boundary.

---

# 65. TESTING PHILOSOPHY

Tests are evidence, not the goal. Use the appropriate unit, integration,
architecture, runtime, E2E, regression, adversarial, load/concurrency,
persistence/recovery, player-simulation, visual/UX, and performance tests.

Do not weaken tests to make a gate pass.

---

# 66. KNOWN LIMITATIONS / STATE LANGUAGE

Use explicit language for project state:

`PLANNED → DESIGNED → IN PROGRESS → IMPLEMENTED → VERIFIED → CERTIFIED`

and when appropriate:

`BLOCKED / DEPRECATED / SUPERSEDED`.

Never describe a target capability as implemented merely because it is documented.

---

# 67. ARCHITECTURAL RULE

Historical project intent and newer future-proofing requirements are additive
unless a documented decision explicitly supersedes an earlier requirement.

When in doubt, preserve detail, mark uncertainty, and merge requirements
without information loss where possible.

---

# 68. PROJECT MEMORY RULE

`MYNO_PROJECT_MEMORY.md` is canonical long-term memory. It must remain
provenance-aware, auditable, protected against poisoning, and synchronized with
`AGENTS.md`.

---

# 69. AGENT STARTUP PROTOCOL

Before meaningful work:

1. Read `MYNO_PROJECT_MEMORY.md`.
2. Read `AGENTS.md`.
3. Determine current phase and gate.
4. Inspect repository state and relevant implementation.
5. Identify invariants and compatibility constraints.
6. Define scope.
7. Preserve unrelated work.
8. Implement only the authorized scope.
9. Verify with appropriate evidence.
10. Report honestly.
11. Update project memory if architecture/state changed.

---

# 70. CURRENT DECISION

The current canonical direction is:

P3.6-S
    ↓
Complete S.1 → S.25 + LEI
    ↓
P3.6-R
    ↓
P3.6-RT
    ↓
P3.6-CERTIFIED
    ↓
P3.7
    ↓
P3.8 Production Engineering Platform
    ↓
P3.9 Beta Readiness
    ↓
P4.0 Luau + Roblox Mastery
    ↓
Pre-Beta Production Gates
    ↓
Customer Beta Ladder

Do not skip the S.1-S.25 intelligence foundation.
Do not treat LEI as a new numbered S item.
Do not enter customer Beta as a technical preview.
Do not declare a later gate passed without evidence for its required scope.

---

# 71. FINAL PRINCIPLE

The ambition of MYNO is not:

"Generate code faster."

The ambition is:

"Understand Roblox engineering deeply enough to build and evolve complete Roblox
projects autonomously, safely, correctly, and architecturally."

MYNO should eventually make complex Roblox engineering feel like:

Describe the goal.
MYNO understands the system.
MYNO builds it.
MYNO tests it.
MYNO fixes it.
MYNO verifies it.
MYNO explains it.

The system should be impressive not because it produces a lot of code, but
because it demonstrates genuine engineering intelligence.

---

# 72. ULTIMATE GAME-BUILDING INTELLIGENCE

MYNO's long-term target includes complete game design and experience creation.

## 72.1 Game Design Intelligence

Understand core fantasy, gameplay loop, player motivation, onboarding,
progression, difficulty, rewards, quests, economy, social systems,
replayability, pacing, session structure, retention risks, and monetization.

## 72.2 Creative / Visual / Taste Intelligence

Understand composition, visual hierarchy, lighting, color harmony, material and
scale consistency, prop density, landmarks, navigation, focal points,
repetition/dead space, UI hierarchy, animation feel, VFX readability, audio
feedback, and environmental storytelling.

## 72.3 Polish / Taste Passes

Functional output is not finished output. Applicable quality progression is:

`Functional → Correct → Consistent → Readable → Polished → Immersive → Professional`

## 72.4 Autonomous Player Intelligence

The long-term target includes controlled synthetic players that exercise real
inputs and observations to evaluate onboarding, navigation, objectives,
interaction, progression, failure/recovery, UI clarity, rewards, social systems,
economy, and edge cases.

Synthetic-player evidence supplements rather than replaces deterministic tests,
real runtime verification, adversarial testing, or real player evidence.

## 72.5 Game / Economy Simulation

Use simulation where useful to evaluate progression, reward rates, currency sinks,
inflation, rarity, pricing, grind, and monetization pressure. Simulation is
evidence/hypothesis, not a guarantee of real player behavior.

## 72.6 Content Factory

Use reusable content primitives for asset families, buildings, props, roads,
biomes, zones, NPC archetypes, quests, item families, UI patterns, and VFX/audio
patterns. Generated content must respect project style, gameplay requirements,
performance budgets, provenance, deterministic placement, and ownership.

---

# 73. CREATIVE ENGINEERING LOOP

The canonical long-term loop is:

`INTENT → DESIGN → ARCHITECT → BUILD → OBSERVE → PLAY → EVALUATE → CRITIQUE → IMPROVE → VERIFY → POLISH → RELEASE → MEASURE → LEARN → EVOLVE`

This loop extends rather than bypasses the existing security and engineering
pipeline.

Three truths must remain distinct:

- **Technical truth:** does it work?
- **Design truth:** does it satisfy the intended design?
- **Experience truth:** is it good enough for the intended audience?

None automatically proves the others.

---

# 74. FULL GAME LIFECYCLE INTELLIGENCE

The long-term lifecycle is:

`IDEA → DESIGN → PROTOTYPE → VERTICAL SLICE → PRODUCTION → CONTENT EXPANSION → QA → OPTIMIZATION → SECURITY → RELEASE CANDIDATE → PUBLISH → POST-PUBLISH VERIFY → LIVE MONITORING → LEARN → UPDATE → LIVEOPS → EVOLVE`

Publishing is not the end of engineering.

---

# 75. RELEASE ENGINEERING + LIVEOPS

Release operations should eventually support versioning, staging, release
candidates, controlled rollout, publish validation, post-publish health checks,
compatibility/migration checks, incident response, hotfixes, rollback, emergency
shutdown, and change tracking.

---

# 76. DEFINITION OF DONE

Use scope-aware states:

- **BUILT** — artifacts/mutations were produced.
- **VERIFIED** — required technical/runtime evidence confirms defined behavior.
- **POLISHED** — applicable player-facing quality criteria passed.
- **RELEASE-CANDIDATE** — applicable engineering, security, design, QA, and release gates passed.
- **RELEASED** — intended build was published and post-publish checks passed.
- **SUCCESSFUL** — real-world evidence supports the intended product outcome for the relevant scope.
- **COMPLETE** — all applicable requirements and gates are satisfied with evidence.
- **MASTERED** — the declared mastery scope passed its benchmark and runtime/review gates.

Never collapse these states into a single done flag.

---

# 77. QUALITY GATE MODEL

## Design

Validate user intent, requirements, constraints, core fantasy, and design
coherence.

## Engineering

Validate architecture, implementation, dependencies, runtime, persistence,
performance, and maintainability.

## Creative

Validate visual hierarchy, readability, polish, interaction feel, and experience
quality.

## Safety

Validate security, authorization, isolation, budgets, destructive controls, and
recoverability.

## Validation

Validate tests, runtime evidence, regression, adversarial coverage, and evidence
traceability.

## Release

Validate release readiness, migrations, post-publish checks, monitoring, and
rollback/recovery where promised.

---

# 78. EVIDENCE GRAPH

Long-term MYNO should maintain an evidence graph connecting:

`REQUIREMENT → DESIGN → ARCHITECTURE → ARTIFACT → MUTATION → TEST → OBSERVATION → VERIFICATION → DECISION → RELEASE`

Evidence must be attributable to its source/tool/runtime and freshness/version
scoped where applicable.

---

# 79. PLAYER EXPERIENCE MEMORY

Player feedback and telemetry are evidence with uncertainty. They should be
stored with context, timestamp/version, provenance, and enough scope to avoid
mistaking one player's experience for universal truth.

---

# 80. HUMAN INTENT PRESERVATION

MYNO should refuse or flag technically impossible assumptions, contradictory
requirements, poor architecture, severe performance risks, or exploitable designs.

But it must not silently replace the user's creative intent with a different
product merely because the agent prefers it.

When requirements conflict, MYNO should surface the conflict, explain the
tradeoff, and obtain authorization where a meaningful creative decision is
required.

---

# 81. ULTIMATE SYSTEM BOUNDARY

The long-term MYNO boundary is:

HUMAN CREATIVE INTENT
        ↓
MYNO DESIGN INTELLIGENCE
        ↓
MYNO ENGINEERING INTELLIGENCE
        ↓
MYNO CREATIVE / VISUAL INTELLIGENCE
        ↓
MYNO AUTONOMOUS VALIDATION
        ↓
DETERMINISTIC SAFETY / POLICY LAYER
        ↓
ROBLOX STUDIO / PRODUCTION SYSTEMS
        ↓
PUBLISHED EXPERIENCE
        ↓
REAL PLAYER EVIDENCE
        ↓
MYNO LEARNING / EVOLUTION

The goal is not to remove humans from meaningful creative ownership. The goal
is to remove unnecessary engineering friction while preserving control, safety,
evidence, and intent.

---

# 82. CURRENT VISION MILESTONE — EXPERIENCE-COMPLETE MYNO

A major architectural vision decision is now recorded:

MYNO's long-term target is not only Universal Roblox Engineering Intelligence,
but an Experience-Complete system capable, when the required capabilities are
implemented and verified, of taking a high-level game goal through:

DESIGN
→ WORLD / CONTENT
→ SYSTEMS
→ CODE
→ UI / UX
→ AUDIO / VFX / ANIMATION
→ PLAYTEST
→ SECURITY
→ PERFORMANCE
→ POLISH
→ RELEASE
→ POST-RELEASE OBSERVATION
→ EVOLUTION

This does NOT create a new roadmap gate or authorize skipping P3.6. Instead,
these capabilities become the target architecture that P3.6-S, P3.6-R,
P3.6-RT, P3.6-CERTIFIED, P3.7, P3.8, and P3.9 must progressively make real.

---

# 83. ULTIMATE LUAU + ROBLOX MASTERY TARGET

A major long-term product decision is now explicit:

> MYNO is being built to reach **100% Luau capability and 100% Roblox engineering
> coverage within a defined, evidence-based mastery scope**.

This is an engineering target, not a claim of omniscience or literal perfection.
"100%" means that every declared mastery domain has a complete curriculum and
has passed the required challenge, regression, runtime, and review gates.

The mastery target covers, at minimum:

### Luau

- language syntax and semantics
- execution model, scope, closures, tables, metatables, coroutines, iterators, modules
- error behavior and runtime semantics
- `--!strict`, inference, annotations, unions/intersections, generics, narrowing, casts
- type-system edge cases and evolving type-solver behavior
- async/task scheduling and concurrency semantics
- memory allocation, garbage collection, and performance
- debugging, profiling, refactoring, API design, and maintainability

### Roblox Engineering

- DataModel, services, Instances, lifecycle, Studio workflows
- Script/LocalScript/ModuleScript architecture and placement
- client/server authority, remotes, replication, prediction, serialization
- DataStore, MemoryStore, configuration, persistence, migrations, recovery
- UI/UX, input, physics, animation, VFX, audio, NPC/AI, gameplay systems
- terrain, world building, level design, spatial organization, streaming
- performance, network cost, memory, rendering, server/client scaling
- security, exploit resistance, authorization, trust boundaries, abuse controls
- autonomous testing, playtesting, simulation, debugging, repair, and verification
- release engineering, LiveOps, monitoring, incident handling, and evolution

No mastery claim is valid from documentation or one successful generated example.
Mastery requires repeatable success on unseen cases plus real Studio/runtime
evidence where the domain depends on runtime behavior.

---

# 84. MASTERY EVIDENCE MODEL

Each mastery domain must maintain:

`Knowledge → Examples → Anti-patterns → Tests → Challenges → Failure Cases → Benchmarks → Runtime Evidence → Regression Corpus → Review Criteria → Confidence → Mastery Level → Known Gaps`

A domain remains below mastery if evidence is missing, stale, contradictory, or
failed. Unknown behavior must trigger observation, research, or a safe stop rather
than fabricated confidence.

Mastery must be evaluated against new/unseen problems, not only memorized examples.

---

# 85. P4.0 — LUAU + ROBLOX MASTERY

P4.0 is a future roadmap phase. It does not bypass or replace P3.6-S, P3.6-R,
P3.6-RT, P3.6-CERTIFIED, P3.7, P3.8, or P3.9.

P4.0 becomes active only after the preceding gates are actually evidenced. Its
purpose is to drive MYNO from broad Roblox intelligence toward measured, deep,
repeatable expert-level Luau and Roblox engineering capability.

Suggested mastery tracks:

1. Luau Core
2. Luau Types
3. Luau Runtime / Concurrency
4. Roblox Core Engine
5. Roblox Architecture
6. Networking / Replication
7. Persistence / Distributed State
8. Gameplay / Systems
9. UI / UX
10. World / Level / Spatial Engineering
11. NPC / AI
12. Animation / VFX / Audio
13. Security
14. Performance / Scalability
15. Debugging / Recovery / Refactoring
16. Testing / Playtesting / Simulation
17. Production / Release / LiveOps

Each track requires explicit benchmarks, adversarial cases, runtime evidence where
applicable, regression coverage, and a defined pass threshold before it contributes
to the overall mastery state.

---

# 86. MASTERY CLAIM RULE

The project must never use "100% Luau", "100% Roblox", "expert", or equivalent
claims as decoration. Any such claim must reference:

- the declared scope
- the benchmark version
- the domains covered
- the pass/fail results
- runtime evidence requirements
- known gaps and exclusions
- the date of evaluation

Until those conditions are met, the correct state language is:

`TARGETED / PARTIALLY COVERED / IMPLEMENTED / VERIFIED / MASTERED`

not an unsupported percentage.

---

# END OF CANONICAL MEMORY
