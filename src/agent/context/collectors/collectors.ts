/**
 * P3.6-B — Source Collectors
 *
 * Independent collectors that gather raw evidence from different sources
 * and normalize them into ContextEvidence items.
 *
 * Each collector:
 * - Knows only its own source domain
 * - Produces normalized ContextEvidence
 * - Preserves provenance
 * - Never fabricates evidence
 * - Fails safely (returns empty array, never throws)
 */

import type {
  ContextEvidence,
  ContextSource,
  EvidenceKind,
  CriticalityLevel,
  PriorityLevel,
  SecurityClassification,
  TrustLevel,
  FreshnessLevel,
} from "../types.js";
import { createEvidence } from "../evidence.js";
import type { TaskIntelligence } from "../../intelligence/orchestrator.js";
import type { IntelligenceBudget } from "../../intelligence/budget.js";
import { buildProvenance } from "../provenance.js";

/* ============================================================================
 * COLLECTOR INTERFACE
 * ========================================================================== */

export interface ContextCollector {
  readonly id: string;
  readonly description: string;

  collect(request: ContextCollectionRequest): Promise<CollectorResult>;
}

export interface ContextCollectionRequest {
  taskId: string;
  taskDescription: string;
  intent: string;
  domain: string;
  intelligence: TaskIntelligence | null;
  budget: IntelligenceBudget | null;
  projectFingerprint?: string;
  executedTools?: Array<{
    name: string;
    status: "success" | "error" | "timeout";
    input: Record<string, unknown>;
    result?: unknown;
  }>;
  verification?: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
  previousFingerprint?: string;
}

export interface CollectorResult {
  evidence: ContextEvidence[];
  collectorId: string;
  durationMs: number;
  success: boolean;
  error?: string;
  itemCount: number;
}

/* ============================================================================
 * TASK COLLECTOR
 * Collects evidence from the user's request, task classification, and constraints.
 * Trust: user-input (untrusted as system instructions).
 * ========================================================================== */

export const taskCollector: ContextCollector = {
  id: "task-collector",
  description: "Collects evidence from user request and task metadata",

  async collect(request: ContextCollectionRequest): Promise<CollectorResult> {
    const start = Date.now();
    const evidence: ContextEvidence[] = [];

    try {
      const source: ContextSource = {
        sourceType: "user",
        sourceId: `task-${request.taskId}`,
        sourceName: "User Request",
        taskId: request.taskId,
        timestamp: Date.now(),
      };

      // Evidence 1: The original user request
      evidence.push(createEvidence({
        kind: "user-input",
        source,
        content: { type: "text", value: request.taskDescription },
        relevance: 1.0,
        confidence: "unknown",
        criticality: "critical",
        priority: "critical",
        securityClassification: "none",
        trustLevel: "user-input",
        tags: ["task", "user-request"],
        provenance: buildProvenance({
          collectorId: "task-collector",
          taskId: request.taskId,
        }),
      }));

      // Evidence 2: Task intent (system-interpreted, not user-provided)
      evidence.push(createEvidence({
        kind: "constraint",
        source: {
          ...source,
          sourceId: `intent-${request.taskId}`,
          sourceName: "Task Classification",
        },
        content: { type: "text", value: `Intent: ${request.intent} | Domain: ${request.domain}` },
        relevance: 0.9,
        confidence: 0.8,
        criticality: "important",
        priority: "high",
        securityClassification: "none",
        trustLevel: "system",
        tags: ["task", "intent", request.domain],
        provenance: buildProvenance({
          collectorId: "task-collector",
          engineId: "task-classification",
          taskId: request.taskId,
        }),
      }));

      return {
        evidence,
        collectorId: "task-collector",
        durationMs: Date.now() - start,
        success: true,
        itemCount: evidence.length,
      };
    } catch (err) {
      return {
        evidence: [],
        collectorId: "task-collector",
        durationMs: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        itemCount: 0,
      };
    }
  },
};

