/**
 * P3.6-A — Intelligence Adapters
 *
 * Maps existing P3.5 intelligence outputs into canonical ContextEvidence.
 * These adapters bridge the gap between legacy intelligence formats
 * and the new P3.6-A Context Data Model.
 *
 * Each adapter takes an existing intelligence result and produces
 * an array of ContextEvidence items.
 */

import type { ContextEvidence, ContextSource, EvidenceKind, CriticalityLevel, PriorityLevel, SecurityClassification, TrustLevel, FreshnessLevel } from "../types.js";
import { createEvidence, estimateTokens } from "../evidence.js";

/* ============================================================================
 * ADAPTER: SECURITY VULNERABILITIES
 * ========================================================================== */

interface SecurityVulnerabilityInput {
  id: string;
  type: string;
  severity: string;
  title?: string;
  description: string;
  file?: string;
  line?: number;
  evidence?: string[];
  discoveredAt?: number;
}

/**
 * Map security vulnerabilities to ContextEvidence.
 */
export function adaptSecurityVulnerabilities(
  vulns: SecurityVulnerabilityInput[],
  source: ContextSource,
): ContextEvidence[] {
  return vulns.map(vuln => {
    const severityMap: Record<string, CriticalityLevel> = {
      critical: "critical",
      high: "important",
      medium: "relevant",
      low: "informational",
      info: "informational",
    };
    const priorityMap: Record<string, PriorityLevel> = {
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
      info: "low",
    };

    const text = `[${vuln.severity?.toUpperCase()}] ${vuln.title ?? vuln.type}: ${vuln.description}` +
      (vuln.file ? ` (at ${vuln.file}:${vuln.line ?? "?"})` : "");

    return createEvidence({
      kind: "security",
      source,
      content: { type: "text", value: text },
      relevance: vuln.severity === "critical" ? 1.0 : vuln.severity === "high" ? 0.9 : 0.7,
      confidence: 0.9,
      criticality: severityMap[vuln.severity] ?? "relevant",
      priority: priorityMap[vuln.severity] ?? "medium",
      securityClassification: vuln.severity === "critical" || vuln.severity === "high"
        ? "security-critical"
        : "security-relevant",
      trustLevel: "project-data",
      tags: ["security", "vulnerability", vuln.type],
    });
  });
}

/* ============================================================================
 * ADAPTER: ARCHITECTURE RECOMMENDATIONS
 * ========================================================================== */

interface ArchitectureRecommendationInput {
  id: string;
  title?: string;
  description: string;
  priority?: string;
  category?: string;
}

/**
 * Map architecture recommendations to ContextEvidence.
 */
export function adaptArchitectureRecommendations(
  recs: ArchitectureRecommendationInput[],
  source: ContextSource,
): ContextEvidence[] {
  return recs.map(rec => {
    const priorityMap: Record<string, PriorityLevel> = {
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
    };

    return createEvidence({
      kind: "architecture",
      source,
      content: { type: "text", value: `${rec.title ?? "Architecture recommendation"}: ${rec.description}` },
      relevance: rec.priority === "critical" ? 0.95 : rec.priority === "high" ? 0.8 : 0.6,
      confidence: 0.8,
      criticality: rec.priority === "critical" ? "critical" : rec.priority === "high" ? "important" : "relevant",
      priority: priorityMap[rec.priority ?? "medium"] ?? "medium",
      securityClassification: rec.category === "security" ? "security-relevant" : "none",
      trustLevel: "project-data",
      tags: ["architecture", rec.category ?? "general"],
    });
  });
}

/* ============================================================================
 * ADAPTER: DEPENDENCY VIOLATIONS
 * ========================================================================== */

interface DependencyViolationInput {
  from: string;
  to: string;
  type: string;
  severity: string;
  description: string;
  suggestedFix?: string;
}

/**
 * Map dependency violations to ContextEvidence.
 */
export function adaptDependencyViolations(
  violations: DependencyViolationInput[],
  source: ContextSource,
): ContextEvidence[] {
  return violations.map(v => {
    const severityMap: Record<string, CriticalityLevel> = {
      error: "important",
      warning: "relevant",
      info: "informational",
    };

    return createEvidence({
      kind: "dependency",
      source,
      content: { type: "text", value: `[${v.severity}] ${v.type}: ${v.from} → ${v.to}: ${v.description}` },
      relevance: v.severity === "error" ? 0.85 : 0.6,
      confidence: 0.85,
      criticality: severityMap[v.severity] ?? "relevant",
      priority: v.severity === "error" ? "high" : "medium",
      securityClassification: "none",
      trustLevel: "project-data",
      tags: ["dependency", v.type],
    });
  });
}

/* ============================================================================
 * ADAPTER: PLACEMENT MISPLACED ITEMS
 * ========================================================================== */

interface MisplacedItemInput {
  name: string;
  type: string;
  currentContainer?: string;
  recommendedContainer?: string;
  reason: string;
  severity?: string;
}

/**
 * Map placement findings to ContextEvidence.
 */
