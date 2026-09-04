/**
 * P3.5 — Intelligence Orchestrator
 *
 * Central coordination layer for all P3.5 intelligence subsystems.
 * Sits ABOVE the P3.4 runtime. Provides intelligence to planning,
 * execution, verification, and learning.
 *
 * Architecture:
 *   USER REQUEST
 *       ↓
 *   INTENT / TASK CLASSIFICATION  (existing plan.ts)
 *       ↓
 *   P3.5 INTELLIGENCE LAYER  (this orchestrator)
 *       ├── Project Map
 *       ├── Project Constitution
 *       ├── Architecture Intelligence
 *       ├── Luau Intelligence
 *       ├── Security Intelligence
 *       ├── Remote Review
 *       ├── Dependency Intelligence
 *       ├── Knowledge Routing
 *       ├── Gameplay Intelligence
 *       ├── World Building Intelligence
 *       ├── UI/UX Intelligence
 *       ├── Performance Intelligence
 *       └── Placement Intelligence
 *       ↓
 *   ENRICHED PLAN  (feeds into P3.4)
 *       ↓
 *   P3.4 EXECUTION
 *       ↓
 *   QUALITY / DOMAIN VERIFICATION
 *       ↓
 *   EXPERIENCE RECORD + LESSON EXTRACTION
 */

import type { ToolRegistry } from "../../tools/registry.js";
import type { ProjectMap } from "../project-map/types.js";

import { ProjectMapEngine } from "../project-map/engine.js";
import { ArchitectureIntelligenceEngine } from "../architecture/engine.js";
import { LuauAnalyzerImpl } from "../luau-intelligence/engine.js";
import { RemoteSecurityReviewer } from "../remote-review/engine.js";
import { SecurityAnalyzerImpl } from "../security/intelligence.js";
import { WorldBuildingEngine } from "../world-building/engine.js";
import { RobloxKnowledgeEngine } from "../knowledge/engine.js";
import { TaskKnowledgeRouter } from "../knowledge/routing.js";
import { QualityEvaluator } from "../quality/evaluation.js";
import { ExperienceStoreImpl } from "../experience/records.js";
import { LessonExtractor } from "../learning/lessons.js";
import { FailurePatternLibrary } from "../learning/failures.js";
import { LessonStore } from "../learning/lesson-store.js";
import { PlacementAnalyzer } from "../placement/intelligence.js";
import { GameplaySystemsEngine } from "../gameplay/intelligence.js";
import { UIUXIntelligenceEngine } from "../ui-ux/intelligence.js";
import { ResponsiveUIEngine } from "../ui-ux/responsive.js";
import { PerformanceIntelligenceEngine } from "../performance/intelligence.js";
import { DependencyAnalyzerImpl } from "../dependency/intelligence.js";

import type { ArchitectureAnalysis } from "../architecture/types.js";
import type { LuauAnalysis } from "../luau-intelligence/engine.js";
import type { RemoteSecurityReviewResult } from "../remote-review/engine.js";

import { classifyTask, routeIntelligence, BudgetTracker, type IntelligenceBudget, type TaskComplexity } from "./budget.js";
import { IntelligenceCache, ProjectMapCache, MetricsCollector, type IntelligenceMetrics } from "./cache.js";
import { ContextRelevanceEngine, type ContextItem } from "./context-relevance.js";
import type { WorldBuildingAnalysis } from "../world-building/types.js";
import type { QualityEvaluation } from "../quality/evaluation.js";
import type { ExperienceRecord } from "../experience/records.js";
import type { Lesson } from "../learning/lessons.js";

/* ============================================================================
 * INTELLIGENCE RESULT
 * ========================================================================== */

/** Complete intelligence result for a task */
export interface TaskIntelligence {
  /** Project map (may be null if scan failed) */
  projectMap: ProjectMap | null;

  /** Architecture analysis */
  architecture: ArchitectureAnalysis | null;

  /** Luau code analysis (for scripting tasks) */
  luau: LuauAnalysis | null;

