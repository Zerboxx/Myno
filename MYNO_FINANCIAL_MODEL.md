# MYNO — FINANCIAL MODEL & PROFITABILITY REFERENCE

**Document Type:** Canonical Financial Reference  
**Project:** Myno AI / Myno AI Studio  
**Status:** FINAL / CANONICAL  
**Version:** 1.0  
**Last Updated:** 2026-09-05

---

# 1. PURPOSE

This document is the canonical financial reference for Myno.

It defines how Myno:

- Calculates AI/API costs.
- Charges customers through Myno Credits.
- Reserves customer credits before an agent task starts.
- Controls maximum provider spending.
- Limits agent iterations.
- Calculates true task cost.
- Calculates contribution margin.
- Calculates operating profit.
- Calculates net profit.
- Protects Myno from API overspending.
- Optimizes model selection and token consumption.
- Maintains profitability while providing customers with strong AI capabilities.

Any financial, billing, credit, AI-routing, or agent-budget implementation MUST follow the rules defined in this document.

---

# 2. CORE BUSINESS MODEL

Myno is NOT a pass-through API reseller.

Customers pay Myno.

Myno pays AI providers.

The difference between customer revenue and Myno's total operating costs is Myno's margin/profit.

The basic flow is:

```text
CUSTOMER
   │
   │ buys Myno Credits
   ▼
MYNO BILLING SYSTEM
   │
   │ credits consumed by tasks
   ▼
AI AGENT
   │
   ├── Model Router
   ├── Credit Controller
   ├── Dollar Budget Controller
   ├── Iteration Controller
   └── Cost Tracker
   │
   ▼
AI PROVIDER
   │
   │ API cost
   ▼
MYNO COST LEDGER
```

Customers should not need to understand the underlying provider economics.

Myno sells an outcome/capability, not raw tokens.

---

# 3. IMPORTANT FINANCIAL DEFINITIONS

Myno MUST distinguish between the following:

## 3.1 Revenue

Money collected from customers.

```text
Revenue = Customer payments
```

---

## 3.2 AI API Cost

Money paid to AI providers.

Examples:

- Anthropic
- OpenAI
- Google
- OpenRouter
- DeepSeek
- Groq
- Other approved providers

```text
AI Cost =
Input Token Cost
+ Output Token Cost
+ Cache Write Cost
+ Cache Read Cost
+ Other Provider Charges
```

---

## 3.3 Variable Cost

Costs that increase when customers use Myno more.

Examples:

- AI API usage
- Payment processing
- Per-request infrastructure
- Storage/bandwidth attributable to usage
- Retry/failure costs
- Other usage-dependent costs

---

## 3.4 Contribution Profit

The money remaining after variable costs.

```text
Contribution Profit =
Revenue
- AI API Costs
- Payment Processing
- Usage-Dependent Infrastructure
- Expected Retry/Failure Costs
- Refunds/Chargebacks
```

---

## 3.5 Operating Profit

Contribution profit after operating expenses.

```text
Operating Profit =
Contribution Profit
- Fixed Infrastructure
- Salaries
- Software
- Marketing
- Support
- Legal
- Accounting
- Other Operating Expenses
```

---

## 3.6 Net Profit

True company profit after all applicable expenses.

```text
Net Profit =
Operating Profit
- Taxes
- Financing Costs
- Other Non-Operating Expenses
```

IMPORTANT:

The word "profit" inside Myno dashboards MUST NOT be used ambiguously.

The system should identify whether it is showing:

- Contribution Profit
- Operating Profit
- Net Profit

---

# 4. CANONICAL PROFITABILITY PRINCIPLE

Myno MUST NEVER optimize for maximum AI usage.

Myno optimizes for:

> Maximum customer value per dollar of AI cost.

The objective is:

```text
Increase:
Customer Value

While minimizing:
AI Cost
Token Waste
Unnecessary Agent Loops
Retry Waste
Context Waste
Infrastructure Waste
```

The system should make the customer feel that Myno is powerful, while internally Myno remains financially disciplined.

---

# 5. MYNO CREDITS

Myno Credits are the internal customer billing unit.

Customers purchase credits from Myno.

Credits are NOT provider tokens.

Credits are NOT equal to OpenAI tokens, Anthropic tokens, or Gemini tokens.

Credits are an abstraction layer controlled by Myno.

Example:

```text
Customer buys:

1,250 Myno Credits

Myno internally decides how many credits different tasks consume.
```

The customer should not need to know:

```text
"This task used 18,342 Anthropic input tokens."
```

Instead:

```text
Task completed
Credits used: 31
```

---

# 6. REFERENCE CREDIT PRICING

Initial reference pricing:

