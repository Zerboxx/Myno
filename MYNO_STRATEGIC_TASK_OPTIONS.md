# MYNO — Strategic Task Options & Client Decision Checkpoints

> **Status:** `PLANNED`
>
> **Purpose:** Define a bounded decision layer for large, expensive, ambiguous, high-impact, or potentially irreversible MYNO tasks where the customer should choose among a small number of viable execution strategies before MYNO commits significant resources.
>
> **Authority:** This document extends the product/UX, agent-orchestration, financial, security, and verification direction already defined by `MYNO_PROJECT_MEMORY.md`, `AGENTS.md`, and `MYNO_MASTER_EXECUTION_PLAN.md`. It does not replace them, alter the canonical roadmap, or authorize implementation outside the currently open roadmap gate.
>
> **Core principle:** **MYNO proposes bounded strategies. Deterministic systems price, constrain, authorize, and execute the strategy the customer selects.**

---

## 1. Problem

For a large task, a single automatic execution path can create unnecessary cost, rework, or customer dissatisfaction when multiple technically valid approaches exist.

Examples include:

- large world/environment construction
- major architecture changes
- large asset construction or acquisition decisions
- substantial gameplay-system implementations
- expensive migrations/refactors
- high-impact visual redesigns
- tasks with materially different quality/cost/time tradeoffs

MYNO should be able to recognize when a task contains meaningful strategic choices and present a small, understandable set of viable options before committing substantial execution resources.

This is a **decision checkpoint**, not a requirement to generate multiple full implementations.

---

## 2. Strategic Task Option Model

For eligible tasks, MYNO may generate approximately **2–4 strategies**, with 3 as the normal target when enough meaningful alternatives exist.

The options should represent genuinely different execution strategies, not superficial wording variations.

Typical strategy dimensions include:

- quality / fidelity
- cost
- execution time
- asset reuse vs. custom construction
- implementation complexity
- performance impact
- maintainability
- risk
- reversibility
- expected verification effort

MYNO should not manufacture extra options merely to reach a fixed count.

If only one strategy is materially viable, MYNO should recommend the single viable path rather than creating artificial choices.

---

## 3. Task Classification Policy

Strategic options should be triggered by deterministic task classification and policy, not by arbitrary model preference.

### Small / routine task

Default behavior:

`UNDERSTAND → PLAN → EXECUTE`

Do not interrupt the customer with unnecessary choices.

### Medium task

MYNO may present options when:

- requirements are materially ambiguous
- multiple viable architectures exist
- cost/quality tradeoffs are meaningful
- customer preference materially changes the result

### Large / expensive task

Use a decision checkpoint when the task can materially consume:

- model/provider budget
- tool budget
- runtime budget
- mutation budget
- credits
- engineering time

### High-impact / irreversible task

Require an explicit customer decision before committing the affected execution scope where policy requires it.

The exact threshold must be deterministic, configurable, auditable, and independent of model output.

---

## 4. Option Generation Flow

The conceptual flow is:

```text
USER REQUEST
  ↓
SEMANTIC INTENT
  ↓
TASK CLASSIFICATION
  ↓
PROJECT / ARCHITECTURE / CAPABILITY INSPECTION
  ↓
STRATEGY GENERATION
  ↓
DETERMINISTIC VALIDATION
  ↓
COST / RESOURCE / RISK ESTIMATION
  ↓
OPTION PRESENTATION
  ↓
CUSTOMER SELECTS:
  ├─ MYNO-PROPOSED OPTION
  └─ CUSTOMER-DEFINES / MODIFIES STRATEGY
  ↓
DETERMINISTIC NORMALIZATION / VALIDATION
  ↓
CREDIT / RESOURCE RESERVATION
  ↓
AUTHORIZED EXECUTION
  ↓
OBSERVE
  ↓
VERIFY
  ↓
REPAIR / RECOVER IF NEEDED
  ↓
FINAL REPORT
```

A customer decision should occur **before** expensive execution of the unselected strategies.

---

## 5. Option Contract

Each option should have a machine-readable contract where appropriate.

At minimum, an option should identify:

- stable option ID
- strategy name
- concise customer-facing description
- intended outcome
- scope
- assumptions
- dependencies
- required capabilities
- expected quality characteristics
- expected execution time/range
- estimated MYNO resource consumption
- estimated customer credit consumption
- estimated provider/infrastructure cost
- risk level
- reversibility
- verification scope
- known limitations
- compatibility constraints
- whether external assets are required
- whether customer authorization is required

The model may propose option content, but deterministic systems must validate that the option is executable, within policy, and within available capability/budget.

---

## 6. MYNO Recommendation

When multiple valid options exist, MYNO should provide a recommendation based on explicit criteria such as:

- requirement fit
- expected quality
- cost efficiency
- execution time
- reliability
- maintainability
- risk
- reversibility
- project consistency

The recommendation must be transparent and must not prevent the customer from choosing another valid option.

Example presentation:

```text
MYNO Recommendation: Hybrid

Why:
Best balance of visual quality, execution cost, performance,
and maintainability for this project.

Alternatives:
A — Premium Custom
B — Hybrid
C — Optimized Reuse
```

The recommendation is advisory. It is not authorization and it is not the final deterministic policy decision.

---

## 7. Customer-Defined / Custom Strategy Option

The customer should not be forced to choose only from MYNO-generated options.

For eligible decision checkpoints, the UX should provide a bounded alternative such as:

**“Custom strategy / I’ll specify what I want.”**

The customer may then:

- describe a different strategy in natural language
- modify a proposed strategy
- specify different quality/speed/cost priorities
- request a combination of characteristics from multiple proposed options
- provide constraints or preferences that MYNO did not propose

The customer-defined request is treated as a **strategy proposal**, not as direct execution authority.

Conceptually:

```text
MYNO OPTIONS
  ├─ A
  ├─ B
  ├─ C
  └─ CUSTOM
       ↓
CUSTOMER DESCRIPTION
       ↓
MYNO NORMALIZES INTO MACHINE-READABLE STRATEGY
       ↓
DETERMINISTIC VALIDATION
       ↓
COST / RESOURCE / RISK ESTIMATION
       ↓
VALID / INVALID / REQUIRES-CLARIFICATION
```

MYNO should explain material differences between the customer's custom strategy and the original proposals when useful.

If the custom strategy is materially ambiguous, unsafe, unsupported, or outside available capability, MYNO should not silently execute it. It should either:

- request clarification
- offer a bounded compatible interpretation for customer approval
- or reject it with a clear reason

The customer must always retain the ability to decline MYNO's suggestions, but declining them must **not bypass deterministic controls**.

---

## 8. Custom Strategy — Financial / Profit Protection

The custom option must not become a mechanism for the customer to bypass MYNO's economics.

Before execution, every customer-defined strategy must pass the same financial controls as MYNO-generated strategies.

The flow should be:

```text
CUSTOM STRATEGY
      ↓
RESOURCE / COST ESTIMATION
      ↓
MAXIMUM DOLLAR BUDGET CHECK
      ↓
MAXIMUM AGENT ITERATIONS CHECK
      ↓
CREDIT / RESOURCE REQUIREMENT
      ↓
CONTRIBUTION-MARGIN CHECK
      ↓
DETERMINISTIC POLICY DECISION
      ↓
ALLOW / MODIFY / REQUIRE CUSTOMER APPROVAL / REJECT
```

MYNO must never execute a customer-defined strategy merely because the customer requested it if doing so would violate enforceable system limits.

If the requested strategy is more expensive than the original proposals, MYNO should recalculate its resource and economic requirements before execution.

The system may present the customer with a revised estimate such as:

```text
Your custom strategy is feasible.

Estimated credits: X
Estimated execution time: Y
Estimated MYNO cost: Z

This request differs from the recommended option because ...
```

The exact internal provider cost does not need to be exposed to the customer unless product policy chooses to expose it; however, it must remain available to the financial control plane.

### Margin floor

The custom strategy must respect a deterministic minimum contribution-margin / economic safety policy where applicable.

If the customer's requested strategy would otherwise make the task economically unsafe, MYNO should not silently absorb the loss.

It should instead apply the configured commercial policy, for example:

- require additional credits/payment
- reduce scope through an explicit customer-approved interpretation
- offer a cheaper compatible strategy
- pause and request customer decision
- reject execution when no economically safe path exists

The system must not manipulate the customer's requested outcome merely to protect margin without making the material change clear.

### Important rule

