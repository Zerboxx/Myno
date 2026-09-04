/**
 * P3.5 — Luau Intelligence Engine
 *
 * Real source code analysis for Luau scripts.
 * Detects type safety issues, security patterns, performance problems,
 * style violations, and best practice adherence.
 *
 * No AST required — uses deterministic regex-based and pattern-based analysis
 * with clearly defined limitations.
 */

import type {
  ScriptSnapshot,
  ModuleSnapshot,
} from "../project-map/types.js";

/* ============================================================================
 * ANALYSIS TYPES
 * ========================================================================== */

export interface LuauAnalysis {
  qualityScore: number;
  typeSafety: TypeSafetyAnalysis;
  style: StyleAnalysis;
  performance: PerformanceAnalysis;
  security: SecurityAnalysis;
  bestPractices: BestPracticesAnalysis;
  issues: LuauIssue[];
  recommendations: LuauRecommendation[];
}

export interface TypeSafetyAnalysis {
  coverage: number;
  strictMode: boolean;
  untypedVariables: UntypedVariable[];
  missingReturnTypes: MissingReturnType[];
  anyUsage: AnyUsage[];
  typeAssertions: TypeAssertion[];
  genericsUsage: GenericsUsage[];
}

export interface UntypedVariable {
  file: string;
  line: number;
  name: string;
  context: string;
  suggestedType?: string;
}

export interface MissingReturnType {
  file: string;
  line: number;
  functionName: string;
  suggestedReturnType?: string;
}

export interface AnyUsage {
  file: string;
  line: number;
  context: string;
  suggestedAlternative?: string;
}

export interface TypeAssertion {
  file: string;
  line: number;
  expression: string;
  assertedType: string;
  safe: boolean;
}

export interface GenericsUsage {
  file: string;
  line: number;
  type: string;
  appropriate: boolean;
}

export interface StyleAnalysis {
  score: number;
  namingViolations: NamingViolation[];
  formattingIssues: FormattingIssue[];
  organization: OrganizationAnalysis;
  comments: CommentAnalysis;
}

export interface CommentAnalysis {
  documented: number;
  quality: number;
}

export interface NamingViolation {
  file: string;
  line: number;
  identifier: string;
  expectedPattern: string;
  actualPattern: string;
  severity: "error" | "warning" | "info";
}

export interface FormattingIssue {
  file: string;
  line: number;
  type: "indentation" | "spacing" | "line-length" | "braces" | "semicolon";
  description: string;
  severity: "error" | "warning" | "info";
}

export interface OrganizationAnalysis {
  moduleStructure: number;
  fileOrganization: number;
  imports: ImportAnalysis;
  deadCode: DeadCodeAnalysis;
}

export interface ImportAnalysis {
  unused: UnusedImport[];
  circular: CircularImport[];
  orderViolations: ImportOrderViolation[];
  pathStyleViolations: PathStyleViolation[];
}

export interface UnusedImport {
  file: string;
  line: number;
  importPath: string;
  importedNames: string[];
}

export interface CircularImport {
  files: string[];
  cycle: string[];
}

export interface ImportOrderViolation {
  file: string;
  line: number;
  expectedOrder: string[];
  actualOrder: string[];
}

export interface PathStyleViolation {
  file: string;
  line: number;
  importPath: string;
  expectedStyle: "relative" | "absolute";
}

export interface DeadCodeAnalysis {
  unusedFunctions: DeadFunction[];
  unusedVariables: DeadVariable[];
  unreachableCode: UnreachableCode[];
}

export interface DeadFunction {
  file: string;
  line: number;
  name: string;
  reason: "unused" | "private" | "overridden";
}

export interface DeadVariable {
  file: string;
  line: number;
  name: string;
  type: "local" | "global" | "parameter";
}

export interface UnreachableCode {
  file: string;
  line: number;
  reason: "after-return" | "after-throw" | "constant-false" | "dead-branch";
}

export interface PerformanceAnalysis {
  score: number;
  expensivePatterns: ExpensivePattern[];
  memoryIssues: MemoryIssue[];
  loopOptimizations: LoopOptimization[];
  connectionLeaks: ConnectionLeak[];
  memoryLeaks: MemoryLeak[];
  redundantComputations: RedundantComputation[];
}

export interface ExpensivePattern {
  file: string;
  line: number;
  pattern: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  estimatedImpact: "high" | "medium" | "low";
  suggestion: string;
}