| Package | Price |
|---|---:|
| 150 Credits | $2.99 |
| 500 Credits | $8.99 |
| 1,250 Credits | $19.99 |
| 3,500 Credits | $49.99 |
| 10,000 Credits | $119.99 |

These prices are REFERENCE VALUES, not permanent technical constants.

They may be changed by business configuration.

DO NOT hardcode these values directly into application logic.

Use a configuration/database-driven pricing system.

---

# 7. CREDIT VALUE

For financial simulations, the initial reference assumption is approximately:

```text
1 Credit ≈ $0.016 customer revenue
```

This is an average modeling assumption.

Actual effective revenue per credit depends on:

- Package purchased
- Discounts
- Promotions
- Refunds
- Taxes
- Payment fees
- Regional pricing
- Enterprise pricing
- Special offers

Therefore:

```text
Actual Credit Revenue =
Actual Customer Payment
÷ Credits Granted
```

The system should preferably calculate this from real transactions rather than assuming a fixed value.

---

# 8. TASK CREDIT PRICING

Reference task ranges:

| Task | Reference Credit Cost |
|---|---:|
| Quick Answer | 1–3 |
| Explain Error | 2–5 |
| Small Fix | 3–8 |
| Generate Script | 5–15 |
| Debug System | 10–30 |
| Build Feature | 20–60 |
| Multi-File Agent | 50–150 |
| Large Project Task | 100–500+ |

These are NOT fixed permanent prices.

Myno should eventually use dynamic cost estimation.

---

# 9. CREDIT RESERVATION SYSTEM

Every agent task MUST use credit reservation.

Before execution:

```text
User Balance
      ↓
Cost Estimator
      ↓
Estimated Credit Requirement
      ↓
Reserve Credits
      ↓
Start Agent
```

Example:

```text
User Balance = 500 Credits

Estimated Task Cost = 80 Credits

Available Balance = 420
Reserved = 80
```

The agent may now execute.

---

# 10. FINAL CREDIT SETTLEMENT

After the task finishes:

```text
Reserved Credits
        ↓
Actual Cost Calculation
        ↓
Charge Actual Credits
        ↓
Refund Unused Reservation
```

Example:

```text
Reserved = 80

Actual Usage = 45

Charged = 45

Refunded = 35
```

The customer MUST NOT permanently lose unused reserved credits.

---

# 11. INSUFFICIENT CREDIT PROTECTION

If the user cannot reserve enough credits:

```text
DO NOT START THE EXPENSIVE AGENT TASK.
```

Example:

```text
User Balance = 20

Estimated Requirement = 80

Result:
Task cannot start.
```

Possible UI:

```text
This task requires up to 80 credits.
You currently have 20.

Please add credits to continue.
```

---

# 12. MAXIMUM DOLLAR BUDGET

Every agent task MUST have an internal maximum AI spending limit.

This is NOT shown as a customer-facing price.

It is a financial circuit breaker.

Example:

```text
Simple Task:
Max AI Cost = $0.03

Medium Task:
Max AI Cost = $0.15

Complex Task:
Max AI Cost = $0.50

Large Agent Task:
Max AI Cost = $2.00
```

These are reference values.

The production system should calculate them dynamically based on:

- Model
- Estimated tokens
- Task type
- User plan
- Risk level
- Expected retries
- Current provider prices
- Desired margin

---

# 13. MAXIMUM AGENT ITERATIONS

Agent loops MUST have a hard maximum.

Reference values:

| Task | Max Iterations |
|---|---:|
| Simple | 3 |
| Medium | 8 |
| Complex | 15 |
| Large Agent | 25 |

An iteration may include:

```text
Think
→ Tool Call
→ Read Result
→ Analyze
→ Modify
→ Test
```

The exact definition of an iteration must remain consistent in the implementation.

---

# 14. THE MYNO TRIPLE SAFETY SYSTEM

Every expensive agent execution should be controlled by three independent limits:

```text
                AGENT TASK
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
     CREDITS      DOLLARS   ITERATIONS
      LIMIT        LIMIT       LIMIT
          │         │           │
          └─────────┼───────────┘
                    ▼
              CONTINUE / STOP
```

Execution continues only while ALL limits are valid.

```text
Credits available?
        AND
Dollar budget available?
        AND
Iterations remaining?
        ↓
      YES
        ↓
    Continue
```

If ANY limit is reached:

```text
STOP EXECUTION
```

---

# 15. HARD STOP CONDITIONS

The agent MUST stop when:

```text
1. Credit budget is exhausted.
2. Maximum dollar budget is reached.
3. Maximum iterations are reached.
4. Provider spending limit is reached.
5. User cancels the task.
6. Security policy blocks the operation.
7. Provider/API repeatedly fails.
8. Agent enters an unsafe or repetitive loop.
9. System detects abnormal token consumption.
```

---

