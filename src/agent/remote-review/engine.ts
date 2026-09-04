/**
 * P3.5 — Remote Security Review Engine
 *
 * Performs real security review of RemoteEvents and RemoteFunctions.
 * CRITICAL FIX: Previously computed vulnerabilities and then discarded them.
 * Now returns actual computed results.
 */

import type {
  RemoteEventSnapshot,
  RemoteFunctionSnapshot,
  ScriptSnapshot,
} from "../project-map/types.js";

export interface RemoteSecurityAssessment {
  remote: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  vulnerabilities: RemoteVulnerability[];
  securityControls: SecurityControl[];
}

export interface RemoteVulnerability {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  exploitScenario: string;
  fix: string;
  cwe?: string;
}

export interface SecurityControl {
  type: string;
  name: string;
  description: string;
  effectiveness: "high" | "medium" | "low";
}

export interface RemoteReviewConfig {
  remoteEventRequiredValidations: string[];
  remoteFunctionRequiredValidations: string[];
  maxRateLimit: number;
  requireAuthentication: boolean;
  requireRateLimit: boolean;
  maxPayloadSize: number;
}

export interface RemoteSecurityReviewResult {
  remoteEvents: RemoteEventReview[];
  remoteFunctions: RemoteFunctionReview[];
  overallRisk: "critical" | "high" | "medium" | "low";
  summary: RemoteReviewSummary;
  recommendations: RemoteRecommendation[];
}

export interface RemoteEventReview {
  remote: string;
  path: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  vulnerabilities: RemoteVulnerability[];
  securityControls: SecurityControl[];
  recommendations: string[];
  compliance: RemoteCompliance;
}

export interface RemoteFunctionReview {
  remote: string;
  path: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  vulnerabilities: RemoteVulnerability[];
  securityControls: SecurityControl[];
  recommendations: string[];
  compliance: RemoteCompliance;
}

export interface RemoteCompliance {
  hasValidation: boolean;
  hasAuthentication: boolean;
  hasRateLimit: boolean;
  hasPermissionCheck: boolean;
  hasDistanceCheck: boolean;
  hasCooldown: boolean;
  hasPayloadSizeLimit: boolean;
  hasTypeValidation: boolean;
  hasOwnershipCheck: boolean;
  compliant: boolean;
  missing: string[];
}

export interface RemoteReviewSummary {
  totalRemotes: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  compliant: number;
  nonCompliant: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
}

export interface RemoteRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  remote: string;
  action: string;
  reason: string;
  effort: "low" | "medium" | "high";
  impact: "high" | "medium" | "low";
}

/**
 * Remote Security Reviewer
 * Reviews all remotes in a project and returns actual security findings.
 */
export class RemoteSecurityReviewer {
  private readonly config: RemoteReviewConfig;

  constructor(config: Partial<RemoteReviewConfig> = {}) {
    this.config = {
      remoteEventRequiredValidations: ["type", "range", "ownership", "cooldown"],
      remoteFunctionRequiredValidations: ["type", "range", "ownership"],
      maxRateLimit: 10,
      requireAuthentication: true,
      requireRateLimit: true,
      maxPayloadSize: 1024 * 1024,
      ...config,
    };
  }

  /**
   * Review all remotes in the project.
   * Returns ACTUAL computed findings (not discarded).
   */
  async reviewProject(projectMap: any): Promise<RemoteSecurityReviewResult> {
    const remotes = projectMap.remotes || [];
    const remoteEvents = remotes.filter((r: any) => r.className === "RemoteEvent");
    const remoteFunctions = remotes.filter((r: any) => r.className === "RemoteFunction");

    const eventReviews = remoteEvents.map((r: any) => this.reviewRemoteEvent(r, projectMap));
    const functionReviews = remoteFunctions.map((r: any) => this.reviewRemoteFunction(r, projectMap));

    const allVulns = [
      ...eventReviews.flatMap((r: any) => r.vulnerabilities),
      ...functionReviews.flatMap((r: any) => r.vulnerabilities),
    ];

    const critical = allVulns.filter(v => v.severity === "critical").length;
    const high = allVulns.filter(v => v.severity === "high").length;
    const medium = allVulns.filter(v => v.severity === "medium").length;
    const low = allVulns.filter(v => v.severity === "low").length;

    const compliant = [...eventReviews, ...functionReviews].filter(r => r.compliance.compliant).length;
    const nonCompliant = [...eventReviews, ...functionReviews].filter(r => !r.compliance.compliant).length;

    const summary: RemoteReviewSummary = {
      totalRemotes: remoteEvents.length + remoteFunctions.length,
      critical,
      high,
      medium,
      low,
      compliant,
      nonCompliant,
      criticalVulnerabilities: critical,
      highVulnerabilities: high,
    };

    const recommendations = this.generateRecommendations(eventReviews, functionReviews);

    return {
      remoteEvents: eventReviews,
      remoteFunctions: functionReviews,
      overallRisk: this.calculateOverallRisk(critical, high, medium),
      summary,
      recommendations,
    };
  }

