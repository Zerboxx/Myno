# MYNO — Quality & Certification Standard

> Quality doctrine for MYNO outputs and future certification. Complements P3.6 evidence gates and does not replace `P3_6_CERTIFICATION_MATRIX.md`.

## 1. Objective
Ensure MYNO does not confuse “generated” with “good”, or “completed” with “verified”.

## 2. Quality Contract
Every meaningful output should be evaluated against applicable dimensions:
- requirement fidelity
- technical correctness
- Luau/Roblox architecture
- placement and dependency correctness
- security
- performance
- maintainability
- visual/spatial quality
- gameplay/player experience
- runtime behavior
- project consistency

## 3. Strong Option Integrity
When MYNO presents multiple strategic options, labels such as “strongest”, “premium”, or “highest quality” must correspond to measurable scope, implementation effort, verification requirements, and expected outcome—not marketing language.

Higher-quality choices may consume more resources, but must remain bounded by explicit economics and customer-visible scope.

## 4. Completion States
Keep distinct:
`PROPOSED ≠ DESIGNED ≠ IMPLEMENTED ≠ OBSERVED ≠ VERIFIED ≠ CERTIFIED`

A model statement cannot by itself promote an output between states.

## 5. Acceptance Criteria
Before declaring a task complete, define applicable acceptance criteria before or during planning. Verification should test the requested outcome, not merely the existence of generated artifacts.

## 6. Evidence Ladder
Preferred progression:
`STATIC CHECK → STRUCTURAL TEST → INTEGRATION TEST → RUNTIME OBSERVATION → ADVERSARIAL/EDGE TEST → HUMAN/EXPERIENCE REVIEW`

Not every task requires every layer; the declared claim determines the required evidence.

## 7. Anti-Fake-Completion Controls
MYNO must resist:
- placeholder implementations presented as final
- untested code presented as working
- screenshots presented as runtime proof
- stale observations presented as current
- partial success hidden as full success
- verification bypass through model confidence

UNKNOWN and PARTIAL_SUCCESS must remain honest terminal outcomes where evidence requires them.

## 8. Regression Discipline
Important fixes and discovered bypasses should become regression cases where practical. Quality improvements must not silently break earlier guarantees.

## 9. Experience Quality
For maps and player-facing work, evaluate where applicable:
- readability and navigation
- composition and landmarks
- scale consistency
- interaction feedback
- progression clarity
- visual hierarchy
- performance under intended conditions
- consistency with project design intent

## 10. Quality vs Economics
Quality optimization must not create unlimited hidden cost. Strategic options should use bounded planning, cost estimation, credit reservation where applicable, and stop conditions.

The goal is:
**maximum justified customer value within controlled unit economics**, not unlimited compute.

## 11. Certification Boundary
Certification is scoped. A passing certification must identify:
- what was tested
- evidence source/date
- environment/version
- known gaps
- untested dimensions

Never extrapolate a local passing result into universal quality or security.

## 12. Final Principle
**MYNO earns the right to claim quality through evidence proportional to the claim.**


---

## 13. Real Roblox Runtime / E2E Validation
For claims involving actual Roblox behavior, the quality ladder should progress beyond static structure whenever the required environment is available:

`STATIC → INTEGRATION → STUDIO/RUNTIME → INTERACTION SCENARIO → REGRESSION → ADVERSARIAL EDGE CASE`

Real runtime validation should observe applicable:
- startup/load success
- runtime errors
- expected artifact behavior
- client/server behavior
- replication/multiplayer interactions
- player-facing flows
- performance/resource behavior
- repair effectiveness after failure

A successful static test must never be presented as proof of a real Studio or live runtime result.

## 14. Project Version Quality Boundaries
Meaningful quality claims should identify the project/version/checkpoint they apply to. When MYNO performs substantial mutation, quality evidence should be tied to a known before/after state so regressions and restoration decisions remain explainable.

## 15. Release Experiment Quality
Feature-flagged or staged capabilities must be evaluated separately from globally released capabilities. An experiment's positive result should include measurable success criteria, failure criteria, cost impact, safety observations, and rollback conditions before broader rollout.

## 16. Abuse-Resistant Quality
Product quality includes resistance to predictable abuse. For customer-facing financial/resource systems, acceptance criteria should consider duplicate actions, replay, races, automation, invalid state transitions, and attempts to obtain value without corresponding authorization.