# 16. TOKEN BUDGET

Dollar limits alone are not enough.

Myno should also maintain token budgets.

Track:

```text
Input Tokens
Output Tokens
Cached Input Tokens
Cache Write Tokens
Total Tokens
```

Example:

```text
Max Input Tokens = 100,000
Max Output Tokens = 20,000
```

If the token budget is exceeded:

```text
STOP
```

or intelligently compress/reduce context if possible.

---

# 17. TRUE TASK COST

The real cost of a task is NOT only the AI API invoice.

Use:

```text
True Task Cost =
AI API Cost
+ Infrastructure Allocation
+ Retry Cost
+ Failure Cost
+ Storage/Bandwidth Allocation
+ Other Variable Costs
```

Example:

```text
AI API Cost       = $0.32
Infrastructure   = $0.05
Retry Buffer     = $0.03

True Cost        = $0.40
```

---

# 18. CUSTOMER CHARGE

Customer pricing should be based on value and risk, not simply raw API cost.

Reference formula:

```text
Customer Price =
True Cost × Margin Multiplier
```

Example:

```text
True Cost = $0.40

Margin Multiplier = 2.5

Customer Value =
$1.00
```

The final implementation should translate this into Myno Credits.

---

# 19. TARGET MARGIN

Reference targets:

| Task Type | Target Contribution Margin |
|---|---:|
| Simple | 60–80% |
| Medium | 55–75% |
| Complex | 50–70% |
| Premium/Expensive | 40–65% |

These are targets, not guarantees.

The company should optimize for a healthy blended margin across all customers.

A single expensive task may have a lower margin if it creates significant customer value.

---

# 20. REFERENCE MULTIPLIERS

Initial modeling guidance:

```text
Simple Task:
True Cost × ~3

Medium Task:
True Cost × ~2.5

Complex Agent:
True Cost × ~2

Premium Model:
True Cost × ~1.8–2.2
```

These multipliers MUST remain configurable.

---

# 21. SMART MODEL ROUTING

Myno should never use the most expensive model for every request.

Reference routing:

```text
Simple
  ↓
Cheap/Fast Model

Medium
  ↓
Mid-Tier Model

Complex
  ↓
High-Quality Coding Model

Very Complex / Premium
  ↓
Premium Model

Fallback
  ↓
Alternative Provider
```

The router should consider:

- Task complexity
- Required reasoning
- Code generation
- Context size
- Vision requirements
- Latency
- Provider availability
- Current provider cost
- Customer plan
- Remaining task budget
- Historical success rate

---

# 22. REFERENCE MODEL STRATEGY

The initial conceptual routing:

```text
Haiku-class model
→ Simple tasks

Sonnet-class model
→ Main coding/agent tasks

Opus-class model
→ Premium/high-complexity tasks

Gemini-class model
→ Large context / vision / specialized tasks

OpenRouter / alternative provider
→ Fallback / routing flexibility

DeepSeek-class model
→ Cost-sensitive tasks where quality is sufficient

Groq-class infrastructure/models
→ Fast lightweight operations
```

Actual models and prices MUST be stored in provider configuration.

Do NOT hardcode provider prices inside task logic.

---

# 23. PROVIDER PRICING RULE

Provider pricing is dynamic.

Therefore:

```text
NEVER:
if model == "X":
    cost = hardcoded_number
```

Instead:

```text
Provider
   ↓
Model Registry
   ↓
Current Pricing Configuration
   ↓
Cost Calculator
```

The model registry should store:

```text
provider
model
input_price
output_price
cache_write_price
cache_read_price
currency
effective_from
effective_until
```

---

# 24. AI USAGE LEDGER

Every provider request should generate a financial usage record.

Minimum fields:

```text
task_id
user_id
project_id
provider
model
request_id
input_tokens
output_tokens
cache_write_tokens
cache_read_tokens
total_tokens
provider_cost
currency
timestamp
retry_number
iteration_number
task_type
```

Myno should additionally store:

```text
estimated_cost
actual_cost
reserved_credits
charged_credits
refunded_credits
margin
```

---

# 25. COST ESTIMATOR

Before an expensive task begins:

```text
User Request
     ↓
Task Classifier
     ↓
Complexity Estimator
     ↓
Context Estimator
     ↓
Model Selection
     ↓
Token Estimate
     ↓
Provider Cost Estimate
     ↓
Credit Estimate
```

Example:

```text
Estimated Input = 15K
Estimated Output = 4K

Selected Model = Sonnet-class

Estimated API Cost = $0.07

Expected Retry Cost = $0.02

Estimated True Cost = $0.10

Required Customer Credits = 8
```

---

# 26. COST ESTIMATION MUST NOT BE THE FINAL BILL

Estimated cost is only for:

- Reservation
- Safety
- Routing
- Budget planning

Actual billing MUST use actual provider usage whenever available.

Therefore:

```text
Estimated Cost ≠ Final Cost
```

Final financial accounting should use provider-reported usage.

---

# 27. PROMPT CACHING

Myno should aggressively use caching where supported and economically beneficial.

Potential cacheable context:

```text
Myno System Instructions
Roblox Development Rules
Luau Standards
Project Architecture
Project Documentation
Stable Project Context
Repeated Tool Instructions
```

Do NOT blindly cache everything.

Caching economics must be evaluated per provider.

The cache strategy must account for:

- Cache write cost
- Cache read cost
- Cache lifetime
- Cache hit rate
- Context stability
- Provider-specific rules

---

# 28. CONTEXT OPTIMIZATION

One of the largest sources of unnecessary AI spending is excessive context.

Myno SHOULD NOT send the entire project to the model for every request.

Instead:

```text
User Request
     ↓
Relevant File Search
     ↓
Relevant Code
     ↓
Relevant Documentation
     ↓
Relevant Errors
     ↓
Relevant Project Context
     ↓
Model
```

Use:

```text
Project Index
File Search
Symbol Search
Dependency Graph
Error History
Project Summary
```

to reduce unnecessary tokens.

---

# 29. PROJECT MEMORY STRATEGY

Myno should maintain compact project memory.

Instead of repeatedly sending thousands of lines of irrelevant files:

```text
PROJECT SUMMARY
+
ARCHITECTURE
+
RELEVANT FILES
+
RELEVANT FUNCTIONS
+
CURRENT ERROR
+
RECENT CHANGES
```

This reduces:

```text
Input Tokens
Latency
API Cost
Context Noise
```

---

# 30. AGENT LOOP ECONOMICS

Agent loops can become the largest source of unexpected API costs.

Bad:

```text
Think
→ Tool
→ Think
→ Tool
→ Think
→ Tool
→ Think
→ Tool
→ Repeat 100 times
```

Good:

```text
Plan
→ Execute
→ Validate
→ Fix
→ Validate
→ Finish
```

Myno should detect repetitive loops.

Example:

```text
Same tool
+
Same arguments
+
Same result
+
No progress
```

→ terminate loop.

---

# 31. RETRY POLICY

Retries have financial cost.

Therefore Myno MUST distinguish between:

```text
Free/cheap retry
```

and:

```text
Expensive retry
```

Retries should happen only when useful.

Example:

```text
Temporary network error
→ Retry

Provider timeout
→ Retry with limit

Invalid generated code
→ Debug/fix

Same error repeated 3 times
→ Stop and report
```

Never allow unlimited retries.

---

# 32. FAILURE COST

Failed agent tasks can still generate API costs.

Therefore Myno should track:

```text
Successful Cost
Failed Cost
Retry Cost
Refund Cost
```

A task that fails after consuming API resources is still an internal cost.

This must be included in profitability calculations.

---

# 33. EXAMPLE TASK

Customer requests:

> Build a complete Roblox inventory system.

Myno estimates:

```text
Complexity = High

Estimated Provider Cost:
$0.50

Maximum Dollar Budget:
$0.60

Maximum Iterations:
15

Estimated Credits:
100
```

Myno reserves:

```text
100 Credits
```

Agent starts.

Actual result:

```text
Provider Cost = $0.32
Infrastructure = $0.05
Retry Cost = $0.02

True Cost = $0.39
```

Customer actually consumed:

```text
70 Credits
```

Therefore:

```text
Charged = 70
Refunded = 30
```

If effective credit revenue is approximately:

```text
$0.016 / credit
```

Customer revenue:

```text
70 × $0.016
= $1.12
```

Contribution:

```text
$1.12
- $0.39
= $0.73
```

Approximate contribution margin:

```text
$0.73 / $1.12
≈ 65%
```

---

# 34. 500-USER FINANCIAL REFERENCE SCENARIOS

These scenarios are illustrative planning models.

They are NOT forecasts.

They assume 500 active users.

They do NOT mean 500 simultaneous/concurrent users.

---

## 34.1 CONSERVATIVE

Per user/day:

```text
3 Simple
1 Medium
0.2 Complex
```

Daily:

```text
Simple = 1,500
Medium = 500
Complex = 100
```

Reference AI cost:

```text
Simple:
1,500 × $0.012
= $18

Medium:
500 × $0.07
= $35

Complex:
100 × $0.25
= $25
```

Total:

```text
$78/day
```

Monthly:

```text
$2,340 AI cost
```

Reference revenue:

```text
~$4,560/month
```

Illustrative expenses:

```text
AI API              $2,340
Infrastructure        $500
Payment Fees          $182
Refund/Abuse Buffer   $150
```

