# MYNO — Project Memory & Engineering Constitution

> Canonical long-term project memory.
> This document is the source of truth for MYNO's vision, architecture, roadmap, invariants, security, product direction, engineering philosophy, and future-proofing rules.
> Any AI agent, coding agent, engineer, or maintainer MUST read this before architectural changes.

---

# 1. WHAT MYNO IS

MYNO is intended to become a **Universal Roblox Engineering Intelligence Platform**.

The target is not "AI that writes Luau".

The target is:

> AI that understands, designs, builds, tests, verifies, repairs, optimizes, secures, and evolves complete Roblox systems.

MYNO should eventually understand a Roblox project as a complete engineering system spanning code, architecture, assets, environment, gameplay, UI/UX, networking, persistence, testing, performance, security, organization, release, and live evolution.

The long-term promise is bounded by real capabilities and evidence. "Universal" means broad technical coverage and extensibility, not a literal guarantee of solving every possible problem.

---

# 2. ULTIMATE USER EXPERIENCE

A user should eventually be able to describe a technically executable Roblox goal in natural language.

MYNO should be able to understand intent, extract requirements and constraints, inspect the existing project, understand architecture, build an Architecture Graph, decompose the goal, determine ownership/placement/dependencies, create a mutation plan, enforce policy, implement, test, observe runtime behavior, verify semantic correctness, diagnose and repair failures, re-test, review architecture and experience quality, preserve project integrity, report evidence, and persist useful project memory.

The user should not need to know which script belongs where. MYNO should understand that.

---

# 3. CORE PRINCIPLE

**LLM proposes. Deterministic systems decide.**

The model may reason, plan, explain, and propose.

Deterministic systems control authorization, placement, mutation scope, Studio identity, tenant identity, security policy, budgets, tool access, destructive operations, verification, rollback/recovery, lifecycle, and resource consumption.

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

A plan is not execution. Execution is not verification. Verification is not certification.

---

# 5. ENGINEERING STATES

Keep these states distinct:

`Designed ≠ Implemented ≠ Verified ≠ Certified`

Evidence must identify what state is actually supported.

Never claim full security, rollback, authorization, runtime correctness, capability, or certification without evidence.

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

Ollama was intentionally removed because local inference caused unacceptable resource consumption for the target environment.

Current strategy is cloud-first and multi-provider capable. Groq is a current primary strategy with OpenAI optional; provider selection remains replaceable.

No provider-specific logic should leak deeply into the agent architecture.

---

# 7. FUTURE-PROOFING PRINCIPLE

**Everything we build today is allowed to evolve tomorrow.**

Do not treat today's provider, model, Roblox API, Studio MCP schema, tool capability, database, payment provider, pricing model, UI, storage format, artifact representation, game design, or deployment topology as permanent.

Prefer stable interfaces, capability discovery, adapters, versioned contracts, migrations, deprecation paths, compatibility layers, feature flags, and replaceable components.

For every important architectural decision, distinguish:

1. stable invariant
2. replaceable implementation
3. versioned contract
4. migration path
5. deprecation path
6. evidence that could justify a future change

Do not over-engineer every hypothetical future. Build extension points where change is reasonably foreseeable.

---

# 8. MULTI-STUDIO / MULTI-TENANT IDENTITY

Roblox Studio identity is explicit.

**Every Roblox MCP call MUST use the correct `studio_id`.**

There must be no global active-Studio assumption.

Production must model tenant/customer/session identity explicitly. Cross-Studio and cross-tenant access must fail closed and be auditable.

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

P3.6-S is not a checklist of disconnected features. Each subsystem integrates with the Architecture Graph, contracts, verification, security, evidence, and project memory.

---

# 10. S.1 — ARTIFACT INTELLIGENCE

Understand Roblox artifacts semantically, not merely by class name. This includes scripts, remotes, bindables, folders, models, parts, meshes, attachments, UI, animation, sound, VFX, terrain, lighting, NPC structures, configuration, data systems, and future artifact types.

Artifact understanding includes purpose, owner, runtime, lifecycle, placement, dependencies, security, and verification criteria.

