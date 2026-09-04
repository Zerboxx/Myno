/* ============================================================================
 * TOOL RISK CLASSIFICATION (B9)
 *
 * A deterministic, testable risk boundary for tools. Reuses the existing
 * `mutating` / `destructive` flags already tracked by the ToolRegistry and
 * folds in execution capability to produce a four-level classification:
 *
 *   read-only    → does not mutate anything
 *   write        → mutates state but is not destructive
 *   destructive  → named destructive (delete/clear/reset/...)
 *   high-risk    → destructive AND executes arbitrary code (worst case)
 *
 * This is metadata/policy only — it does not itself block anything. The
 * existing agent destructive gate remains authoritative. It exists so
 * diagnostics and watchdog surfaces can reason about risk deterministically.
 * ========================================================================== */

export type ToolRiskLevel = "read-only" | "write" | "destructive" | "high-risk";

export interface ToolRiskFlags {
  mutating: boolean;
  destructive: boolean;
  /**
   * True when the tool executes code/commands (terminal or Roblox
   * execution) that a model could drive toward arbitrary behavior.
   */
  executes: boolean;
}

/**
 * Classifies a tool by risk. Deterministic: identical flags always yield
 * the same level.
 */
export function classifyToolRisk(flags: ToolRiskFlags): ToolRiskLevel {
  if (flags.destructive && flags.executes) {
    return "high-risk";
  }
  if (flags.destructive) {
    return "destructive";
  }
  if (flags.mutating) {
    return "write";
  }
  return "read-only";
}

/** Severity ordering for risk levels (higher index = higher risk). */
const ORDER: readonly ToolRiskLevel[] = [
  "read-only",
  "write",
  "destructive",
  "high-risk",
];

/** True when `left` is at least as risky as `right`. */
export function atLeastAsRiskyAs(
  left: ToolRiskLevel,
  right: ToolRiskLevel,
): boolean {
  return ORDER.indexOf(left) >= ORDER.indexOf(right);
}

/** Human-readable guidance for a risk level (non-secret). */
export function riskGuidance(level: ToolRiskLevel): string {
  switch (level) {
    case "read-only":
      return "safe to run freely; read-only surface";
    case "write":
      return "mutates workspace state; validated by tool schemas";
    case "destructive":
      return "can remove or overwrite state; subject to destructive policy";
    case "high-risk":
      return "destructive and executes code; highest scrutiny required";
  }
}
