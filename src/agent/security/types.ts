/* ============================================================================
 * SECURITY & SERVER-AUTHORITY REVIEW — shared types
 *
 * Deterministic, context-aware static review of generated Luau. The intent
 * is evidence, not "anti-exploit theater": findings map to a concrete rule
 * that fired against the artifact's actual source, keyed to whether the
 * artifact runs on the server, on the client, or is shared.
 * ========================================================================== */

export type SecuritySeverity = "HIGH" | "MEDIUM" | "INFO";

export type SecurityCategory =
  | "server-authority"
  | "client-service-misuse"
  | "remote-direction"
  | "payload-validation";

/** Where a Roblox instance actually runs, derived from class + path. */
export type RunContext = "Client" | "Server" | "Shared" | "Unknown";

export interface SecurityFinding {
  /** Stable machine id, e.g. "AUTH-LOCALPLAYER-SERVER". */
  code: string;

  severity: SecuritySeverity;

  category: SecurityCategory;

  /** Unprefixed DataModel path, e.g. ServerScriptService.Services.SaveSystem. */
  path: string;

  className: string;

  context: RunContext;

  message: string;

  /**
   * Concrete remediation guidance. Deterministic, not model-generated.
   */
  fix: string;

  /** Matching line from the source (trimmed/truncated), if found. */
  snippet?: string;
}

export interface SecurityArtifact {
  path: string;

  className: string;

  source: string;
}

export interface SecurityReview {
  artifactsScanned: number;

  findings: SecurityFinding[];

  /**
   * Findings that MUST be resolved for verification to pass: HIGH
   * severity in an authoritative run context (client or server).
   */
  blocking: SecurityFinding[];

  /** Compact human-readable summary block for plan/report/verify. */
  rendered: string;
}

export interface SecurityGateResult {
  /** True when every blocking finding has been cleared by real evidence. */
  satisfied: boolean;

  unresolved: SecurityFinding[];
}

export interface SecurityDirectiveOptions {
  needsRoblox: boolean;
  requiresBuild: boolean;
}