  /** Remote security review */
  remoteReview: RemoteSecurityReviewResult | null;

  /** Security intelligence */
  security: any | null;

  /** World building analysis */
  worldBuilding: any | null;

  /** Knowledge routed to this task */
  knowledge: any[];

  /** Quality evaluation (post-execution) */
  quality: QualityEvaluation | null;

  /** Relevant lessons from past experience */
  lessons: any[];

  /** Failure patterns relevant to this task */
  failurePatterns: any[];

  /** Placement intelligence */
  placement: any | null;

  /** Constitution (learned project conventions) */
  constitution: any | null;

  /** Gameplay system analysis */
  gameplay: any | null;

  /** UI/UX analysis */
  uiux: any | null;

  /** Responsive UI analysis */
  responsive: any | null;

  /** Performance analysis */
  performance: any | null;

  /** Dependency analysis */
  dependency: any | null;

  /** Intelligence metadata */
  metadata: IntelligenceMetadata;
}

/** Intelligence metadata */
export interface IntelligenceMetadata {
  gatheredAt: number;
  durationMs: number;
  subsystemsInvoked: string[];
  subsystemsFailed: string[];
  projectMapAvailable: boolean;
  studioConnected: boolean;
}

/* ============================================================================
 * TASK DESCRIPTION (input to orchestrator)
 * ========================================================================== */

/** Description of the current task for intelligence gathering */
export interface TaskDescription {
  taskId: string;
  userRequest: string;
  intent: string;
  domain: string;
  needsRoblox: boolean;
  requiresBuild: boolean;
  requiresTesting: boolean;
  requiresVerification: boolean;
  studioId?: string;
  workspaceRoot?: string;
}

/* ============================================================================
 * INTELLIGENCE ORCHESTRATOR
 * ========================================================================== */

export class IntelligenceOrchestrator {
  private readonly projectMapEngine: ProjectMapEngine;
  private readonly architectureEngine: ArchitectureIntelligenceEngine;
  private readonly luauEngine: LuauAnalyzerImpl;
  private readonly remoteReviewer: RemoteSecurityReviewer;
  private readonly securityEngine: SecurityAnalyzerImpl;
  private readonly worldBuildingEngine: WorldBuildingEngine;
  private readonly knowledgeEngine: RobloxKnowledgeEngine;
  private readonly knowledgeRouter: TaskKnowledgeRouter;
  private readonly qualityEvaluator: QualityEvaluator;
  private readonly experienceStore: ExperienceStoreImpl;
  private readonly lessonExtractor: LessonExtractor;
  private readonly failurePatterns: FailurePatternLibrary;
  private readonly lessonStore: LessonStore;
  private readonly placementAnalyzer: PlacementAnalyzer;
  private readonly gameplayEngine: GameplaySystemsEngine;
  private readonly uiuxEngine: UIUXIntelligenceEngine;
  private readonly responsiveEngine: ResponsiveUIEngine;
  private readonly performanceEngine: PerformanceIntelligenceEngine;
  private readonly dependencyEngine: DependencyAnalyzerImpl;

  // P3.5.1 — Performance & Caching
  private readonly intelligenceCache: IntelligenceCache;
  private readonly projectMapCache: ProjectMapCache;
  private readonly metricsCollector: MetricsCollector;
  private readonly contextRelevance: ContextRelevanceEngine;

  private projectMap: ProjectMap | null = null;
  private lastScanTime = 0;
  private readonly SCAN_CACHE_MS = 60_000; // Cache project map for 60s

