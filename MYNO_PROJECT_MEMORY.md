# MYNO — Project Memory & Engineering Constitution

> Canonical project memory.
>
> This document is the long-term source of truth for MYNO's vision,
> architecture, engineering decisions, roadmap, current state,
> security principles, product direction, and agent operating rules.
>
> Any AI agent, coding agent, engineer, or future maintainer working
> on MYNO MUST read this document before making architectural changes.

---

# 1. WHAT IS MYNO?

MYNO is not intended to be a simple AI coding assistant.

MYNO is intended to become a:

# Universal Roblox Engineering Intelligence Platform

Its long-term purpose is to understand Roblox projects as complete
engineering systems and autonomously perform technically executable
engineering work across code, architecture, assets, environment,
gameplay, UI, networking, persistence, testing, optimization,
security, and project organization.

The target is not:

"AI that writes Luau."

The target is:

"AI that understands, designs, builds, tests, verifies, repairs,
optimizes, and evolves complete Roblox systems."

---

# 2. ULTIMATE VISION

A user should eventually be able to describe a technically executable
Roblox goal in natural language.

Example:

"Build a complete delivery system with quests, NPCs, UI,
persistent progression, multiplayer-safe remotes, effects,
sounds, and optimized delivery zones."

MYNO should eventually be able to:

1. Understand the intent.
2. Determine requirements.
3. Inspect the existing project.
4. Understand the existing architecture.
5. Build an Architecture Graph.
6. Decompose the request into artifacts.
7. Determine ownership and runtime behavior.
8. Determine correct Roblox placement.
9. Determine dependencies and communication.
10. Plan mutations.
11. Implement the system.
12. Build or modify assets/environment.
13. Test the system.
14. Observe runtime behavior.
15. Verify semantic correctness.
16. Detect failures.
17. Repair failures.
18. Re-test.
19. Review the architecture.
20. Refactor if necessary.
21. Preserve project integrity.
22. Report exactly what happened.

The user should not need to know which script goes where.

MYNO should understand that.

---

# 3. CORE ENGINEERING PRINCIPLE

The central principle of MYNO is:

LLM proposes.
Deterministic systems decide.

The model may reason about what should happen.

The application must deterministically control:

- authorization
- placement
- mutation scope
- security
- budgets
- tool access
- Studio identity
- destructive operations
- verification
- rollback/recovery
- lifecycle
- resource consumption

The model must never become the final security authority.

---

# 4. MYNO OPERATING MODEL

The long-term canonical pipeline is:

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

---

# 5. MY ROLE IN THE PROJECT

The assistant operating with the project owner is not merely a
code generator.

My role is:

## Technical Director
Make architectural decisions and protect the long-term direction.

## Principal Engineer
Design robust systems rather than short-term patches.

## Security Reviewer
Challenge dangerous assumptions and attack the system mentally
and through adversarial testing.

## Architecture Reviewer
Determine whether the implementation actually represents the
intended architecture.

## Product/Engineering Strategist
Keep the project aligned with the ultimate MYNO vision.

## Project Memory Keeper
Maintain consistency between current implementation,
architectural decisions, roadmap, and long-term goals.

## Reality Check
I must disagree when something is technically wrong.

I must never agree merely because the requested solution sounds good.

If an idea is dangerous, incomplete, premature, or architecturally weak,
I should say so.

---

# 6. ENGINEERING BEHAVIOR

When working on MYNO:

- Do not blindly agree.
- Do not optimize for superficial test counts.
- Do not hide limitations.
- Do not fabricate capabilities.
- Do not claim security that has not been proven.
- Do not claim rollback that does not exist.
- Do not claim authorization when only policy scaffolding exists.
- Do not confuse TPM protection with task-level agent budgets.
- Do not confuse structure verification with semantic verification.
- Do not introduce global mutable state for convenience.
- Do not make architecture decisions only for today's feature.
- Prefer extensible primitives over feature-specific hacks.
- Preserve unrelated user changes.
- Never perform destructive Git operations without explicit approval.
- Treat tests as evidence, not as proof of certification by themselves.
- Keep Designed, Implemented, Verified, and Certified as separate states.

---

# 7. CURRENT ARCHITECTURE

MYNO currently uses or is designed around:

- TypeScript / Node.js backend
- Electron desktop shell
- Provider abstraction
- Model Router
- Reliability Router
- Provider Registry
- Provider Gateway
- Cloud-first model strategy
- Roblox Studio MCP integration
- Autonomous task state machine
- Structured plans
- Dependency-aware execution
- Observation and verification
- Recovery
- Context engineering
- Security lifecycle controls
- Roblox placement intelligence
- Artifact intelligence
- Roblox path normalization
- Mutation planning
- Artifact contracts
- Artifact reconciliation
- TPM preflight/enforcement
- Model failover
- Action journaling
- Metadata-driven skills

The architecture must remain provider-neutral.

---

# 8. MODEL / PROVIDER STRATEGY

MYNO is cloud-first.

Ollama was intentionally removed because local inference caused
unacceptable resource consumption for the target machine.

Current strategy:

Provider
    ↓
Provider Gateway
    ↓
Model Router
    ↓
Reliability Router
    ↓
Selected Model

The system must support multiple providers and models.

No provider-specific logic should leak deeply into the agent architecture.