---

# 11. S.2 — ARCHITECTURE GRAPH

The Architecture Graph is the backbone of project understanding.

It represents artifacts, systems, ownership, runtime side, placement, dependencies, communication, persistence, security boundaries, lifecycle, responsibilities, contracts, versions, migrations, feature flags, and evidence.

Before high-impact mutations, MYNO should perform change-impact analysis over the graph.

---

# 12. S.3 — PLACEMENT INTELLIGENCE

Placement is determined by semantic role, runtime ownership, replication, lifecycle, security, dependencies, and performance.

Typical locations include ServerScriptService, ServerStorage, ReplicatedStorage, StarterPlayerScripts, StarterCharacterScripts, StarterGui, Workspace, Lighting, SoundService, Terrain, and other current/future Roblox containers.

Do not blindly use remembered locations when current Roblox behavior or project architecture requires something else.

---

# 13. S.4 — DEPENDENCY / COMMUNICATION

Understand require relationships, RemoteEvents/RemoteFunctions, Bindables/signals, listeners, shared/replicated state, service/data/runtime dependencies, serialization boundaries, Actor/cross-thread communication, and network ownership.

Detect broken dependency direction, cycles, missing contracts, unsafe communication, and lifecycle hazards before runtime where possible.

---

# 14. S.5 — ARCHITECTURE MUTATION

Mutations are structured plans, not blind edits.

A mutation plan should capture target, operation, owner, scope, preconditions, dependencies, expected result, risk, policy requirements, verification requirements, rollback/compensation, idempotency, and concurrency/version expectations.

---

# 15. S.6 — ARCHITECTURE VERIFICATION

Verification must go beyond "Instance exists".

Verify when applicable artifact, class, location, source, ownership, runtime, dependencies, communication, lifecycle, security boundary, semantic behavior, runtime behavior, architecture, performance/resource behavior, and player-facing result.

Observations must be freshness-aware and scoped to a known project/Studio/version context.

---

# 16. S.7 — SYSTEMS ENGINEERING

Understand complete systems such as quests, inventory, economy, shops, progression, combat, spawning, matchmaking, missions, delivery systems, jobs, rewards, achievements, player profiles, admin systems, social systems, analytics, telemetry, and live events.

The target is system engineering, not isolated scripts.

---

# 17. S.8 — ENVIRONMENT / TERRAIN

Understand terrain, biomes, roads, zones, buildings, world layout, lighting, atmosphere, landmarks, navigation spaces, gameplay areas, and streaming-aware spatial design.

---

# 18. S.9 — ASSET / SPATIAL CONSTRUCTION

Understand models, meshes, procedural structures, props, buildings, roads, delivery locations, NPC locations, interactables, ownership, purpose, placement, performance, and asset provenance.

Prefer reusable content primitives over uncontrolled duplication.

---

# 19. S.10 — VISUAL INTELLIGENCE

Reason about composition, visual hierarchy, readability, contrast, color harmony, lighting, materials, scale consistency, prop density, landmarks, focal points, repetition/dead space, player guidance, and environmental storytelling.

Use evidence loops such as `BUILD → CAPTURE → CRITIQUE → REPAIR → RE-CAPTURE → COMPARE → POLISH`.

---

# 20. S.11 — GAMEPLAY / INTERACTION

Core loop:

`INPUT → STATE → ACTION → FEEDBACK → REWARD → PROGRESSION`

Construct and verify interaction systems and their player experience, not just their code.

---

# 21. S.12 — NPC / AI

Understand NPC state machines, navigation, behavior trees, perception, combat AI, dialogue, task AI, utility AI, spawning, despawning, performance, and multiplayer implications.

---

# 22. S.13 — UI / UX

Understand ScreenGui, BillboardGui, SurfaceGui, hierarchy, responsive layouts, interaction, feedback, accessibility/readability, navigation, design systems, and device/platform differences.

---

# 23. S.14 — ANIMATION / VFX / AUDIO

Understand animation state, particles, beams, trails, sound, spatial audio, VFX, timing, readability, and feedback systems.

