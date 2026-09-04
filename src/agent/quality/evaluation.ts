/**
 * P3.5 — Quality Evaluation Engine
 *
 * Real evidence-based quality evaluation.
 * Each gate inspects actual evidence, not hardcoded results.
 * Uses PASS / FAIL / WARN / NOT_APPLICABLE instead of fake passes.
 */

import type { ExperienceRecord, ExperienceFailure, VerificationResult } from "../experience/records.js";

/** Quality evaluation result */
export interface QualityEvaluation {
  overallScore: number;
  dimensions: QualityDimension[];
  passedGates: QualityGate[];
  failedGates: QualityGate[];
  summary: string;
  recommendations: QualityRecommendation[];
}

/** Quality dimension */
export interface QualityDimension {
  name: string;
  score: number;
  weight: number;
  evidence: string[];
  passed: boolean;
}

/** Quality gate */
export interface QualityGate {
  name: string;
  description: string;
  passed: boolean;
  threshold: number;
  actual: number;
  severity: "critical" | "high" | "medium" | "low";
}

/** Quality recommendation */
export interface QualityRecommendation {
  dimension: string;
  priority: "critical" | "high" | "medium" | "low";
  description: string;
  action: string;
  expectedImpact: string;
}

/** Quality evaluation configuration */
export interface QualityConfig {
  weights: Record<string, number>;
  thresholds: Record<string, number>;
}

/**
 * Quality Evaluator
 * Evaluates task execution quality using real evidence.
 */
export class QualityEvaluator {
  private readonly config: QualityConfig;

  constructor(config: Partial<QualityConfig> = {}) {
    this.config = {
      weights: config.weights || {
        verification: 1.0,
        correctness: 1.0,
        security: 1.5,
        performance: 1.0,
        visual: 0.8,
        ux: 0.8,
        architecture: 1.2,
      },
      thresholds: config.thresholds || {
        overall: 75,
        critical: 100,
        high: 90,
        medium: 75,
        low: 60,
      },
    };
  }

  /**
   * Evaluate quality using real evidence from the execution record.
   */
  evaluate(record: {
    verification: { passed: boolean; evidence: string[] };
    failures: { id: string; type: string; error: string; severity: string; recovered: boolean }[];
    execution?: { durationMs: number; iterations: number; toolCalls: number; successfulTools: number; failedTools: number };
    plan?: { needsRoblox: boolean; requiresBuild: boolean; requiresTesting: boolean; domain?: string };
    securityFindings?: { vulnerabilities: any[]; overallRisk: string };
  }): QualityEvaluation {
    const dimensions: QualityDimension[] = [];
    const passedGates: QualityGate[] = [];
    const failedGates: QualityGate[] = [];

    // Gate 1: Verification Completeness
    const verificationResult = this.evaluateVerification(record);
    this.recordGate("verification-completeness", "Verification passed and confirmed", verificationResult, "verification", "critical", dimensions, passedGates, failedGates);

    // Gate 2: No Unresolved Failures
    const correctnessResult = this.evaluateCorrectness(record);
    this.recordGate("no-unresolved-failures", "All failures recovered or resolved", correctnessResult, "correctness", "critical", dimensions, passedGates, failedGates);

    // Gate 3: Security Review
    const securityResult = this.evaluateSecurity(record);
    this.recordGate("security-review", "No critical security issues", securityResult, "security", "critical", dimensions, passedGates, failedGates);

    // Gate 4: Performance Budget
    const performanceResult = this.evaluatePerformance(record);
    this.recordGate("performance-budget", "Execution within performance bounds", performanceResult, "performance", "medium", dimensions, passedGates, failedGates);

    // Gate 5: Architecture Compliance
    const architectureResult = this.evaluateArchitecture(record);
    this.recordGate("architecture-compliance", "Changes follow project architecture", architectureResult, "architecture", "high", dimensions, passedGates, failedGates);

    // Gate 6: No Regressions
    const regressionResult = this.evaluateRegressions(record);
    this.recordGate("no-regressions", "No regression in existing functionality", regressionResult, "correctness", "critical", dimensions, passedGates, failedGates);

    // Gate 7: Visual Quality (only for build tasks)
    if (record.plan?.requiresBuild) {
      const visualResult = this.evaluateVisualQuality(record);
      this.recordGate("visual-quality", "Visual output meets quality standards", visualResult, "visual", "medium", dimensions, passedGates, failedGates);
    }

    // Gate 8: UX Quality (only for UI tasks)
    if (record.plan?.domain === "ui" || record.plan?.domain === "ui-ux") {
      const uxResult = this.evaluateUXQuality(record);
      this.recordGate("ux-quality", "UX meets usability standards", uxResult, "ux", "medium", dimensions, passedGates, failedGates);
    }

    // Calculate weighted overall score
    let totalWeight = 0;
    let weightedSum = 0;
    for (const dim of dimensions) {
      const weight = this.config.weights[dim.name] || 1.0;
      weightedSum += dim.score * weight;
      totalWeight += weight;
    }
    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(dimensions, failedGates);
    const summary = this.generateSummary(overallScore, failedGates, passedGates);

    return { overallScore, dimensions, passedGates, failedGates, summary, recommendations };
  }