Provider failures must be classified and handled deterministically.

Model selection must track the effective model actually used.

Never display a configured model as the effective model if a fallback
model was actually used.

For production, MYNO must be able to operate across more than one
provider and, where appropriate, more than one cloud/provider pool.
A free-tier provider may optimize cost but must never become the sole
reliability foundation.

---

# 9. ROBLOX STUDIO INTEGRATION

Roblox Studio MCP is a core capability.

Current conceptual capabilities include:

- reading scripts
- editing scripts
- searching scripts
- searching the game tree
- inspecting instances
- executing Luau
- starting/stopping Play Mode
- reading console output
- screenshots
- navigation
- asset search
- asset insertion
- procedural model generation
- material generation
- mesh generation
- image upload
- keyboard/mouse input
- HTTP access where supported
- Studio state inspection
- subagents/skills where supported

Every Roblox MCP call MUST be explicitly bound to the correct
Studio identity.

Invariant:

EVERY ROBLOX MCP CALL MUST HAVE THE CORRECT studio_id.

There must be no global active Studio assumption.

---

# 10. P3.6-S — UNIVERSAL ROBLOX INTELLIGENCE

P3.6-S is the major intelligence foundation.

It is NOT merely a list of features.

Each S represents an intelligence subsystem that should integrate
with architecture understanding, artifact intelligence, verification,
security, and project memory.

Canonical structure:

P3.6-S
│
├── S.1  Artifact Intelligence
├── S.2  Architecture Graph
├── S.3  Placement Intelligence
├── S.4  Dependency / Communication
├── S.5  Architecture Mutation
├── S.6  Architecture Verification
├── S.7  Systems Engineering
├── S.8  Environment / Terrain
├── S.9  Asset / Spatial Construction
├── S.10 Visual Intelligence
├── S.11 Gameplay / Interaction
├── S.12 NPC / AI
├── S.13 UI / UX
├── S.14 Animation / VFX / Audio
├── S.15 Data / Persistence
├── S.16 Multiplayer / Replication
├── S.17 Performance
├── S.18 Autonomous Testing
├── S.19 Migration / Refactoring
├── S.20 Project Hygiene
├── S.21 Roblox Security Architecture
├── S.22 Design Systems
├── S.23 Project Memory / Intent
├── S.24 Novel / Unknown Problem Solver
└── S.25 Golden Architecture / Self-Review

---

# 11. S.1 — ARTIFACT INTELLIGENCE

MYNO must understand Roblox artifacts semantically.

Examples:

- Script
- LocalScript
- ModuleScript
- RemoteEvent
- RemoteFunction
- BindableEvent
- BindableFunction
- Folder
- Model
- Part
- MeshPart
- Attachment
- BillboardGui
- ScreenGui
- UI objects
- Animation
- Sound
- ParticleEmitter
- Beam
- Trail
- Terrain
- Lighting objects
- NPC structures
- data systems
- configuration objects

The artifact must have semantic meaning, not just a class name.

---

# 12. S.2 — ARCHITECTURE GRAPH

MYNO must maintain a project-level Architecture Graph.

The graph should represent:

- artifacts
- ownership
- runtime
- dependencies
- communication
- persistence
- security
- placement
- lifecycle
- relationships
- responsibilities

The Architecture Graph is intended to become the backbone of
project understanding.

---

# 13. S.3 — PLACEMENT INTELLIGENCE

MYNO must determine where an artifact belongs.

Examples:

ServerScriptService
StarterPlayerScripts
StarterCharacterScripts
ReplicatedStorage
ServerStorage
Workspace
StarterGui
Lighting
SoundService
Terrain
etc.

Placement must be determined from semantic role, runtime ownership,
replication requirements, and dependencies.

Example:

A player overhead BillboardGui system implemented as a LocalScript
belongs in the appropriate client runtime location rather than
being blindly placed into a generic server system folder.

---

# 14. S.4 — DEPENDENCY / COMMUNICATION

MYNO must understand:

- require relationships
- RemoteEvents
- RemoteFunctions
- Bindables
- signals
- event listeners
- shared state
- replicated state
- service dependencies
- data dependencies
- runtime dependencies

It should eventually be able to detect broken architecture before
runtime.

---

# 15. S.5 — ARCHITECTURE MUTATION

MYNO must not mutate the project blindly.

Mutations should be represented as structured plans with:

- target
- operation
- ownership
- scope
- dependencies
- expected result
- risk
- policy requirements
- verification requirements

---

# 16. S.6 — ARCHITECTURE VERIFICATION

Verification must go beyond:

"Instance exists."

MYNO should verify:

- correct location
- correct class
- correct source
- correct dependencies
- correct runtime ownership
- correct communication
- correct semantic behavior
- correct project architecture
- correct runtime behavior

Verification levels should be explicit.

---

# 17. S.7 — SYSTEMS ENGINEERING

MYNO must understand Roblox systems as systems.

Examples:

- quest systems
- inventory
- economy
- shops
- progression
- combat
- spawning
- matchmaking
- missions
- delivery systems
- jobs
- rewards
- achievements
- player profiles
- admin systems

The goal is complete system engineering rather than isolated scripts.

---

# 18. S.8 — ENVIRONMENT / TERRAIN

MYNO should eventually understand and manipulate:

- terrain
- biomes
- roads
- zones
- buildings
- world layout
- lighting
- atmosphere
- environment composition
- spatial gameplay areas

---

# 19. S.9 — ASSET / SPATIAL CONSTRUCTION

MYNO should understand spatial construction:

- models
- meshes
- procedural structures
- props
- buildings
- roads
- delivery locations
- NPC locations
- interactable objects

It should understand ownership and purpose of spatial artifacts.

---

# 20. S.10 — VISUAL INTELLIGENCE

MYNO should eventually reason about visual quality:

- composition
- readability
- hierarchy
- consistency
- player guidance
- contrast
- visual feedback
- scene organization

---

# 21. S.11 — GAMEPLAY / INTERACTION

MYNO should understand gameplay loops:

Input
→ State
→ Action
→ Feedback
→ Reward
→ Progression

It should be able to construct and verify interaction systems.

---

# 22. S.12 — NPC / AI

MYNO should eventually understand:

- NPC state machines
- navigation
- behavior trees
- perception
- combat AI
- dialogue
- task AI
- utility AI
- spawning
- despawning

---

# 23. S.13 — UI / UX

MYNO should understand:

- ScreenGui
- BillboardGui
- SurfaceGui
- UI hierarchy
- responsive layouts
- interaction
- feedback
- accessibility/readability
- design systems

---

# 24. S.14 — ANIMATION / VFX / AUDIO

MYNO should understand:

- animation
- animation state
- particles
- beams
- trails
- sound
- spatial audio
- effects
- feedback systems

---

# 25. S.15 — DATA / PERSISTENCE

MYNO must understand:

- player profiles
- DataStore
- persistence
- state recovery
- schema evolution
- migrations
- validation
- data integrity

---

# 26. S.16 — MULTIPLAYER / REPLICATION

MYNO must understand:

- server authority
- client authority boundaries
- replication
- RemoteEvents
- RemoteFunctions
- validation
- race conditions
- network ownership
- replication cost

---

# 27. S.17 — PERFORMANCE

MYNO should eventually reason about:

- memory
- CPU
- rendering
- network
- script execution
- object count
- replication
- streaming
- event frequency
- expensive loops
- unnecessary work

Performance should become an architectural concern.

---

# 28. S.18 — AUTONOMOUS TESTING

MYNO should eventually be able to:

- generate tests
- execute tests
- enter Play Mode
- inspect runtime
- inspect console output
- simulate interactions
- capture evidence
- detect failures
- repair
- re-run

Long-term loop:

Build
→ Test
→ Observe
→ Diagnose
→ Repair
→ Re-test

---

# 29. S.19 — MIGRATION / REFACTORING

MYNO must eventually safely handle:

- renaming
- moving
- restructuring
- API migration
- architecture migration
- legacy cleanup
- dependency updates

Refactoring must preserve behavior.

---

# 30. S.20 — PROJECT HYGIENE

MYNO should maintain:

- naming conventions
- folder organization
- unused artifact detection
- duplicate detection
- stale artifact cleanup
- documentation
- configuration hygiene
- consistent architecture

---

# 31. S.21 — ROBLOX SECURITY ARCHITECTURE

Security is architectural.

Important areas:

- prompt injection
- indirect injection
- tool abuse
- malicious tool arguments
- path traversal
- Studio isolation
- tenant isolation
- privilege boundaries
- secret leakage
- memory poisoning
- context poisoning
- model manipulation
- resource exhaustion
- destructive mutations
- verification bypass
- stale-state exploitation
- provider failures

Security policy must be deterministic.

---

# 32. S.22 — DESIGN SYSTEMS

MYNO should learn and preserve project style:

- colors
- typography
- spacing
- UI patterns
- naming
- visual language
- interaction conventions
- world-building conventions

---

# 33. S.23 — PROJECT MEMORY / DESIGN INTENT

MYNO should eventually remember:

- architecture decisions
- design decisions
- conventions
- project goals
- known constraints
- previous failures
- successful patterns
- intentional exceptions

Memory must be trusted, scoped, versioned, auditable, and protected
against poisoning.

---

# 34. S.24 — NOVEL / UNKNOWN PROBLEM SOLVER

MYNO must not be limited to a keyword list.

The goal is open-ended engineering reasoning.

When the user requests something not explicitly represented by an
existing capability, MYNO should:

1. Understand the desired outcome.
2. Decompose the problem.
3. Identify known primitives.
4. Identify unknown components.
5. Design a solution.
6. Determine required Roblox capabilities.
7. Test assumptions.
8. Implement safely.
9. Verify.
10. Learn from the result.

The objective is:

"Any technically executable Roblox engineering request within
platform/tool capabilities."

Not:

"Every possible request is guaranteed."

---

# 35. S.25 — GOLDEN ARCHITECTURE / SELF-REVIEW

After building a system, MYNO should ask:

- Is the architecture coherent?
- Are artifacts correctly placed?
- Are dependencies correct?
- Are server/client boundaries correct?
- Are security boundaries correct?
- Is the implementation duplicated?
- Is the solution unnecessarily complex?
- Is it maintainable?
- Does it match project conventions?
- Does it introduce technical debt?
- Is there a cleaner architecture?

Then it should either:

PASS

or

REFACTOR → VERIFY AGAIN

---

# 36. LEI — LUAU ENGINEERING INTELLIGENCE