Illustrative contribution/operating result:

```text
≈ $1,388/month
```

Approximate margin:

```text
≈ 30%
```

---

## 34.2 REALISTIC

Per user/day:

```text
6 Simple
3 Medium
0.5 Complex
```

Daily:

```text
Simple = 3,000
Medium = 1,500
Complex = 250
```

Reference AI cost:

```text
Simple:
3,000 × $0.012
= $36

Medium:
1,500 × $0.07
= $105

Complex:
250 × $0.25
= $62.50
```

Total:

```text
$203.50/day
```

Monthly:

```text
$6,105 AI cost
```

Reference revenue:

```text
~$11,640/month
```

Illustrative expenses:

```text
AI API              $6,105
Infrastructure        $700
Payment Fees          $466
Refund/Abuse Buffer   $300
```

Illustrative result:

```text
≈ $4,069/month
```

Approximate margin:

```text
≈ 35%
```

---

## 34.3 HEAVY

Per user/day:

```text
15 Simple
8 Medium
2 Complex
```

Daily:

```text
Simple = 7,500
Medium = 4,000
Complex = 1,000
```

Reference AI cost:

```text
Simple:
7,500 × $0.012
= $90

Medium:
4,000 × $0.07
= $280

Complex:
1,000 × $0.25
= $250
```

Total:

```text
$620/day
```

Monthly:

```text
$18,600 AI cost
```

Reference revenue:

```text
~$34,560/month
```

Illustrative expenses:

```text
AI API              $18,600
Infrastructure        $1,500
Payment Fees          $1,382
Refund/Abuse Buffer     $800
```

Illustrative result:

```text
≈ $12,278/month
```

Approximate margin:

```text
≈ 35.5%
```

---

# 35. IMPORTANT WARNING ABOUT THE 500-USER MODELS

The previous scenarios are modeling examples only.

Actual profitability depends on:

```text
Actual users
×
Actual tasks
×
Actual tokens
×
Actual model
×
Actual provider price
×
Actual retry rate
×
Actual cache hit rate
×
Actual infrastructure
×
Actual payment fees
```

Therefore:

```text
500 users ≠ guaranteed $X profit
```

Real financial reporting MUST use production telemetry.

---

# 36. MONTHLY FINANCIAL REPORT

Myno should generate a monthly report containing:

```text
Total Customers
Active Customers
Paying Customers
Free Customers

Total Credits Purchased
Total Credits Consumed
Total Credits Refunded
Outstanding Credits

Gross Revenue

AI API Cost
Infrastructure Cost
Payment Processing
Refunds
Chargebacks
Retry Cost
Other Variable Costs

Contribution Profit
Contribution Margin %

Fixed Infrastructure
Salaries
Marketing
Software
Support
Legal
Accounting
Other Operating Expenses

Operating Profit
Operating Margin %

Taxes
Other Non-Operating Expenses

Net Profit
Net Margin %
```

---

# 37. CUSTOMER ECONOMICS

Track:

```text
ARPU
ARPPU
CAC
LTV
Gross Margin
Contribution Margin
Net Revenue
AI Cost Per User
AI Cost Per Task
Credits Purchased Per User
Credits Consumed Per User
```

Especially important:

```text
AI Cost / Revenue
```

Example:

```text
Revenue = $10,000

AI Cost = $3,000

AI Cost Ratio = 30%
```

A rising AI Cost Ratio should trigger investigation.

---

# 38. KEY FINANCIAL KPI

The most important Myno operational metric is:

```text
Contribution Margin Per Agent Task
```

Track:

```text
Revenue Per Task
-
True Cost Per Task
=
Contribution Per Task
```

Then:

```text
Contribution Margin =
Contribution Per Task
÷
Revenue Per Task
```

---

# 39. USER-LEVEL PROFITABILITY

Myno should eventually calculate profitability per customer.

Example:

```text
Customer A

Revenue:
$20

AI Cost:
$4

Infrastructure:
$1

Payment:
$0.80

Refunds:
$0.20

Contribution:
$14
```

This helps identify:

```text
Profitable Users
Break-even Users
Loss-making Users
Abusive Users
Heavy AI Users
```

---

# 40. FREE PLAN PROTECTION

Free users MUST have controlled economics.

The Free Plan should use:

```text
Daily/Monthly Credit Limit
+
Cheap Model Routing
+
Maximum Task Size
+
Maximum Agent Iterations
+
Maximum Dollar Budget
+
Rate Limits
```

The Free Plan MUST NOT expose unlimited expensive models.

---

# 41. PREMIUM MODEL PROTECTION

Premium models should require either:

```text
Higher Credit Cost
```

or:

```text
Higher Plan
```

or:

```text
Both
```

Example:

```text
Normal Agent:
30 Credits

Premium Agent:
60 Credits
```

This protects Myno from expensive provider usage.

---

# 42. ABUSE PROTECTION

Myno should implement:

```text
Rate Limiting
Concurrency Limits
Daily Limits
Credit Limits
IP/Account Abuse Detection
Task Size Limits
Agent Iteration Limits
Dollar Budgets
Provider Rate Limits
Suspicious Usage Detection
```

Never allow a single customer to create unlimited simultaneous expensive agent executions.

---

# 43. CONCURRENCY CONTROL

Myno should have per-user and global concurrency limits.

Example:

```text
Free:
1 active agent

Paid:
2–5 active agents

Enterprise:
Configurable
```

Global:

```text
Queue
→ Worker Pool
→ Provider
```

This protects infrastructure and provider spending.

---

# 44. FINANCIAL CIRCUIT BREAKER

Myno should have global spending protection.

Example:

```text
Daily AI Budget:
$500
```

If daily spending reaches:

```text
$450
```

Myno can:

```text
Warn
+
Reduce expensive routing
+
Increase queueing
+
Disable premium models for free users
```

If:

```text
$500
```

is reached:

```text
HARD STOP / SAFE MODE
```

depending on business policy.

---

# 45. DYNAMIC COST CONTROL

Myno should dynamically react to API economics.

Example:

```text
Provider A becomes expensive
        ↓
Router detects higher cost
        ↓
Simple tasks move to Provider B
        ↓
Complex tasks remain on Provider A
```

This allows Myno to protect margin without changing the customer experience.

---

# 46. VALUE-BASED PRICING

Myno should NOT tell customers:

```text
You paid us $1 because the API cost us $0.40.
```

Instead, the product should communicate:

```text
This task consumed 70 Myno Credits.
```

Myno is selling:

```text
AI development capability
+
Automation
+
Roblox expertise
+
Tools
+
Agent execution
+
Debugging
+
Project understanding
```

not tokens.

---

# 47. CUSTOMER EXPERIENCE RULE

Cost optimization must happen internally.

The customer should experience:

```text
Fast
Reliable
Powerful
Predictable
```

The customer should NOT experience:

```text
"We switched you to a cheaper model because our margin was bad."
```

unless product policy explicitly exposes model selection.

---

# 48. MODEL ROUTING RULE

Default:

```text
Use the CHEAPEST model capable of completing the task reliably.
```

Not:

```text
Always use the cheapest model.
```

Quality comes first when quality materially affects task success.

The objective is:

```text
Minimum Cost
for Required Quality
```

---

# 49. TOKEN OPTIMIZATION RULES

Myno should:

```text
1. Avoid sending irrelevant files.
2. Use project indexing.
3. Use targeted file retrieval.
4. Compress repeated context.
5. Cache stable context when economical.
6. Keep tool results concise.
7. Avoid unnecessary model verbosity.
8. Detect repeated context.
9. Reuse structured project state.
10. Stop agents once the requested outcome is achieved.
```

---

# 50. PROFIT CALCULATION ENGINE

The backend should conceptually implement:

```text
provider_cost
+
infrastructure_cost
+
retry_cost
+
payment_cost
+
refund_cost
=
variable_cost
```

Then:

```text
revenue
-
variable_cost
=
contribution_profit
```

Then:

```text
contribution_profit
-
operating_expenses
=
operating_profit
```

Then:

```text
operating_profit
-
taxes
-
other_non_operating_costs
=
net_profit
```

---

# 51. RECOMMENDED INTERNAL DATA MODEL

Financial task record:

```text
FinancialTaskRecord {
    task_id

    user_id
    project_id

    task_type
    complexity

    provider
    model

    estimated_input_tokens
    estimated_output_tokens

    actual_input_tokens
    actual_output_tokens

    cache_write_tokens
    cache_read_tokens

    estimated_ai_cost
    actual_ai_cost

    infrastructure_cost
    retry_cost
    payment_cost
    refund_cost

    true_cost

    reserved_credits
    charged_credits
    refunded_credits

    customer_revenue

    contribution_profit
    contribution_margin

    iterations
    max_iterations

    max_dollar_budget
    max_token_budget

    status

    created_at
    completed_at
}
```

---

# 52. FINANCIAL AUDITABILITY

Every customer charge should be explainable internally.

Myno should be able to answer:

```text
Why did this user lose 73 credits?
```

The backend should provide:

```text
Task
→ Provider
→ Model
→ Usage
→ Actual Cost
→ Credit Conversion
→ Final Charge
```

This is essential for:

- Support
- Refunds
- Financial audits
- Fraud detection
- Margin analysis
- Debugging billing problems

---

# 53. NEVER TRUST ESTIMATES FOR ACCOUNTING

Estimates are for control.

