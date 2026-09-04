/**
 * P3.5.1 — Intelligence Budget & Progressive Intelligence
 *
 * Controls how much intelligence gathering occurs per task.
 * Classifies tasks into FAST/STANDARD/DEEP paths.
 * Enforces budget limits to prevent unnecessary latency.
 */

import type { TaskDescription } from "./orchestrator.js";

/* ============================================================================
 * TASK COMPLEXITY
 * ========================================================================== */

export type TaskComplexity = "fast" | "standard" | "deep";

/* ============================================================================
 * INTELLIGENCE BUDGET
 * ========================================================================== */

export interface IntelligenceBudget {
  /** Task complexity level */
  complexity: TaskComplexity;
  /** Maximum number of intelligence engines to invoke */
  maxEngines: number;
  /** Maximum MCP/inspection calls allowed */
  maxInspections: number;
  /** Maximum total intelligence latency in ms */
  maxLatencyMs: number;
  /** Maximum context items to inject into prompt */
  maxContextItems: number;
  /** Whether deep analysis escalation is allowed */
  allowEscalation: boolean;
  /** Whether world-building analysis is permitted */
  allowWorldBuilding: boolean;
  /** Whether security analysis is permitted */
  allowSecurity: boolean;
  /** Whether performance analysis is permitted */
  allowPerformance: boolean;
  /** Whether dependency analysis is permitted */
  allowDependency: boolean;
  /** Whether remote review is permitted */
  allowRemoteReview: boolean;
}

const FAST_BUDGET: IntelligenceBudget = {
  complexity: "fast",
  maxEngines: 3,
  maxInspections: 0,
  maxLatencyMs: 500,
  maxContextItems: 5,
  allowEscalation: false,
  allowWorldBuilding: false,
  allowSecurity: false,
  allowPerformance: false,
  allowDependency: false,
  allowRemoteReview: false,
};

const STANDARD_BUDGET: IntelligenceBudget = {
  complexity: "standard",
  maxEngines: 7,
  maxInspections: 2,
  maxLatencyMs: 2000,
  maxContextItems: 15,
  allowEscalation: true,
  allowWorldBuilding: false,
  allowSecurity: true,
  allowPerformance: true,
  allowDependency: true,
  allowRemoteReview: true,
};

const DEEP_BUDGET: IntelligenceBudget = {
  complexity: "deep",
  maxEngines: 15,
  maxInspections: 5,
  maxLatencyMs: 5000,
  maxContextItems: 30,
  allowEscalation: false,
  allowWorldBuilding: true,
  allowSecurity: true,
  allowPerformance: true,
  allowDependency: true,
  allowRemoteReview: true,
};

/* ============================================================================
 * TASK CLASSIFIER
 * ========================================================================== */

/** Keywords that indicate complexity levels */
const FAST_PATTERNS = [
  /\btypo\b/i,
  /\brename\b/i,
  /\bchange\s+(color|name|text|label)\b/i,
  /\bsimple\b/i,
  /\bfix\s+(a\s+)?(small|simple|minor)\b/i,
  /\badd\s+a\s+comment\b/i,
  /\bmove\s+(this|it|the)\b/i,
];

const DEEP_PATTERNS = [
  /\b(trading|shop|economy|purchase|currency)\b/i,
  /\b(harbor|district|world|terrain|environment)\b/i,
  /\b(security|anti-cheat|exploit|protect)\b/i,
  /\b(quest|mission|progression|level)\b/i,
  /\b(inventory\s+system|backpack\s+system)\b/i,
  /\b(npc\s+(ai|system|behavior|patrol|chase))\b/i,
  /\b(multiplayer|replicated|server|client)\b/i,
  /\b(persistence|datastore|save|load)\b/i,
];