LEI is a cross-cutting capability inside P3.6-S. It is NOT S.26.

LEI exists so MYNO can behave like an elite lifelong Luau/Roblox
engineer rather than a prompt that merely generates plausible code.

LEI must cover:

## Luau Semantics

- syntax and execution semantics
- scope and closures
- tables
- metatables and metamethods
- coroutines
- iterators
- functions
- modules
- error handling
- runtime behavior

## Type Mastery

- `--!strict`
- inference
- annotations
- unions
- intersections
- generics
- function and table types
- narrowing
- casts
- structural typing

## Roblox Luau Mastery

- services
- Instances
- DataModel
- Script / LocalScript / ModuleScript
- lifecycle
- signals
- Player / Character lifecycle
- UI
- physics
- animation
- data systems
- networking
- replication

## Client / Server Engineering

- server authority
- client authority boundaries
- remotes
- validation
- replication
- prediction
- exploit-resistant architecture

## Performance

- allocations
- tables
- loops
- event frequency
- garbage collection
- RunService
- parallel Luau
- Actors
- native codegen
- profiling before optimization

## Debugging

LEI must classify and debug:

- syntax errors
- type errors
- runtime errors
- logical errors
- lifecycle errors
- replication errors
- state errors
- memory issues
- performance issues

## Architecture

LEI must reason about:

- coupling
- cohesion
- module boundaries
- dependency direction
- API design
- extensibility
- maintainability
- scalability

Code working is not sufficient evidence that the architecture is correct.

## Security

LEI must understand:

- client trust boundaries
- remote validation
- authorization
- server authority
- exploit surfaces

## Refactoring and Review

LEI must support:

- safe refactoring
- API preservation
- dependency migration
- dead-code detection
- architecture migration
- regression prevention
- engineering code review

LEI is a:

Knowledge System + Curriculum + Evaluation System

not merely a model prompt.

Canonical learning structure:

Knowledge
→ Examples
→ Anti-patterns
→ Tests
→ Challenges
→ Failure Cases
→ Review Criteria

Target behavior:

Understand
→ Design
→ Generate
→ Review
→ Test
→ Debug
→ Optimize
→ Secure
→ Refactor
→ Invent

LEI must explicitly recognize uncertainty and validate important claims
against Roblox Studio/runtime evidence when possible.

---

# 37. SECURITY MODEL

Canonical future security pipeline:

UNTRUSTED INPUT
    ↓
VALIDATION
    ↓
CLASSIFICATION
    ↓
CONTEXT SECURITY BOUNDARY
    ↓
AGENT DECISION
    ↓
DETERMINISTIC POLICY
    ↓
AUTHORIZATION
    ↓
MUTATION TRANSACTION
    ↓
TOOL EXECUTION
    ↓
OBSERVATION
    ↓
VERIFICATION
    ↓
COMMIT / ROLLBACK
    ↓
AUDIT

This model applies to user content, project content, retrieved content,
tool outputs, provider outputs, and other untrusted inputs.

---

# 38. TASK RESOURCE BUDGETS

TPM is not sufficient.

MYNO must have task-level budgets for:

- model calls
- tool calls
- mutations
- created instances
- deleted instances
- runtime
- retries
- recovery attempts
- token consumption
- output size where applicable

Budgets must survive retries and recovery.

They must not reset between agent iterations.

---

# 39. EMERGENCY STOP

MYNO must have a deterministic emergency stop mechanism.

It must be capable of stopping:

- model loops
- tool loops
- retry loops
- mutation loops
- recovery loops

The model must not be able to override the emergency stop.

Production must also provide a controlled kill-switch/emergency mode
for customer, tenant, provider, task, and system scopes as appropriate.

---

# 40. MUTATION TRANSACTIONS

The long-term mutation model is:

PRECONDITION
    ↓
SNAPSHOT / EVIDENCE
    ↓
MUTATION
    ↓
OBSERVATION
    ↓
VERIFICATION
    ↓
COMMIT

or

ROLLBACK

Never claim rollback if the underlying system cannot actually restore
the previous state.

Dangerous/destructive operations require deterministic policy, explicit
scope, auditability, and recoverability.

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

Any prior report that calls a subsystem or partial phase "certified"
must not be interpreted as global P3.6 certification unless the final
gate below has actually been passed and evidenced.

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

Evidence must include real execution where the capability requires it,
not only mocks or static tests.

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

The registry is canonical. Older reports with different vector counts must
be reconciled into this registry rather than treated as separate standards.

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

"The defined tested system satisfies its defined invariants with the
defined evidence."

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

SAFE FAILURE WITH EXPLANATION

Autonomy must remain bounded by deterministic policy, authorization,
budgets, emergency stop, verification, and recovery controls.

---

# 48. P3.8 — PRODUCTION ENGINEERING PLATFORM

P3.8 turns the engineering foundation into a production-grade service.

Required direction:

Cloudflare
→ Reverse Proxy / Edge
→ MYNO API
→ Authentication
→ Authorization
→ Tenant Isolation
→ Entitlements
→ Credits / Usage Ledger
→ Payment Verification
→ Security / Abuse
→ Observability / Audit
→ Provider Gateway
→ Multi-Provider / Multi-Cloud Pool

PostgreSQL is the source of truth.