export interface MemoryIssue {
  file: string;
  line: number;
  type: "table-leak" | "closure-capture" | "event-leak" | "cache-unbounded";
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  fix: string;
}

export interface LoopOptimization {
  file: string;
  line: number;
  type: "nested" | "redundant" | "unnecessary-iteration" | "expensive-operation";
  description: string;
  optimization: string;
  estimatedSavings: string;
}

export interface ConnectionLeak {
  file: string;
  line: number;
  event: string;
  description: string;
  fix: string;
}

export interface MemoryLeak {
  file: string;
  line: number;
  type: "table" | "closure" | "event" | "cache";
  description: string;
  fix: string;
}

export interface RedundantComputation {
  file: string;
  line: number;
  expression: string;
  occurrences: number;
  suggestion: string;
}

export interface SecurityAnalysis {
  score: number;
  vulnerabilities: SecurityVulnerability[];
  insecurePatterns: InsecurePattern[];
  missingValidations: MissingValidation[];
  dangerousAPIs: DangerousAPIUsage[];
}

export interface SecurityVulnerability {
  id: string;
  file: string;
  line: number;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  code: string;
  fix: string;
  cwe?: string;
}

export interface InsecurePattern {
  file: string;
  line: number;
  pattern: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  fix: string;
}

export interface MissingValidation {
  file: string;
  line: number;
  parameter: string;
  expectedValidation: string;
  risk: string;
}

export interface DangerousAPIUsage {
  file: string;
  line: number;
  api: string;
  risk: string;
  alternative: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface BestPracticesAnalysis {
  score: number;
  violations: BestPracticeViolation[];
  followed: BestPracticeAdherence[];
}

export interface BestPracticeViolation {
  rule: string;
  file: string;
  line: number;
  description: string;
  severity: "error" | "warning" | "info";
  fix: string;
}

export interface BestPracticeAdherence {
  practice: string;
  file: string;
  line: number;
}

export interface LuauIssue {
  id: string;
  file: string;
  line: number;
  column?: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  rule: string;
  message: string;
  code: string;
  fix?: string;
}

export interface LuauRecommendation {
  id: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  files: string[];
  effort: "low" | "medium" | "high";
  impact: "high" | "medium" | "low";
  implementation: string;
}

/* ============================================================================
 * LUAU ANALYZER
 * ========================================================================== */

export class LuauAnalyzerImpl {
  /**
   * Analyze a single script source.
   * This is the core analysis method — all others delegate here.
   */
  async analyzeScript(script: { source: string; path: string }): Promise<LuauAnalysis> {
    const source = script.source || "";
    const path = script.path || "unknown";
    const lines = source.split("\n");

    const typeSafety = this.checkTypeSafety(source, path);
    const style = this.checkStyle(source, path, lines);
    const performance = this.checkPerformance(source, path, lines);
    const security = this.checkSecurity(source, path, lines);
    const bestPractices = this.checkBestPractices(source, path, lines);

    const issues = this.collectIssues(typeSafety, style, performance, security, bestPractices, path, lines);
    const recommendations = this.generateRecommendations(typeSafety, style, performance, security, bestPractices);

    const qualityScore = this.calculateQualityScore(typeSafety, style, performance, security, bestPractices);

    return {
      qualityScore,
      typeSafety,
      style,
      performance,
      security,
      bestPractices,
      issues,
      recommendations,
    };
  }

  async analyzeModule(module: any): Promise<LuauAnalysis> {
    return this.analyzeScript({ source: module.source || "", path: module.path || module.name || "module" });
  }

  async analyzeProject(projectMap: any): Promise<LuauAnalysis> {
    const scripts = projectMap.scripts || [];
    const combined = scripts
      .filter((s: any) => s.source)
      .map((s: any) => s.source)
      .join("\n---\n");
    return this.analyzeScript({ source: combined, path: "project" });
  }

  /* ==========================================================================
   * TYPE SAFETY ANALYSIS
   * ======================================================================== */