const SECURITY_PATTERNS = [
  /\b(trading|shop|economy|purchase|currency)\b/i,
  /\b(security|anti-cheat|exploit|protect|validate)\b/i,
  /\b(remote|remoteevent|remotefunction)\b/i,
  /\b(datastore|data\s*store)\b/i,
];

const WORLD_BUILDING_PATTERNS = [
  /\b(harbor|district|world|terrain|environment)\b/i,
  /\b(building|road|bridge|water)\b/i,
  /\b(scene|landscape|map\s*build)\b/i,
];

const UI_PATTERNS = [
  /\b(ui|gui|interface|menu|screen|button)\b/i,
  /\b(inventory\s+ui|shop\s+ui|hud)\b/i,
  /\b(responsive|mobile|tablet)\b/i,
];

const GAMEPLAY_PATTERNS = [
  /\b(npc|enemy|boss|combat|fight|attack)\b/i,
  /\b(quest|mission|objective)\b/i,
  /\b(loot|drop|reward)\b/i,
  /\b(spawn|wave|round)\b/i,
];

const DEBUG_PATTERNS = [
  /\b(fix|broken|error|bug|crash|debug)\b/i,
  /\b(fails?|failing|doesn't\s+work|not\s+working)\b/i,
];

/**
 * Classify task complexity based on request content and domain.
 */
export function classifyTask(task: TaskDescription): TaskComplexity {
  const lower = task.userRequest.toLowerCase();
  const domain = task.domain ?? "general";

  // Check FAST patterns first
  for (const pattern of FAST_PATTERNS) {
    if (pattern.test(lower)) return "fast";
  }

  // Simple domain classification
  if (domain === "debugging" && !task.requiresBuild) return "fast";

  // Check DEEP patterns
  for (const pattern of DEEP_PATTERNS) {
    if (pattern.test(lower)) return "deep";
  }

  // Domain-based deep classification
  if (domain === "economy" || domain === "security" || domain === "networking") return "deep";
  if (domain === "world-building") return "deep";

  // Multi-step or complex tasks
  if (task.requiresBuild && task.requiresTesting) return "standard";

  // Default to standard
  return "standard";
}

/**
 * Get the budget for a given complexity level.
 */
export function getBudget(complexity: TaskComplexity): IntelligenceBudget {
  switch (complexity) {
    case "fast": return { ...FAST_BUDGET };
    case "standard": return { ...STANDARD_BUDGET };
    case "deep": return { ...DEEP_BUDGET };
  }
}

/* ============================================================================
 * BUDGET TRACKER
 * ========================================================================== */

export class BudgetTracker {
  private enginesInvoked = 0;
  private inspectionsUsed = 0;
  private startTime: number;
  private readonly budget: IntelligenceBudget;

  constructor(budget: IntelligenceBudget) {
    this.budget = budget;
    this.startTime = Date.now();
  }

  /** Check if we can still invoke an engine */
  canInvokeEngine(): boolean {
    return this.enginesInvoked < this.budget.maxEngines;
  }

  /** Check if we can still perform an inspection */
  canInspect(): boolean {
    return this.inspectionsUsed < this.budget.maxInspections;
  }

  /** Check if we're within latency budget */
  isWithinLatency(): boolean {
    return (Date.now() - this.startTime) < this.budget.maxLatencyMs;
  }

  /** Check if we're within overall budget */
  isWithinBudget(): boolean {
    return this.canInvokeEngine() && this.isWithinLatency();
  }

  /** Record an engine invocation */
  recordEngine(): void {
    this.enginesInvoked++;
  }

  /** Record an inspection */
  recordInspection(): void {
    this.inspectionsUsed++;
  }

  /** Get elapsed time */
  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  /** Get remaining budget info */
  getRemaining(): { engines: number; inspections: number; latencyMs: number } {
    return {
      engines: this.budget.maxEngines - this.enginesInvoked,
      inspections: this.budget.maxInspections - this.inspectionsUsed,
      latencyMs: this.budget.maxLatencyMs - (Date.now() - this.startTime),
    };
  }

  /** Get the budget */
  getBudget(): IntelligenceBudget {
    return { ...this.budget };
  }
}

/* ============================================================================
 * PROGRESSIVE ROUTER
 * ========================================================================== */

export interface RoutingDecision {
  complexity: TaskComplexity;
  engines: string[];
  budget: IntelligenceBudget;
}

/**
 * Determine which engines to run based on task classification and budget.
 */
export function routeIntelligence(task: TaskDescription): RoutingDecision {
  const complexity = classifyTask(task);
  const budget = getBudget(complexity);
  const engines: string[] = [];

  // Always-on engines (minimal overhead)
  engines.push("knowledge");
  engines.push("lesson-retrieval");
  engines.push("failure-patterns");

  // Conditional engines based on budget permissions and task content
  const lower = task.userRequest.toLowerCase();

  if (budget.allowSecurity || needsSecurity(lower, task.domain)) {
    if (needsRemoteReview(lower, task.domain)) engines.push("remote-review");
    if (needsSecurityAnalysis(lower, task.domain)) engines.push("security");
  }

  if (budget.allowWorldBuilding && needsWorldBuilding(lower, task.domain)) {
    engines.push("world-building");
  }

  if (needsGameplayAnalysis(lower, task.domain)) {
    engines.push("gameplay");
  }

  if (needsUIAnalysis(lower, task.domain)) {
    engines.push("uiux");
  }

  if (needsResponsiveAnalysis(lower)) {
    engines.push("responsive");
  }

  if (budget.allowPerformance && needsPerformanceAnalysis(lower)) {
    engines.push("performance");
  }

  if (budget.allowDependency && needsDependencyAnalysis(lower, task.domain)) {
    engines.push("dependency");
  }

  // Always include architecture for context (lightweight)
  engines.push("architecture");

  // Luau analysis for scripting tasks
  if (task.needsRoblox && (task.requiresBuild || task.requiresTesting)) {
    engines.push("luau-intelligence");
  }

  // Placement for build tasks
  if (task.requiresBuild) {
    engines.push("placement");
  }

  // Constitution for context
  engines.push("constitution");

  // Enforce budget: trim engines if over budget
  const trimmed = engines.slice(0, budget.maxEngines);

  return { complexity, engines: trimmed, budget };
}

/* ============================================================================
 * KEYWORD MATCHING HELPERS
 * ========================================================================== */

function needsSecurity(lower: string, domain?: string): boolean {
  return SECURITY_PATTERNS.some(p => p.test(lower)) ||
    domain === "economy" || domain === "security" || domain === "networking";
}

function needsRemoteReview(lower: string, domain?: string): boolean {
  return SECURITY_PATTERNS.some(p => p.test(lower)) ||
    domain === "economy" || domain === "networking";
}

function needsSecurityAnalysis(lower: string, domain?: string): boolean {
  return needsRemoteReview(lower, domain);
}

function needsWorldBuilding(lower: string, domain?: string): boolean {
  return WORLD_BUILDING_PATTERNS.some(p => p.test(lower)) ||
    domain === "world-building";
}

function needsGameplayAnalysis(lower: string, domain?: string): boolean {
  return GAMEPLAY_PATTERNS.some(p => p.test(lower));
}

function needsUIAnalysis(lower: string, _domain?: string): boolean {
  return UI_PATTERNS.some(p => p.test(lower));
}

function needsResponsiveAnalysis(lower: string): boolean {
  return /\b(mobile|responsive|phone|tablet)\b/i.test(lower);
}

function needsPerformanceAnalysis(lower: string): boolean {
  return /\b(performance|optimize|lag|fps|slow|memory)\b/i.test(lower);
}

function needsDependencyAnalysis(lower: string, domain?: string): boolean {
  return DEBUG_PATTERNS.some(p => p.test(lower)) || domain === "debugging";
}
