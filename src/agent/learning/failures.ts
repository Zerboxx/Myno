/**
 * P3.5 — Failure Pattern Library
 *
 * Library of known failure patterns with detection and recovery strategies.
 */

import type { ToolFailureCategory } from "../../tools/types.js";

/** Failure pattern */
export interface FailurePattern {
  id: string;
  name: string;
  category: FailureCategory;
  description: string;

  /** Detection criteria */
  detection: DetectionCriteria;

  /** Root cause patterns */
  rootCauses: RootCause[];

  /** Recovery strategies */
  recoveries: RecoveryStrategy[];

  /** Prevention measures */
  prevention: PreventionMeasure[];

  /** Examples */
  examples: FailureExample[];

  /** Metadata */
  frequency: "common" | "uncommon" | "rare";
  severity: "critical" | "high" | "medium" | "low";
  tags: string[];
}

/** Failure category */
export type FailureCategory =
  | "validation"
  | "permission"
  | "network"
  | "resource"
  | "logic"
  | "state"
  | "concurrency"
  | "resource-exhaustion"
  | "dependency"
  | "configuration"
  | "api"
  | "schema";

/** Detection criteria */
export interface DetectionCriteria {
  errorPatterns: string[];
  toolNames?: string[];
  errorTypes?: ToolFailureCategory[];
  contextPatterns?: string[];
  customDetector?: (execution: any) => boolean;
}

/** Root cause */
export interface RootCause {
  description: string;
  probability: number;
  indicators: string[];
  verification: string;
}

/** Recovery strategy */
export interface RecoveryStrategy {
  name: string;
  description: string;
  steps: RecoveryStep[];
  successRate: number;
  applicableWhen: string[];
  prerequisites: string[];
  automated: boolean;
}

/** Recovery step */
export interface RecoveryStep {
  order: number;
  action: string;
  tool?: string;
  args?: Record<string, any>;
  expectedOutcome: string;
  verification: string;
  fallback?: string;
}

/** Prevention measure */
export interface PreventionMeasure {
  description: string;
  implementation: string;
  effectiveness: number;
  effort: "low" | "medium" | "high";
  automated: boolean;
}

/** Failure example */
export interface FailureExample {
  scenario: string;
  errorMessage: string;
  rootCause: string;
  recoveryUsed: string;
  outcome: "resolved" | "partial" | "failed";
  lessons: string[];
}

/** Failure pattern library */
export class FailurePatternLibrary {
  private patterns: Map<string, FailurePattern> = new Map();
  private readonly logger: any;

  constructor() {
    this.logger = console;
    this.initializeDefaultPatterns();
  }