---

# 24. S.15 — DATA / PERSISTENCE

Understand player profiles, DataStore, MemoryStore, configuration, secrets, persistence, recovery, schema evolution, migrations, validation, data integrity, quotas/limits, retries, and concurrency.

Durable state, temporary distributed state, configuration, secrets, and session memory are different classes and must not be conflated.

Never test destructive persistence behavior against live production data.

---

# 25. S.16 — MULTIPLAYER / REPLICATION

Understand server authority, client authority boundaries, replication, remotes, validation, rate limits, race conditions, network ownership, serialization, replication cost, streaming implications, and cross-server state.

Client-originated state changes must be server validated.

---

# 26. S.17 — PERFORMANCE

Reason about memory, CPU, rendering, network, script execution, object count, replication, streaming, event frequency, allocations, GC, physics, expensive loops, asset cost, and server/client work.

Performance decisions are evidence-driven: profile → identify bottleneck → change → measure.

Parallel Luau, Actors, native-code paths, streaming, and future engine features are capability-dependent options, not permanent assumptions.

---

# 27. S.18 — AUTONOMOUS TESTING

Long-term loop:

`BUILD → RUN → OBSERVE → DIAGNOSE → REPAIR → RE-RUN → REGRESSION CHECK`

MYNO should eventually generate and execute tests, enter Play Mode, inspect runtime and console output, simulate interactions, capture evidence, diagnose failures, repair, and re-run.

---

# 28. S.19 — MIGRATION / REFACTORING

Safely handle renaming, moving, restructuring, API migration, architecture migration, legacy cleanup, dependency updates, schema migrations, and compatibility transitions.

Refactoring must preserve behavior and include dependency discovery, migration sequencing, regression verification, and cleanup only after references are proven migrated.

---

# 29. S.20 — PROJECT HYGIENE

Maintain naming, folder organization, unused artifact detection, duplicate detection, stale artifact cleanup, documentation, configuration hygiene, dependency hygiene, and consistent architecture.

---

# 30. S.21 — ROBLOX SECURITY ARCHITECTURE

Security is architectural.

Important areas include client/server trust boundaries, remote validation, authorization, prompt injection, indirect injection, malicious project content, malicious tool output, tool abuse, malicious arguments, path traversal, Studio isolation, tenant isolation, privilege boundaries, secret leakage, context poisoning, memory poisoning, model manipulation, resource exhaustion, destructive mutations, verification bypass, stale-state exploitation, and provider failure abuse.

Security policy must be deterministic and auditable.

---

# 31. S.22 — DESIGN SYSTEMS

MYNO should learn and preserve project style: colors, typography, spacing, UI patterns, naming, visual language, interaction conventions, world-building conventions, and asset conventions.

Design systems must be versionable and evolvable.

---

# 32. S.23 — PROJECT MEMORY / DESIGN INTENT

Remember architecture decisions, design decisions, conventions, goals, constraints, previous failures, successful patterns, intentional exceptions, compatibility assumptions, migrations, deprecations, and evidence.

Memory must be provenance-aware and must not become an unquestioned source of truth. Memory can become stale or poisoned and must be validated against current project/runtime evidence.

---

# 33. S.24 — NOVEL / UNKNOWN PROBLEM SOLVER

Strategy:

`DETECT NOVELTY → DECOMPOSE → SEARCH/RETRIEVE → HYPOTHESIZE → BUILD SMALL EXPERIMENT → OBSERVE → VALIDATE → UPDATE KNOWLEDGE → IMPLEMENT → VERIFY`

Unknown behavior must not be filled with confident invention. Novel solutions remain bounded by deterministic policy and evidence.

---

# 34. S.25 — GOLDEN ARCHITECTURE / SELF-REVIEW

Before declaring meaningful work complete, review architecture fit, dependency direction, security, placement, runtime correctness, persistence, performance, maintainability, extensibility, player experience, project consistency, and evidence coverage.

The final question is not "does the code run?" but "does the implementation belong in the project and survive its intended lifecycle?"

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