**Customer freedom of choice must not equal unlimited MYNO resource consumption.**

The customer can choose what they want, but MYNO executes only a strategy that is:

- technically feasible
- authorized
- secure
- within resource limits
- within credit/budget policy
- economically acceptable under the configured commercial rules

---

## 9. Custom Strategy — Do Not Rebuild Everything to Compare

When a customer supplies a custom strategy, MYNO should not automatically execute the custom strategy plus all generated alternatives.

Default behavior remains:

```text
GENERATE / RECEIVE STRATEGIES
        ↓
ESTIMATE / VALIDATE
        ↓
CUSTOMER CHOOSES OR DEFINES ONE
        ↓
EXECUTE ONE
```

Comparative implementation is allowed only when explicitly authorized, bounded, and economically justified.

---

## 10. Build-vs-Reuse Decisions

For tasks involving assets or world construction, strategic options may explicitly expose different construction strategies, for example:

- build from scratch
- reuse approved existing assets
- modify/recompose existing assets
- hybrid custom + reused assets

Asset selection remains subject to the existing MYNO requirements for:

- provenance
- licensing/IP considerations
- security
- compatibility
- project style
- performance
- deterministic placement
- duplication controls

MYNO must not treat "use an existing asset" as automatically cheaper, safer, or better. The selected strategy must be evaluated against the actual project and task constraints.

---

## 11. Financial / Profit Protection

Strategic options must be designed to improve customer choice **without creating uncontrolled MYNO cost**.

For every executable option, the financial layer should estimate:

```text
Expected Revenue / Entitlement Value
        −
Expected Provider Cost
        −
Expected Infrastructure Cost
        −
Expected Payment / Operational Cost
        =
Expected Contribution Margin
```

Where the commercial model is credit-based, the option should also expose or internally calculate:

- estimated credits
- reserved credits
- maximum dollar budget
- maximum agent iterations
- model/tool budget
- runtime budget
- mutation budget
- recovery budget

Every option must remain within deterministic spend/resource limits.

The system must never intentionally present an option that is known to exceed its enforceable budget merely because the customer selected it.

Customer-defined strategies are subject to these same controls; the custom path is not a pricing, credit, budget, or margin bypass.

---

## 12. Reservation Semantics

After the customer selects an option and before execution begins, MYNO should reserve the applicable resources according to the authoritative financial/budget system.

Conceptually:

```text
OPTION SELECTED
  ↓
VALIDATE AVAILABILITY
  ↓
RESERVE CREDITS / BUDGET
  ↓
AUTHORIZE EXECUTION
  ↓
CONSUME ACTUAL USAGE
  ↓
RECONCILE
  ↓
RELEASE UNUSED RESERVATION
```

Reservations must be safe against:

- retries
- duplicate delivery
- replay
- race conditions
- cancellation
- partial execution
- provider failure
- recovery
- stale option selection

Financial truth remains server-authoritative.

---

## 13. Critical Economic Rule — Do Not Build All Options

The normal strategic-option flow must **not** execute all 3–4 strategies and then ask the customer which one they like.

That would multiply provider, infrastructure, tool, and execution costs and could destroy contribution margin.

Default behavior:

```text
GENERATE 3–4 PLANS
        ↓
ESTIMATE / VALIDATE
        ↓
CUSTOMER SELECTS ONE OR DEFINES ONE
        ↓
EXECUTE ONE
```

Running multiple implementations may be allowed only as an explicitly authorized evaluation/experiment with a deterministic budget and a clear business/product reason.

---

## 14. UX Requirements

The customer should be able to understand the decision without reading MYNO's internal architecture.

Each option should make the key tradeoffs visible, such as:

- quality
- speed
- cost
- risk
- maintainability
- asset strategy
- important limitations

Avoid overwhelming the customer with internal token counts, raw model details, or implementation noise unless those details are useful to the decision.

The experience should support:

- recommended option
- compare options
- select one
- custom strategy / specify my own
- modify a proposed option where supported
- cancel decision
- request clarification where supported
- preserve the decision in task history

No option should be represented as guaranteed if it is only an estimate.

For a custom strategy, the UX should make clear that:

- the customer has freedom to specify the desired outcome/approach
- MYNO will validate feasibility and economics before execution
- additional credits/payment or scope adjustment may be required when applicable
- deterministic security and authorization controls still apply