  private initializeDefaultPatterns(): void {
    // Validation failure pattern
    this.register({
      id: "validation-missing-args",
      name: "Missing Required Arguments",
      category: "validation",
      description: "Tool called with missing required arguments",
      detection: {
        errorPatterns: ["missing required", "required.*argument", "argument.*required", "expected.*argument"],
        errorTypes: ["VALIDATION"],
      },
      rootCauses: [
        { description: "Model omitted required parameter", probability: 0.6, indicators: ["missing", "required"], verification: "Check tool schema vs call" },
        { description: "Argument name mismatch", probability: 0.3, indicators: ["unknown", "unexpected"], verification: "Compare schema vs call" },
        { description: "Schema validation not enforced", probability: 0.1, indicators: [], verification: "Check schema validation enabled" },
      ],
      recoveries: [{
        name: "Argument Correction",
        description: "Identify and supply missing arguments",
        steps: [
          { order: 1, action: "Inspect tool schema for required fields", expectedOutcome: "Identify missing parameters", verification: "Schema shows required fields", fallback: "Check tool documentation" },
          { order: 2, action: "Extract missing values from context or user", expectedOutcome: "Obtain required values", verification: "Values obtained", fallback: "Ask user for input" },
          { order: 3, action: "Retry with corrected arguments", expectedOutcome: "Tool executes successfully", verification: "Tool returns success", fallback: "Try alternative tool" },
        ],
        successRate: 0.85,
        applicableWhen: ["VALIDATION error", "missing required argument"],
        prerequisites: ["Tool schema available"],
        automated: true,
      }],
      prevention: [
        { description: "Validate arguments before tool call", implementation: "Schema validation in tool registry", effectiveness: 0.9, effort: "low", automated: true },
        { description: "Schema-driven argument generation", implementation: "Model uses schema to generate calls", effectiveness: 0.8, effort: "medium", automated: true },
      ],
      examples: [{
        scenario: "create_instance called without required 'className' parameter",
        errorMessage: "VALIDATION: Missing required argument: className",
        rootCause: "Model omitted required className parameter",
        recoveryUsed: "Argument Correction",
        outcome: "resolved",
        lessons: ["Always validate required params before tool calls"],
      }],
      frequency: "common",
      severity: "high",
      tags: ["validation", "arguments", "schema"],
    });

    // Permission denied pattern
    this.register({
      id: "permission-denied",
      name: "Permission Denied",
      category: "permission",
      description: "Operation failed due to insufficient permissions",
      detection: {
        errorPatterns: ["permission denied", "unauthorized", "access denied", "forbidden", "insufficient permission"],
        errorTypes: ["PERMISSION"],
      },
      rootCauses: [
        { description: "Client attempting server-only operation", probability: 0.5, indicators: ["LocalScript", "client"], verification: "Check script RunContext" },
        { description: "Missing server-side permission check", probability: 0.3, indicators: ["RemoteEvent", "RemoteFunction"], verification: "Check server validation" },
        { description: "Insufficient user permissions", probability: 0.2, indicators: ["group", "rank", "permission"], verification: "Check user permissions" },
      ],
      recoveries: [{
        name: "Permission Fix",
        description: "Adjust permissions or move operation to correct context",
        steps: [
          { order: 1, action: "Identify required permission level", expectedOutcome: "Determine needed permissions", verification: "Documentation or code review", fallback: "Check Roblox docs" },
          { order: 2, action: "Move operation to appropriate context", expectedOutcome: "Operation runs with correct permissions", verification: "Test in correct context", fallback: "Refactor architecture" },
          { order: 3, action: "Add server-side validation", expectedOutcome: "Prevent future permission issues", verification: "Validation present and working", fallback: "Add basic checks" },
        ],
        successRate: 0.75,
        applicableWhen: ["PERMISSION error", "access denied"],
        prerequisites: ["Understanding of Roblox security model"],
        automated: false,
      }],
      prevention: [
        { description: "Enforce server-side validation", implementation: "Mandatory server-side checks for all remotes", effectiveness: 0.95, effort: "medium", automated: true },
        { description: "Use appropriate script types", implementation: "Server scripts for authoritative logic", effectiveness: 0.9, effort: "low", automated: true },
      ],
      examples: [{
        scenario: "LocalScript tries to write to DataStore",
        errorMessage: "PERMISSION: DataStoreService cannot be accessed from client",
        rootCause: "Client attempted server-only operation",
        recoveryUsed: "Permission Fix",
        outcome: "resolved",
        lessons: ["DataStore operations must be server-side"],
      }],
      frequency: "common",
      severity: "high",
      tags: ["permission", "security", "client-server"],
    });

    // Network/timeout pattern
    this.register({
      id: "network-timeout",
      name: "Network Timeout",
      category: "network",
      description: "MCP tool call timed out",
      detection: {
        errorPatterns: ["timeout", "timed out", "ETIMEDOUT", "connection timeout", "request timeout"],
        errorTypes: ["TIMEOUT"],
      },
      rootCauses: [
        { description: "Studio MCP server overloaded", probability: 0.4, indicators: ["high load", "many requests"], verification: "Check server load" },
        { description: "Network connectivity issues", probability: 0.3, indicators: ["intermittent", "random"], verification: "Check network" },
        { description: "Operation too complex", probability: 0.3, indicators: ["large data", "complex query"], verification: "Profile operation" },
      ],
      recoveries: [{
        name: "Retry with Backoff",
        description: "Retry with exponential backoff",
        steps: [
          { order: 1, action: "Wait with exponential backoff", expectedOutcome: "Server recovers", verification: "Subsequent call succeeds", fallback: "Try alternative" },
          { order: 2, action: "Simplify operation", expectedOutcome: "Reduced load", verification: "Operation completes", fallback: "Split operation" },
        ],
        successRate: 0.7,
        applicableWhen: ["TIMEOUT error", "transient failure"],
        prerequisites: [],
        automated: true,
      }],
      prevention: [
        { description: "Set appropriate timeouts", implementation: "Configure appropriate timeout values", effectiveness: 0.8, effort: "low", automated: true },
        { description: "Optimize heavy operations", implementation: "Batch or paginate large operations", effectiveness: 0.7, effort: "medium", automated: false },
      ],
      examples: [],
      frequency: "uncommon",
      severity: "medium",
      tags: ["timeout", "network", "retry"],
    });

    // Duplicate creation pattern
    this.register({
      id: "duplicate-creation",
      name: "Unintended Duplicate Creation",
      category: "state",
      description: "Creating duplicate instances when one already exists",
      detection: {
        errorPatterns: ["already exists", "duplicate", "name conflict", "name taken"],
        contextPatterns: ["create", "insert", "spawn", "clone"],
      },
      rootCauses: [
        { description: "No existence check before creation", probability: 0.7, indicators: ["no search", "no inspect"], verification: "Check if inspection performed" },
        { description: "Race condition in concurrent creation", probability: 0.2, indicators: ["concurrent", "parallel"], verification: "Check execution timeline" },
        { description: "Name generation not unique", probability: 0.1, indicators: ["random name", "timestamp"], verification: "Check naming strategy" },
      ],
      recoveries: [{
        name: "Deduplication",
        description: "Find and reuse existing instance",
        steps: [
          { order: 1, action: "Search for existing instance", expectedOutcome: "Find existing", verification: "Instance found", fallback: "Create new" },
          { order: 2, action: "Reuse or update existing", expectedOutcome: "Single instance", verification: "Single instance exists", fallback: "Delete duplicate" },
        ],
        successRate: 0.9,
        applicableWhen: ["duplicate name error", "conflict error"],
        prerequisites: ["Search capability"],
        automated: true,
      }],
      prevention: [
        { description: "Check before create", implementation: "Search before create pattern", effectiveness: 0.95, effort: "low", automated: true },
        { description: "Unique naming", implementation: "UUID or deterministic naming", effectiveness: 0.9, effort: "low", automated: true },
      ],
      examples: [],
      frequency: "common",
      severity: "medium",
      tags: ["duplicate", "deduplication", "idempotency"],
    });

    // Tool execution failure
    this.register({
      id: "tool-execution-failure",
      name: "Tool Execution Failure",
      category: "api",
      description: "MCP tool execution failed with runtime error",
      detection: {
        errorPatterns: ["execution failed", "runtime error", "script error", "execution error"],
        errorTypes: ["RUNTIME", "STUDIO_DISCONNECTED"],
      },
      rootCauses: [
        { description: "Invalid arguments after validation", probability: 0.3, indicators: ["type mismatch", "range"], verification: "Check argument types" },
        { description: "Studio state changed", probability: 0.3, indicators: ["disconnected", "stale"], verification: "Check Studio connection" },
        { description: "Script execution error", probability: 0.4, indicators: ["script error", "runtime"], verification: "Check script output" },
      ],
      recoveries: [{
        name: "Diagnose and Retry",
        description: "Diagnose error and retry with corrected approach",
        steps: [
          { order: 1, action: "Analyze error message", expectedOutcome: "Identify root cause", verification: "Error categorized", fallback: "Retry with different approach" },
          { order: 2, action: "Fix identified issue", expectedOutcome: "Corrected execution", verification: "Tool succeeds", fallback: "Try alternative tool" },
        ],
        successRate: 0.6,
        applicableWhen: ["RUNTIME error", "execution failed"],
        prerequisites: ["Error analysis capability"],
        automated: true,
      }],
      prevention: [
        { description: "Pre-flight validation", implementation: "Validate inputs before execution", effectiveness: 0.8, effort: "low", automated: true },
        { description: "Health checks", implementation: "Check Studio connection before calls", effectiveness: 0.7, effort: "low", automated: true },
      ],
      examples: [],
      frequency: "common",
      severity: "high",
      tags: ["execution", "runtime", "retry"],
    });

    // Resource exhaustion
    this.register({
      id: "resource-exhaustion",
      name: "Resource Exhaustion",
      category: "resource-exhaustion",
      description: "System resources exhausted (memory, instances, connections)",
      detection: {
        errorPatterns: ["out of memory", "too many", "limit exceeded", "quota exceeded", "maximum reached"],
        errorTypes: ["RESOURCE"],
      },
      rootCauses: [
        { description: "Memory leak", probability: 0.4, indicators: ["growing memory", "gc pressure"], verification: "Monitor memory" },
        { description: "Instance limit reached", probability: 0.3, indicators: ["too many", "limit"], verification: "Count instances" },
        { description: "Connection pool exhausted", probability: 0.3, indicators: ["connection", "pool"], verification: "Check connections" },
      ],
      recoveries: [{
        name: "Resource Cleanup",
        description: "Free resources and retry",
        steps: [
          { order: 1, action: "Identify resource type", expectedOutcome: "Know what to clean", verification: "Resource identified", fallback: "Restart" },
          { order: 2, action: "Clean up unused resources", expectedOutcome: "Resources freed", verification: "Resources available", fallback: "Force cleanup" },
          { order: 3, action: "Implement limits", expectedOutcome: "Prevent recurrence", verification: "Limits enforced", fallback: "Monitor" },
        ],
        successRate: 0.7,
        applicableWhen: ["RESOURCE error", "out of memory"],
        prerequisites: ["Monitoring capability"],
        automated: true,
      }],
      prevention: [
        { description: "Implement resource limits", implementation: "Set max instances/connections", effectiveness: 0.9, effort: "medium", automated: true },
        { description: "Monitor resource usage", implementation: "Alert on high usage", effectiveness: 0.8, effort: "low", automated: true },
      ],
      examples: [],
      frequency: "uncommon",
      severity: "critical",
      tags: ["resource", "memory", "limits"],
    });
  }

  register(pattern: any): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Find matching patterns for an error
   */
  findPatterns(error: string, context: any = {}): any[] {
    const matches = [];
    for (const pattern of this.patterns.values()) {
      if (this.matchesPattern(pattern, error, context)) {
        matches.push(pattern);
      }
    }
    return matches.sort((a, b) => {
      // Sort by severity then frequency
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private matchesPattern(pattern: any, error: string, context: any): boolean {
    for (const pattern_ of pattern.detection.errorPatterns) {
      if (new RegExp(pattern_, "i").test(error)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get recovery strategies for a pattern
   */
  getRecoveryStrategies(patternId: string): any[] {
    const pattern = this.patterns.get(patternId);
    return pattern?.recoveries || [];
  }

  /**
   * Get prevention measures for a pattern
   */
  getPreventionMeasures(patternId: string): any[] {
    const pattern = this.patterns.get(patternId);
    return pattern?.prevention || [];
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): any[] {
    return Array.from(this.patterns.values());
  }
}

export function createFailurePatternLibrary(): FailurePatternLibrary {
  return new FailurePatternLibrary();
}