The **MYNO Mastery Framework** is a cross-cutting capability above individual S systems.

Every important capability should eventually have:

1. Knowledge
2. Provenance
3. Freshness/version context
4. Examples
5. Anti-patterns
6. Failure cases
7. Tests
8. Challenges
9. Benchmarks
10. Runtime evidence
11. Review criteria
12. Confidence
13. Mastery level
14. Known capability gaps
15. Regression corpus

Mastery is demonstrated by repeated correct behavior across new cases, not by one successful example.

---

# 37. ENGINEERING INTELLIGENCE LAYERS

Required long-term layers include:

### Evidence Graph
Trace intent → decision → mutation → observation → verification.

### Confidence / Uncertainty
Represent confidence and trigger observation or human review when uncertainty matters.

### Capability Gap Detection
Recognize when MYNO lacks a tool, knowledge, runtime capability, or evidence.

### Regression Corpus
Preserve failures and solved cases as reusable regression tests.

### Benchmark System
Measure quality by task families, not only generic model benchmarks.

### API / Knowledge Drift Detection
Detect when Roblox, MCP, provider, SDK, or policy changes invalidate assumptions.

### Knowledge Provenance
Know where a rule came from, when it was retrieved, and what environment/version it applies to.

### Change-Impact Analysis
Predict affected artifacts, contracts, tests, data, runtime, security, and experience before high-impact mutations.

### Capability Negotiation
Discover actual tool/provider/Studio capabilities instead of assuming them.

### Graceful Degradation
If a capability is unavailable, preserve intent with a safe fallback where possible; never fake completion.

---

# 38. TRANSACTION / RECOVERY MODEL

Important primitives:

- operation/task IDs
- idempotency keys
- preconditions
- version checks
- leases/ownership where required
- bounded locks
- snapshots
- mutation journals
- commit points
- compensation actions
- rollback
- stale-state rejection
- duplicate detection
- partial-failure recovery

A retry must not accidentally duplicate a destructive, financial, or state-changing operation.

---

# 39. OBSERVABILITY / AUDIT

Production MYNO requires structured observability: logs, metrics, traces, task history, mutation journals, provider health, usage/cost, security events, incident evidence, and audit logs.

Observability must not leak secrets or unnecessary customer/project data.

Security-sensitive audit records should answer `WHO / WHAT / WHEN / WHERE / WHY / AUTHORIZATION / RESULT`.

---

# 40. PRIVACY / DATA GOVERNANCE

Customer and project data require explicit lifecycle rules for collection, purpose, retention, deletion, access, export, isolation, backup, logs, support access, and incident handling.

Do not retain data merely because it is technically convenient.

---

# 41. PRODUCTION SOURCE / SUPPLY CHAIN

Production must protect MYNO source/IP and customer data.

Direction includes least privilege, secret management/rotation, dependency security, vulnerability monitoring, provenance/SBOM where appropriate, secure builds, controlled artifacts/source maps, no debug backdoors, environment separation, secure update mechanism, and release auditability.

---

# 42. PAYMENT / CREDIT / ECONOMY

Payment/credit architecture must be server-authoritative.

Required invariants include server-side payment verification, signed/authenticated webhooks, idempotency, atomic entitlement/credit issuance, reconciliation, refunds, chargebacks, duplicate protection, append-only/tamper-resistant credit ledger, atomic debit/credit, replay protection, race protection, negative-balance prevention, and auditability.

Daily credits renew every 24 hours using authoritative server time and resist client-clock manipulation, reconnect/retry/replay abuse.

Purchased credits and daily/promotional credits remain distinguishable with explicit consumption, expiry, refund, and promotion policy.

Anti-farming controls must be layered and lawful and account for shared devices, privacy, false positives, and appeals.

---

# 43. CANONICAL RED-TEAM REGISTRY