Provider-reported usage is for accounting.

Correct:

```text
Estimate
→ Reserve
→ Execute
→ Read Actual Usage
→ Settle
```

Incorrect:

```text
Estimate
→ Charge User Permanently
```

---

# 54. PROFITABILITY ALERTS

Myno should generate alerts when:

```text
AI Cost Ratio > Target
```

or:

```text
Task Margin < Minimum Margin
```

or:

```text
User becomes persistently unprofitable
```

or:

```text
Provider cost unexpectedly increases
```

or:

```text
Retry rate increases
```

or:

```text
Average tokens/task increases
```

or:

```text
Cache hit rate decreases
```

---

# 55. RECOMMENDED ALERT EXAMPLES

```text
WARNING:
Average AI cost increased 22% this week.
```

```text
WARNING:
Complex agent margin dropped below 45%.
```

```text
WARNING:
Customer X generated $8.20 API cost
against $5.00 revenue.
```

```text
WARNING:
Average task tokens increased 31%.
```

These alerts should help the operator act before losses become significant.

---

# 56. MARGIN PROTECTION POLICY

If a task becomes structurally unprofitable:

```text
DO NOT simply allow unlimited execution.
```

Possible actions:

```text
1. Increase credit cost.
2. Route to cheaper model.
3. Reduce maximum context.
4. Reduce maximum iterations.
5. Require premium plan.
6. Require additional credits.
7. Disable the expensive capability temporarily.
```

The product should preserve customer value while protecting the business.

---

# 57. FINANCIAL RULES FOR DEVELOPERS

Developers MUST:

```text
1. Never hardcode provider prices.
2. Never create unlimited agent loops.
3. Never bypass credit reservation.
4. Never bypass dollar budgets.
5. Never bypass iteration limits.
6. Track actual provider usage.
7. Record every provider request.
8. Record retries.
9. Record refunds.
10. Keep billing calculations auditable.
```

---

# 58. FINANCIAL RULES FOR AI AGENTS

Myno agents MUST:

```text
1. Stop when the requested task is complete.
2. Avoid unnecessary tool calls.
3. Avoid reading irrelevant files.
4. Avoid repeating failed actions.
5. Respect iteration limits.
6. Respect token limits.
7. Respect dollar budgets.
8. Respect user credit reservations.
9. Return concise final responses.
10. Never intentionally waste tokens.
```

---

# 59. WHAT MUST NEVER HAPPEN

The following are prohibited:

```text
Unlimited retries
Unlimited agent iterations
Unlimited premium-model usage
Untracked provider requests
Untracked API costs
Negative credit balances caused by execution
Bypassing credit reservations
Hardcoded outdated provider pricing
Charging users based solely on estimated usage
Ignoring failed-task API costs
Sending the entire project unnecessarily
```

---

# 60. CANONICAL EXECUTION FLOW

Every paid agent task should follow:

```text
USER REQUEST
     ↓
CLASSIFY TASK
     ↓
ESTIMATE COMPLEXITY
     ↓
SELECT MODEL
     ↓
ESTIMATE TOKENS
     ↓
ESTIMATE PROVIDER COST
     ↓
CALCULATE CREDIT REQUIREMENT
     ↓
RESERVE CREDITS
     ↓
SET MAX DOLLAR BUDGET
     ↓
SET MAX TOKEN BUDGET
     ↓
SET MAX ITERATIONS
     ↓
START AGENT
     ↓
TRACK EVERY REQUEST
     ↓
TRACK TOKENS
     ↓
TRACK PROVIDER COST
     ↓
TRACK ITERATIONS
     ↓
CHECK LIMITS
     ↓
CONTINUE / STOP
     ↓
TASK COMPLETE
     ↓
READ ACTUAL PROVIDER USAGE
     ↓
CALCULATE TRUE COST
     ↓
SETTLE CREDITS
     ↓
REFUND UNUSED RESERVATION
     ↓
CALCULATE TASK MARGIN
     ↓
STORE FINANCIAL RECORD
```

---

# 61. THE FOUR CORE FINANCIAL ENGINES

Myno's financial architecture should contain four conceptual engines:

## Engine 1 — Cost Estimator

Determines:

```text
Expected tokens
Expected model
Expected provider cost
Expected credit requirement
```

---

## Engine 2 — Credit Reservation Engine

Controls:

```text
Reserved Credits
Actual Credits
Refunded Credits
User Balance
```

---

## Engine 3 — Agent Budget Controller

Controls:

```text
Maximum Dollar Cost
Maximum Tokens
Maximum Iterations
Maximum Retries
Concurrency
```

---

## Engine 4 — Profit Engine

Calculates:

```text
Revenue
AI Cost
True Cost
Contribution
Margin
Operating Profit
Net Profit
```