export function adaptPlacementFindings(
  items: MisplacedItemInput[],
  source: ContextSource,
): ContextEvidence[] {
  return items.map(item => {
    const text = `[${item.severity ?? "warning"}] ${item.name} (${item.type}): ${item.reason}` +
      (item.currentContainer && item.recommendedContainer
        ? ` — currently in ${item.currentContainer}, should be in ${item.recommendedContainer}`
        : "");

    return createEvidence({
      kind: "placement",
      source,
      content: { type: "text", value: text },
      relevance: item.severity === "error" ? 0.8 : 0.6,
      confidence: 0.8,
      criticality: item.severity === "error" ? "important" : "relevant",
      priority: item.severity === "error" ? "high" : "medium",
      securityClassification: "none",
      trustLevel: "project-data",
      tags: ["placement", item.type],
    });
  });
}

/* ============================================================================
 * ADAPTER: LESSONS
 * ========================================================================== */

interface LessonInput {
  content: string;
  category?: string;
  confidence?: number;
}

/**
 * Map lessons to ContextEvidence.
 */
export function adaptLessons(
  lessons: LessonInput[],
  source: ContextSource,
): ContextEvidence[] {
  return lessons.map(lesson => {
    return createEvidence({
      kind: "lesson",
      source,
      content: { type: "text", value: lesson.content },
      relevance: 0.7,
      confidence: lesson.confidence ?? 0.7,
      criticality: "relevant",
      priority: "medium",
      securityClassification: lesson.category === "security" ? "security-relevant" : "none",
      trustLevel: "system",
      tags: ["lesson", lesson.category ?? "general"],
    });
  });
}

/* ============================================================================
 * ADAPTER: KNOWLEDGE ENTRIES
 * ========================================================================== */

interface KnowledgeEntryInput {
  title: string;
  content: string;
  category?: string;
  confidence?: number;
}

/**
 * Map knowledge entries to ContextEvidence.
 */
export function adaptKnowledge(
  entries: KnowledgeEntryInput[],
  source: ContextSource,
): ContextEvidence[] {
  return entries.map(entry => {
    return createEvidence({
      kind: "knowledge",
      source,
      content: { type: "text", value: `${entry.title}: ${entry.content}` },
      relevance: 0.6,
      confidence: entry.confidence ?? 0.8,
      criticality: "informational",
      priority: "low",
      securityClassification: entry.category === "security" ? "security-relevant" : "none",
      trustLevel: "external",
      tags: ["knowledge", entry.category ?? "general"],
    });
  });
}

/* ============================================================================
 * ADAPTER: PERFORMANCE BOTTLENECKS
 * ========================================================================== */

interface PerformanceBottleneckInput {
  description: string;
  severity?: string;
}

/**
 * Map performance findings to ContextEvidence.
 */
export function adaptPerformanceFindings(
  score: number | undefined,
  bottlenecks: PerformanceBottleneckInput[],
  source: ContextSource,
): ContextEvidence[] {
  const items: ContextEvidence[] = [];

  if (score !== undefined) {
    items.push(createEvidence({
      kind: "performance",
      source,
      content: { type: "text", value: `Performance score: ${score}/100` },
      relevance: score < 50 ? 0.9 : score < 70 ? 0.7 : 0.4,
      confidence: 0.8,
      criticality: score < 50 ? "important" : "relevant",
      priority: score < 50 ? "high" : "medium",
      securityClassification: "none",
      trustLevel: "project-data",
      tags: ["performance", "score"],
    }));
  }

  for (const b of bottlenecks) {
    items.push(createEvidence({
      kind: "performance",
      source,
      content: { type: "text", value: `Bottleneck: ${b.description}` },
      relevance: 0.75,
      confidence: 0.8,
      criticality: "relevant",
      priority: "medium",
      securityClassification: "none",
      trustLevel: "project-data",
      tags: ["performance", "bottleneck"],
    }));
  }

  return items;
}

/* ============================================================================
 * ADAPTER: QUALITY EVALUATION
 * ========================================================================== */

interface QualityDimensionInput {
  name: string;
  score: number;
  passed: boolean;
}

/**
 * Map quality evaluation to ContextEvidence.
 */
export function adaptQualityEvaluation(
  score: number,
  dimensions: QualityDimensionInput[],
  source: ContextSource,
): ContextEvidence[] {
  const items: ContextEvidence[] = [];

  items.push(createEvidence({
    kind: "quality",
    source,
    content: { type: "text", value: `Overall quality score: ${score}/100` },
    relevance: score < 50 ? 0.9 : 0.6,
    confidence: 0.85,
    criticality: score < 50 ? "important" : "relevant",
    priority: score < 50 ? "high" : "medium",
    securityClassification: "none",
      trustLevel: "system",
      tags: ["quality", "score"],
  }));

  for (const d of dimensions.filter(dim => !dim.passed)) {
    items.push(createEvidence({
      kind: "quality",
      source,
      content: { type: "text", value: `Quality gate failed: ${d.name} (score: ${d.score})` },
      relevance: 0.8,
      confidence: 0.85,
      criticality: "relevant",
      priority: "high",
      securityClassification: "none",
      trustLevel: "system",
      tags: ["quality", "gate-failed", d.name],
    }));
  }

  return items;
}