/* ============================================================================
 * PROJECT MAP COLLECTOR
 * Collects evidence from the project map (structure, scripts, remotes, etc.).
 * Trust: project-data.
 * ========================================================================== */

export const projectMapCollector: ContextCollector = {
  id: "project-map-collector",
  description: "Collects evidence from project map inspection",

  async collect(request: ContextCollectionRequest): Promise<CollectorResult> {
    const start = Date.now();
    const evidence: ContextEvidence[] = [];

    try {
      const projectMap = request.intelligence?.projectMap;
      if (!projectMap) {
        return {
          evidence: [],
          collectorId: "project-map-collector",
          durationMs: Date.now() - start,
          success: true,
          itemCount: 0,
        };
      }

      const source: ContextSource = {
        sourceType: "project-map",
        sourceId: `project-${projectMap.projectId}`,
        sourceName: "Project Map",
        taskId: request.taskId,
        timestamp: Date.now(),
      };

      // Evidence: Project structure summary
      const instanceCount = projectMap.instances?.length ?? 0;
      const scriptCount = projectMap.scripts?.length ?? 0;
      const remoteCount = projectMap.remotes?.length ?? 0;

      evidence.push(createEvidence({
        kind: "project-map",
        source,
        content: {
          type: "structured",
          value: {
            projectId: projectMap.projectId,
            instanceCount,
            scriptCount,
            remoteCount,
            hasUI: Object.keys(projectMap.uiHierarchy ?? {}).length > 0,
            hasWorld: Object.keys(projectMap.world ?? {}).length > 0,
          },
        },
        relevance: 0.7,
        confidence: 0.9,
        criticality: "relevant",
        priority: "medium",
        securityClassification: "none",
        trustLevel: "project-data",
        tags: ["project", "structure"],
        provenance: buildProvenance({
          collectorId: "project-map-collector",
          projectFingerprint: request.projectFingerprint,
          taskId: request.taskId,
        }),
      }));

      // Evidence: Scripts in the project
      if (projectMap.scripts && projectMap.scripts.length > 0) {
        const scriptSummary = projectMap.scripts
          .slice(0, 20)
          .map(s => `${s.name} (${s.className})`)
          .join(", ");

        evidence.push(createEvidence({
          kind: "code",
          source: {
            ...source,
            sourceId: `scripts-${projectMap.projectId}`,
            sourceName: "Project Scripts",
          },
          content: { type: "text", value: `Project scripts: ${scriptSummary}` },
          relevance: 0.6,
          confidence: 0.9,
          criticality: "relevant",
          priority: "medium",
          securityClassification: "none",
          trustLevel: "project-data",
          tags: ["project", "scripts"],
          provenance: buildProvenance({
            collectorId: "project-map-collector",
            projectFingerprint: request.projectFingerprint,
            taskId: request.taskId,
          }),
        }));
      }

      // Evidence: Remotes
      if (projectMap.remotes && projectMap.remotes.length > 0) {
        const remoteSummary = projectMap.remotes
          .slice(0, 20)
          .map(r => `${r.name} (${r.className})`)
          .join(", ");

        evidence.push(createEvidence({
          kind: "remote-security",
          source: {
            ...source,
            sourceId: `remotes-${projectMap.projectId}`,
            sourceName: "Project Remotes",
          },
          content: { type: "text", value: `Project remotes: ${remoteSummary}` },
          relevance: 0.7,
          confidence: 0.9,
          criticality: "relevant",
          priority: "medium",
          securityClassification: "security-relevant",
          trustLevel: "project-data",
          tags: ["project", "remotes"],
          provenance: buildProvenance({
            collectorId: "project-map-collector",
            projectFingerprint: request.projectFingerprint,
            taskId: request.taskId,
          }),
        }));
      }

      // Evidence: Project issues
      if (projectMap.issues && projectMap.issues.length > 0) {
        const issueSummary = projectMap.issues
          .slice(0, 10)
          .map(i => `[${i.severity}] ${i.message}`)
          .join("\n");

        evidence.push(createEvidence({
          kind: "observation",
          source: {
            ...source,
            sourceId: `issues-${projectMap.projectId}`,
            sourceName: "Project Issues",
          },
          content: { type: "text", value: `Project issues:\n${issueSummary}` },
          relevance: 0.8,
          confidence: 0.85,
          criticality: "important",
          priority: "high",
          securityClassification: "none",
          trustLevel: "project-data",
          tags: ["project", "issues"],
          provenance: buildProvenance({
            collectorId: "project-map-collector",
            projectFingerprint: request.projectFingerprint,
            taskId: request.taskId,
          }),
        }));
      }

      return {
        evidence,
        collectorId: "project-map-collector",
        durationMs: Date.now() - start,
        success: true,
        itemCount: evidence.length,
      };
    } catch (err) {
      return {
        evidence: [],
        collectorId: "project-map-collector",
        durationMs: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        itemCount: 0,
      };
    }
  },
};

