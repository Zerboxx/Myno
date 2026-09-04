/**
 * P3.5 — Security Intelligence Types
 *
 * Types for security analysis, threat modeling, and vulnerability assessment.
 */

import type { ScriptSnapshot, ModuleSnapshot, RemoteEventSnapshot, RemoteFunctionSnapshot } from "../project-map/types.js";

/** Security analysis result */
export interface SecurityAnalysis {
  /** Overall security score (0-100) */
  score: number;
  /** Threat model */
  threatModel: ThreatModel;
  /** Vulnerabilities found */
  vulnerabilities: SecurityVulnerability[];
  /** Security gaps */
  gaps: SecurityGap[];
  /** Compliance status */
  compliance: ComplianceStatus;
  /** Risk assessment */
  riskAssessment: RiskAssessment;
}

/** Threat model */
export interface ThreatModel {
  /** Assets to protect */
  assets: Asset[];
  /** Threat actors */
  actors: ThreatActor[];
  /** Attack surfaces */
  attackSurfaces: AttackSurface[];
  /** Mitigations */
  mitigations: Mitigation[];
}

/** Asset to protect */
export interface Asset {
  id: string;
  name: string;
  type: "data" | "logic" | "asset" | "system" | "user-data" | "economy" | "auth";
  value: "critical" | "high" | "medium" | "low";
  description: string;
  location: string;
  owner: string;
}

/** Threat actor */
export interface ThreatActor {
  id: string;
  name: string;
  type: "external" | "internal" | "script-kiddie" | "advanced" | "insider";
  capabilities: string[];
  motivation: "financial" | "disruption" | "espionage" | "vandalism" | "curiosity";
  likelihood: "very-high" | "high" | "medium" | "low";
}

/** Attack surface */
export interface AttackSurface {
  id: string;
  name: string;
  type: "remote" | "script" | "ui" | "data-store" | "asset" | "network";
  entryPoints: string[];
  vulnerabilities: string[];
  riskLevel: "critical" | "high" | "medium" | "low";
  mitigations: string[];
}

/** Mitigation */
export interface Mitigation {
  id: string;
  name: string;
  type: "preventive" | "detective" | "corrective" | "compensating";
  description: string;
  effectiveness: "high" | "medium" | "low";
  cost: "low" | "medium" | "high";
  implements: string[];
}

/** Security vulnerability */
export interface SecurityVulnerability {
  id: string;
  file: string;
  line: number;
  column?: number;
  type: "injection" | "xss" | "csrf" | "auth-bypass" | "data-exposure" | "privilege-escalation" | "insecure-random" | "weak-crypto" | "information-disclosure" | "denial-of-service" | "auth-bypass" | "path-traversal" | "deserialization" | "prototype-pollution" | "replay-attack" | "replay-attack" | "timing-attack" | "side-channel" | "race-condition" | "toctou" | "logic-flaw" | "authentication-bypass" | "authorization-bypass" | "input-validation" | "output-encoding" | "session-management" | "cryptographic" | "configuration" | "dependency" | "supply-chain";
  severity: "critical" | "high" | "medium" | "low" | "info";
  cvss?: number;
  cwe?: string;
  owasp?: string;
  title: string;
  description: string;
  code: string;
  impact: string;
  likelihood: "very-high" | "high" | "medium" | "low" | "very-low";
  fix: string;
  references: string[];
  cve?: string;
  discoveredAt: number;
  status: "open" | "in-progress" | "fixed" | "wont-fix" | "false-positive";
  evidence: string[];
}

/** Security gap */
export interface SecurityGap {
  id: string;
  area: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  currentState: string;
  desiredState: string;
  remediation: string;
  effort: "low" | "medium" | "high";
  priority: number;
}

/** Compliance status */
export interface ComplianceStatus {
  robloxTOS: boolean;
  robloxCommunityStandards: boolean;
  dataProtection: boolean;
  ageAppropriate: boolean;
  accessibility: boolean;
  gaps: ComplianceGap[];
}

/** Compliance gap */
export interface ComplianceGap {
  requirement: string;
  currentState: string;
  requiredState: string;
  severity: "critical" | "high" | "medium" | "low";
  remediation: string;
}

/** Risk assessment */
export interface RiskAssessment {
  overallRisk: "critical" | "high" | "medium" | "low";
  risks: Risk[];
  residualRisk: "acceptable" | "needs-mitigation" | "unacceptable";
  riskAppetite: "conservative" | "moderate" | "aggressive";
}