  checkTypeSafety(source: string, path: string): TypeSafetyAnalysis {
    const lines = source.split("\n");
    const untypedVariables: UntypedVariable[] = [];
    const missingReturnTypes: MissingReturnType[] = [];
    const anyUsage: AnyUsage[] = [];
    const typeAssertions: TypeAssertion[] = [];
    const genericsUsage: GenericsUsage[] = [];

    const strictMode = source.includes("--!strict") || source.includes("--!native");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect untyped local variables: `local x = value` without `: Type`
      const localMatch = line.match(/^\s*local\s+(\w+)\s*=\s*(.+)/);
      if (localMatch) {
        const varName = localMatch[1];
        const value = localMatch[2];
        // Skip if it has a type annotation
        if (!line.includes(":") || line.indexOf(":") > line.indexOf("=")) {
          // Heuristic: numbers and strings are obvious types
          if (!/^\d+/.test(value.trim()) && !(/^["']/.test(value.trim())) && !value.includes("new ")) {
            untypedVariables.push({
              file: path,
              line: lineNum,
              name: varName,
              context: line.trim(),
              suggestedType: this.inferType(value),
            });
          }
        }
      }

      // Detect missing return types on function declarations
      const funcMatch = line.match(/^\s*(?:local\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*$/);
      if (funcMatch && !line.match(/:\s*\w+/)) {
        missingReturnTypes.push({
          file: path,
          line: lineNum,
          functionName: funcMatch[1],
        });
      }

      // Detect `any` type usage
      if (line.includes(": any") || line.includes("<any>") || line.match(/as any/)) {
        anyUsage.push({
          file: path,
          line: lineNum,
          context: line.trim(),
          suggestedAlternative: "Use a specific type or union type",
        });
      }

      // Detect type assertions (`::`)
      const assertMatch = line.match(/(\w+)\s*::\s*(\w+)/);
      if (assertMatch) {
        typeAssertions.push({
          file: path,
          line: lineNum,
          expression: assertMatch[1],
          assertedType: assertMatch[2],
          safe: !assertMatch[2].includes("any"),
        });
      }

      // Detect generic usage
      const genericMatch = line.match(/<(\w+)>/);
      if (genericMatch) {
        genericsUsage.push({
          file: path,
          line: lineNum,
          type: genericMatch[1],
          appropriate: true,
        });
      }
    }

    const totalVars = untypedVariables.length + 10; // Approximate
    const coverage = totalVars > 0 ? Math.max(0, 1 - (untypedVariables.length / totalVars)) : 1;

    return {
      coverage: Math.round(coverage * 100) / 100,
      strictMode,
      untypedVariables: untypedVariables.slice(0, 20),
      missingReturnTypes: missingReturnTypes.slice(0, 20),
      anyUsage,
      typeAssertions,
      genericsUsage,
    };
  }

  /* ==========================================================================
   * STYLE ANALYSIS
   * ======================================================================== */

  checkStyle(source: string, path: string, lines: string[]): StyleAnalysis {
    const namingViolations: NamingViolation[] = [];
    const formattingIssues: FormattingIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check line length
      if (line.length > 120) {
        formattingIssues.push({
          file: path,
          line: lineNum,
          type: "line-length",
          description: `Line exceeds 120 characters (${line.length})`,
          severity: "warning",
        });
      }

      // Check tab vs spaces inconsistency
      if (line.includes("\t") && line.includes("  ")) {
        formattingIssues.push({
          file: path,
          line: lineNum,
          type: "indentation",
          description: "Mixed tabs and spaces",
          severity: "warning",
        });
      }

      // Check for trailing whitespace
      if (line !== line.trimEnd() && line.trim().length > 0) {
        formattingIssues.push({
          file: path,
          line: lineNum,
          type: "spacing",
          description: "Trailing whitespace",
          severity: "info",
        });
      }
    }

    // Naming convention checks
    const funcDeclarations = source.match(/function\s+(\w+)/g) || [];
    for (const func of funcDeclarations) {
      const name = func.replace("function ", "");
      if (name[0] === name[0].toLowerCase() && name[0] !== name[0].toUpperCase()) {
        // camelCase is acceptable for functions in Luau
      } else if (!/^[A-Z]/.test(name) && !name.startsWith("_")) {
        namingViolations.push({
          file: path,
          line: 0,
          identifier: name,
          expectedPattern: "PascalCase or camelCase",
          actualPattern: name,
          severity: "info",
        });
      }
    }

    const documentationRatio = this.calculateDocumentationRatio(lines);
    const commentQuality = this.assessCommentQuality(lines);

    return {
      score: Math.max(0, 100 - namingViolations.length * 5 - formattingIssues.length * 2),
      namingViolations: namingViolations.slice(0, 20),
      formattingIssues: formattingIssues.slice(0, 20),
      organization: {
        moduleStructure: 80,
        fileOrganization: 80,
        imports: { unused: [], circular: [], orderViolations: [], pathStyleViolations: [] },
        deadCode: { unusedFunctions: [], unusedVariables: [], unreachableCode: [] },
      },
      comments: { documented: documentationRatio, quality: commentQuality },
    };
  }

  /* ==========================================================================
   * PERFORMANCE ANALYSIS
   * ======================================================================== */

  checkPerformance(source: string, path: string, lines: string[]): PerformanceAnalysis {
    const expensivePatterns: ExpensivePattern[] = [];
    const memoryIssues: MemoryIssue[] = [];
    const loopOptimizations: LoopOptimization[] = [];
    const connectionLeaks: ConnectionLeak[] = [];
    const memoryLeaks: MemoryLeak[] = [];
    const redundantComputations: RedundantComputation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect :FindFirstChild in loops (expensive)
      if (line.match(/for.*do/) && lines.slice(i, i + 5).some(l => l.includes(":FindFirstChild"))) {
        expensivePatterns.push({
          file: path,
          line: lineNum,
          pattern: "FindFirstChild in loop",
          description: "FindFirstChild inside a loop is expensive — cache the result",
          severity: "medium",
          estimatedImpact: "medium",
          suggestion: "Cache FindFirstChild results outside the loop",
        });
      }

      // Detect :GetChildren() in tight loops
      if (line.match(/for.*do/) && lines.slice(i, i + 3).some(l => l.includes(":GetChildren()"))) {
        expensivePatterns.push({
          file: path,
          line: lineNum,
          pattern: "GetChildren in loop",
          description: "GetChildren() inside a loop creates a new table each iteration",
          severity: "medium",
          estimatedImpact: "medium",
          suggestion: "Cache GetChildren() result before the loop",
        });
      }

      // Detect while true without task.wait
      if (line.includes("while true") && !lines.slice(i, i + 10).some(l => l.includes("task.wait") || l.includes("wait("))) {
        expensivePatterns.push({
          file: path,
          line: lineNum,
          pattern: "Infinite loop without yield",
          description: "while true without task.wait() will freeze the thread",
          severity: "critical",
          estimatedImpact: "high",
          suggestion: "Add task.wait() or a condition to yield",
        });
      }

      // Detect table.insert in a loop (potential O(n²))
      if (line.match(/for.*do/) && lines.slice(i, i + 5).some(l => l.includes("table.insert"))) {
        loopOptimizations.push({
          file: path,
          line: lineNum,
          type: "expensive-operation",
          description: "table.insert inside a loop may be inefficient for large datasets",
          optimization: "Pre-allocate table or use table.move",
          estimatedSavings: "O(n) improvement for large datasets",
        });
      }

      // Detect event connections without cleanup
      if (line.includes(":Connect(") && !lines.slice(Math.max(0, i - 5), i).some(l => l.includes(":Disconnect()"))) {
        connectionLeaks.push({
          file: path,
          line: lineNum,
          event: line.match(/(\w+):Connect/)?.[1] || "unknown",
          description: "Event connection may not be cleaned up",
          fix: "Store the connection and call :Disconnect() when no longer needed",
        });
      }

      // Detect repeated expensive computations
      const methodCalls = line.match(/:(\w+)\(/g) || [];
      for (const call of methodCalls) {
        if (call === ":FindFirstChild(" || call === ":GetService(" || call === ":WaitForChild(") {
          redundantComputations.push({
            file: path,
            line: lineNum,
            expression: call,
            occurrences: (source.match(new RegExp(call.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length,
            suggestion: `Cache ${call} result if called repeatedly`,
          });
        }
      }
    }

    // Deduplicate redundant computations
    const seenExpressions = new Set<string>();
    const uniqueRedundant = redundantComputations.filter(r => {
      const key = `${r.expression}:${r.file}`;
      if (seenExpressions.has(key)) return false;
      seenExpressions.add(key);
      return true;
    });

    const score = Math.max(0, 100 -
      expensivePatterns.length * 10 -
      memoryIssues.length * 15 -
      connectionLeaks.length * 10 -
      loopOptimizations.length * 5
    );

    return {
      score,
      expensivePatterns,
      memoryIssues,
      loopOptimizations,
      connectionLeaks,
      memoryLeaks,
      redundantComputations: uniqueRedundant.slice(0, 10),
    };
  }

  /* ==========================================================================
   * SECURITY ANALYSIS
   * ======================================================================== */

  checkSecurity(source: string, path: string, lines: string[]): SecurityAnalysis {
    const vulnerabilities: SecurityVulnerability[] = [];
    const insecurePatterns: InsecurePattern[] = [];
    const missingValidations: MissingValidation[] = [];
    const dangerousAPIs: DangerousAPIUsage[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Detect game:GetService in LocalScripts (potential client trust issue)
      if (line.includes("game:GetService") && this.isInLocalScriptContext(lines, i)) {
        // Not necessarily a vulnerability, but worth noting
      }

      // Detect DataStore access patterns
      if (line.includes("DataStoreService") || line.includes("GetDataStore")) {
        if (this.isInLocalScriptContext(lines, i)) {
          vulnerabilities.push({
            id: `vuln-ds-${lineNum}`,
            file: path,
            line: lineNum,
            type: "data-exposure",
            severity: "critical",
            description: "DataStore access from LocalScript — data stores must be server-side only",
            code: line.trim(),
            fix: "Move DataStore operations to a server Script",
            cwe: "CWE-306",
          });
        }
      }

      // Detect require of unknown modules (potential backdoor)
      if (line.match(/require\s*\(\s*\d+/)) {
        vulnerabilities.push({
          id: `vuln-require-${lineNum}`,
          file: path,
          line: lineNum,
          type: "injection",
          severity: "high",
          description: "Hardcoded numeric require — potential asset ID injection",
          code: line.trim(),
          fix: "Use path-based requires instead of asset IDs",
          cwe: "CWE-94",
        });
      }

      // Detect HTTP requests
      if (line.includes("HttpService") || line.includes("HttpGet") || line.includes("HttpPost")) {
        dangerousAPIs.push({
          file: path,
          line: lineNum,
          api: "HttpService",
          risk: "External HTTP requests can leak data or receive malicious responses",
          alternative: "Validate and sanitize all external data",
          severity: "medium",
        });
      }

      // Detect loadstring (code injection risk)
      if (line.includes("loadstring")) {
        vulnerabilities.push({
          id: `vuln-loadstring-${lineNum}`,
          file: path,
          line: lineNum,
          type: "injection",
          severity: "critical",
          description: "loadstring usage — potential code injection vulnerability",
          code: line.trim(),
          fix: "Remove loadstring and use direct function calls",
          cwe: "CWE-94",
        });
      }

      // Detect tick() for randomness (insecure)
      if (line.includes("tick()") && (line.includes("random") || line.includes("Random"))) {
        insecurePatterns.push({
          file: path,
          line: lineNum,
          pattern: "tick()-based randomness",
          description: "Using tick() for randomness is predictable",
          severity: "medium",
          fix: "Use Random.new() for better randomness",
        });
      }

      // Detect missing type validation on remote handlers
      if (line.includes("OnServerEvent") || line.includes("OnClientEvent")) {
        const nextLines = lines.slice(i, i + 10);
        const hasValidation = nextLines.some(l =>
          l.includes("typeof") || l.includes("type(") || l.includes("assert(")
        );
        if (!hasValidation) {
          missingValidations.push({
            file: path,
            line: lineNum,
            parameter: "remote_args",
            expectedValidation: "Type checking on remote arguments",
            risk: "Client can send arbitrary data to server",
          });
        }
      }
    }

    const score = Math.max(0, 100 -
      vulnerabilities.length * 20 -
      insecurePatterns.length * 10 -
      missingValidations.length * 15 -
      dangerousAPIs.length * 5
    );

    return {
      score,
      vulnerabilities,
      insecurePatterns,
      missingValidations,
      dangerousAPIs,
    };
  }

  /* ==========================================================================
   * BEST PRACTICES
   * ======================================================================== */

  checkBestPractices(source: string, path: string, lines: string[]): BestPracticesAnalysis {
    const violations: BestPracticeViolation[] = [];
    const followed: BestPracticeAdherence[] = [];

    // Check for pcall usage around risky operations
    if ((source.includes("DataStore") || source.includes("HttpService")) && !source.includes("pcall")) {
      violations.push({
        rule: "error-handling",
        file: path,
        line: 0,
        description: "DataStore/HttpService operations should be wrapped in pcall",
        severity: "warning",
        fix: "Wrap in pcall(function() ... end)",
      });
    } else if (source.includes("pcall")) {
      followed.push({ practice: "error-handling", file: path, line: 0 });
    }

    // Check for task.spawn vs spawn
    if (source.includes("spawn(") && !source.includes("task.spawn")) {
      violations.push({
        rule: "deprecated-api",
        file: path,
        line: 0,
        description: "spawn() is deprecated — use task.spawn() instead",
        severity: "warning",
        fix: "Replace spawn() with task.spawn()",
      });
    }

    // Check for wait() vs task.wait
    if (source.match(/\bwait\s*\(/) && !source.includes("task.wait")) {
      violations.push({
        rule: "deprecated-api",
        file: path,
        line: 0,
        description: "wait() is deprecated — use task.wait() instead",
        severity: "info",
        fix: "Replace wait() with task.wait()",
      });
    }

    // Check for proper script type organization
    if (source.includes("game:GetService") && source.includes("LocalScript")) {
      // Good: LocalScript using services
      followed.push({ practice: "service-usage", file: path, line: 0 });
    }

    // Check for anchored parts
    if (source.includes("Instance.new") && source.includes("Part") && !source.includes("Anchored")) {
      violations.push({
        rule: "anchoring",
        file: path,
        line: 0,
        description: "Newly created Parts should be anchored",
        severity: "info",
        fix: "Set Part.Anchored = true after creation",
      });
    }

    // Check for proper variable naming (PascalCase for services, camelCase for variables)
    const serviceNames = source.match(/game:GetService\("(\w+)"\)/g) || [];
    for (const svc of serviceNames) {
      followed.push({ practice: "service-naming", file: path, line: 0 });
    }

    const score = Math.max(0, 100 - violations.length * 10);

    return { score, violations, followed };
  }

  /* ==========================================================================
   * LINT
   * ======================================================================== */

  lint(source: string, options?: { strict?: boolean; styleGuide?: string }): LuauIssue[] {
    const issues: LuauIssue[] = [];
    const lines = source.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Global variable usage
      if (line.match(/^\s*[a-zA-Z_]\w*\s*=/) && !line.includes("local") && !line.includes("function")) {
        issues.push({
          id: `global-${lineNum}`,
          file: "current",
          line: lineNum,
          severity: "info",
          category: "best-practice",
          rule: "no-global",
          message: "Avoid global variables — use 'local'",
          code: line.trim(),
          fix: `local ${line.trim()}`,
        });
      }
    }

    return issues;
  }

  /* ==========================================================================
   * AUTO-FIX (safe, deterministic fixes only)
   * ======================================================================== */

  autoFix(source: string, issues: LuauIssue[]): string {
    let fixed = source;
    const lines = fixed.split("\n");

    for (const issue of issues) {
      if (issue.rule === "no-global" && issue.fix) {
        const lineIdx = issue.line - 1;
        if (lineIdx >= 0 && lineIdx < lines.length) {
          lines[lineIdx] = lines[lineIdx].replace(/^(\s*)([a-zA-Z_])/, `$1local $2`);
        }
      }
    }

    return lines.join("\n");
  }

  /* ==========================================================================
   * PRIVATE HELPERS
   * ======================================================================== */

  private inferType(value: string): string {
    const v = value.trim();
    if (/^\d+$/.test(v)) return "number";
    if (/^\d+\.\d+$/.test(v)) return "number";
    if (/^["']/.test(v)) return "string";
    if (v === "true" || v === "false") return "boolean";
    if (v === "nil") return "nil";
    if (v.includes("{}")) return "table";
    if (v.includes("Instance.new")) return "Instance";
    return "any";
  }

  private isInLocalScriptContext(lines: string[], currentLine: number): boolean {
    // Check if this code is in a LocalScript context
    // Heuristic: look for LocalPlayer references or RunService usage
    for (let i = 0; i < currentLine; i++) {
      if (lines[i].includes("LocalPlayer") || lines[i].includes("RunService")) {
        return true;
      }
    }
    return false;
  }

  private calculateDocumentationRatio(lines: string[]): number {
    const commentLines = lines.filter(l => l.trim().startsWith("--")).length;
    const codeLines = lines.filter(l => l.trim().length > 0 && !l.trim().startsWith("--")).length;
    return codeLines > 0 ? Math.min(1, commentLines / codeLines) : 0;
  }

  private assessCommentQuality(lines: string[]): number {
    const comments = lines.filter(l => l.trim().startsWith("--"));
    if (comments.length === 0) return 0;

    // Good comments explain WHY, not WHAT
    const goodPatterns = [/TODO/, /FIXME/, /NOTE/, /HACK/, /WARNING/, /IMPORTANT/, /SECURITY/, /PERFORMANCE/];
    const goodComments = comments.filter(c =>
      goodPatterns.some(p => p.test(c)) || c.trim().length > 20
    );

    return Math.min(1, goodComments.length / comments.length);
  }

  private collectIssues(
    typeSafety: TypeSafetyAnalysis,
    style: StyleAnalysis,
    performance: PerformanceAnalysis,
    security: SecurityAnalysis,
    bestPractices: BestPracticesAnalysis,
    path: string,
    lines: string[],
  ): LuauIssue[] {
    const issues: LuauIssue[] = [];

    // Convert type safety issues
    for (const v of typeSafety.untypedVariables.slice(0, 10)) {
      issues.push({
        id: `ts-untyped-${v.line}`,
        file: path,
        line: v.line,
        severity: "info",
        category: "type-safety",
        rule: "typed-variables",
        message: `Variable '${v.name}' lacks type annotation`,
        code: v.context,
        fix: v.suggestedType ? `Add ': ${v.suggestedType}' annotation` : undefined,
      });
    }

    // Convert security issues
    for (const v of security.vulnerabilities) {
      issues.push({
        id: v.id,
        file: path,
        line: v.line,
        severity: v.severity,
        category: "security",
        rule: v.type,
        message: v.description,
        code: v.code,
        fix: v.fix,
      });
    }

    // Convert performance issues
    for (const p of performance.expensivePatterns.slice(0, 5)) {
      issues.push({
        id: `perf-${p.line}`,
        file: path,
        line: p.line,
        severity: p.severity,
        category: "performance",
        rule: p.pattern,
        message: p.description,
        code: "",
        fix: p.suggestion,
      });
    }

    return issues.slice(0, 30);
  }

  private generateRecommendations(
    typeSafety: TypeSafetyAnalysis,
    style: StyleAnalysis,
    performance: PerformanceAnalysis,
    security: SecurityAnalysis,
    bestPractices: BestPracticesAnalysis,
  ): LuauRecommendation[] {
    const recs: LuauRecommendation[] = [];

    if (typeSafety.untypedVariables.length > 5) {
      recs.push({
        id: "rec-types",
        category: "type-safety",
        priority: "medium",
        title: "Add type annotations to untyped variables",
        description: `${typeSafety.untypedVariables.length} variables lack type annotations`,
        files: [],
        effort: "low",
        impact: "medium",
        implementation: "Add ': Type' annotations to local variable declarations",
      });
    }

    if (security.vulnerabilities.length > 0) {
      recs.push({
        id: "rec-security",
        category: "security",
        priority: "critical",
        title: "Fix security vulnerabilities",
        description: `${security.vulnerabilities.length} security vulnerabilities found`,
        files: [],
        effort: "medium",
        impact: "high",
        implementation: "Address critical and high severity vulnerabilities first",
      });
    }

    if (performance.connectionLeaks.length > 0) {
      recs.push({
        id: "rec-connections",
        category: "performance",
        priority: "high",
        title: "Clean up event connections",
        description: `${performance.connectionLeaks.length} potential connection leaks`,
        files: [],
        effort: "low",
        impact: "high",
        implementation: "Store connections and disconnect them in cleanup functions",
      });
    }

    if (bestPractices.violations.length > 0) {
      recs.push({
        id: "rec-practices",
        category: "best-practice",
        priority: "medium",
        title: "Follow Luau best practices",
        description: `${bestPractices.violations.length} best practice violations`,
        files: [],
        effort: "low",
        impact: "medium",
        implementation: "Update deprecated APIs and add error handling",
      });
    }

    return recs;
  }

  private calculateQualityScore(
    typeSafety: TypeSafetyAnalysis,
    style: StyleAnalysis,
    performance: PerformanceAnalysis,
    security: SecurityAnalysis,
    bestPractices: BestPracticesAnalysis,
  ): number {
    const weights = { typeSafety: 0.2, style: 0.15, performance: 0.2, security: 0.3, bestPractices: 0.15 };
    return Math.round(
      typeSafety.coverage * 100 * weights.typeSafety +
      style.score * weights.style +
      performance.score * weights.performance +
      security.score * weights.security +
      bestPractices.score * weights.bestPractices
    );
  }
}