/* ============================================================================
 * INTELLIGENCE COLLECTOR
 * Converts P3.5 intelligence outputs into ContextEvidence.
 * Does NOT re-run intelligence engines — consumes already-produced results.
 * ========================================================================== */

export const intelligenceCollector: ContextCollector = {
  id: "intelligence-collector",
  description: "Converts P3.5 intelligence outputs to ContextEvidence",

  async collect(request: ContextCollectionRequest): Promise<CollectorResult> {
    const start = Date.now();
    const evidence: ContextEvidence[] = [];

    try {
      const intel = request.intelligence;
      if (!intel) {
        return {
          evidence: [],
          collectorId: "intelligence-collector",
          durationMs: Date.now() - start,
          success: true,
          itemCount: 0,
        };
      }

      const source: ContextSource = {
        sourceType: "intelligence-engine",
        sourceId: "intelligence-orchestrator",
        sourceName: "Intelligence Orchestrator",
        taskId: request.taskId,
        timestamp: Date.now(),
      };

      // Security findings
      if (intel.security?.vulnerabilities) {
        for (const vuln of intel.security.vulnerabilities.slice(0, 10)) {
          const severity: CriticalityLevel =
            vuln.severity === "critical" ? "critical" :
            vuln.severity === "high" ? "important" : "relevant";
          const priority: PriorityLevel =
            vuln.severity === "critical" ? "critical" :
            vuln.severity === "high" ? "high" : "medium";
          const secClass: SecurityClassification =
            vuln.severity === "critical" || vuln.severity === "high"
              ? "security-critical" : "security-relevant";

          evidence.push(createEvidence({
            kind: "security",
            source: { ...source, sourceId: "security-engine", sourceName: "Security Intelligence" },
            content: { type: "text", value: `[${vuln.severity?.toUpperCase()}] ${vuln.title ?? vuln.type}: ${vuln.description}` },
            relevance: vuln.severity === "critical" ? 1.0 : vuln.severity === "high" ? 0.9 : 0.7,
            confidence: 0.9,
            criticality: severity,
            priority,
            securityClassification: secClass,
            trustLevel: "project-data",
            tags: ["security", "vulnerability", vuln.type],
            provenance: buildProvenance({
              collectorId: "intelligence-collector",
              engineId: "security-engine",
              taskId: request.taskId,
            }),
          }));
        }
      }

      // Architecture findings
      if (intel.architecture?.antiPatterns) {
        for (const ap of intel.architecture.antiPatterns.slice(0, 5)) {
          const sev = ap.severity ?? "medium";
          evidence.push(createEvidence({
            kind: "architecture",
            source: { ...source, sourceId: "architecture-engine", sourceName: "Architecture Intelligence" },
            content: { type: "text", value: `[${sev}] Anti-pattern: ${ap.description}` },
            relevance: 0.8,
            confidence: 0.8,
            criticality: sev === "critical" ? "critical" : sev === "high" ? "important" : "relevant",
            priority: sev === "critical" ? "critical" : sev === "high" ? "high" : "medium",
            securityClassification: "none",
            trustLevel: "project-data",
            tags: ["architecture", "anti-pattern"],
            provenance: buildProvenance({
              collectorId: "intelligence-collector",
              engineId: "architecture-engine",
              taskId: request.taskId,
            }),
          }));
        }
      }

      // Architecture recommendations
      if (intel.architecture?.recommendations) {
        for (const rec of intel.architecture.recommendations.slice(0, 5)) {
          evidence.push(createEvidence({
            kind: "architecture",
            source: { ...source, sourceId: "architecture-engine", sourceName: "Architecture Intelligence" },
            content: { type: "text", value: `Recommendation: ${rec.description}` },
            relevance: 0.7,
            confidence: 0.8,
            criticality: "relevant",
            priority: "medium",
            securityClassification: "none",
            trustLevel: "project-data",
            tags: ["architecture", "recommendation"],
            provenance: buildProvenance({
              collectorId: "intelligence-collector",
              engineId: "architecture-engine",
              taskId: request.taskId,
            }),
          }));
        }
      }

      // Dependency violations
      if (intel.dependency?.violations) {
        for (const v of intel.dependency.violations.slice(0, 5)) {
          evidence.push(createEvidence({
            kind: "dependency",
            source: { ...source, sourceId: "dependency-engine", sourceName: "Dependency Intelligence" },
            content: { type: "text", value: `[${v.severity}] ${v.type}: ${v.from} → ${v.to}: ${v.description}` },
            relevance: v.severity === "error" ? 0.85 : 0.6,
            confidence: 0.85,
            criticality: v.severity === "error" ? "important" : "relevant",
            priority: v.severity === "error" ? "high" : "medium",
            securityClassification: "none",
            trustLevel: "project-data",
            tags: ["dependency", v.type],
            provenance: buildProvenance({
              collectorId: "intelligence-collector",
              engineId: "dependency-engine",
              taskId: request.taskId,
            }),
          }));
        }
      }

      // Placement findings
      if (intel.placement?.misplacedItems) {
        for (const item of intel.placement.misplacedItems.slice(0, 5)) {
          evidence.push(createEvidence({
            kind: "placement",
            source: { ...source, sourceId: "placement-engine", sourceName: "Placement Intelligence" },
            content: { type: "text", value: `[${item.severity ?? "warning"}] ${item.name}: ${item.reason}` },
            relevance: item.severity === "error" ? 0.8 : 0.6,
            confidence: 0.8,
            criticality: item.severity === "error" ? "important" : "relevant",
            priority: item.severity === "error" ? "high" : "medium",
            securityClassification: "none",
            trustLevel: "project-data",
            tags: ["placement", item.type],
            provenance: buildProvenance({
              collectorId: "intelligence-collector",
              engineId: "placement-engine",
              taskId: request.taskId,
            }),
          }));
        }
      }

      // Performance findings
      if (intel.performance?.bottlenecks) {
        for (const b of intel.performance.bottlenecks.slice(0, 5)) {
          evidence.push(createEvidence({
            kind: "performance",
            source: { ...source, sourceId: "performance-engine", sourceName: "Performance Intelligence" },
            content: { type: "text", value: `Bottleneck: ${b.description}` },
            relevance: 0.75,
            confidence: 0.8,
            criticality: "relevant",
            priority: "medium",
            securityClassification: "none",
            trustLevel: "project-data",
            tags: ["performance", "bottleneck"],
            provenance: buildProvenance({
              collectorId: "intelligence-collector",
              engineId: "performance-engine",
              taskId: request.taskId,
            }),
          }));
        }
      }

      // Remote security review
      if (intel.remoteReview) {
        // Remote events
        if (intel.remoteReview.remoteEvents) {
          for (const evt of intel.remoteReview.remoteEvents.slice(0, 5)) {
            const risk = evt.riskLevel;
            const secClass: SecurityClassification =
              risk === "critical" || risk === "high"
                ? "security-critical" : "security-relevant";
            const vulnSummary = evt.vulnerabilities?.map((v: { type: string; description: string }) => v.description).join("; ") ?? "";

            evidence.push(createEvidence({
              kind: "remote-security",
              source: { ...source, sourceId: "remote-review-engine", sourceName: "Remote Security Review" },
              content: { type: "text", value: `[${risk}] RemoteEvent ${evt.remote}: ${vulnSummary || (evt.recommendations?.join("; ") ?? "reviewed")}` },
              relevance: risk === "critical" ? 1.0 : risk === "high" ? 0.9 : 0.7,
              confidence: 0.85,
              criticality: risk === "critical" ? "critical" : risk === "high" ? "important" : "relevant",
              priority: risk === "critical" ? "critical" : risk === "high" ? "high" : "medium",
              securityClassification: secClass,
              trustLevel: "project-data",
              tags: ["remote-security", "event", evt.remote],
              provenance: buildProvenance({
                collectorId: "intelligence-collector",
                engineId: "remote-review-engine",
                taskId: request.taskId,
              }),
            }));
          }
        }

        // Remote functions
        if (intel.remoteReview.remoteFunctions) {
          for (const fn of intel.remoteReview.remoteFunctions.slice(0, 5)) {
            const risk = fn.riskLevel;
            const secClass: SecurityClassification =
              risk === "critical" || risk === "high"
                ? "security-critical" : "security-relevant";
            const vulnSummary = fn.vulnerabilities?.map((v: { type: string; description: string }) => v.description).join("; ") ?? "";

            evidence.push(createEvidence({
              kind: "remote-security",
              source: { ...source, sourceId: "remote-review-engine", sourceName: "Remote Security Review" },
              content: { type: "text", value: `[${risk}] RemoteFunction ${fn.remote}: ${vulnSummary || (fn.recommendations?.join("; ") ?? "reviewed")}` },
              relevance: risk === "critical" ? 1.0 : risk === "high" ? 0.9 : 0.7,
              confidence: 0.85,
              criticality: risk === "critical" ? "critical" : risk === "high" ? "important" : "relevant",
              priority: risk === "critical" ? "critical" : risk === "high" ? "high" : "medium",
              securityClassification: secClass,
              trustLevel: "project-data",
              tags: ["remote-security", "function", fn.remote],
              provenance: buildProvenance({
                collectorId: "intelligence-collector",
                engineId: "remote-review-engine",
                taskId: request.taskId,
              }),
            }));
          }
        }
      }

      // Quality evaluation
      if (intel.quality) {
        const failedDimensions = intel.quality.dimensions?.filter((d: { passed: boolean }) => !d.passed) ?? [];
        if (failedDimensions.length > 0) {
          evidence.push(createEvidence({
            kind: "quality",
            source: { ...source, sourceId: "quality-engine", sourceName: "Quality Evaluation" },
            content: { type: "text", value: `Quality gates failed: ${failedDimensions.map((d: { name: string }) => d.name).join(", ")}` },
            relevance: 0.8,
            confidence: 0.85,
            criticality: "important",
            priority: "high",
            securityClassification: "none",
            trustLevel: "system",
            tags: ["quality", "gate-failed"],
            provenance: buildProvenance({
              collectorId: "intelligence-collector",
              engineId: "quality-engine",
              taskId: request.taskId,
            }),
          }));
        }
      }

      return {
        evidence,
        collectorId: "intelligence-collector",
        durationMs: Date.now() - start,
        success: true,
        itemCount: evidence.length,
      };
    } catch (err) {
      return {
        evidence: [],
        collectorId: "intelligence-collector",
        durationMs: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        itemCount: 0,
      };
    }
  },
};