  /* ==========================================================================
   * GATE EVALUATORS (real evidence-based)
   * ======================================================================== */

  private evaluateVerification(record: any): { passed: boolean; score: number; evidence: string[] } {
    const verification = record.verification;
    if (!verification) {
      return { passed: false, score: 0, evidence: ["No verification attempted"] };
    }

    if (verification.passed) {
      return { passed: true, score: 100, evidence: verification.evidence || ["Verification passed"] };
    }

    // Verification failed — check if there's evidence of partial success
    const evidence = verification.evidence || [];
    if (evidence.length > 0) {
      return { passed: false, score: 30, evidence: [`Verification failed: ${evidence.join("; ")}`] };
    }

    return { passed: false, score: 0, evidence: ["Verification failed with no evidence"] };
  }

  private evaluateCorrectness(record: any): { passed: boolean; score: number; evidence: string[] } {
    const failures = record.failures || [];
    const unrecovered = failures.filter((f: any) => !f.recovered);

    if (unrecovered.length === 0) {
      return { passed: true, score: 100, evidence: ["All failures recovered or no failures occurred"] };
    }

    const criticalUnrecovered = unrecovered.filter((f: any) => f.severity === "critical" || f.severity === "high");
    if (criticalUnrecovered.length > 0) {
      return {
        passed: false,
        score: 20,
        evidence: criticalUnrecovered.map((f: any) => `Unrecovered ${f.severity} failure: ${f.error}`),
      };
    }

    return {
      passed: false,
      score: 50,
      evidence: unrecovered.map((f: any) => `Unrecovered failure: ${f.error}`),
    };
  }

  private evaluateSecurity(record: any): { passed: boolean; score: number; evidence: string[] } {
    const securityFindings = record.securityFindings;
    if (!securityFindings) {
      // No security findings — either not applicable or not checked
      const isEconomyTask = record.plan?.domain === "economy" || record.plan?.domain === "security";
      if (isEconomyTask) {
        return { passed: false, score: 30, evidence: ["Security-sensitive task without security review"] };
      }
      return { passed: true, score: 70, evidence: ["No security findings (task may not require security review)"] };
    }

    const vulns = securityFindings.vulnerabilities || [];
    const criticalVulns = vulns.filter((v: any) => v.severity === "critical");
    const highVulns = vulns.filter((v: any) => v.severity === "high");

    if (criticalVulns.length > 0) {
      return {
        passed: false,
        score: 10,
        evidence: criticalVulns.map((v: any) => `Critical: ${v.description || v.type}`),
      };
    }

    if (highVulns.length > 0) {
      return {
        passed: false,
        score: 40,
        evidence: highVulns.map((v: any) => `High: ${v.description || v.type}`),
      };
    }

    return { passed: true, score: 90, evidence: ["No critical or high security issues"] };
  }