  /**
   * Review a single RemoteEvent — returns ACTUAL findings.
   */
  private reviewRemoteEvent(remote: any, projectMap: any): RemoteEventReview {
    const vulnerabilities: RemoteVulnerability[] = [];
    const securityControls: SecurityControl[] = [];
    const recommendations: string[] = [];

    // 1. Missing input validation
    const hasValidation = this.checkForValidation(remote, projectMap);
    if (!hasValidation) {
      vulnerabilities.push({
        type: "missing-validation",
        severity: "high",
        description: `RemoteEvent "${remote.name}" lacks input validation on the server`,
        exploitScenario: "Attacker can send arbitrary data types and values to the server",
        fix: "Add server-side type checking, range validation, and ownership verification in the OnServerEvent handler",
        cwe: "CWE-20",
      });
    } else {
      securityControls.push({ type: "validation", name: "Input Validation", description: "Server-side input validation present", effectiveness: "high" });
    }

    // 2. Missing authentication/ownership
    const hasAuth = this.checkForAuthentication(remote, projectMap);
    if (!hasAuth) {
      vulnerabilities.push({
        type: "missing-auth",
        severity: "high",
        description: `RemoteEvent "${remote.name}" lacks player authentication/ownership checks`,
        exploitScenario: "Any client can invoke this remote, potentially affecting other players",
        fix: "Verify the player making the request owns or has permission for the target object",
        cwe: "CWE-306",
      });
    } else {
      securityControls.push({ type: "authentication", name: "Ownership Check", description: "Player ownership verified", effectiveness: "high" });
    }

    // 3. Missing rate limiting
    const hasRateLimit = this.checkForRateLimit(remote, projectMap);
    if (!hasRateLimit && this.isHighFrequencyRemote(remote)) {
      vulnerabilities.push({
        type: "missing-rate-limit",
        severity: "medium",
        description: `RemoteEvent "${remote.name}" lacks rate limiting`,
        exploitScenario: "Attacker can spam the remote causing server overload or economy exploits",
        fix: "Implement per-player cooldown tracking with os.clock() or tick()",
        cwe: "CWE-770",
      });
    }

    // 4. Missing type validation
    const hasTypeValidation = this.checkForTypeValidation(remote, projectMap);
    if (!hasTypeValidation) {
      vulnerabilities.push({
        type: "missing-type-validation",
        severity: "medium",
        description: `RemoteEvent "${remote.name}" does not validate argument types`,
        exploitScenario: "Client can send unexpected types causing server errors or logic bypass",
        fix: "Use typeof() or type() to validate argument types before processing",
        cwe: "CWE-20",
      });
    }

    // 5. Sensitive action without distance check
    const hasDistanceCheck = this.checkForDistanceCheck(remote, projectMap);
    if (!hasDistanceCheck && this.isSpatialRemote(remote)) {
      vulnerabilities.push({
        type: "missing-distance-check",
        severity: "medium",
        description: `RemoteEvent "${remote.name}" performs spatial actions without distance validation`,
        exploitScenario: "Player can interact with objects from anywhere on the map",
        fix: "Add server-side distance check using (player.Character.HumanoidRootPart.Position - target.Position).Magnitude",
        cwe: "CWE-284",
      });
    }

    // 6. Missing ownership check
    const hasOwnership = this.checkForOwnership(remote, projectMap);
    if (!hasOwnership && this.isEconomyRemote(remote)) {
      vulnerabilities.push({
        type: "missing-ownership-check",
        severity: "high",
        description: `RemoteEvent "${remote.name}" affects economy/ownership without ownership validation`,
        exploitScenario: "Player can modify other players' currency, inventory, or items",
        fix: "Verify the requesting player owns the affected resources before processing",
        cwe: "CWE-639",
      });
    }

    // Build compliance
    const compliance: RemoteCompliance = {
      hasValidation,
      hasAuthentication: hasAuth,
      hasRateLimit: hasRateLimit || !this.isHighFrequencyRemote(remote),
      hasPermissionCheck: hasAuth,
      hasDistanceCheck: hasDistanceCheck || !this.isSpatialRemote(remote),
      hasCooldown: hasRateLimit,
      hasPayloadSizeLimit: false, // Hard to detect from static analysis
      hasTypeValidation,
      hasOwnershipCheck: hasOwnership || !this.isEconomyRemote(remote),
      compliant: vulnerabilities.length === 0,
      missing: vulnerabilities.map(v => v.type),
    };

    // Determine risk level
    const riskLevel = this.calculateRemoteRisk(vulnerabilities);

    return {
      remote: remote.name,
      path: remote.path || "",
      riskLevel,
      vulnerabilities,
      securityControls,
      recommendations,
      compliance,
    };
  }

