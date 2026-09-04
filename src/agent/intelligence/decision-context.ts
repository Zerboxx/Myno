/**
 * P3.5 — Decision Context
 *
 * Synthesizes raw intelligence into focused, actionable constraints
 * that influence planning, execution, and verification.
 *
 * This is the bridge between intelligence gathering and decision-making.
 */

import type { TaskIntelligence } from "../intelligence/orchestrator.js";

/* ============================================================================
 * DECISION CONTEXT TYPES
 * ========================================================================== */

/** A single actionable constraint derived from intelligence */
export interface IntelligenceConstraint {
  /** Source engine that produced this constraint */
  source: string;
  /** Category of constraint */
  category:
    | "security"
    | "architecture"
    | "performance"
    | "placement"
    | "dependency"
    | "gameplay"
    | "uiux"
    | "responsive"
    | "world-building"
    | "code-quality"
    | "verification"
    | "lesson";
  /** Human-readable description */
  description: string;
  /** Severity: blocks execution if critical */
  severity: "critical" | "high" | "medium" | "low";
  /** Confidence in this finding (0-1) */
  confidence: number;
  /** Concrete recommendation */
  recommendation: string;
  /** Evidence supporting this constraint */
  evidence: string[];
}

/** A verification requirement derived from intelligence */
export interface IntelligenceVerification {
  /** What must be verified */
  requirement: string;
  /** Why this is needed */
  reason: string;
  /** Source engine */
  source: string;
}

/** Complete decision context for a task */
export interface DecisionContext {
  /** Actionable constraints from intelligence */
  constraints: IntelligenceConstraint[];
  /** Additional verification requirements */
  verificationRequirements: IntelligenceVerification[];
  /** Relevant historical lessons */
  lessons: string[];
  /** Architecture recommendations (existing systems to reuse) */
  reuseRecommendations: string[];
  /** Risks identified */
  risks: string[];
  /** Performance constraints */
  performanceConstraints: string[];
}

/* ============================================================================
 * DECISION SYNTHESIZER
 * ========================================================================== */

/**
 * Synthesizes raw TaskIntelligence into a focused DecisionContext.
 *
 * Extracts only actionable, relevant information. Filters noise.
 * Each constraint includes source, evidence, and confidence.
 */