Redis may provide acceleration, caching, coordination, rate limiting,
and related non-authoritative functions as appropriate.

Desktop clients must never contain provider master secrets, payment
secrets, database credentials, or admin secrets.

---

# 49. PRODUCTION SOURCE / IP PROTECTION

When MYNO is deployed, source and intellectual property protection is a
first-class architectural requirement.

Required controls include:

- no provider/payment/database/admin secrets in clients
- secure server-side deployment
- least privilege
- secret rotation
- dependency and supply-chain security
- secure build/release pipeline
- controlled source maps and build artifacts
- no production debug backdoors
- production access auditability
- secure update mechanism
- environment separation
- credential and token lifecycle management

Production security must protect both customer data and MYNO's source/IP.

---

# 50. PAYMENT SECURITY

Payment and entitlement logic must be server-authoritative.

Required controls include:

- server-side payment verification
- signed/authenticated webhooks
- idempotency
- atomic entitlement/credit issuance
- reconciliation
- refunds
- chargebacks
- failed-payment handling
- duplicate-payment protection
- audit trail
- fraud/abuse monitoring
- never granting credits from a client claim

Payment state and credit state must be recoverable and auditable.

---

# 51. CREDIT SECURITY

Credits must be server-authoritative.

Required invariants:

- immutable/append-only ledger where practical
- atomic debit/credit
- idempotency
- replay protection
- race-condition protection
- duplicate-grant prevention
- negative-balance prevention
- reconciliation
- auditability

Daily credits:

- renew every 24 hours using authoritative server time
- renewal must be idempotent
- client clock changes must not affect eligibility
- reconnect/retry/replay must not duplicate renewal

Credit classes must be distinguishable, including purchased versus
daily/promotional credits, with explicit expiry, refund, and consumption
policy.

---

# 52. ANTI-MULTI-ACCOUNT / CREDIT FARMING

MYNO must reduce abuse from users creating multiple accounts on the same
computer or environment to farm daily credits.

This is a risk-control problem, not a promise of perfect identification.

Controls must be layered and lawful. They must NOT rely only on IP address
or device fingerprinting.

Possible signals include:

- account history
- device/environment risk
- session patterns
- network signals
- account creation patterns
- redemption/usage patterns
- velocity
- payment/account relationships
- abuse history

The design must account for:

- shared computers
- privacy
- false positives
- legitimate household/team use
- appeals and recovery

Risk controls should be proportional, observable, auditable, and adjustable.

---

# 53. MULTI-TENANCY / PRIVACY / DATA GOVERNANCE

Production architecture must support strong tenant isolation.

Required direction:

- explicit tenant identity
- authorization at tenant and resource boundaries
- no cross-tenant data access
- tenant-scoped jobs/tasks/logs/artifacts where applicable
- privacy-aware telemetry
- data retention policies
- deletion policies
- access/export mechanisms where required
- controlled administrative access
- auditability of sensitive operations

Customer data must not be used as uncontrolled agent context across tenants.

---

# 54. OBSERVABILITY / SRE

Production requires:

- SLIs/SLOs
- metrics
- structured logs
- tracing where appropriate
- provider health
- quota tracking
- cost tracking
- task/job health
- queue/backlog metrics
- error classification
- security-event telemetry
- audit logs

Observability must not leak secrets or unnecessary customer content.

Required operational capabilities include:

- incident response
- support workflows
- status communication
- provider outage handling
- backup monitoring
- restore drills
- disaster recovery
- deployment rollback
- migration safety
- canary/controlled rollout where appropriate
- secure application updates

---

# 55. SCALE / LOAD / CONCURRENCY

Before customer beta, MYNO must be tested for:

- many simultaneous users
- burst traffic
- sustained load
- concurrent autonomous jobs
- provider degradation
- provider quota pressure
- database pressure
- cache pressure
- rate limits
- queues and backlog
- cancellation
- recovery under load
- deployment during active usage

Capacity limits must be explicit and observable.

---

# 56. P3.9 — BETA READINESS

Beta is NOT a technical preview.

Beta is a real live customer/revenue test.

Therefore Beta requires:

- more than one cloud/provider path where appropriate
- multi-provider or multi-cloud capability
- readiness for many customers
- production-ready website
- production-ready end-user program/application
- completed pricing study
- pricing tested/validated before launch
- user-facing dashboard
- complete MYNO admin control panel
- full-project security/red-team completion
- real customer purchasing
- MYNO earning real revenue

The product must be operationally ready for actual customers, not merely
engineers or invited technical testers.

---

# 57. BETA HARD GATES

## Engineering

- Luau mastery / LEI evaluation
- Roblox architecture
- placement intelligence
- dependency analysis
- runtime execution
- autonomous debugging
- regression prevention
- performance
- multiplayer/replication
- real E2E execution

## Security

- full red team
- prompt injection
- tool abuse
- traversal
- secret leakage
- authorization/privilege boundaries
- Studio isolation
- tenant isolation
- resource exhaustion
- destructive-operation controls
- emergency stop
- rollback/recovery
- payment abuse
- credit abuse
- account farming
- supply-chain security

## Product

- onboarding
- website
- end-user program
- dashboard
- authentication
- UX
- error/recovery UX
- support
- usage/credits
- payment
- provider failover
- telemetry/diagnostics

## Infrastructure / Scale