/* ============================================================================
 * EXECUTION COLLECTOR
 * Collects evidence produced during task execution.
 * Distinguishes: requested, attempted, completed, verified, failed.
 * ========================================================================== */

export const executionCollector: ContextCollector = {
  id: "execution-collector",
  description: "Collects evidence from execution results",

  async collect(request: ContextCollectionRequest): Promise<CollectorResult> {
    const start = Date.now();
    const evidence: ContextEvidence[] = [];

    try {
      const tools = request.executedTools;
      if (!tools || tools.length === 0) {
        return {
          evidence: [],
          collectorId: "execution-collector",
          durationMs: Date.now() - start,
          success: true,
          itemCount: 0,
        };
      }

      const source: ContextSource = {
        sourceType: "agent",
        sourceId: `execution-${request.taskId}`,
        sourceName: "Execution Results",
        taskId: request.taskId,
        timestamp: Date.now(),
      };

      // Aggregate execution status
      const succeeded = tools.filter(t => t.status === "success");
      const failed = tools.filter(t => t.status === "error");
      const timedOut = tools.filter(t => t.status === "timeout");

      evidence.push(createEvidence({
        kind: "observation",
        source,
        content: {
          type: "structured",
          value: {
            totalTools: tools.length,
            succeeded: succeeded.length,
            failed: failed.length,
            timedOut: timedOut.length,
            toolNames: [...new Set(tools.map(t => t.name))],
          },
        },
        relevance: 0.7,
        confidence: "unknown",
        criticality: failed.length > 0 ? "important" : "relevant",
        priority: failed.length > 0 ? "high" : "medium",
        securityClassification: "none",
        trustLevel: "system",
        tags: ["execution", "summary"],
        provenance: buildProvenance({
          collectorId: "execution-collector",
          taskId: request.taskId,
        }),
      }));

      // Individual failures
      for (const tool of failed) {
        evidence.push(createEvidence({
          kind: "code-error",
          source: {
            ...source,
            sourceId: `exec-fail-${tool.name}-${request.taskId}`,
            sourceName: `Tool Failure: ${tool.name}`,
          },
          content: { type: "text", value: `Tool ${tool.name} failed` },
          relevance: 0.8,
          confidence: "unknown",
          criticality: "important",
          priority: "high",
          securityClassification: "none",
          trustLevel: "system",
          tags: ["execution", "failure", tool.name],
          provenance: buildProvenance({
            collectorId: "execution-collector",
            taskId: request.taskId,
          }),
        }));
      }

      return {
        evidence,
        collectorId: "execution-collector",
        durationMs: Date.now() - start,
        success: true,
        itemCount: evidence.length,
      };
    } catch (err) {
      return {
        evidence: [],
        collectorId: "execution-collector",
        durationMs: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        itemCount: 0,
      };
    }
  },
};