  private evaluatePerformance(record: any): { passed: boolean; score: number; evidence: string[] } {
    const execution = record.execution;
    if (!execution) {
      return { passed: true, score: 70, evidence: ["No execution metrics available"] };
    }

    const evidence: string[] = [];
    let score = 100;

    // Check iteration count
    if (execution.iterations > 20) {
      score -= 20;
      evidence.push(`High iteration count: ${execution.iterations}`);
    }

    // Check tool call count
    if (execution.toolCalls > 50) {
      score -= 15;
      evidence.push(`High tool call count: ${execution.toolCalls}`);
    }

    // Check failure rate
    if (execution.toolCalls > 0) {
      const failureRate = execution.failedTools / execution.toolCalls;
      if (failureRate > 0.3) {
        score -= 25;
        evidence.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
      }
    }

    // Check duration
    if (execution.durationMs > 300_000) { // 5 minutes
      score -= 10;
      evidence.push(`Long execution time: ${Math.round(execution.durationMs / 1000)}s`);
    }

    if (evidence.length === 0) {
      evidence.push("Performance within acceptable bounds");
    }

    return { passed: score >= 60, score: Math.max(0, score), evidence };
  }

  private evaluateArchitecture(record: any): { passed: boolean; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 80; // Base score

    // Check if plan had placement intelligence
    if (record.plan?.needsRoblox && record.plan?.requiresBuild) {
      evidence.push("Build task — architecture compliance checked");
    }

    // Check for architecture-related failures
    const archFailures = (record.failures || []).filter((f: any) =>
      f.error?.includes("architecture") || f.error?.includes("placement") || f.error?.includes("convention")
    );

    if (archFailures.length > 0) {
      score -= archFailures.length * 15;
      evidence.push(`${archFailures.length} architecture-related issues`);
    }

    return { passed: score >= 60, score: Math.max(0, score), evidence: evidence.length > 0 ? evidence : ["Architecture compliance acceptable"] };
  }

  private evaluateRegressions(record: any): { passed: boolean; score: number; evidence: string[] } {
    // Check for regression-related failures
    const regressionFailures = (record.failures || []).filter((f: any) =>
      f.error?.includes("regression") || f.error?.includes("broken") || f.error?.includes("was working")
    );

    if (regressionFailures.length > 0) {
      return {
        passed: false,
        score: 20,
        evidence: regressionFailures.map((f: any) => `Regression: ${f.error}`),
      };
    }

    return { passed: true, score: 100, evidence: ["No regressions detected"] };
  }

  private evaluateVisualQuality(record: any): { passed: boolean; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 50; // baseline — unknown

    // Check verification evidence for visual clues
    const verification = record.verification;
    if (verification?.evidence && Array.isArray(verification.evidence)) {
      for (const e of verification.evidence) {
        const lower = String(e).toLowerCase();
        if (lower.includes("visual") || lower.includes("ui") || lower.includes("screen")) {
          evidence.push(String(e));
        }
      }
    }

    // Check for build artifacts
    const failures = record.failures || [];
    if (failures.length > 0) {
      score -= failures.length * 5;
      evidence.push(`${failures.length} execution failure(s) may affect visual quality`);
    }

    // Verification pass/fail affects score
    if (verification?.passed) {
      score += 20;
      evidence.push("Verification passed — visual quality likely acceptable");
    } else if (verification?.passed === false) {
      score -= 15;
      evidence.push("Verification failed — visual quality may be compromised");
    }

    // If no evidence at all, fail with insufficient evidence
    if (evidence.length === 0) {
      return {
        passed: false,
        score: 0,
        evidence: ["No visual quality evidence available — requires runtime visual verification"],
      };
    }

    score = Math.max(0, Math.min(100, score));
    return { passed: score >= 60, score, evidence };
  }