  constructor(
    private readonly tools: ToolRegistry,
    private readonly sessionId: string,
  ) {
    this.projectMapEngine = new ProjectMapEngine(tools as any, tools);
    this.architectureEngine = new ArchitectureIntelligenceEngine();
    this.luauEngine = new LuauAnalyzerImpl();
    this.remoteReviewer = new RemoteSecurityReviewer();
    this.securityEngine = new SecurityAnalyzerImpl();
    this.worldBuildingEngine = new WorldBuildingEngine();
    this.knowledgeEngine = new RobloxKnowledgeEngine();
    this.knowledgeRouter = new TaskKnowledgeRouter();
    this.qualityEvaluator = new QualityEvaluator();
    this.experienceStore = new ExperienceStoreImpl();
    this.lessonExtractor = new LessonExtractor();
    this.failurePatterns = new FailurePatternLibrary();
    this.lessonStore = new LessonStore();
    this.placementAnalyzer = new PlacementAnalyzer();
    this.gameplayEngine = new GameplaySystemsEngine();
    this.uiuxEngine = new UIUXIntelligenceEngine();
    this.responsiveEngine = new ResponsiveUIEngine();
    this.performanceEngine = new PerformanceIntelligenceEngine();
    this.dependencyEngine = new DependencyAnalyzerImpl();

    // P3.5.1 — Performance & Caching systems
    this.intelligenceCache = new IntelligenceCache();
    this.projectMapCache = new ProjectMapCache();
    this.metricsCollector = new MetricsCollector();
    this.contextRelevance = new ContextRelevanceEngine();
  }