/** Risk */
export interface Risk {
  id: string;
  title: string;
  description: string;
  category: "technical" | "operational" | "compliance" | "reputational" | "financial";
  likelihood: "very-high" | "high" | "medium" | "low" | "very-low";
  impact: "critical" | "high" | "medium" | "low";
  riskScore: number; // 1-25
  mitigation: string;
  residualRisk: "accepted" | "mitigated" | "transferred" | "avoided";
  owner: string;
  status: "open" | "mitigating" | "monitoring" | "closed";
}

/** Remote security assessment */
export interface RemoteSecurityAssessment {
  remote: string;
  type: "RemoteEvent" | "RemoteFunction";
  riskLevel: "critical" | "high" | "medium" | "low";
  vulnerabilities: RemoteVulnerability[];
  securityControls: SecurityControl[];
  recommendations: string[];
}

export interface RemoteVulnerability {
  type: "missing-validation" | "missing-auth" | "missing-rate-limit" | "excessive-permissions" | "information-disclosure" | "insecure-defaults" | "replay-attack" | "injection" | "logic-flaw";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  exploitScenario: string;
  fix: string;
  cwe?: string;
}

export interface SecurityControl {
  name: string;
  type: "validation" | "authentication" | "authorization" | "rate-limit" | "encryption" | "audit" | "sanitization";
  implemented: boolean;
  effectiveness: "high" | "medium" | "low";
  description: string;
}

/** Script security assessment */
export interface ScriptSecurityAssessment {
  script: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  issues: ScriptSecurityIssue[];
  recommendations: string[];
}

export interface ScriptSecurityIssue {
  type: "unsafe-global" | "insecure-random" | "weak-crypto" | "hardcoded-secret" | "sql-injection" | "command-injection" | "path-traversal" | "deserialization" | "prototype-pollution" | "regex-dos" | "unvalidated-input" | "missing-auth" | "missing-rate-limit" | "excessive-permissions" | "debug-code" | "console-log" | "test-code";
  severity: "critical" | "high" | "medium" | "low";
  line: number;
  code: string;
  description: string;
  fix: string;
  cwe?: string;
}

/** Security analyzer interface */
export interface SecurityAnalyzer {
  assessProject(projectMap: any): Promise<any>;
  assessRemote(remote: any, context: any): Promise<RemoteSecurityAssessment>;
  assessScript(script: any): Promise<ScriptSecurityAssessment>;
  assessArchitecture(projectMap: any): Promise<any>;
  generateThreatModel(projectMap: any): Promise<any>;
  checkCompliance(projectMap: any): Promise<ComplianceStatus>;
  generateRiskAssessment(projectMap: any): Promise<RiskAssessment>;
  checkRemoteSecurity(remote: any): Promise<RemoteSecurityAssessment>;
  checkScriptSecurity(script: any): Promise<ScriptSecurityAssessment>;
  generateSecurityReport(projectMap: any): Promise<any>;
}

/** Security analyzer implementation */
export class SecurityAnalyzerImpl {
  private readonly logger: any;

  constructor() {
    this.logger = console;
  }

  async assessProject(projectMap: any): Promise<any> {
    const threatModel = await this.generateThreatModel(projectMap);
    const vulnerabilities = await this.findVulnerabilities(projectMap);
    const gaps = await this.findGaps(projectMap);
    const compliance = await this.checkCompliance(projectMap);
    const riskAssessment = await this.generateRiskAssessment(projectMap);

    return {
      score: this.calculateSecurityScore(vulnerabilities),
      threatModel,
      vulnerabilities,
      gaps,
      compliance,
      riskAssessment,
    };
  }

  async assessRemote(remote: any, context: any): Promise<any> {
    const vulnerabilities = this.checkRemoteVulnerabilities(remote);
    return {
      remote: remote.name,
      type: remote.className,
      riskLevel: vulnerabilities.length > 0 ? "high" : "low",
      vulnerabilities,
      securityControls: [],
      recommendations: vulnerabilities.map((v: any) => v.fix),
    };
  }

