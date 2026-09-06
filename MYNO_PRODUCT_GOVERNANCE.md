# MYNO — Product Governance & Owner Control Plane

> Governance doctrine for the separate MYNO Admin Dashboard and privileged operations. This document defines target policy; implementation remains roadmap-gated.

## 1. Objective
Ensure the platform has a controlled, auditable chain of authority so the owner can govern product, economics, safety, releases, providers, and operations without exposing privileged powers to customer surfaces.

## 2. Authority Model
Conceptual hierarchy:
`OWNER → APPROVED PRIVILEGED ADMIN → SCOPED OPERATOR/SUPPORT → AUTOMATED SYSTEM WITH BOUNDED POLICY → CUSTOMER`

No model output or client-side flag may self-authorize privileged actions.

## 3. Separate Admin Control Plane
The Admin Dashboard must remain logically and authorization-wise separate from:
- public website
- customer account surfaces
- Desktop application

UI separation is not itself a security boundary; backend authorization must independently enforce every privileged operation.

## 4. RBAC & Least Privilege
Support granular permissions and scoped roles. Sensitive operations should require stronger controls, and where justified:
- re-authentication
- multi-party approval
- time-bounded elevation
- reason capture
- immutable audit records

## 5. Owner Control Domains
The control plane should eventually govern:
- users/accounts/tenants
- Studio and project isolation
- tasks/queues/execution limits
- providers/models/routing
- feature flags and experiments
- Desktop/backend releases
- credits and pricing policy
- promo codes and campaigns
- refunds and entitlement reconciliation
- security events and abuse controls
- emergency controls
- observability and incident workflows

## 6. Promo & Credit Governance
Authorized operators should be able to define controlled promotions such as:
- named promo code
- percentage or fixed discount where supported
- explicit credit grant
- maximum redemption count
- per-user/tenant limits
- start/end time
- eligibility constraints
- campaign budget ceiling
- revocation/suspension

All redemption must be server-authoritative, idempotent, auditable, and protected against replay/race abuse.

## 7. Financial Safety
The Admin UI must not bypass financial integrity. Sensitive changes require controlled ledger operations, reconciliation, audit evidence, and explicit authority. Direct arbitrary balance mutation should not be the default operational primitive.

## 8. Dangerous Operations
High-risk actions include:
- global kill switch
- tenant suspension
- destructive project/task operations
- provider routing changes
- price changes
- release rollback
- security policy changes
- privileged impersonation/support access

Such actions should be explicitly scoped and logged.

## 9. Audit Standard
Privileged actions should record, as applicable:
- actor identity
- authority/role
- action
- target/scope
- timestamp
- reason
- before/after state or safe reference
- approval evidence
- correlation ID
- outcome

Audit logs themselves require access controls and integrity protections.

## 10. Break-Glass Access
Emergency access may exist, but must be:
- rare
- strongly authenticated
- time/scoped bounded
- fully audited
- reviewed after use

Emergency convenience is not permission for permanent superuser bypasses.

## 11. Governance Invariant
**The owner retains ultimate governed authority, but even owner-level power should flow through secure, auditable, bounded operational mechanisms rather than invisible bypasses.**


---

## 12. Controlled Release & Feature Flag Governance
The Admin Control Plane should eventually govern feature flags and controlled rollouts with explicit:
- flag identity and purpose
- scope (global, tenant, cohort, account, environment)
- activation state
- authorized owner
- expiry/review date for temporary flags
- linked release/experiment
- rollback/disable action
- audit history

Privileged users must not use feature flags as an undocumented authorization bypass.

## 13. Fraud & Financial Abuse Response Governance
The control plane should provide governed workflows for investigating and responding to suspected:
- promo abuse
- credit abuse
- duplicate entitlement
- replay/race redemption
- automated farming
- refund abuse
- chargeback abuse

Responses should distinguish observation from proof and support proportionate actions such as review, temporary restriction, reversal only through authorized ledger processes, and documented appeal/recovery paths.

## 14. Legal & Policy Operations
Where product policy is implemented, the control plane should support governed visibility and version tracking for applicable:
- terms/policy versions
- acceptance records where required
- retention/deletion workflows
- account enforcement
- dispute/refund workflows
- jurisdiction/configuration boundaries

The Admin Dashboard is an operational surface, not a substitute for qualified legal review.

## 15. Project Version & Recovery Authority
High-impact project restore, rollback, migration, or checkpoint operations should expose:
- exact project/version target
- scope
- actor authorization
- reason
- compatibility constraints
- confirmation/approval requirements where appropriate
- resulting outcome evidence

No privileged operator should silently overwrite a customer project without an auditable recovery boundary.