---

# 62. THE MAIN FINANCIAL FORMULA

At task level:

```text
CUSTOMER REVENUE
        -
TRUE TASK COST
        =
CONTRIBUTION PROFIT
```

Where:

```text
TRUE TASK COST =
AI API COST
+
INFRASTRUCTURE
+
RETRY COST
+
PAYMENT COST
+
REFUNDS
+
OTHER VARIABLE COSTS
```

Then:

```text
CONTRIBUTION PROFIT
÷
CUSTOMER REVENUE
=
CONTRIBUTION MARGIN
```

---

# 63. THE MAIN BUSINESS FORMULA

Monthly:

```text
TOTAL REVENUE
        -
TOTAL VARIABLE COSTS
        =
CONTRIBUTION PROFIT
```

Then:

```text
CONTRIBUTION PROFIT
        -
OPERATING EXPENSES
        =
OPERATING PROFIT
```

Then:

```text
OPERATING PROFIT
        -
TAXES
        -
OTHER NON-OPERATING COSTS
        =
NET PROFIT
```

---

# 64. THE GOLDEN RULE

Myno should NEVER ask:

> "How much can we make the customer use?"

Myno should ask:

> "How much customer value can we create per dollar of AI cost?"

The winning formula is:

```text
HIGH CUSTOMER VALUE
+
LOW TOKEN WASTE
+
SMART MODEL ROUTING
+
CONTROLLED AGENT LOOPS
+
STRONG CREDIT PRICING
+
ACCURATE COST TRACKING
=
HEALTHY MYNO MARGINS
```

---

# 65. FINAL CANONICAL POLICY

These rules are considered the final financial principles for Myno:

```text
RULE 1
Customers pay Myno, not AI providers.

RULE 2
Myno Credits are an internal billing abstraction.

RULE 3
Every expensive task requires credit reservation.

RULE 4
Every agent task requires a maximum dollar budget.

RULE 5
Every agent task requires a maximum iteration limit.

RULE 6
Token budgets should also be enforced.

RULE 7
Actual provider usage determines final API accounting.

RULE 8
Unused credit reservations are refunded.

RULE 9
Provider prices must never be hardcoded.

RULE 10
The cheapest capable model should be preferred.

RULE 11
Context should be minimized without damaging quality.

RULE 12
Stable context should be cached when economically beneficial.

RULE 13
Retries must be limited and financially tracked.

RULE 14
Agent loops must terminate when no meaningful progress is being made.

RULE 15
Free users must have strict financial protection.

RULE 16
Premium capabilities must have higher economic protection.

RULE 17
Every provider request must be financially auditable.

RULE 18
Contribution margin must be tracked per task.

RULE 19
Operating profit and net profit must not be confused with contribution profit.

RULE 20
All financial assumptions are configurable and must be validated against current provider pricing before production use.
```

---

# 66. FINAL ARCHITECTURE

The final Myno financial system should conceptually look like:

```text
                         ┌─────────────────────┐
                         │      CUSTOMER       │
                         └──────────┬──────────┘
                                    │
                              Myno Credits
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  CREDIT RESERVATION │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   COST ESTIMATOR    │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
               MODEL ROUTER   DOLLAR BUDGET    ITERATION LIMIT
                    │               │                │
                    └───────────────┼────────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │     AI AGENT        │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┼──────────┐
                         ▼          ▼          ▼
                    Provider A  Provider B  Provider C
                         │          │          │
                         └──────────┼──────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   USAGE TRACKER     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    PROFIT ENGINE    │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
             Task Margin       User Profitability   Monthly P&L
```

---

# 67. STATUS

This document is the **canonical financial reference** for Myno.

If implementation requirements conflict with this document, the financial implementation should be reviewed before changing the system.

However, provider prices, payment fees, infrastructure prices, and market assumptions are NOT immutable.

When external costs change:

```text
UPDATE CONFIGURATION
        ↓
RECALCULATE COST MODEL
        ↓
RECALCULATE CREDIT ECONOMICS
        ↓
REVIEW MARGINS
        ↓
UPDATE THIS DOCUMENT'S VERSION
```

Do not silently change financial assumptions inside application code.

---

# 68. FINAL OBJECTIVE

The objective of Myno is NOT to maximize:

```text
Tokens
API Calls
Agent Iterations
```

The objective is to maximize:

```text
CUSTOMER VALUE
        /
TOTAL COST
```

while maintaining:

```text
Excellent Quality
+
Excellent UX
+
Predictable Billing
+
Financial Safety
+
Healthy Margins
+
Scalable Infrastructure
```

**Myno wins when the customer feels they received $10+ of value while Myno spent a fraction of that amount to deliver it.**

---

**END OF CANONICAL FINANCIAL REFERENCE**