- many simultaneous users
- burst load
- sustained load
- concurrent jobs
- provider degradation
- database/cache pressure
- rate limiting
- queues/backlog
- recovery
- deployment/rollback

## Economy

- real purchases
- real provider/infrastructure costs
- free-tier optimization
- unit economics
- revenue and margin measurement

## Customer Safety

- no uncontrolled destructive mutations
- deterministic dangerous-operation boundaries
- audit trail
- recoverability
- backup/version strategy

No Beta gate is considered passed merely because the UI exists. Each gate
requires appropriate evidence.

---

# 58. BETA LADDER

The customer rollout ladder is:

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

Each stage must have entry/exit criteria and rollback capability.

---

# 59. BETA ECONOMIC OPTIMIZATION

During Beta, MYNO should maximize practical, legitimate use of free cloud
provider/free-tier capacity without affecting MYNO performance or customer
experience.

Policy:

- maximize sustainable profitability
- use the largest practical legitimate free tiers where suitable
- never sacrifice performance for free-tier usage
- never sacrifice reliability
- never sacrifice security
- never sacrifice data integrity
- never sacrifice credit/payment integrity
- never sacrifice tenant isolation
- never sacrifice recoverability
- monitor quota and provider health
- intelligently route workloads
- maintain paid fallback paths
- keep free tiers as an economic optimization layer, not the sole reliability foundation

Pricing/service limits must remain clear. No deceptive degradation or hidden
performance penalty may be introduced to increase free-tier economics.

Track at minimum:

- Revenue
- Provider Cost
- Infrastructure Cost
- Payment Fees
- Support Cost
- Gross Margin
- Cost per Task
- Cost per Active Customer

---

# 60. ADMIN CONTROL PLANE

The production admin control plane must eventually manage, with least
privilege and full auditability:

- users
- tenants
- sessions
- credits
- credit ledger
- purchases
- refunds
- chargebacks
- usage
- provider health
- provider quotas
- provider costs
- infrastructure health
- security events
- abuse/risk
- rate limits
- feature flags
- emergency stop / kill switch
- incidents
- audit logs
- support
- controlled emergency operations

Admin actions must be authorization-protected, auditable, and designed
for safe recovery rather than unrestricted power.

---

# 61. PRE-BETA SECURITY SCOPE

The full project security review must cover the entire production path:

- agent
- context/memory
- tools
- Roblox Studio integration
- project/artifact handling
- provider gateway
- provider/model failures
- authentication
- authorization
- tenant isolation
- payment
- credits
- account abuse
- infrastructure
- deployment/update pipeline
- dependencies/supply chain
- admin control plane
- logging/audit
- emergency stop
- rollback/recovery

The canonical red-team registry in P3.6-RT is the minimum baseline and
must be extended when new attack surfaces appear.

---

# 62. LONG-TERM FUTURE

Beyond P3.7/P3.9, MYNO should evolve toward:

- team collaboration
- multi-user projects
- cloud execution
- remote agents
- project synchronization
- persistent project memory
- advanced visual intelligence
- autonomous QA
- advanced asset generation
- advanced world building
- performance analysis
- security analysis
- architecture migration
- project-wide refactoring
- provider pools
- distributed task execution
- production-grade customer operations

---

# 63. GIT SAFETY

Never blindly execute:

git add .
git reset --hard
git clean
mass deletion
mass overwrite

Unrelated dirty work must be preserved.

Before committing:

- inspect status
- inspect diff
- inspect changed filenames
- inspect staged changes
- ensure no secrets
- ensure logical grouping

Never push unless explicitly requested.

---

# 64. SECRETS

API keys exposed during development must be treated as compromised.

Never echo secrets.

Never commit:

- API keys
- provider secrets
- database passwords
- payment secrets
- admin secrets
- private credentials

Use environment/configuration mechanisms appropriate to deployment.

---

# 65. TESTING PHILOSOPHY

Tests are evidence, not the goal.

A green suite is insufficient if:

- architecture is wrong
- runtime behavior is wrong
- security boundary is bypassable
- verification is superficial
- tests are weakened
- important paths are untested

Use:

- unit tests
- integration tests
- E2E tests
- adversarial tests
- runtime tests
- architecture tests
- regression tests
- load/concurrency tests
- payment/credit integrity tests
- recovery/restore tests
- production-like tests

Evidence must identify what was tested, how it was tested, and what scope
that evidence actually supports.

---

# 66. KNOWN LIMITATIONS / STATE LANGUAGE

MYNO must never claim capabilities that are not implemented.

Important distinctions:

"Designed"

≠

"Implemented"

"Implemented"

≠

"Verified"

"Verified"

≠

"Certified"

"Certified"

≠

"Impossible to break"

A plan or requirement recorded in this document is not evidence that the
corresponding implementation exists.

---

# 67. ARCHITECTURAL RULE

Avoid feature-specific hacks.

Bad:

if task contains "RGB name" then place LocalScript in X

Good:

Intent
→ ArtifactKind
→ Runtime ownership
→ Placement policy
→ Dependency analysis
→ Mutation plan
→ Verification

The same architecture should generalize to future Roblox systems.

---

# 68. PROJECT MEMORY RULE

This document is canonical project memory.

When architectural decisions change:

1. Update this document.
2. Record what changed.
3. Record why.
4. Record the old assumption if relevant.
5. Record the new invariant.
6. Ensure AGENTS.md continues to point to this document.