1. direct prompt injection
2. indirect prompt injection
3. malicious project content
4. malicious tool outputs
5. tool misuse
6. malicious tool arguments
7. path traversal
8. secret leakage
9. privilege escalation
10. authorization bypass
11. cross-Studio access
12. tenant isolation failure
13. destructive-operation abuse
14. verification bypass
15. budget bypass
16. retry storms
17. recovery loops
18. context poisoning
19. memory poisoning
20. stale-state exploitation
21. provider/model failure abuse
22. resource exhaustion
23. payment abuse
24. credit manipulation
25. replay attacks
26. race-condition abuse
27. multi-account/daily-credit farming
28. supply-chain/dependency attacks
29. deployment/update abuse
30. emergency-stop/rollback bypass

Red-team loop:

`REPRODUCE → CLASSIFY → FIX → TEST → RE-ATTACK → PASS/BLOCK`

---

# 44. EXPERIENCE-COMPLETE BUILDING RULES

For player-facing experiences:

`PLAYER/OWNER INTENT → GAME DESIGN → SYSTEM DESIGN → ARCHITECTURE → CONTENT → IMPLEMENTATION → PLAYTEST → CRITIQUE → POLISH → VERIFY → RELEASE`

Technical correctness is necessary but insufficient.

Consider core fantasy, gameplay loop, onboarding, progression, difficulty, rewards, quests, economy, social systems, replayability, pacing, retention, monetization pressure, accessibility, clarity, visual quality, audio, animation, VFX, and environmental storytelling.

---

# 45. AUTONOMOUS PLAYER / SIMULATION

Long-term validation may include controlled synthetic players using real inputs and observations.

They can evaluate onboarding, navigation, objectives, interaction, progression, failure/recovery, UI clarity, rewards, social systems, economy, and edge cases.

Game/economy simulation may estimate progression, reward rates, sinks, inflation, rarity, pricing, grind, and monetization pressure.

Simulation is evidence/hypothesis, not a guarantee of human behavior.

---

# 46. CONTENT FACTORY

Reusable content primitives should support asset families, building families, props, roads, biome variants, zones, NPC archetypes, quest templates, item families, UI patterns, and VFX/audio patterns.

Content generation must respect project style, gameplay purpose, performance budgets, licensing/provenance, deterministic placement, ownership, and duplication controls.

---

# 47. FULL LIFECYCLE / LIVEOPS

Canonical lifecycle:

`IDEA → DESIGN → PROTOTYPE → VERTICAL SLICE → PRODUCTION → CONTENT EXPANSION → QA → OPTIMIZATION → SECURITY → RELEASE CANDIDATE → PUBLISH → POST-PUBLISH VERIFY → LIVE MONITORING → LEARN → UPDATE → LIVEOPS → EVOLVE`

Eventually support versioning, staging, controlled rollout, publish validation, post-publish health checks, compatibility/migration checks, incidents, hotfixes, rollback, emergency shutdown, analytics, experiments, notifications, localization, and player feedback loops.

---

# 48. RELEASE / MIGRATION / DISASTER RECOVERY

Production architecture must eventually support release candidates, staging, canary/controlled rollout, versioned migrations, backward compatibility, code rollback, data/schema recovery strategy, backups, restore drills, disaster recovery, incident response, and emergency shutdown.

A code rollback without a data compatibility strategy is not a complete rollback strategy.

---

# 49. FEATURE FLAGS / EXPERIMENTS

Flags and experiments must be scoped, auditable, reversible, and compatible with persistence/migrations.

Permanent hidden branches are technical debt and require ownership and cleanup plans.

---

# 50. ADMIN CONTROL PLANE

Production admin tooling should eventually control, as authorized, users, tenants, sessions, credits/ledger, purchases, refunds, chargebacks, usage, provider health/quotas/costs, infrastructure health, security events, abuse/risk, rate limits, feature flags, emergency stop, incidents, audit logs, support, and controlled emergency operations.

Emergency operations must be authenticated, authorized, logged, and recoverable.

---

# 51. CLOUD / PRODUCTION DIRECTION

Target architecture:

`Cloudflare → Reverse Proxy/Edge → MYNO API → Authentication → Authorization → Tenant Isolation → Entitlements → Credits/Usage Ledger → Payment Verification → Security/Abuse → Observability/Audit → Provider Gateway → Multi-Provider/Multi-Cloud Pool`