  async assessScript(script: any): Promise<any> {
    const issues = this.checkScriptIssues(script);
    return {
      script: script.name,
      riskLevel: issues.some((i: any) => i.severity === "critical") ? "critical" : issues.length > 0 ? "medium" : "low",
      issues,
      recommendations: issues.map((i: any) => i.fix),
    };
  }

  async assessArchitecture(projectMap: any): Promise<any> {
    const issues: any[] = [];
    const scripts = projectMap.scripts || [];
    const remotes = projectMap.remotes || [];

    // Check for server-side scripts
    const serverScripts = scripts.filter((s: any) => s.className === "Script");
    if (remotes.length > 0 && serverScripts.length === 0) {
      issues.push({ type: "missing-server-validation", severity: "critical", description: "Remotes exist without server-side validation scripts" });
    }

    return { issues, score: issues.length === 0 ? 90 : Math.max(20, 90 - issues.length * 20) };
  }

  async generateThreatModel(projectMap: any): Promise<any> {
    const assets: any[] = [];
    const actors = [{ id: "external", name: "External Attacker", type: "external" as const, capabilities: ["remote-exploit"], motivation: "financial" as const, likelihood: "medium" as const }];
    const attackSurfaces: any[] = [];

    // Identify attack surfaces from remotes
    const remotes = projectMap.remotes || [];
    for (const remote of remotes) {
      attackSurfaces.push({
        id: remote.name,
        name: remote.name,
        type: "remote" as const,
        entryPoints: [remote.path || remote.name],
        vulnerabilities: [],
        riskLevel: "medium" as const,
        mitigations: [],
      });
    }

    // Identify assets from scripts
    const scripts = projectMap.scripts || [];
    for (const script of scripts) {
      if (script.source?.includes("DataStore")) {
        assets.push({ id: script.name, name: script.name, type: "data" as const, value: "high" as const, description: "Persistent data storage", location: script.path || script.name, owner: "server" });
      }
    }

    return { assets, actors, attackSurfaces, mitigations: [] };
  }

  async findVulnerabilities(projectMap: any): Promise<any[]> {
    const vulns: any[] = [];
    const scripts = projectMap.scripts || [];
    const remotes = projectMap.remotes || [];

    // Check for DataStore in LocalScripts
    for (const script of scripts) {
      if (script.className === "LocalScript" && script.source?.includes("DataStore")) {
        vulns.push({ id: `vuln-${script.name}`, type: "data-exposure", severity: "critical", title: "DataStore access from client", description: `LocalScript "${script.name}" accesses DataStore — must be server-side only`, file: script.path, line: 0, impact: "Data corruption or theft", likelihood: "high" as const, fix: "Move DataStore operations to server Script", discoveredAt: Date.now(), status: "open" as const, evidence: [script.source.substring(0, 200)] });
      }
    }

    // Check for unvalidated remotes
    const serverScripts = scripts.filter((s: any) => s.className === "Script");
    for (const remote of remotes) {
      const hasHandler = serverScripts.some((s: any) => s.source?.includes(remote.name));
      if (!hasHandler) {
        vulns.push({ id: `vuln-nohandler-${remote.name}`, type: "input-validation", severity: "high", title: `Remote "${remote.name}" has no server handler`, description: `RemoteEvent "${remote.name}" has no corresponding server-side handler`, file: remote.path, line: 0, impact: "Unhandled remote calls", likelihood: "high" as const, fix: "Add server-side OnServerEvent handler with validation", discoveredAt: Date.now(), status: "open" as const, evidence: [] });
      }
    }

    return vulns;
  }

  async findGaps(projectMap: any): Promise<any[]> {
    const gaps: any[] = [];
    const scripts = projectMap.scripts || [];

    // Check for missing error handling
    for (const script of scripts) {
      if (script.source?.includes("DataStore") && !script.source?.includes("pcall")) {
        gaps.push({ id: `gap-pcall-${script.name}`, area: "error-handling", description: `Script "${script.name}" uses DataStore without pcall`, severity: "high" as const, currentState: "No error handling", desiredState: "pcall wrapping for DataStore operations", remediation: "Wrap DataStore calls in pcall", effort: "low" as const, priority: 1 });
      }
    }

    return gaps;
  }