/* ============================================================================
 * VERIFICATION COLLECTOR
 * Collects evidence from test/build/runtime verification results.
 * Critical rule: "test passed" is evidence of THAT TEST ONLY.
 * ========================================================================== */

export const verificationCollector: ContextCollector = {
  id: "verification-collector",
  description: "Collects evidence from verification results",

  async collect(request: ContextCollectionRequest): Promise<CollectorResult> {
    const start = Date.now();
    const evidence: ContextEvidence[] = [];

    try {
      const ver = request.verification;
      if (!ver) {
        return {
          evidence: [],
          collectorId: "verification-collector",
          durationMs: Date.now() - start,
          success: true,
          itemCount: 0,
        };
      }

      const source: ContextSource = {
        sourceType: "agent",
        sourceId: `verification-${request.taskId}`,
        sourceName: "Verification Results",
        taskId: request.taskId,
        timestamp: Date.now(),
      };

      // Verification summary
      evidence.push(createEvidence({
        kind: "verification",
        source,
        content: {
          type: "structured",
          value: {
            passed: ver.passed,
            errorCount: ver.errors.length,
            warningCount: ver.warnings.length,
          },
        },
        relevance: 0.9,
        confidence: 0.95,
        criticality: ver.passed ? "relevant" : "critical",
        priority: ver.passed ? "medium" : "critical",
        securityClassification: "none",
        trustLevel: "system",
        tags: ["verification", ver.passed ? "passed" : "failed"],
        provenance: buildProvenance({
          collectorId: "verification-collector",
          taskId: request.taskId,
        }),
      }));

      // Individual errors
      for (const error of ver.errors.slice(0, 5)) {
        evidence.push(createEvidence({
          kind: "runtime-error",
          source: {
            ...source,
            sourceId: `ver-error-${request.taskId}`,
            sourceName: "Verification Error",
          },
          content: { type: "error", message: error },
          relevance: 0.9,
          confidence: 0.95,
          criticality: "critical",
          priority: "critical",
          securityClassification: "none",
          trustLevel: "system",
          tags: ["verification", "error"],
          provenance: buildProvenance({
            collectorId: "verification-collector",
            taskId: request.taskId,
          }),
        }));
      }

      return {
        evidence,
        collectorId: "verification-collector",
        durationMs: Date.now() - start,
        success: true,
        itemCount: evidence.length,
      };
    } catch (err) {
      return {
        evidence: [],
        collectorId: "verification-collector",
        durationMs: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        itemCount: 0,
      };
    }
  },
};