PostgreSQL is the source of truth where relational durable state is required. Redis is for acceleration/cache/coordination/rate limiting where appropriate, not the authoritative financial ledger.

Desktop must not contain provider master secrets, payment secrets, database credentials, or admin secrets.

---

# 52. BETA DEFINITION

Beta is a real live customer/revenue test with many concurrent users, not a technical preview.

Before Beta, evidence must cover engineering, security, product, infrastructure/scale, economy, and customer safety.

Required direction includes many simultaneous users, burst/sustained load, provider degradation, database/cache pressure, queues, recovery, real purchases, real cost measurement, free-tier optimization without deceptive degradation, full security/red-team coverage, tenant isolation, observability, support, dashboard, authentication, admin controls, backup/restore, and rollback.

Beta ladder:

`INTERNAL ALPHA → PRIVATE BETA → LIMITED CUSTOMER BETA → LIVE CUSTOMER BETA → STABILIZATION → PUBLIC RELEASE DECISION`

---

# 53. BETA ECONOMICS

Optimize legitimate sustainable free-tier/provider usage without degrading customer experience, performance, reliability, security, data integrity, payment/credit integrity, tenant isolation, or recoverability.

Free tiers are an economic optimization layer, never the sole reliability foundation.

Track revenue, provider cost, infrastructure cost, payment fees, support cost, gross margin, cost per task, and cost per active customer.

No deceptive degradation or hidden performance penalty.

---

# 54. ROADMAP GATES

Canonical roadmap:

`P3.6-S → Complete S.1-S.25 + LEI → P3.6-R → P3.6-RT → P3.6-CERTIFIED → P3.7 → P3.8 → P3.9 → Pre-Beta Gates → Customer Beta Ladder → Public Release Decision`

P3.6-R focuses on runtime correctness, real Roblox execution, MCP/observation/verification/recovery reliability, resource controls, concurrency, cancellation, Studio lifecycle, and real E2E.

P3.6-RT is hostile/adversarial testing across the canonical security registry.

P3.6-CERTIFIED means the defined P3.6 scope has passed correctness, security, runtime, integration, adversarial, build, verification, and architecture review evidence. It is scope-bound and does not mean impossible to break.

P3.7 autonomous execution begins only after P3.6 certification actually passes.

---

# 55. CURRENT PROJECT PHASE

The project remains in the **P3.6-S intelligence-foundation phase** unless a later gate is explicitly evidenced and recorded.

The current priority is to complete and strengthen the S.1-S.25 intelligence foundation and LEI, while designing the architecture so later runtime, red-team, certification, cloud, product, and customer phases can evolve without architectural rewrites.

Documentation of future capabilities does not mean those capabilities are implemented.

---

# 56. DECISION / CHANGE MANAGEMENT

Major architectural decisions should be recorded with decision, context, alternatives, reason, invariant introduced, migration implications, future reversal conditions, and evidence.

When a major decision changes, update this memory and `AGENTS.md` together.

Avoid silent architecture drift.

---

# 57. KNOWLEDGE FRESHNESS

Roblox, Luau, Studio, MCP, providers, SDKs, payment systems, and platform policies change.

MYNO knowledge must eventually track source/provenance, retrieval/update date, version/engine context, confidence, superseded status, compatibility notes, and validation status.

Current official Roblox documentation and real Studio/runtime evidence outrank stale model memory.

---

# 58. REALITY / EVIDENCE PRINCIPLE

The strongest MYNO is not the one that sounds most certain.

It is the one that knows what it knows, what it inferred, what it observed, what it tested, what it could not test, what may have changed, and what remains uncertain.

When evidence is missing, stop, observe, ask, or safely degrade.

Never invent evidence.

---

# 59. FINAL QUALITY PRINCIPLE

The goal is not maximum code, maximum automation, or maximum feature count.

The goal is:

> **Correct, secure, maintainable, observable, verifiable, recoverable, extensible engineering that produces a good Roblox experience and remains capable of evolving as technology changes.**

MYNO must be built for the future without pretending to already possess it.
