# MYNO — Roblox Engineering Intelligence

MYNO is being built as a **Roblox-specialized engineering intelligence platform**.
Its target is not simply generating Luau code; it is understanding, designing,
building, testing, debugging, optimizing, securing, verifying, polishing,
releasing, and evolving complete Roblox experiences.

## Ultimate Target

The long-term target is:

> **100% Luau capability + 100% Roblox engineering coverage within a defined,
> evidence-based mastery scope.**

This does **not** mean a literal guarantee of perfect or infinite knowledge.
"100%" is a benchmarked engineering state: every declared mastery domain must
have curriculum coverage, unseen challenges, regression tests, and runtime evidence
where runtime behavior matters. Unsupported mastery claims are not accepted.

The end-state spans:

- **Luau:** semantics, strict typing, runtime behavior, concurrency, memory,
  debugging, performance, architecture, refactoring, and API design.
- **Roblox engineering:** Studio/DataModel, services, lifecycle, placement,
  networking/replication, persistence, UI/UX, physics, animation, VFX/audio,
  NPC/AI, gameplay systems, world building, level design, security, performance,
  testing, release engineering, and LiveOps.
- **Experience quality:** game design, player experience, visual quality,
  simulation, autonomous playtesting, polish, and post-release evolution.

## Engineering Philosophy

**LLM proposes. Deterministic systems decide.**

MYNO must keep authorization, Studio/tenant identity, mutation scope, security,
budgets, verification, rollback/recovery, and final completion state outside the
model's unchecked authority.

The canonical engineering loop is:

`INTENT → CLASSIFY → INSPECT → INTELLIGENCE → DECIDE → ARCHITECT → PLAN →
AUTHORIZE → EXECUTE → OBSERVE → VERIFY → REPAIR → RE-VERIFY → REVIEW → MEMORY`

For player-facing work this expands into:

`INTENT → DESIGN → ARCHITECT → BUILD → PLAY → EVALUATE → CRITIQUE → IMPROVE →
VERIFY → POLISH → RELEASE → MEASURE → LEARN → EVOLVE`

## Current Roadmap

`P3.6-S → P3.6-R → P3.6-RT → P3.6-CERTIFIED → P3.7 → P3.8 → P3.9 →
P4.0 Luau + Roblox Mastery → Pre-Beta Gates → Customer Beta Ladder → Public Release Decision`

### Current phase

MYNO remains in **P3.6-S — Intelligence Foundation** until the defined gate is
actually evidenced. LEI is a cross-cutting P3.6-S capability, not S.26.

Current priority is to complete the intelligence foundation, then prove runtime
reliability, red-team resilience, and certification before later execution/product
and mastery phases are treated as active.

## Intelligence Foundation

P3.6-S contains S.1–S.25:

- Artifact Intelligence
- Architecture Graph
- Placement Intelligence
- Dependency / Communication
- Architecture Mutation
- Architecture Verification
- Systems Engineering
- Environment / Terrain
- Asset / Spatial Construction
- Visual Intelligence
- Gameplay / Interaction
- NPC / AI
- UI / UX
- Animation / VFX / Audio
- Data / Persistence
- Multiplayer / Replication
- Performance
- Autonomous Testing
- Migration / Refactoring
- Project Hygiene
- Roblox Security Architecture
- Design Systems
- Project Memory / Design Intent
- Novel / Unknown Problem Solver
- Golden Architecture / Self-Review

LEI connects the foundation to a formal Luau/Roblox knowledge, curriculum,
evaluation, benchmark, and runtime-evidence model.

## Evidence & Quality

MYNO distinguishes:

`Designed ≠ Implemented ≠ Verified ≠ Certified ≠ Mastered`

Tests are evidence, not certification by themselves. Mastery is demonstrated by
repeatable success on new problems with scope-specific evidence. Runtime-dependent
claims require real Studio/runtime evidence where applicable.

## Development Direction

The architecture is provider-neutral and cloud-first, with replaceable model/provider
abstractions. Roblox Studio integration is treated as a scoped, explicit runtime
boundary rather than an implicit global session.

Typical development commands are:

```bash
npm install
npm run build
npm run typecheck
npm test
```

See `AGENTS.md` for mandatory agent operating rules and
`MYNO_PROJECT_MEMORY.md` for the canonical long-term architecture, roadmap,
invariants, evidence model, and project state.

## Important

Future capabilities documented here are **targets**, not proof of implementation.
A capability is considered real only when its defined implementation and evidence
gates have actually passed.

MIT