  /**
   * MAIN ENTRY POINT: Gather all relevant intelligence for a task.
   *
   * P3.5.1: Uses budget-aware progressive intelligence routing.
   * Simple tasks get fast path, complex tasks get deep analysis.
   * Results are cached to avoid redundant computation.
   */
  async gatherIntelligence(task: TaskDescription): Promise<TaskIntelligence> {
    const startTime = Date.now();
    const subsystemsInvoked: string[] = [];
    const subsystemsFailed: string[] = [];

    // P3.5.1: Classify task and get budget
    const complexity = classifyTask(task);
    const routing = routeIntelligence(task);
    const budget = routing.budget;
    const tracker = new BudgetTracker(budget);

    // P3.5.1: Check intelligence cache
    const projectHash = this.projectMapCache.getHash() || "empty";
    const taskCategory = `${complexity}:${task.domain ?? "general"}`;
    const cacheKey = IntelligenceCache.cacheKey("full-intelligence", projectHash, taskCategory, "all");
    const cached = this.intelligenceCache.get<TaskIntelligence>(cacheKey);
    if (cached) {
      this.metricsCollector.record({
        taskId: task.taskId,
        stage: "gather",
        engine: "cache",
        durationMs: Date.now() - startTime,
        cacheHit: true,
        cacheKey,
        scope: "full-intelligence",
        resultStatus: "cached",
      });
      return cached;
    }

    // 1. Build or reuse Project Map (with cache)
    let projectMap: ProjectMap | null = null;
    try {
      projectMap = await this.ensureProjectMap(task);
      subsystemsInvoked.push("project-map");
    } catch (error) {
      subsystemsFailed.push(`project-map: ${error instanceof Error ? error.message : String(error)}`);
    }

    // P3.5.1: Budget-gated engine execution
    const runEngine = async (
      name: string,
      condition: boolean,
      fn: () => Promise<any>,
    ): Promise<any> => {
      if (!condition) return null;
      if (!tracker.canInvokeEngine()) {
        this.metricsCollector.record({
          taskId: task.taskId,
          stage: "gather",
          engine: name,
          durationMs: 0,
          cacheHit: false,
          cacheKey: "",
          scope: name,
          resultStatus: "budget-exceeded",
        });
        return null;
      }
      if (!tracker.isWithinLatency()) {
        this.metricsCollector.record({
          taskId: task.taskId,
          stage: "gather",
          engine: name,
          durationMs: 0,
          cacheHit: false,
          cacheKey: "",
          scope: name,
          resultStatus: "budget-exceeded",
        });
        return null;
      }
      const engineStart = Date.now();
      try {
        tracker.recordEngine();
        const result = await fn();
        this.metricsCollector.record({
          taskId: task.taskId,
          stage: "gather",
          engine: name,
          durationMs: Date.now() - engineStart,
          cacheHit: false,
          cacheKey: "",
          scope: name,
          resultStatus: "success",
          budgetRemaining: tracker.getRemaining(),
        });
        subsystemsInvoked.push(name);
        return result;
      } catch (error) {
        this.metricsCollector.record({
          taskId: task.taskId,
          stage: "gather",
          engine: name,
          durationMs: Date.now() - engineStart,
          cacheHit: false,
          cacheKey: "",
          scope: name,
          resultStatus: "error",
          failureCategory: error instanceof Error ? error.message : String(error),
        });
        subsystemsFailed.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    };

    // 2. Architecture Intelligence (depends on Project Map)
    const architecture = await runEngine(
      "architecture",
      !!projectMap,
      () => this.architectureEngine.analyzeProject(projectMap!),
    );

    // 3. Luau Intelligence (for scripting tasks)
    const luau = await runEngine(
      "luau-intelligence",
      !!projectMap && task.needsRoblox && (task.requiresBuild || task.requiresTesting),
      async () => {
        const scripts = projectMap?.scripts || [];
        if (scripts.length > 0) {
          const combinedSource = scripts
            .filter((s: any) => s.source)
            .map((s: any) => s.source)
            .join("\n---\n");
          if (combinedSource.trim()) {
            return this.luauEngine.analyzeScript({ source: combinedSource, path: "project-analysis" });
          }
        }
        return null;
      },
    );

    // 4. Remote Security Review (budget-gated)
    const remoteReview = await runEngine(
      "remote-review",
      !!projectMap && budget.allowRemoteReview && routing.engines.includes("remote-review"),
      () => this.remoteReviewer.reviewProject(projectMap!),
    );

    // 5. Security Intelligence (budget-gated)
    const security = await runEngine(
      "security",
      !!projectMap && budget.allowSecurity && routing.engines.includes("security"),
      () => this.securityEngine.assessProject(projectMap!),
    );

    // 6. World Building Intelligence (budget-gated)
    const worldBuilding = await runEngine(
      "world-building",
      !!projectMap && budget.allowWorldBuilding && routing.engines.includes("world-building"),
      () => this.worldBuildingEngine.analyzeWorld(projectMap!),
    );

    // 7. Knowledge Routing
    const knowledge = await runEngine(
      "knowledge",
      true,
      () => this.routeKnowledge(task),
    );

    // 8. Gameplay Intelligence
    const gameplay = await runEngine(
      "gameplay",
      !!projectMap && routing.engines.includes("gameplay"),
      () => this.gameplayEngine.analyzeGameplaySystems(projectMap!, task.userRequest),
    );

    // 9. UI/UX Intelligence
    const uiux = await runEngine(
      "uiux",
      !!projectMap && routing.engines.includes("uiux"),
      () => this.uiuxEngine.analyzeUI(projectMap!),
    );

    // 10. Responsive UI Intelligence
    const responsive = await runEngine(
      "responsive",
      !!projectMap && routing.engines.includes("responsive"),
      () => this.responsiveEngine.analyzeResponsiveness(projectMap!),
    );

    // 11. Performance Intelligence (budget-gated)
    const performance = await runEngine(
      "performance",
      !!projectMap && budget.allowPerformance && routing.engines.includes("performance"),
      () => this.performanceEngine.analyzePerformance(projectMap!),
    );

    // 12. Dependency Intelligence (budget-gated)
    const dependency = await runEngine(
      "dependency",
      !!projectMap && budget.allowDependency && routing.engines.includes("dependency"),
      () => this.dependencyEngine.analyze(projectMap!),
    );

    // 13. Placement Intelligence
    const placement = await runEngine(
      "placement",
      !!projectMap && task.requiresBuild && routing.engines.includes("placement"),
      () => this.placementAnalyzer.analyze({
        instances: projectMap!.instances,
        scripts: projectMap!.scripts,
        remotes: projectMap!.remotes,
        services: projectMap!.services,
        uiHierarchy: projectMap!.uiHierarchy,
      }),
    );

    // 14. Constitution
    const constitution = await runEngine(
      "constitution",
      !!projectMap && routing.engines.includes("constitution"),
      () => this.learnConstitution(projectMap!),
    );

    // 15. Failure patterns (lightweight, always available)
    let failurePatterns: any[] = [];
    try {
      failurePatterns = this.failurePatterns.getAllPatterns().slice(0, 10);
      subsystemsInvoked.push("failure-patterns");
    } catch (error) {
      subsystemsFailed.push(`failure-patterns: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 16. Lesson retrieval (lightweight, always available)
    let lessons: any[] = [];
    try {
      lessons = this.lessonStore.retrieve(task.userRequest, { maxLessons: 5, minConfidence: 0.4 });
      subsystemsInvoked.push("lesson-retrieval");
    } catch (error) {
      subsystemsFailed.push(`lesson-retrieval: ${error instanceof Error ? error.message : String(error)}`);
    }

    const durationMs = Date.now() - startTime;

    const result: TaskIntelligence = {
      projectMap,
      architecture,
      luau,
      remoteReview,
      security,
      worldBuilding,
      knowledge,
      quality: null, // Filled after execution
      lessons,
      failurePatterns,
      placement,
      constitution,
      gameplay,
      uiux,
      responsive,
      performance,
      dependency,
      metadata: {
        gatheredAt: Date.now(),
        durationMs,
        subsystemsInvoked,
        subsystemsFailed,
        projectMapAvailable: projectMap !== null,
        studioConnected: task.studioId !== undefined,
      },
    };

    // P3.5.1: Cache the result
    this.intelligenceCache.set(cacheKey, result, {
      projectHash,
      taskCategory,
      engine: "full-intelligence",
      scope: "all",
    });

    // P3.5.1: Record metrics
    this.metricsCollector.record({
      taskId: task.taskId,
      stage: "gather",
      engine: "orchestrator",
      durationMs,
      cacheHit: false,
      cacheKey,
      scope: "full-intelligence",
      resultStatus: "success",
      escalation: complexity !== "fast" ? complexity : undefined,
      budgetRemaining: tracker.getRemaining(),
    });

    return result;
  }

  /**
   * POST-EXECUTION: Evaluate quality and record experience.
   */
  async recordOutcome(
    task: TaskDescription,
    intelligence: TaskIntelligence,
    outcome: {
      success: boolean;
      completed: boolean;
      failed: boolean;
      cancelled: boolean;
      summary: string;
      durationMs: number;
      iterations: number;
      toolCalls: number;
      successfulTools: number;
      failedTools: number;
      verificationPassed: boolean;
      verificationEvidence: string[];
      errors: string[];
    },
  ): Promise<{ quality: QualityEvaluation; lessons: Lesson[] }> {
    // Quality evaluation
    const qualityRecord = {
      verification: { passed: outcome.verificationPassed, evidence: outcome.verificationEvidence },
      failures: outcome.errors.map((e, i) => ({
        id: `f-${i}`,
        type: "execution" as const,
        error: e,
        severity: "medium" as const,
        recovered: false,
      })),
      execution: outcome,
    };

    const quality = this.qualityEvaluator.evaluate(qualityRecord);

    // Record experience
    const experience: ExperienceRecord = {
      id: `exp-${task.taskId}`,
      taskId: task.taskId,
      projectId: "default",
      timestamp: Date.now(),
      task: {
        intent: task.intent,
        domain: task.domain,
        objective: task.userRequest,
        complexity: this.estimateComplexity(task),
      },
      plan: {
        goal: task.userRequest,
        steps: [],
        successCriteria: [],
      },
      execution: {
        durationMs: outcome.durationMs,
        iterations: outcome.iterations,
        toolCalls: outcome.toolCalls,
        successfulTools: outcome.successfulTools,
        failedTools: outcome.failedTools,
        totalTokens: 0,
        cost: 0,
      },
      outcome: {
        success: outcome.success,
        completed: outcome.completed,
        failed: outcome.failed,
        cancelled: outcome.cancelled,
        summary: outcome.summary,
        verification: {
          passed: outcome.verificationPassed,
          checks: [],
          evidence: outcome.verificationEvidence,
        },
      },
      verification: {
        passed: outcome.verificationPassed,
        checks: [],
        evidence: outcome.verificationEvidence,
      },
      observations: [],
      failures: outcome.errors.map((e, i) => ({
        id: `f-${i}`,
        type: "execution" as const,
        error: e,
        severity: "medium" as const,
        recovered: false,
      })),
      recoveries: [],
      quality: {
        overall: quality.overallScore,
        correctness: quality.dimensions.find(d => d.name === "correctness")?.score ?? 80,
        architecture: quality.dimensions.find(d => d.name === "architecture")?.score ?? 80,
        security: quality.dimensions.find(d => d.name === "security")?.score ?? 80,
        performance: quality.dimensions.find(d => d.name === "performance")?.score ?? 80,
        maintainability: 80,
        visual: quality.dimensions.find(d => d.name === "visual")?.score ?? 80,
        ux: quality.dimensions.find(d => d.name === "ux")?.score ?? 80,
        verification: outcome.verificationPassed ? 100 : 0,
        recovery: 80,
        efficiency: 80,
      },
      lessons: [],
      tags: [task.intent, task.domain],
      confidence: 0.8,
    };

    await this.experienceStore.save(experience);

    // Extract lessons
    const lessons = await this.lessonExtractor.extractLessons(experience);

    // Store lessons for future retrieval
    for (const lesson of lessons) {
      const l = lesson as any;
      this.lessonStore.store({
        content: l.content || l.description || "",
        category: this.mapLessonCategory(task.domain),
        sourceTaskId: task.taskId,
        confidence: l.confidence ?? 0.7,
        keywords: this.extractKeywords(task.userRequest),
      });
    }

    return { quality, lessons };
  }

  /**
   * Get failure patterns relevant to an error message.
   */
  getRelevantFailurePatterns(errorMessage: string): any[] {
    return this.failurePatterns.findPatterns(errorMessage);
  }

  /**
   * Get recovery strategies for a matched failure pattern.
   */
  getRecoveryStrategies(patternId: string): any[] {
    return this.failurePatterns.getRecoveryStrategies(patternId);
  }

  /* ==========================================================================
   * PRIVATE METHODS
   * ======================================================================== */

  /**
   * Ensure we have a current Project Map, reusing cache when fresh.
   */
  private async ensureProjectMap(task: TaskDescription): Promise<ProjectMap | null> {
    // Reuse cached map if fresh enough
    if (this.projectMap && (Date.now() - this.lastScanTime) < this.SCAN_CACHE_MS) {
      return this.projectMap;
    }

    // Try to load from disk first
    const loaded = await this.projectMapEngine.loadProjectMap("default");
    if (loaded && (Date.now() - loaded.lastUpdated) < this.SCAN_CACHE_MS) {
      this.projectMap = loaded;
      this.lastScanTime = loaded.lastUpdated;
      return this.projectMap;
    }

    // Build new map via MCP if Studio is connected
    if (task.studioId) {
      try {
        const result = await this.projectMapEngine.buildProjectMap("default", task.workspaceRoot || process.cwd());
        this.projectMap = result.projectMap;
        this.lastScanTime = Date.now();
        return this.projectMap;
      } catch {
        // Scan failed, fall through to empty map
      }
    }

    // Return null if no data available
    return null;
  }

  /**
   * Determine if remote review is needed for this task.
   */
  private needsRemoteReview(task: TaskDescription): boolean {
    const lower = task.userRequest.toLowerCase();
    return (
      lower.includes("remote") ||
      lower.includes("trading") ||
      lower.includes("shop") ||
      lower.includes("purchase") ||
      lower.includes("economy") ||
      lower.includes("inventory system") ||
      lower.includes("security") ||
      lower.includes("anti-cheat") ||
      lower.includes("validation") ||
      task.domain === "economy" ||
      task.domain === "networking" ||
      task.domain === "security"
    );
  }

  /**
   * Determine if security analysis is needed.
   */
  private needsSecurityAnalysis(task: TaskDescription): boolean {
    return this.needsRemoteReview(task);
  }

  /**
   * Determine if world building analysis is needed.
   */
  private needsWorldBuilding(task: TaskDescription): boolean {
    const lower = task.userRequest.toLowerCase();
    return (
      lower.includes("world") ||
      lower.includes("terrain") ||
      lower.includes("map design") ||
      lower.includes("district") ||
      lower.includes("harbor") ||
      lower.includes("house") ||
      lower.includes("building layout") ||
      lower.includes("environment") ||
      lower.includes("scenery") ||
      lower.includes("landscape") ||
      task.domain === "world-building"
    );
  }

  /**
   * Determine if gameplay analysis is needed.
   */
  private needsGameplayAnalysis(task: TaskDescription): boolean {
    const lower = task.userRequest.toLowerCase();
    return (
      lower.includes("trade") ||
      lower.includes("shop") ||
      lower.includes("combat") ||
      lower.includes("npc") ||
      lower.includes("quest") ||
      lower.includes("inventory") ||
      lower.includes("currency") ||
      lower.includes("economy") ||
      lower.includes("gameplay") ||
      lower.includes("reward") ||
      lower.includes("loot") ||
      lower.includes("spawn") ||
      task.domain === "economy" ||
      task.domain === "gameplay"
    );
  }

  /**
   * Determine if UI analysis is needed.
   */
  private needsUIAnalysis(task: TaskDescription): boolean {
    const lower = task.userRequest.toLowerCase();
    return (
      lower.includes("ui") ||
      lower.includes("interface") ||
      lower.includes("menu") ||
      lower.includes("screen") ||
      lower.includes("button") ||
      lower.includes("gui") ||
      lower.includes("hud") ||
      lower.includes("inventory") ||
      lower.includes("shop") ||
      task.domain === "ui" ||
      task.domain === "ui-ux"
    );
  }

  /**
   * Determine if responsive analysis is needed.
   */
  private needsResponsiveAnalysis(task: TaskDescription): boolean {
    const lower = task.userRequest.toLowerCase();
    return (
      lower.includes("mobile") ||
      lower.includes("responsive") ||
      lower.includes("phone") ||
      lower.includes("tablet") ||
      lower.includes("cross-platform") ||
      task.domain === "ui-ux"
    );
  }

  /**
   * Determine if performance analysis is needed.
   */
  private needsPerformanceAnalysis(task: TaskDescription): boolean {
    const lower = task.userRequest.toLowerCase();
    return (
      lower.includes("performance") ||
      lower.includes("optimize") ||
      lower.includes("lag") ||
      lower.includes("fps") ||
      lower.includes("slow") ||
      lower.includes("memory") ||
      lower.includes("many objects") ||
      lower.includes("hundred") ||
      lower.includes("thousand") ||
      task.domain === "performance"
    );
  }

  /**
   * Determine if dependency analysis is needed.
   */
  private needsDependencyAnalysis(task: TaskDescription): boolean {
    const lower = task.userRequest.toLowerCase();
    return (
      lower.includes("debug") ||
      lower.includes("fix") ||
      lower.includes("error") ||
      lower.includes("broken") ||
      lower.includes("refactor") ||
      lower.includes("module") ||
      lower.includes("import") ||
      task.domain === "debugging"
    );
  }

  /**
   * Route knowledge based on task intent and domain.
   */
  private async routeKnowledge(task: TaskDescription): Promise<any[]> {
    const knowledge: any[] = [];

    // Always include core Roblox knowledge for Roblox tasks
    if (task.needsRoblox) {
      const coreKnowledge = await this.knowledgeEngine.query(task.domain || "building");
      knowledge.push(...coreKnowledge);
    }

    // Route domain-specific knowledge
    if (task.domain === "security" || task.domain === "networking") {
      const securityKnowledge = await this.knowledgeEngine.query("remote", "security");
      knowledge.push(...securityKnowledge);
    }

    if (task.domain === "ui" || task.domain === "ui-ux") {
      const uiKnowledge = await this.knowledgeEngine.query("responsive", "ui");
      knowledge.push(...uiKnowledge);
    }

    if (task.domain === "world-building") {
      const buildKnowledge = await this.knowledgeEngine.query("part", "building");
      knowledge.push(...buildKnowledge);
    }

    return knowledge;
  }

  /**
   * Learn project constitution from Project Map.
   */
  private learnConstitution(projectMap: ProjectMap): any {
    const conventions = projectMap.conventions;
    const scripts = projectMap.scripts || [];
    const remotes = projectMap.remotes || [];
    const instances = projectMap.instances || [];

    // Detect actual naming patterns from observed entities
    const detectedPatterns = {
      scriptNames: scripts.map((s: any) => s.name),
      remoteNames: remotes.map((r: any) => r.name),
      instanceNames: instances.slice(0, 50).map((i: any) => i.name),
    };

    // Detect folder structure from instances
    const folderStructure: Record<string, string[]> = {};
    for (const inst of instances) {
      if (inst.parentPath) {
        if (!folderStructure[inst.parentPath]) {
          folderStructure[inst.parentPath] = [];
        }
        folderStructure[inst.parentPath].push(inst.name);
      }
    }

    // Detect service usage patterns
    const servicesUsed: string[] = [];
    if (projectMap.dataModel?.workspace) servicesUsed.push("Workspace");
    if (projectMap.dataModel?.replicatedStorage) servicesUsed.push("ReplicatedStorage");
    if (projectMap.dataModel?.serverScriptService) servicesUsed.push("ServerScriptService");
    if (projectMap.dataModel?.serverStorage) servicesUsed.push("ServerStorage");
    if (projectMap.dataModel?.starterGui) servicesUsed.push("StarterGui");
    if (projectMap.dataModel?.starterPlayer) servicesUsed.push("StarterPlayer");
    if (projectMap.dataModel?.lighting) servicesUsed.push("Lighting");

    return {
      conventions,
      detectedPatterns,
      folderStructure,
      servicesUsed,
      scriptCount: scripts.length,
      remoteCount: remotes.length,
      instanceCount: instances.length,
    };
  }

  /**
   * Estimate task complexity.
   */
  private estimateComplexity(task: TaskDescription): "low" | "medium" | "high" {
    let score = 0;
    if (task.requiresBuild) score++;
    if (task.requiresTesting) score++;
    if (task.requiresVerification) score++;
    if (task.needsRoblox) score++;
    if (task.domain === "economy" || task.domain === "security") score++;
    if (task.userRequest.length > 200) score++;

    if (score >= 4) return "high";
    if (score >= 2) return "medium";
    return "low";
  }

  /**
   * Map task domain to lesson category.
   */
  private mapLessonCategory(domain: string): "security" | "architecture" | "performance" | "gameplay" | "uiux" | "placement" | "dependency" | "code-quality" | "general" {
    switch (domain) {
      case "security": return "security";
      case "economy": return "gameplay";
      case "networking": return "security";
      case "ui": return "uiux";
      case "ui-ux": return "uiux";
      case "performance": return "performance";
      case "world-building": return "placement";
      case "debugging": return "dependency";
      default: return "general";
    }
  }

  /**
   * Extract keywords from user request for lesson retrieval.
   */
  private extractKeywords(userRequest: string): string[] {
    const stopWords = new Set(["a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "and", "but", "or", "nor", "not", "so", "yet", "both", "either", "neither", "each", "every", "all", "any", "few", "more", "most", "other", "some", "such", "no", "only", "own", "same", "than", "too", "very", "just", "because", "if", "when", "where", "how", "what", "which", "who", "whom", "this", "that", "these", "those"]);
    return userRequest
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopWords.has(t))
      .slice(0, 10);
  }
}

/**
 * Creates an Intelligence Orchestrator.
 */
export function createIntelligenceOrchestrator(
  tools: ToolRegistry,
  sessionId: string,
): IntelligenceOrchestrator {
  return new IntelligenceOrchestrator(tools, sessionId);
}
