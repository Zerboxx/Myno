# MYNO — Project Memory & Engineering Constitution

> Canonical project memory.
>
> This document is the long-term source of truth for MYNO's vision,
> architecture, engineering decisions, roadmap, current state,
> security principles, and agent operating rules.
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

---

# 7. CURRENT ARCHITECTURE

MYNO currently uses:

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

The system should support multiple providers and models.

No provider-specific logic should leak deeply into the agent architecture.

Provider failures must be classified and handled deterministically.

Model selection must track the effective model actually used.

Never display a configured model as the effective model if a fallback
model was actually used.

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
- privilege boundaries
- secret leakage
- memory poisoning
- context poisoning
- model manipulation
- resource exhaustion
- destructive mutations
- verification bypass

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

Memory must be trusted, scoped, versioned, and protected against
poisoning.

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

# 36. SECURITY MODEL

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

---

# 37. TASK RESOURCE BUDGETS

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

# 38. EMERGENCY STOP

MYNO must have a deterministic emergency stop mechanism.

It must be capable of stopping:

- model loops
- tool loops
- retry loops
- mutation loops
- recovery loops

The model must not be able to override the emergency stop.

---

# 39. MUTATION TRANSACTIONS

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

Never claim rollback if the underlying system cannot actually
restore the previous state.

---

# 40. CURRENT P3.6-S SECURITY/CORRECTNESS LESSONS

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

---

# 41. P3.6 STATUS

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

Certification must be based on the complete final gate.

---

# 42. CANONICAL ROADMAP

The agreed high-level roadmap is:

P3.6-S
    ↓
Complete S.1 → S.25
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

---

# 43. P3.6-R

P3.6-R is Runtime Stabilization.

Focus:

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

---

# 44. P3.6-RT

P3.6-RT is the final hostile security phase.

The system should be attacked against:

- prompt injection
- indirect prompt injection
- malicious project content
- malicious tool outputs
- path traversal
- tool abuse
- privilege escalation
- destructive operations
- budget bypass
- retry storms
- recovery loops
- context poisoning
- memory poisoning
- cross-Studio access
- verification bypass
- stale-state exploitation
- provider/model failures
- resource exhaustion

Every discovered issue follows:

REPRODUCE
→ CLASSIFY
→ FIX
→ TEST
→ RE-ATTACK
→ PASS/BLOCK

---

# 45. P3.6-CERTIFIED

Certification means:

The defined P3.6 scope has passed:

- correctness tests
- security tests
- runtime tests
- integration tests
- adversarial tests
- build gates
- verification gates
- architecture review

Certification is scope-bound.

It does not mean:

"MYNO can never fail."

It means:

"The defined tested system satisfies its defined invariants."

---

# 46. P3.7 — AUTONOMOUS EXECUTION

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

---

# 47. LONG-TERM FUTURE

Beyond P3.7, MYNO should evolve toward:

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

---

# 48. CLOUD ARCHITECTURE DIRECTION

Long-term:

Cloudflare
    ↓
Reverse Proxy
    ↓
MYNO API
    ↓
Authentication
    ↓
Authorization
    ↓
Entitlements
    ↓
Credits / Usage
    ↓
Security
    ↓
Provider Gateway
    ↓
Provider Pool

PostgreSQL:
Source of truth.

Redis:
Acceleration / caching / coordination.

The desktop client should NOT contain:

- provider master secrets
- payment secrets
- admin secrets
- database credentials

Server-side secrets must remain server-side.

---

# 49. FUTURE PRODUCT ROADMAP

Long-term product phases may include:

P4.0 Future-Ready Platform
P4.1 Backend Foundation
P4.2 Identity / Authentication
P4.3 Authorization
P5 Admin Control Plane
P6 Economy / Website / Payments
P7 Premium UX
P8 Visual Intelligence
P9 Advanced Builder
P10 Autonomous QA
P11 Production Infrastructure
P12 Production Security / IP Protection
P13 Closed Beta / Launch

These phases must not distract from completing the engineering
foundation first.

---

# 50. GIT SAFETY

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

# 51. SECRETS

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

# 52. TESTING PHILOSOPHY

Tests are evidence, not the goal.

A green suite is insufficient if:

- architecture is wrong
- runtime behavior is wrong
- security boundary is bypassable
- verification is superficial
- tests are weakened
- important paths are untested

Use:

Unit tests
Integration tests
E2E tests
Adversarial tests
Runtime tests
Architecture tests
Regression tests

---

# 53. KNOWN LIMITATIONS

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

---

# 54. ARCHITECTURAL RULE

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

# 55. PROJECT MEMORY RULE

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

# 56. AGENT STARTUP PROTOCOL

Before making significant changes:

1. Read AGENTS.md.
2. Read MYNO_PROJECT_MEMORY.md.
3. Inspect git status.
4. Determine current phase.
5. Determine current architecture.
6. Inspect relevant implementation.
7. Identify constraints.
8. Plan changes.
9. Implement.
10. Test.
11. Verify.
12. Self-review.
13. Update project memory if architecture/state changed.

---

# 57. CURRENT DECISION

The current canonical direction is:

COMPLETE P3.6-S
    ↓
S.1 → S.25
    ↓
P3.6-R
    ↓
P3.6-RT
    ↓
P3.6-CERTIFIED
    ↓
P3.7

Do not skip the S.1-S.25 intelligence foundation.

---

# 58. FINAL PRINCIPLE

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

# END OF CANONICAL MEMORY