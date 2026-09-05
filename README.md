# MYNO

> **Universal Roblox Engineering Intelligence Platform**

MYNO is being built to become an AI engineering system for the Roblox ecosystem — not merely an assistant that writes Luau.

The long-term goal is to help transform a natural-language objective into a complete, evidence-driven engineering workflow:

**Understand → Inspect → Design → Plan → Build → Test → Observe → Verify → Repair → Optimize → Evolve**

MYNO is designed to understand Roblox projects as interconnected systems spanning Luau, architecture, gameplay, UI/UX, environments, networking, persistence, performance, security, testing, debugging, and future live evolution.

> **Core principle: LLMs propose. Deterministic systems decide.**

---

## What MYNO Is Becoming

A mature MYNO workflow should be able to:

- Understand a user's technical goal in natural language.
- Inspect an existing Roblox project and its architecture.
- Build an Architecture Graph of artifacts, ownership, dependencies, communication, lifecycle, and security boundaries.
- Decompose goals into verifiable engineering tasks.
- Determine correct Roblox placement and runtime ownership.
- Create bounded mutation plans before changing a project.
- Execute through explicit Studio-scoped tooling.
- Observe real results instead of trusting generation alone.
- Perform structural and semantic verification.
- Diagnose failures and attempt bounded repair.
- Preserve useful project knowledge and design intent.
- Continuously improve through evidence without allowing untrusted memory or model output to become authority.

The ambition is broad Roblox engineering coverage with evidence-based boundaries — **not a promise that an AI can solve every possible problem without verification**.

---

## Engineering Pipeline

```text
USER REQUEST
  ↓
SEMANTIC INTENT
  ↓
TASK CLASSIFICATION
  ↓
PROJECT INSPECTION + INTELLIGENCE
  ↓
ARCHITECTURE GRAPH
  ↓
ARTIFACT DECOMPOSITION
  ↓
PLACEMENT / OWNERSHIP
  ↓
DEPENDENCY + COMMUNICATION ANALYSIS
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
ROLLBACK / RECOVERY WHEN ACTUALLY SUPPORTED
  ↓
ARCHITECTURE REVIEW
  ↓
EVIDENCE + PROJECT MEMORY
```

A foundational rule throughout the project:

> **A plan is not execution. Execution is not verification. Verification is not certification.**

---

## Current Direction

MYNO is architected around:

- TypeScript / Node.js
- Electron desktop shell
- Provider-neutral AI architecture
- Provider Registry and Provider Gateway
- Model routing and reliability-aware failover
- Cloud-first inference strategy
- Roblox Studio MCP integration
- Autonomous task state machine
- Structured planning and bounded execution
- Architecture and Artifact Intelligence
- Roblox placement intelligence
- Dependency and communication analysis
- Mutation planning and transaction boundaries
- Semantic verification and artifact reconciliation
- Action journaling and auditability
- Context engineering and persistent project intelligence
- Metadata-driven skills
- Security lifecycle controls
- Task-level resource budgets
- Cancellation and deterministic emergency stops
- Multi-Studio isolation

Provider implementations are replaceable. MYNO remains the orchestrator and decision authority rather than allowing a model provider to become the system's architectural center.

---

## Roblox Intelligence Scope

The roadmap targets deep capability across the Roblox engineering lifecycle, including:

### Luau & Software Engineering
- Strict typing and Luau semantics
- Modules and API design
- Debugging and failure classification
- Refactoring and migration
- Performance and maintainability
- Code review and anti-pattern detection

### Roblox Architecture
- Artifact classification
- Script placement and runtime ownership
- Architecture graphs
- Dependencies and communication
- Replication and lifecycle reasoning
- Change-impact analysis

### Game & Systems Engineering
- Gameplay loops
- Economy and progression
- Inventory and quests
- Combat and interactions
- NPC and AI systems
- Data and persistence
- Multiplayer systems

### World & Experience Creation
- Environment and terrain
- Spatial construction
- Assets and reusable content primitives
- Visual composition
- UI/UX
- Animation, VFX, and audio feedback

### Quality, Safety & Operations
- Autonomous testing
- Runtime observation
- Semantic verification
- Security architecture
- Performance analysis
- Project hygiene
- Recovery and bounded repair
- Architecture self-review

---

## Security Philosophy

MYNO treats model output, tool output, project content, memory, retrieved information, and user input as potentially untrusted.

Security-sensitive decisions should not depend on a model simply claiming that an action is safe.