  /**
   * Review a single RemoteFunction — returns ACTUAL findings.
   */
  private reviewRemoteFunction(remote: any, projectMap: any): RemoteFunctionReview {
    const vulnerabilities: RemoteVulnerability[] = [];
    const securityControls: SecurityControl[] = [];
    const recommendations: string[] = [];

    // RemoteFunctions have additional risks vs RemoteEvents

    // 1. All RemoteEvent checks apply
    const hasValidation = this.checkForValidation(remote, projectMap);
    if (!hasValidation) {
      vulnerabilities.push({
        type: "missing-validation",
        severity: "high",
        description: `RemoteFunction "${remote.name}" lacks input validation`,
        exploitScenario: "Attacker can send arbitrary data and receive server responses",
        fix: "Validate all arguments server-side before processing",
        cwe: "CWE-20",
      });
    }

    // 2. RemoteFunctions block the client thread — DoS risk
    vulnerabilities.push({
      type: "blocking-remote",
      severity: "medium",
      description: `RemoteFunction "${remote.name}" blocks the client thread until server responds`,
      exploitScenario: "Slow server responses freeze the client, enabling DoS",
      fix: "Consider using RemoteEvents with callback patterns instead",
      cwe: "CWE-400",
    });

    // 3. Return value exposure
    vulnerabilities.push({
      type: "return-exposure",
      severity: "medium",
      description: `RemoteFunction "${remote.name}" returns data to client — may expose sensitive information`,
      exploitScenario: "Client can inspect returned data for unintended information disclosure",
      fix: "Minimize return data to only what the client needs",
      cwe: "CWE-200",
    });

    const compliance: RemoteCompliance = {
      hasValidation,
      hasAuthentication: false,
      hasRateLimit: false,
      hasPermissionCheck: false,
      hasDistanceCheck: false,
      hasCooldown: false,
      hasPayloadSizeLimit: false,
      hasTypeValidation: false,
      hasOwnershipCheck: false,
      compliant: false,
      missing: ["validation", "authentication", "rate-limit", "permission-check"],
    };

    return {
      remote: remote.name,
      path: remote.path || "",
      riskLevel: this.calculateRemoteRisk(vulnerabilities),
      vulnerabilities,
      securityControls,
      recommendations,
      compliance,
    };
  }

  /* ==========================================================================
   * PRIVATE CHECKS
   * ======================================================================== */

  private checkForValidation(remote: any, projectMap: any): boolean {
    // Check if there's a server script that handles this remote
    const scripts = projectMap.scripts || [];
    const handlerScript = scripts.find((s: any) => {
      const source = s.source || "";
      return source.includes(remote.name) && s.className === "Script";
    });

    if (!handlerScript) return false;

    const source = handlerScript.source || "";
    // Check for type/range validation patterns
    return (
      source.includes("typeof") ||
      source.includes("type(") ||
      source.includes("assert(") ||
      source.includes(" tonumber(") ||
      source.includes("math.clamp") ||
      source.includes("range")
    );
  }

  private checkForAuthentication(remote: any, projectMap: any): boolean {
    const scripts = projectMap.scripts || [];
    const handlerScript = scripts.find((s: any) => {
      const source = s.source || "";
      return source.includes(remote.name) && s.className === "Script";
    });

    if (!handlerScript) return false;

    const source = handlerScript.source || "";
    return (
      source.includes("player") &&
      (source.includes("UserId") || source.includes("Name") || source.includes("Character"))
    );
  }