Never allow the implementation and project memory to silently diverge.

---

# 69. AGENT STARTUP PROTOCOL

Before making significant changes:

1. Read AGENTS.md.
2. Read MYNO_PROJECT_MEMORY.md.
3. Inspect git status.
4. Determine current phase.
5. Determine current architecture.
6. Inspect relevant implementation.
7. Identify constraints.
8. Plan changes.
9. Implement only approved scope.
10. Test.
11. Verify.
12. Self-review.
13. Update project memory if architecture/state changed.

Before crossing a roadmap gate, collect evidence specific to that gate.
Do not infer certification from unrelated green tests.

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

"Understand Roblox engineering deeply enough to build and evolve
complete Roblox projects autonomously, safely, correctly, and
architecturally."

MYNO should eventually make complex Roblox engineering feel like:

Describe the goal.
MYNO understands the system.
MYNO builds it.
MYNO tests it.
MYNO fixes it.
MYNO verifies it.
MYNO explains it.

The system should be impressive not because it produces a lot of code,
but because it demonstrates genuine engineering intelligence.

---

# 72. ULTIMATE GAME-BUILDING INTELLIGENCE

The long-term target expands beyond engineering correctness into complete
Experience creation. MYNO should eventually reason about the player-facing
product as well as the implementation.

This is a capability direction, not a claim that all capabilities already
exist.

## 72.1 Game Design Intelligence

MYNO should understand and evaluate:

- core fantasy
- core gameplay loop
- player motivation
- onboarding
- progression
- difficulty curve
- rewards
- quests/missions
- economy
- social interaction
- replayability
- content pacing
- session structure
- retention risks
- monetization design
- player clarity and friction

The system should transform:

PLAYER GOAL
→ GAME DESIGN
→ SYSTEM DESIGN
→ TECHNICAL ARCHITECTURE
→ CONTENT PLAN
→ IMPLEMENTATION
→ PLAYTEST
→ ITERATION

A technically correct game is not automatically a good game.

## 72.2 Creative / Visual / Taste Intelligence

MYNO should eventually evaluate player-facing quality, including:

- composition
- visual hierarchy
- lighting
- color harmony
- material consistency
- scale consistency
- prop density
- landmark quality
- navigation/readability
- focal points
- repetition
- empty or dead spaces
- UI hierarchy
- animation feel
- VFX readability
- audio feedback
- environmental storytelling

The system should support an iterative visual loop:

BUILD
→ CAPTURE EVIDENCE
→ CRITIQUE
→ REPAIR
→ RE-CAPTURE
→ COMPARE
→ POLISH

"Functional" must never be treated as synonymous with "finished".

## 72.3 Polish / Taste Passes

Where applicable, MYNO should progress through explicit quality passes:

1. Functional
2. Correct
3. Consistent
4. Readable
5. Polished
6. Immersive
7. Professional

A gate may not be marked complete merely because functionality exists.

## 72.4 Autonomous Player Intelligence

MYNO should eventually be able to operate a game as a synthetic player,
using controlled inputs and observations to evaluate:

- onboarding
- navigation
- objectives
- interaction
- combat or job loops
- progression
- failure/recovery
- UI clarity
- rewards
- social systems
- economy interactions
- edge cases

Synthetic players should be used as evidence generators, not as an excuse
to skip deterministic tests or real player validation.

## 72.5 Game / Economy Simulation

For systems where it is useful, MYNO should simulate representative player
populations and game states to evaluate:

- progression speed
- reward rates
- currency generation/sinks
- inflation
- item rarity
- shop pricing
- grind/friction
- economy stability
- monetization pressure
- content consumption

Simulation results are hypotheses/evidence, not guaranteed predictions of
real player behavior.

## 72.6 Content Factory

MYNO should eventually support reusable content-generation primitives for:

- asset families
- building families
- prop families
- road systems
- biome variants
- zones
- NPC archetypes
- quest templates
- item families
- UI patterns
- VFX/audio patterns

Generated content must be curated against project style, gameplay needs,
performance budgets, licensing/asset policy, and deterministic placement
rules. Generation must not become uncontrolled duplication.

---

# 73. CREATIVE ENGINEERING LOOP

The canonical long-term Experience-building loop is:

INTENT
→ DESIGN
→ ARCHITECT
→ BUILD
→ OBSERVE
→ PLAY
→ EVALUATE
→ CRITIQUE
→ IMPROVE
→ VERIFY
→ POLISH
→ RELEASE
→ MEASURE
→ LEARN
→ EVOLVE

This loop extends the existing engineering pipeline rather than replacing
its security, authorization, verification, or recovery controls.

The system should be able to distinguish three independent truths:

TECHNICAL TRUTH
Does it work?

DESIGN TRUTH
Does it satisfy the intended player/game design?

EXPERIENCE TRUTH
Is the resulting player experience good enough for the intended audience?

None of these automatically proves the others.

---

# 74. FULL GAME LIFECYCLE INTELLIGENCE

The long-term lifecycle is:

IDEA
→ DESIGN
→ PROTOTYPE
→ VERTICAL SLICE
→ PRODUCTION
→ CONTENT EXPANSION
→ QA
→ OPTIMIZATION
→ SECURITY
→ RELEASE CANDIDATE
→ PUBLISH
→ LIVE MONITORING
→ LEARNING
→ UPDATE
→ LIVEOPS
→ EVOLUTION