The intended boundary is:

```text
UNTRUSTED INPUT
  ↓
VALIDATE / CLASSIFY
  ↓
MODEL PROPOSAL
  ↓
DETERMINISTIC POLICY
  ↓
AUTHORIZATION
  ↓
BOUNDED EXECUTION
  ↓
OBSERVATION
  ↓
VERIFICATION
  ↓
AUDIT / RECOVERY
```

Key architectural principles include:

- Explicit Studio identity; no global active-Studio assumption.
- Fail-closed behavior when security-critical facts are unavailable.
- Bounded task budgets and recovery attempts.
- Deterministic emergency-stop controls.
- Explicit authorization boundaries for destructive actions.
- Path and tool-argument hardening.
- Honest rollback capability reporting.
- Server-authoritative design principles for Roblox gameplay.
- No trust in client-reported financial or entitlement state.
- Evidence and audit trails for meaningful operations.

---

## Project Status

MYNO is under active development and follows a gated roadmap.

**Current transition:**

```text
P3.6-S — Universal Roblox Intelligence
        ↓
P3.6-S-CLOSE — Security / correctness hardening ✅
        ↓
P3.6-R — Reliability ← CURRENT NEXT PHASE
        ↓
P3.6-RT — Red Team
        ↓
P3.6-CERTIFIED
        ↓
P3.7 → P3.8 → P3.9
        ↓
Pre-Beta Gates → Customer Beta Ladder → Public Release Decision
```

The completed P3.6-S-CLOSE checkpoint established and tested important security/correctness boundaries, including deterministic emergency stops, task budgets, destructive-action policy controls, mutation transaction boundaries, canonical red-team vectors, path hardening, and multi-Studio isolation.

This does **not** mean the entire product is production-certified. MYNO deliberately distinguishes:

```text
Designed ≠ Implemented ≠ Verified ≠ Certified
```

See the canonical governance and audit documents for exact scope and evidence.

---

## Repository Guide

| Path | Purpose |
|---|---|
| `MYNO_PROJECT_MEMORY.md` | Canonical project vision, architecture, roadmap, invariants, and long-term engineering memory |
| `AGENTS.md` | Mandatory operating rules for AI agents and contributors modifying MYNO |
| `src/agent/` | Agent orchestration, execution lifecycle, planning, budgets, intelligence, verification |
| `src/agent/roblox/` | Roblox-specific intelligence, policy, mutation, verification, and security logic |
| `src/tools/` | Tool abstractions and integrations |
| `src/tools/roblox/` | Roblox Studio tooling and path/tool safety |
| `src/router/` | Model and reliability routing |
| `src/providers/` | Provider abstraction and implementations |
| `config/` | Versioned configuration and model catalog |
| `desktop/` | Electron desktop application components |

Before making architectural changes, contributors and coding agents should read:

1. `MYNO_PROJECT_MEMORY.md`
2. `AGENTS.md`

---

## Development

Typical development commands include:

```bash
npm install
npm run dev
npm test
npm run build
npm run desktop:build
node scripts/verify.mjs
```

Exact provider and runtime configuration should be treated as environment-specific and may evolve as the provider architecture evolves.

Do not commit real credentials or secrets. Use local environment configuration and safe templates only.

---

## Engineering Rules

When contributing to MYNO:

- Preserve unrelated working-tree changes.
- Do not bypass roadmap gates.
- Do not weaken tests merely to obtain a green result.
- Do not treat model output as a security authority.
- Do not introduce hidden global Studio state.
- Do not claim rollback when restoration is unsupported.
- Do not claim verification or certification without evidence.
- Prefer stable contracts over provider-specific coupling.
- Build for evolution where change is reasonably foreseeable.
- Keep implementation, evidence, limitations, and assumptions explicit.

---

## Vision

The destination is not “an AI chatbot for Roblox scripting.”

The destination is an engineering intelligence capable of understanding the difference between:

- generating code and integrating a system,
- creating an object and placing it correctly,
- executing a mutation and proving the intended outcome,
- passing a test and demonstrating real-world correctness,
- remembering information and trusting it,
- using multiple AI providers and surrendering architectural control.

MYNO's long-term objective is to become a deeply capable, provider-neutral Roblox engineering platform that can help take projects from an idea through architecture, implementation, verification, iteration, and eventual release — while remaining bounded by deterministic policy, evidence, and real engineering constraints.

---

## License

MIT