---

## 15. Authorization and Security

A customer selecting an option does not bypass MYNO's deterministic controls.

The selected strategy must still pass:

- capability validation
- authentication
- tenant binding
- Studio binding
- deterministic authorization
- policy checks
- budget checks
- mutation-scope checks
- security checks
- verification requirements

A malicious or manipulated option must not be able to grant itself elevated permissions, larger budgets, broader filesystem access, another tenant/Studio, or privileged tools.

Option IDs and selected strategies should be treated as untrusted input at execution boundaries and resolved against authoritative server-side option records/contracts.

Customer-defined strategy text must be treated as untrusted input as well. It must never become an execution instruction that bypasses the same authorization, capability, budget, security, or verification boundaries.

---

## 16. Stale Decision Protection

A customer decision may become invalid if the project changes after the options were generated.

MYNO should therefore associate options with sufficient context/version information, such as:

- project/Studio identity
- task ID
- architecture/evidence version where applicable
- capability snapshot
- option generation timestamp
- relevant project state/version
- option contract version

Before execution, deterministic systems should validate that the selected option is still compatible.

If not, MYNO should:

`REVALIDATE → REPLAN IF NEEDED → REQUEST NEW DECISION WHEN MATERIAL → EXECUTE`

Never silently execute a stale high-impact strategy against changed project state.

Customer-defined strategies should receive the same stale-state and compatibility validation before execution.

---

## 17. Failure / Cancellation Behavior

The decision checkpoint should support at minimum:

- customer cancellation before reservation
- customer cancellation after reservation but before execution
- option invalidation
- provider failure during execution
- partial execution
- timeout
- recovery
- recovery failure
- insufficient credits/resources
- capability loss
- custom strategy validation failure
- custom strategy becoming economically unsafe after re-estimation

Unused reservations should be reconciled according to the authoritative financial rules.

The selected option or accepted custom strategy must remain linked to task evidence so that the final result can be compared against the approved strategy.

---

## 18. Observability / Evidence

Record, where appropriate:

- task ID
- tenant/user
- Studio
- generated option IDs
- option contracts/versions
- estimates
- recommendation and recommendation basis
- customer selection or custom-strategy submission
- selection timestamp
- authorization result
- reservation result
- actual execution path
- effective provider/model
- actual usage/cost
- observations
- verification result
- recovery attempts
- final outcome

For customer-defined strategies, retain the normalized strategy contract and enough provenance to show how it was derived from the customer's request without unnecessarily retaining sensitive raw content.

The evidence chain should support:

`REQUEST → OPTIONS/CUSTOM STRATEGY → DECISION → RESERVATION → EXECUTION → OBSERVATION → VERIFICATION → OUTCOME`

Do not record unnecessary sensitive customer content merely to explain the decision.

---

## 19. Abuse / Cost-Explosion Protection

Strategic options themselves must not become an abuse vector.

Deterministic controls should bound:

- number of options generated per task
- planning tokens/cost
- option-generation retries
- repeated decision regeneration
- option comparison requests
- reservation attempts
- abandoned reservations
- repeated task replanning
- customer-triggered expensive evaluations
- custom-strategy submissions/regenerations
- custom-strategy normalization/re-estimation loops

A customer should not be able to force MYNO to generate unlimited strategic alternatives or repeatedly reinterpret custom strategies as a way to consume provider resources.

---

## 20. Relationship to the Canonical Engineering Pipeline

Strategic decision checkpoints fit into the existing pipeline as a bounded branch after intelligence and before commitment to expensive execution:

```text
INTENT
  ↓
CLASSIFY
  ↓
INSPECT
  ↓
INTELLIGENCE
  ↓
DECIDE / STRATEGY GENERATION
  ↓
[ CLIENT DECISION CHECKPOINT WHEN POLICY REQUIRES ]
  ↓
ARCHITECTURE GRAPH
  ↓
ARTIFACT PLAN
  ↓
PLACEMENT / DEPENDENCY
  ↓
MUTATION PLAN
  ↓
POLICY / AUTHORIZATION
  ↓
EXECUTE
  ↓
OBSERVE
  ↓
VERIFY
  ↓
REPAIR / RECOVER
  ↓
RE-VERIFY
  ↓
ARCHITECTURE REVIEW
  ↓
REPORT
  ↓
MEMORY
```