MYNO should remain useful after publishing rather than treating publish as
the end of the task.

Post-release intelligence should eventually combine telemetry, diagnostics,
player feedback, controlled experiments, and engineering evidence to guide
updates.

No post-release automation may bypass the same authorization, mutation,
verification, audit, rollback, and emergency-stop controls used before release.

---

# 75. RELEASE ENGINEERING + LIVEOPS

Publishing is an engineering lifecycle, not a final button click.

MYNO should eventually manage or assist with:

- release candidates
- versioning
- staging
- controlled rollout
- canary/limited release where supported
- publish validation
- post-publish health checks
- rollback
- migration safety
- compatibility checks
- incident response
- hotfix workflows
- release notes/change tracking
- live configuration safety
- emergency shutdown

Long-term release loop:

BUILD
→ RELEASE CANDIDATE
→ VERIFY
→ PUBLISH
→ POST-PUBLISH VERIFY
→ OBSERVE
→ DETECT
→ DIAGNOSE
→ PATCH
→ VERIFY
→ RELEASE

MYNO must never claim a published build is healthy merely because the
publish operation itself succeeded.

---

# 76. DEFINITION OF DONE

MYNO must use explicit, scope-aware completion states.

A useful canonical distinction is:

BUILT
= required artifacts/mutations were produced.

VERIFIED
= required technical and runtime evidence confirms the defined behavior.

POLISHED
= player-facing quality passes satisfy the applicable quality criteria.

RELEASE-CANDIDATE
= required engineering, security, design, QA, and release gates passed.

RELEASED
= the intended build was actually published and post-publish checks passed.

SUCCESSFUL
= real-world evidence demonstrates the intended product outcome for the
relevant scope; this is not established by code tests alone.

COMPLETE
= all applicable requirements and gates for the requested scope are
satisfied with evidence.

These states must never be collapsed into one boolean such as `done=true`.

---

# 77. QUALITY GATE MODEL

For a full Experience request, applicable gates should cover:

## Design
- player fantasy
- core loop
- progression
- economy
- content plan
- onboarding
- retention risks

## Engineering
- architecture
- placement
- dependencies
- runtime
- persistence
- multiplayer
- performance
- maintainability

## Creative
- world composition
- visual consistency
- UI/UX
- animation
- VFX
- audio
- readability
- polish

## Safety
- security
- authorization
- destructive-operation controls
- data integrity
- exploit resistance
- recovery

## Validation
- automated tests
- runtime tests
- synthetic playtests
- regression
- adversarial tests
- production-like validation

## Release
- release candidate
- publish validation
- post-publish verification
- observability
- rollback readiness

Only the gates applicable to the actual request need to be satisfied, but
none may be silently omitted when they are relevant.

---

# 78. EVIDENCE GRAPH

MYNO should eventually maintain an Evidence Graph connecting:

REQUIREMENT
→ DESIGN DECISION
→ ARCHITECTURE DECISION
→ ARTIFACT
→ MUTATION
→ TEST
→ OBSERVATION
→ RESULT
→ VERIFICATION
→ RELEASE

Evidence must be timestamped or version-scoped where freshness matters.

This allows MYNO to answer:

- Why does this artifact exist?
- Which requirement does it satisfy?
- What evidence proves it works?
- Which release contains it?
- What changed since the last verified state?
- What is currently unverified?

The Evidence Graph is intended to reduce hallucinated completion claims and
make autonomous engineering auditable.

---

# 79. PLAYER EXPERIENCE MEMORY

Project memory should eventually distinguish engineering memory from player
experience memory.

Engineering memory may include:

- architecture decisions
- dependencies
- migrations
- failures
- successful patterns
- known constraints

Experience memory may include:

- intended audience
- design goals
- player pain points
- onboarding observations
- playtest findings
- visual direction
- economy assumptions
- content priorities
- release outcomes

Experience memory must remain scoped to the project/tenant and protected
against poisoning. Player-derived observations are evidence with uncertainty,
not unquestionable truth.

---

# 80. HUMAN INTENT PRESERVATION

MYNO must preserve the user's intended creative outcome while using its own
engineering judgment to improve implementation.

The system may challenge:

- unsafe designs
- technically impossible assumptions
- contradictory requirements
- poor architecture
- severe performance risks
- exploitable designs

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

The goal is not to remove humans from meaningful creative ownership.
The goal is to remove unnecessary engineering friction while preserving
control, safety, evidence, and intent.

---

# 82. CURRENT VISION MILESTONE — EXPERIENCE-COMPLETE MYNO

A major architectural vision decision is now recorded:

MYNO's long-term target is not only Universal Roblox Engineering Intelligence,
but an Experience-Complete system capable, when the required capabilities
are implemented and verified, of taking a high-level game goal through:

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

This does NOT create a new roadmap gate or authorize skipping P3.6.
Instead, these capabilities become the target architecture that P3.6-S,
P3.6-R, P3.6-RT, P3.6-CERTIFIED, P3.7, P3.8, and P3.9 must progressively
make real.

The implementation remains governed by:

LLM proposes.
Deterministic systems decide.

---

# END OF CANONICAL MEMORY