  async checkCompliance(projectMap: any): Promise<any> {
    const issues = await this.findVulnerabilities(projectMap);
    const criticalIssues = issues.filter((i: any) => i.severity === "critical");
    return {
      robloxTOS: criticalIssues.length === 0,
      robloxCommunityStandards: true,
      dataProtection: !issues.some((i: any) => i.type === "data-exposure"),
      ageAppropriate: true,
      accessibility: true,
      gaps: criticalIssues.map((i: any) => ({ requirement: i.title, currentState: "Non-compliant", requiredState: "Compliant", severity: i.severity, remediation: i.fix })),
    };
  }

  async generateRiskAssessment(projectMap: any): Promise<any> {
    const vulns = await this.findVulnerabilities(projectMap);
    const critical = vulns.filter((v: any) => v.severity === "critical").length;
    const high = vulns.filter((v: any) => v.severity === "high").length;

    const overallRisk = critical > 0 ? "critical" : high > 0 ? "high" : vulns.length > 0 ? "medium" : "low";

    const risks = vulns.map((v: any) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      category: "technical" as const,
      likelihood: v.likelihood || "medium" as const,
      impact: v.severity,
      riskScore: v.severity === "critical" ? 20 : v.severity === "high" ? 15 : 10,
      mitigation: v.fix,
      residualRisk: "mitigated" as const,
      owner: "developer",
      status: "open" as const,
    }));

    return { overallRisk, risks, residualRisk: overallRisk === "critical" ? "unacceptable" : "acceptable", riskAppetite: "conservative" as const };
  }

  async checkRemoteSecurity(remote: any): Promise<any> {
    const vulnerabilities = this.checkRemoteVulnerabilities(remote);
    return {
      remote: remote.name,
      type: remote.className,
      riskLevel: vulnerabilities.length > 0 ? "high" : "low",
      vulnerabilities,
      securityControls: [],
      recommendations: vulnerabilities.map((v: any) => v.fix),
    };
  }

  async checkScriptSecurity(script: any): Promise<any> {
    const issues = this.checkScriptIssues(script);
    return {
      script: script.name,
      riskLevel: issues.some((i: any) => i.severity === "critical") ? "critical" : issues.length > 0 ? "medium" : "low",
      issues,
      recommendations: issues.map((i: any) => i.fix),
    };
  }

  async generateSecurityReport(projectMap: any): Promise<any> {
    const vulns = await this.findVulnerabilities(projectMap);
    const compliance = await this.checkCompliance(projectMap);
    const risk = await this.generateRiskAssessment(projectMap);
    return {
      summary: `Found ${vulns.length} vulnerabilities. Overall risk: ${risk.overallRisk}`,
      findings: vulns,
      compliance,
      riskAssessment: risk,
      recommendations: vulns.map((v: any) => ({ priority: v.severity, action: v.fix, reason: v.description })),
    };
  }

  /* ==========================================================================
   * PRIVATE HELPERS
   * ======================================================================== */

  private checkRemoteVulnerabilities(remote: any): any[] {
    const vulns: any[] = [];
    // Static analysis hints based on remote name
    const name = (remote.name || "").toLowerCase();
    if (name.includes("trade") || name.includes("buy") || name.includes("sell") || name.includes("reward")) {
      vulns.push({ type: "missing-validation", severity: "high", description: `Economy remote "${remote.name}" needs server-side validation`, fix: "Validate all economy operations server-side" });
    }
    return vulns;
  }

  private checkScriptIssues(script: any): any[] {
    const issues: any[] = [];
    const source = script.source || "";

    if (script.className === "LocalScript" && source.includes("DataStore")) {
      issues.push({ type: "data-exposure", severity: "critical", line: 0, code: "DataStore", description: "DataStore access from client script", fix: "Move to server Script" });
    }
    if (source.includes("loadstring")) {
      issues.push({ type: "code-injection", severity: "critical", line: 0, code: "loadstring", description: "loadstring usage — potential code injection", fix: "Remove loadstring" });
    }
    if (source.includes("spawn(") && !source.includes("task.spawn")) {
      issues.push({ type: "deprecated-api", severity: "low", line: 0, code: "spawn()", description: "spawn() is deprecated", fix: "Use task.spawn()" });
    }

    return issues;
  }

  private calculateSecurityScore(vulnerabilities: any[]): number {
    let score = 100;
    for (const v of vulnerabilities) {
      if (v.severity === "critical") score -= 25;
      else if (v.severity === "high") score -= 15;
      else if (v.severity === "medium") score -= 8;
      else score -= 3;
    }
    return Math.max(0, score);
  }
}