The checkpoint must not become a bypass around architecture, authorization, security, verification, or budget controls.

---

## 21. Cross-Track Integration

This capability is intentionally cross-cutting.

### Agent Orchestration

- strategic task classification
- bounded plan generation
- option lifecycle
- customer-defined strategy normalization
- selected-plan execution
- stale-plan detection

### Financial / Business / Credits

- option-level cost estimation
- custom-strategy cost estimation
- credit estimation
- reservation
- maximum dollar budget
- maximum agent iterations
- actual-cost reconciliation
- contribution-margin visibility
- commercial handling for economically unsafe custom requests

### Product / UX

- option comparison
- recommendation
- decision checkpoint
- custom strategy input
- customer transparency
- reduced rework

### Security

- untrusted option handling
- untrusted customer strategy handling
- authorization after selection
- budget enforcement
- tenant/Studio binding
- abuse limits

### Verification

- approved strategy recorded as evidence
- expected outcome bound to verification
- selected strategy compared with actual execution

### Project Memory

Where useful, preserve customer-selected strategic decisions as project intent/preferences, while keeping them provenance-aware and subject to current project/runtime validation.

---

## 22. Quality Rules

MYNO should prefer:

- fewer meaningful choices over many weak choices
- explicit tradeoffs over vague promises
- one recommendation plus alternatives
- plans before expensive execution
- deterministic estimates/limits where possible
- customer choice for material preference decisions
- automatic execution for routine tasks
- evidence-backed outcomes
- freedom for the customer to specify a materially different strategy when feasible
- explicit handling of economic consequences instead of silently absorbing cost

The system should not use choice overload as a substitute for good engineering judgment.

---

## 23. Acceptance Criteria for Future Implementation

Before this capability can be considered implemented, evidence should demonstrate at minimum:

1. routine tasks bypass unnecessary decision checkpoints
2. eligible large tasks can generate bounded viable options
3. options have stable IDs/contracts
4. option count is deterministically bounded
5. options are not full implementations by default
6. customer can select exactly one executable strategy
7. customer can decline MYNO-generated options and submit a custom strategy
8. custom strategy is normalized into a bounded machine-readable contract
9. selected/custom strategy is revalidated before execution
10. unselected strategies are not executed by default
11. cost/resource estimates feed deterministic budget controls
12. credit/resource reservation is authoritative and idempotent where applicable
13. selected/custom strategy remains bound to the task/evidence trail
14. security/authorization still applies after selection
15. stale selections/custom strategies are rejected or replanned safely
16. cancellation/failure/recovery reconcile resources correctly
17. option-generation and custom-strategy abuse is bounded
18. actual usage/cost can be reconciled against the selected strategy
19. recommendation reasoning is explainable without granting the model authority
20. custom strategies cannot bypass credit, budget, security, capability, or margin controls
21. economically unsafe custom strategies trigger the configured commercial policy rather than silent loss
22. runtime-sensitive claims receive target-environment evidence where applicable

---

## 24. Roadmap Placement

This capability is a **planned cross-track product/agent capability**.

It does not move the project to P3.7 and does not authorize implementation while an earlier roadmap gate is blocked.

Current roadmap authority remains:

`P3.6-S → P3.6-R → P3.6-RT → P3.6-CERTIFIED → P3.7 → ...`

Implementation should occur only when the applicable roadmap gate authorizes the underlying orchestration, financial, UX, and runtime capabilities.

---

## 25. Final Principle

The purpose of Strategic Task Options is not to make MYNO ask the customer more questions.

The purpose is to let MYNO handle **high-impact decisions intelligently before expensive commitment**, while still allowing the customer to define a different valid strategy:

```text
MYNO ANALYZES
    ↓
MYNO PROPOSES
    ↓
CUSTOMER CHOOSES A PROPOSAL
    OR
CUSTOMER DEFINES A CUSTOM STRATEGY
    ↓
DETERMINISTIC SYSTEMS VALIDATE / BOUND / PRICE
    ↓
MYNO EXECUTES ONE APPROVED STRATEGY
    ↓
MYNO VERIFIES
```

This preserves the core philosophy:

**LLM proposes. Deterministic systems decide.**
