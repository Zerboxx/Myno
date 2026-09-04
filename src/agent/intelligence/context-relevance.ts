/**
 * P3.5.1 — Context Relevance Engine & Compression
 *
 * Selects only relevant context for the model prompt.
 * Compresses verbose intelligence into concise, actionable facts.
 */

import type { TaskIntelligence } from "./orchestrator.js";
import type { IntelligenceBudget, TaskComplexity } from "./budget.js";

/* ============================================================================
 * CONTEXT ITEM
 * ========================================================================== */

export interface ContextItem {
  /** Source category */
  category: "security" | "architecture" | "performance" | "placement" | "dependency" | "gameplay" | "uiux" | "responsive" | "world-building" | "lessons" | "knowledge" | "conventions" | "risks" | "verification";
  /** Relevance score 0-1 */
  relevance: number;
  /** Compressed text content */
  text: string;
  /** Priority: critical items always included */
  priority: "critical" | "high" | "medium" | "low";
  /** Source engine */
  source: string;
}

/* ============================================================================
 * CONTEXT RELEVANCE ENGINE
 * ========================================================================== */

export class ContextRelevanceEngine {
  /**
   * Select relevant context items from intelligence, bounded by budget.
   */
  selectContext(
    intelligence: TaskIntelligence,
    budget: IntelligenceBudget,
    taskDomain: string,
  ): ContextItem[] {
    const items: ContextItem[] = [];

    // Security findings — always critical
    if (intelligence.security) {
      const sec = intelligence.security as any;
      if (sec.vulnerabilities?.length > 0) {
        items.push({
          category: "security",
          relevance: 1.0,
          text: this.compressSecurityFindings(sec.vulnerabilities),
          priority: "critical",
          source: "security",
        });
      }
    }

    // Remote review findings
    if (intelligence.remoteReview) {
      const rr = intelligence.remoteReview as any;
      if (rr.findings?.length > 0) {
        items.push({
          category: "security",
          relevance: 0.95,
          text: this.compressRemoteFindings(rr.findings),
          priority: "critical",
          source: "remote-review",
        });
      }
    }

    // Architecture findings
    if (intelligence.architecture) {
      const arch = intelligence.architecture as any;
      if (arch.recommendations?.length > 0) {
        items.push({
          category: "architecture",
          relevance: this.domainRelevance("architecture", taskDomain),
          text: this.compressArchitectureFindings(arch),
          priority: "high",
          source: "architecture",
        });
      }
      if (arch.antiPatterns?.length > 0) {
        items.push({
          category: "architecture",
          relevance: 0.8,
          text: this.compressAntiPatterns(arch.antiPatterns),
          priority: "high",
          source: "architecture",
        });
      }
    }

    // Performance findings
    if (intelligence.performance) {
      const perf = intelligence.performance as any;
      if (perf.bottlenecks?.length > 0 || perf.score < 70) {
        items.push({
          category: "performance",
          relevance: this.domainRelevance("performance", taskDomain),
          text: this.compressPerformanceFindings(perf),
          priority: perf.score < 50 ? "critical" : "medium",
          source: "performance",
        });
      }
    }

    // Placement findings
    if (intelligence.placement) {
      const plac = intelligence.placement as any;
      if (plac.misplaced?.length > 0) {
        items.push({
          category: "placement",
          relevance: 0.7,
          text: this.compressPlacementFindings(plac),
          priority: "medium",
          source: "placement",
        });
      }
    }

    // Dependency findings
    if (intelligence.dependency) {
      const dep = intelligence.dependency as any;
      if (dep.metrics?.circularDependencies > 0) {
        items.push({
          category: "dependency",
          relevance: 0.9,
          text: this.compressDependencyFindings(dep),
          priority: "high",
          source: "dependency",
        });
      }
    }

    // Gameplay findings
    if (intelligence.gameplay) {
      const gp = intelligence.gameplay as any;
      if (gp.systems?.length > 0 || gp.requirements?.length > 0) {
        items.push({
          category: "gameplay",
          relevance: this.domainRelevance("gameplay", taskDomain),
          text: this.compressGameplayFindings(gp),
          priority: "medium",
          source: "gameplay",
        });
      }
    }

    // UI/UX findings
    if (intelligence.uiux) {
      const ui = intelligence.uiux as any;
      if (ui.components?.count > 0) {
        items.push({
          category: "uiux",
          relevance: this.domainRelevance("uiux", taskDomain),
          text: this.compressUIFindings(ui),
          priority: "medium",
          source: "uiux",
        });
      }
    }

    // World building findings
    if (intelligence.worldBuilding) {
      const wb = intelligence.worldBuilding as any;
      items.push({
        category: "world-building",
        relevance: this.domainRelevance("world-building", taskDomain),
        text: this.compressWorldBuildingFindings(wb),
        priority: "medium",
        source: "world-building",
      });
    }

    // Lessons
    if (intelligence.lessons?.length > 0) {
      items.push({
        category: "lessons",
        relevance: 0.8,
        text: this.compressLessons(intelligence.lessons),
        priority: "medium",
        source: "lesson-retrieval",
      });
    }

    // Knowledge
    if (intelligence.knowledge?.length > 0) {
      items.push({
        category: "knowledge",
        relevance: 0.6,
        text: this.compressKnowledgeFindings(intelligence.knowledge),
        priority: "low",
        source: "knowledge",
      });
    }

    // Conventions
    if (intelligence.constitution) {
      const cons = intelligence.constitution as any;
      if (cons.conventions?.length > 0 || cons.namingPatterns) {
        items.push({
          category: "conventions",
          relevance: 0.5,
          text: this.compressConventions(cons),
          priority: "low",
          source: "constitution",
        });
      }
    }

    // Sort by relevance and priority
    items.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.relevance - a.relevance;
    });

    // Enforce budget limit
    return items.slice(0, budget.maxContextItems);
  }

  /**
   * Compress context items into a concise prompt section.
   */
  compressToPrompt(items: ContextItem[]): string {
    if (items.length === 0) return "";

    const sections: string[] = [];

    // Group by category
    const grouped = new Map<string, ContextItem[]>();
    for (const item of items) {
      const existing = grouped.get(item.category) ?? [];
      existing.push(item);
      grouped.set(item.category, existing);
    }

    for (const [category, categoryItems] of grouped) {
      const header = this.categoryHeader(category);
      const texts = categoryItems.map(i => i.text).filter(t => t.length > 0);
      if (texts.length > 0) {
        sections.push(`${header}:\n${texts.join("\n")}`);
      }
    }

    return sections.join("\n\n");
  }

  /* ========================================================================
   * COMPRESSION HELPERS
   * ======================================================================== */

  private compressSecurityFindings(vulns: any[]): string {
    if (!vulns || vulns.length === 0) return "";
    const critical = vulns.filter((v: any) => v.severity === "critical" || v.severity === "high");
    const lines = critical.map((v: any) => `- [${v.severity?.toUpperCase()}] ${v.description ?? v.type ?? "Unknown vulnerability"}`);
    if (lines.length === 0) return "";
    return `Security vulnerabilities found (${critical.length} critical/high):\n${lines.slice(0, 5).join("\n")}`;
  }

  private compressRemoteFindings(findings: any[]): string {
    if (!findings || findings.length === 0) return "";
    const lines = findings.slice(0, 5).map((f: any) => `- ${f.type ?? "issue"}: ${f.description ?? "Unknown"}`);
    return `Remote security issues (${findings.length}):\n${lines.join("\n")}`;
  }

  private compressArchitectureFindings(arch: any): string {
    const parts: string[] = [];
    if (arch.recommendations?.length > 0) {
      const top = arch.recommendations.slice(0, 3);
      parts.push(`Architecture recommendations (${arch.recommendations.length} total):`);
      for (const r of top) {
        parts.push(`- ${r.title ?? r.description ?? "Recommendation"}`);
      }
    }
    return parts.join("\n");
  }

  private compressAntiPatterns(patterns: any[]): string {
    if (!patterns || patterns.length === 0) return "";
    const lines = patterns.slice(0, 3).map((p: any) => `- ${p.name ?? p.type ?? "Anti-pattern"}: ${p.description ?? ""}`);
    return `Anti-patterns detected (${patterns.length}):\n${lines.join("\n")}`;
  }

  private compressPerformanceFindings(perf: any): string {
    const parts: string[] = [];
    if (perf.score !== undefined) parts.push(`Performance score: ${perf.score}/100`);
    if (perf.bottlenecks?.length > 0) {
      const top = perf.bottlenecks.slice(0, 3);
      parts.push(`Bottlenecks: ${top.map((b: any) => b.description ?? b.type ?? "Unknown").join("; ")}`);
    }
    if (perf.recommendations?.length > 0) {
      parts.push(`Top recommendation: ${perf.recommendations[0].description ?? perf.recommendations[0]}`);
    }
    return parts.join("\n");
  }

  private compressPlacementFindings(plac: any): string {
    if (plac.misplaced?.length > 0) {
      const lines = plac.misplaced.slice(0, 3).map((m: any) => `- ${m.instance ?? m.name}: expected in ${m.expected}, found in ${m.actual}`);
      return `Misplaced items (${plac.misplaced.length}):\n${lines.join("\n")}`;
    }
    return "";
  }

  private compressDependencyFindings(dep: any): string {
    const parts: string[] = [];
    if (dep.metrics?.circularDependencies > 0) {
      parts.push(`Circular dependencies: ${dep.metrics.circularDependencies}`);
    }
    if (dep.metrics?.maxDepth > 5) {
      parts.push(`Deep dependency chain: ${dep.metrics.maxDepth} levels`);
    }
    return parts.join("\n");
  }

  private compressGameplayFindings(gp: any): string {
    const parts: string[] = [];
    if (gp.systems?.length > 0) {
      parts.push(`Existing systems: ${gp.systems.slice(0, 3).map((s: any) => s.name ?? s).join(", ")}`);
    }
    if (gp.requirements?.length > 0) {
      parts.push(`Requirements: ${gp.requirements.slice(0, 3).map((r: any) => r.name ?? r).join(", ")}`);
    }
    return parts.join("\n");
  }

  private compressUIFindings(ui: any): string {
    const parts: string[] = [];
    if (ui.qualityScore !== undefined) parts.push(`UI quality: ${ui.qualityScore}/100`);
    if (ui.components?.count !== undefined) parts.push(`Components: ${ui.components.count}`);
    return parts.join("\n");
  }

  private compressWorldBuildingFindings(wb: any): string {
    const parts: string[] = [];
    if (wb.qualityScore !== undefined) parts.push(`World quality: ${wb.qualityScore}/100`);
    if (wb.terrain?.coverage !== undefined) parts.push(`Terrain coverage: ${wb.terrain.coverage}%`);
    return parts.join("\n");
  }

  private compressLessons(lessons: any[]): string {
    if (!lessons || lessons.length === 0) return "";
    return lessons.slice(0, 3).map((l: any) => `- ${l.content ?? l.description ?? "Lesson"}`).join("\n");
  }

  private compressKnowledgeFindings(knowledge: any[]): string {
    if (!knowledge || knowledge.length === 0) return "";
    return knowledge.slice(0, 3).map((k: any) => `- ${k.title ?? k.content ?? "Knowledge"}`).join("\n");
  }

  private compressConstitutions(cons: any): string {
    const parts: string[] = [];
    if (cons.namingPatterns) parts.push(`Naming: ${JSON.stringify(cons.namingPatterns)}`);
    if (cons.conventions?.length > 0) {
      parts.push(`Conventions: ${cons.conventions.slice(0, 2).map((c: any) => c.name ?? c).join(", ")}`);
    }
    return parts.join("\n");
  }

  private compressConventions(cons: any): string {
    return this.compressConstitutions(cons);
  }

  /* ========================================================================
   * RELEVANCE SCORING
   * ======================================================================== */

  private domainRelevance(category: string, domain: string): number {
    const domainMap: Record<string, Record<string, number>> = {
      economy: { security: 0.9, architecture: 0.7, placement: 0.6 },
      security: { security: 1.0, architecture: 0.8 },
      "world-building": { "world-building": 1.0, performance: 0.6 },
      ui: { uiux: 1.0, responsive: 0.8 },
      gameplay: { gameplay: 1.0, performance: 0.5 },
      debugging: { dependency: 0.9, architecture: 0.7 },
    };
    return domainMap[domain]?.[category] ?? 0.5;
  }

  private categoryHeader(category: string): string {
    const headers: Record<string, string> = {
      security: "SECURITY",
      architecture: "ARCHITECTURE",
      performance: "PERFORMANCE",
      placement: "PLACEMENT",
      dependency: "DEPENDENCY",
      gameplay: "GAMEPLAY",
      uiux: "UI/UX",
      responsive: "RESPONSIVE",
      "world-building": "WORLD-BUILDING",
      lessons: "LESSONS",
      knowledge: "KNOWLEDGE",
      conventions: "CONVENTIONS",
      risks: "RISKS",
      verification: "VERIFICATION",
    };
    return headers[category] ?? category.toUpperCase();
  }
}