/* ============================================================================
 * LESSON COLLECTOR
 * Integrates with the existing P3.5 learning system.
 * Lessons are historical evidence — NOT ground truth.
 * ========================================================================== */

export const lessonCollector: ContextCollector = {
  id: "lesson-collector",
  description: "Collects lessons from the learning system",

  async collect(request: ContextCollectionRequest): Promise<CollectorResult> {
    const start = Date.now();
    const evidence: ContextEvidence[] = [];

    try {
      const intel = request.intelligence;
      if (!intel?.lessons || intel.lessons.length === 0) {
        return {
          evidence: [],
          collectorId: "lesson-collector",
          durationMs: Date.now() - start,
          success: true,
          itemCount: 0,
        };
      }

      const source: ContextSource = {
        sourceType: "lesson-store",
        sourceId: "lesson-store",
        sourceName: "Lesson Store",
        taskId: request.taskId,
        timestamp: Date.now(),
      };

      for (const lesson of intel.lessons.slice(0, 5)) {
        evidence.push(createEvidence({
          kind: "lesson",
          source,
          content: { type: "text", value: lesson.content ?? lesson },
          relevance: 0.7,
          confidence: lesson.confidence ?? 0.7,
          criticality: "relevant",
          priority: "medium",
          securityClassification: lesson.category === "security" ? "security-relevant" : "none",
          trustLevel: "system",
          tags: ["lesson", lesson.category ?? "general"],
          provenance: buildProvenance({
            collectorId: "lesson-collector",
            engineId: "lesson-store",
            taskId: request.taskId,
          }),
        }));
      }

      // Failure patterns
      if (intel.failurePatterns) {
        for (const fp of intel.failurePatterns.slice(0, 3)) {
          evidence.push(createEvidence({
            kind: "failure-pattern",
            source: {
              ...source,
              sourceId: "failure-memory",
              sourceName: "Failure Memory",
            },
            content: { type: "text", value: fp.pattern ?? fp.description ?? JSON.stringify(fp) },
            relevance: 0.6,
            confidence: fp.confidence ?? 0.7,
            criticality: "informational",
            priority: "low",
            securityClassification: "none",
            trustLevel: "system",
            tags: ["failure-pattern"],
            provenance: buildProvenance({
              collectorId: "lesson-collector",
              engineId: "failure-memory",
              taskId: request.taskId,
            }),
          }));
        }
      }

      return {
        evidence,
        collectorId: "lesson-collector",
        durationMs: Date.now() - start,
        success: true,
        itemCount: evidence.length,
      };
    } catch (err) {
      return {
        evidence: [],
        collectorId: "lesson-collector",
        durationMs: Date.now() - start,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        itemCount: 0,
      };
    }
  },
};

/* ============================================================================
 * ALL COLLECTORS
 * ========================================================================== */

export const ALL_COLLECTORS: ContextCollector[] = [
  taskCollector,
  projectMapCollector,
  intelligenceCollector,
  executionCollector,
  verificationCollector,
  lessonCollector,
];