  private checkForRateLimit(remote: any, projectMap: any): boolean {
    const scripts = projectMap.scripts || [];
    const handlerScript = scripts.find((s: any) => {
      const source = s.source || "";
      return source.includes(remote.name) && s.className === "Script";
    });

    if (!handlerScript) return false;

    const source = handlerScript.source || "";
    return (
      source.includes("cooldown") ||
      source.includes("lastUsed") ||
      source.includes("rateLimit") ||
      source.includes("os.clock") ||
      source.includes("tick()")
    );
  }

  private checkForTypeValidation(remote: any, projectMap: any): boolean {
    const scripts = projectMap.scripts || [];
    const handlerScript = scripts.find((s: any) => {
      const source = s.source || "";
      return source.includes(remote.name) && s.className === "Script";
    });

    if (!handlerScript) return false;

    const source = handlerScript.source || "";
    return (
      source.includes("typeof") ||
      source.includes("type(") ||
      source.includes("tonumber") ||
      source.includes("tostring")
    );
  }

  private checkForDistanceCheck(remote: any, projectMap: any): boolean {
    const scripts = projectMap.scripts || [];
    const handlerScript = scripts.find((s: any) => {
      const source = s.source || "";
      return source.includes(remote.name) && s.className === "Script";
    });

    if (!handlerScript) return false;

    const source = handlerScript.source || "";
    return (
      source.includes("Magnitude") ||
      source.includes("distance") ||
      source.includes("Position")
    );
  }

  private checkForOwnership(remote: any, projectMap: any): boolean {
    const scripts = projectMap.scripts || [];
    const handlerScript = scripts.find((s: any) => {
      const source = s.source || "";
      return source.includes(remote.name) && s.className === "Script";
    });

    if (!handlerScript) return false;

    const source = handlerScript.source || "";
    return (
      source.includes("player") &&
      (source.includes("owner") || source.includes("UserId"))
    );
  }

  private isHighFrequencyRemote(remote: any): boolean {
    const name = (remote.name || "").toLowerCase();
    return (
      name.includes("input") ||
      name.includes("move") ||
      name.includes("click") ||
      name.includes("tap") ||
      name.includes("update") ||
      name.includes("sync")
    );
  }

  private isSpatialRemote(remote: any): boolean {
    const name = (remote.name || "").toLowerCase();
    return (
      name.includes("build") ||
      name.includes("place") ||
      name.includes("interact") ||
      name.includes("pickup") ||
      name.includes("drop") ||
      name.includes("attack") ||
      name.includes("hit")
    );
  }

  private isEconomyRemote(remote: any): boolean {
    const name = (remote.name || "").toLowerCase();
    return (
      name.includes("trade") ||
      name.includes("buy") ||
      name.includes("sell") ||
      name.includes("purchase") ||
      name.includes("currency") ||
      name.includes("coin") ||
      name.includes("money") ||
      name.includes("reward") ||
      name.includes("inventory") ||
      name.includes("item")
    );
  }

  private calculateRemoteRisk(vulnerabilities: RemoteVulnerability[]): "critical" | "high" | "medium" | "low" {
    if (vulnerabilities.some(v => v.severity === "critical")) return "critical";
    if (vulnerabilities.some(v => v.severity === "high")) return "high";
    if (vulnerabilities.some(v => v.severity === "medium")) return "medium";
    return "low";
  }

  private calculateOverallRisk(critical: number, high: number, medium: number): "critical" | "high" | "medium" | "low" {
    if (critical > 0) return "critical";
    if (high > 0) return "high";
    if (medium > 0) return "medium";
    return "low";
  }

  private generateRecommendations(eventReviews: RemoteEventReview[], functionReviews: RemoteFunctionReview[]): RemoteRecommendation[] {
    const recs: RemoteRecommendation[] = [];

    for (const review of [...eventReviews, ...functionReviews]) {
      for (const vuln of review.vulnerabilities) {
        if (vuln.severity === "critical" || vuln.severity === "high") {
          recs.push({
            priority: vuln.severity as "critical" | "high",
            remote: review.remote,
            action: vuln.fix,
            reason: vuln.description,
            effort: "low",
            impact: "high",
          });
        }
      }
    }

    return recs;
  }
}