export function synthesizeDecisionContext(
  intelligence: TaskIntelligence | null,
): DecisionContext {
  if (!intelligence) {
    return {
      constraints: [],
      verificationRequirements: [],
      lessons: [],
      reuseRecommendations: [],
      risks: [],
      performanceConstraints: [],
    };
  }

  const constraints: IntelligenceConstraint[] = [];
  const verificationRequirements: IntelligenceVerification[] = [];
  const lessons: string[] = [];
  const reuseRecommendations: string[] = [];
  const risks: string[] = [];
  const performanceConstraints: string[] = [];

  // --- Security intelligence ---
  if (intelligence.security) {
    const sec = intelligence.security as any;
    if (sec.vulnerabilities && Array.isArray(sec.vulnerabilities)) {
      for (const vuln of sec.vulnerabilities) {
        constraints.push({
          source: "security-intelligence",
          category: "security",
          description: vuln.description || vuln.title || "Security vulnerability detected",
          severity: vuln.severity === "critical" || vuln.severity === "high" ? "critical" : "high",
          confidence: vuln.confidence ?? 0.8,
          recommendation: vuln.fix || vuln.recommendation || "Address security vulnerability",
          evidence: vuln.evidence ? [vuln.evidence] : [],
        });
        risks.push(`Security: ${vuln.description || vuln.title}`);
      }
    }
    if (sec.score !== undefined && sec.score < 80) {
      verificationRequirements.push({
        requirement: "Server-side validation for all remote events",
        reason: `Security score is ${sec.score}/100 — below safe threshold`,
        source: "security-intelligence",
      });
      verificationRequirements.push({
        requirement: "Ownership validation before state changes",
        reason: "Security intelligence detected vulnerability patterns",
        source: "security-intelligence",
      });
    }
  }

  // --- Architecture intelligence ---
  if (intelligence.architecture) {
    const arch = intelligence.architecture as any;
    if (arch.recommendations && Array.isArray(arch.recommendations)) {
      for (const rec of arch.recommendations) {
        if (rec.type === "reuse" || rec.type === "pattern") {
          reuseRecommendations.push(rec.description || rec.message || "Reuse existing system");
        }
        constraints.push({
          source: "architecture-intelligence",
          category: "architecture",
          description: rec.description || rec.message || "Architecture recommendation",
          severity: rec.priority === "high" ? "high" : "medium",
          confidence: rec.confidence ?? 0.7,
          recommendation: rec.description || rec.message || "",
          evidence: rec.evidence ? [rec.evidence] : [],
        });
      }
    }
    if (arch.antiPatterns && Array.isArray(arch.antiPatterns)) {
      for (const ap of arch.antiPatterns) {
        risks.push(`Architecture anti-pattern: ${ap.description || ap.name}`);
      }
    }
  }

  // --- Performance intelligence ---
  if (intelligence.performance) {
    const perf = intelligence.performance as any;
    if (perf.score !== undefined && perf.score < 70) {
      performanceConstraints.push(`Performance score is ${perf.score}/100 — optimize before adding complexity`);
      constraints.push({
        source: "performance-intelligence",
        category: "performance",
        description: `Low performance score: ${perf.score}/100`,
        severity: "high",
        confidence: 0.8,
        recommendation: "Minimize object count, use throttling, avoid expensive per-frame operations",
        evidence: perf.bottlenecks ? perf.bottlenecks.map((b: any) => b.description || String(b)) : [],
      });
    }
    if (perf.recommendations && Array.isArray(perf.recommendations)) {
      for (const rec of perf.recommendations) {
        performanceConstraints.push(typeof rec === "string" ? rec : rec.description || "");
      }
    }
  }

  // --- Placement intelligence ---
  if (intelligence.placement) {
    const place = intelligence.placement as any;
    if (place.misplaced && Array.isArray(place.misplaced)) {
      for (const m of place.misplaced) {
        constraints.push({
          source: "placement-intelligence",
          category: "placement",
          description: `${m.name} is in ${m.currentLocation} — should be in ${m.recommendedLocation}`,
          severity: "medium",
          confidence: 0.85,
          recommendation: `Move ${m.name} to ${m.recommendedLocation}`,
          evidence: [m.reason || "Placement rules"],
        });
      }
    }
  }

  // --- Dependency intelligence ---
  if (intelligence.dependency) {
    const dep = intelligence.dependency as any;
    if (dep.violations && Array.isArray(dep.violations)) {
      for (const v of dep.violations) {
        risks.push(`Dependency violation: ${v.description}`);
        constraints.push({
          source: "dependency-intelligence",
          category: "dependency",
          description: v.description || "Dependency violation",
          severity: "high",
          confidence: 0.9,
          recommendation: v.fix || "Resolve dependency violation",
          evidence: v.evidence ? [v.evidence] : [],
        });
      }
    }
    if (dep.circularDependencies && dep.circularDependencies.length > 0) {
      risks.push(`${dep.circularDependencies.length} circular dependency(ies) detected`);
    }
  }

  // --- Gameplay intelligence ---
  if (intelligence.gameplay) {
    const gameplay = intelligence.gameplay as any;
    if (gameplay.requirements && Array.isArray(gameplay.requirements)) {
      for (const req of gameplay.requirements) {
        if (req.type === "server-authority") {
          verificationRequirements.push({
            requirement: "Server authority for gameplay decisions",
            reason: req.reason || "Gameplay requires authoritative server",
            source: "gameplay-intelligence",
          });
        }
        if (req.type === "validation") {
          verificationRequirements.push({
            requirement: "Input validation for gameplay actions",
            reason: req.reason || "Gameplay requires input validation",
            source: "gameplay-intelligence",
          });
        }
        constraints.push({
          source: "gameplay-intelligence",
          category: "gameplay",
          description: req.description || `Gameplay requirement: ${req.type}`,
          severity: "medium",
          confidence: 0.75,
          recommendation: req.description || req.type,
          evidence: [],
        });
      }
    }
  }

  // --- UI/UX intelligence ---
  if (intelligence.uiux) {
    const uiux = intelligence.uiux as any;
    if (uiux.qualityScore !== undefined && uiux.qualityScore < 70) {
      constraints.push({
        source: "uiux-intelligence",
        category: "uiux",
        description: `UI quality score is ${uiux.qualityScore}/100`,
        severity: "medium",
        confidence: 0.7,
        recommendation: "Improve UI consistency, accessibility, and layout",
        evidence: uiux.issues ? uiux.issues.map((i: any) => i.description || String(i)) : [],
      });
    }
  }

  // --- Responsive intelligence ---
  if (intelligence.responsive) {
    const resp = intelligence.responsive as any;
    if (resp.score !== undefined && resp.score < 60) {
      constraints.push({
        source: "responsive-intelligence",
        category: "responsive",
        description: `Responsive score is ${resp.score}/100 — poor mobile support`,
        severity: "medium",
        confidence: 0.7,
        recommendation: "Add UIScale, use Scale-based sizing, ensure touch targets >= 44px",
        evidence: resp.issues ? resp.issues.map((i: any) => i.description || String(i)) : [],
      });
    }
  }

  // --- Luau code quality ---
  if (intelligence.luau) {
    const luau = intelligence.luau as any;
    if (luau.issues && Array.isArray(luau.issues)) {
      const criticalIssues = luau.issues.filter(
        (i: any) => i.severity === "error" || i.severity === "warning",
      );
      if (criticalIssues.length > 0) {
        constraints.push({
          source: "luau-intelligence",
          category: "code-quality",
          description: `${criticalIssues.length} code quality issue(s) in existing scripts`,
          severity: "medium",
          confidence: 0.8,
          recommendation: "Address code quality issues before extending",
          evidence: criticalIssues.slice(0, 5).map((i: any) => i.message || String(i)),
        });
      }
    }
  }

  // --- Failure patterns ---
  if (intelligence.failurePatterns && intelligence.failurePatterns.length > 0) {
    for (const pattern of intelligence.failurePatterns.slice(0, 5)) {
      const p = pattern as any;
      if (p.fix) {
        lessons.push(`Failure pattern: ${p.description || p.name} — fix: ${p.fix}`);
      }
    }
  }

  // --- Historical lessons ---
  if (intelligence.lessons && intelligence.lessons.length > 0) {
    for (const lesson of intelligence.lessons) {
      const l = lesson as any;
      if (l.content || l.description) {
        lessons.push(l.content || l.description);
      }
    }
  }

  // --- Quality evaluation ---
  if (intelligence.quality) {
    const quality = intelligence.quality as any;
    if (quality.dimensions && Array.isArray(quality.dimensions)) {
      for (const dim of quality.dimensions) {
        if (dim.score < 60) {
          verificationRequirements.push({
            requirement: `Quality gate: ${dim.name} must score >= 60`,
            reason: `Current score is ${dim.score}/100`,
            source: "quality-evaluation",
          });
        }
      }
    }
  }

  return {
    constraints,
    verificationRequirements,
    lessons,
    reuseRecommendations,
    risks,
    performanceConstraints,
  };
}