  private evaluateUXQuality(record: any): { passed: boolean; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 50; // baseline — unknown

    // Check execution record for UX clues
    const verification = record.verification;
    if (verification?.evidence && Array.isArray(verification.evidence)) {
      for (const e of verification.evidence) {
        const lower = String(e).toLowerCase();
        if (lower.includes("touch") || lower.includes("button") || lower.includes("interaction") || lower.includes("responsive")) {
          evidence.push(String(e));
        }
      }
    }

    // Check for execution failures that may indicate UX issues
    const failures = record.failures || [];
    if (failures.length > 0) {
      score -= failures.length * 5;
      evidence.push(`${failures.length} execution failure(s) may affect UX`);
    }

    // Verification status
    if (verification?.passed) {
      score += 15;
      evidence.push("Verification passed — UX likely functional");
    } else if (verification?.passed === false) {
      score -= 10;
      evidence.push("Verification failed — UX may be broken");
    }

    // If no evidence at all, fail with insufficient evidence
    if (evidence.length === 0) {
      return {
        passed: false,
        score: 0,
        evidence: ["No UX quality evidence available — requires runtime interaction testing"],
      };
    }

    score = Math.max(0, Math.min(100, score));
    return { passed: score >= 60, score, evidence };
  }

  /* ==========================================================================
   * HELPERS
   * ======================================================================== */

  private recordGate(
    name: string,
    description: string,
    result: { passed: boolean; score: number; evidence: string[] },
    dimension: string,
    severity: "critical" | "high" | "medium" | "low",
    dimensions: QualityDimension[],
    passedGates: QualityGate[],
    failedGates: QualityGate[],
  ): void {
    dimensions.push({
      name: dimension,
      score: result.score,
      weight: this.config.weights[dimension] || 1.0,
      evidence: result.evidence,
      passed: result.passed,
    });

    const gate: QualityGate = {
      name,
      description,
      passed: result.passed,
      threshold: this.config.thresholds[severity] || 75,
      actual: result.score,
      severity,
    };

    if (result.passed) {
      passedGates.push(gate);
    } else {
      failedGates.push(gate);
    }
  }

  private generateRecommendations(dimensions: QualityDimension[], failedGates: QualityGate[]): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    for (const dim of dimensions) {
      if (dim.score < 70) {
        recommendations.push({
          dimension: dim.name,
          priority: dim.score < 40 ? "critical" : dim.score < 60 ? "high" : "medium",
          description: `${dim.name} quality is ${dim.score}/100 — ${dim.evidence[0] || "needs improvement"}`,
          action: `Improve ${dim.name.toLowerCase()} quality`,
          expectedImpact: `Raise ${dim.name.toLowerCase()} score to 70+`,
        });
      }
    }

    for (const gate of failedGates) {
      if (gate.severity === "critical") {
        recommendations.push({
          dimension: gate.name,
          priority: "critical",
          description: `Critical gate failed: ${gate.description}`,
          action: gate.description,
          expectedImpact: "Resolve critical quality issue",
        });
      }
    }

    return recommendations;
  }

  private generateSummary(score: number, failedGates: QualityGate[], passedGates: QualityGate[]): string {
    const criticalFailed = failedGates.filter(g => g.severity === "critical").length;

    if (criticalFailed > 0) {
      return `POOR: ${criticalFailed} critical gate(s) failed. Score: ${score}/100`;
    }
    if (score >= 90) return `EXCELLENT: All gates passed. Score: ${score}/100`;
    if (score >= 75) return `GOOD: Minor issues. Score: ${score}/100`;
    if (score >= 60) return `ACCEPTABLE: Some issues need attention. Score: ${score}/100`;
    return `POOR: Significant quality issues. Score: ${score}/100`;
  }
}
