/**
 * P3.5 — Architecture Intelligence Engine
 *
 * Analyzes project architecture from real Project Map data.
 * Detects patterns, anti-patterns, service placement, module organization,
 * and provides actionable recommendations.
 */

import type {
  ProjectMap,
  InstanceSnapshot,
  ScriptSnapshot,
  ModuleSnapshot,
  RemoteSnapshot,
  ServiceSnapshot,
  DependencyGraph,
} from "../project-map/types.js";

import type {
  ArchitectureAnalysis,
  ArchitectureStyle,
  ServicePlacementAnalysis,
  ServicePlacement,
  MisplacedService,
  ModuleOrganizationAnalysis,
  ModuleStyle,
  ModuleCluster,
  DependencyViolation,
  DataFlowAnalysis,
  DataFlow,
  DataFlowBottleneck,
  SinglePointOfFailure,
  DetectedPattern,
  AntiPattern,
  ArchitectureRecommendation,
} from "./types.js";

/**
 * Architecture Intelligence Engine
 * Analyzes real project data and produces actionable architecture insights.
 */
export class ArchitectureIntelligenceEngine {
  async analyzeProject(projectMap: ProjectMap): Promise<ArchitectureAnalysis> {
    const scripts = projectMap.scripts || [];
    const modules = scripts.filter((s: any) => s.className === "ModuleScript") as any[];
    const remotes = projectMap.remotes || [];
    const instances = projectMap.instances || [];
    const services = this.extractServicesFromMap(projectMap);

    const servicePlacement = this.analyzeServicePlacement(services, projectMap);
    const moduleOrganization = this.analyzeModuleOrganization(modules, projectMap);
    const dataFlow = this.analyzeDataFlow(remotes, scripts, projectMap);
    const patterns = this.detectPatterns(projectMap, services, modules, remotes);
    const antiPatterns = this.detectAntiPatterns(projectMap, services, modules, remotes, instances);
    const recommendations = this.generateRecommendations(servicePlacement, moduleOrganization, dataFlow, antiPatterns);

    const style = this.determineArchitectureStyle(services, modules, remotes);

    return {
      style,
      servicePlacement,
      moduleOrganization,
      dataFlow,
      patterns,
      antiPatterns,
      recommendations,
    };
  }

  /**
   * Analyze service placement correctness based on real service locations.
   */
  analyzeServicePlacement(services: any[], projectMap: ProjectMap): ServicePlacementAnalysis {
    const current: ServicePlacement[] = [];
    const recommended: ServicePlacement[] = [];
    const misplaced: MisplacedService[] = [];

    for (const service of services) {
      const serviceName = service.name || service.serviceName || "Unknown";
      const currentContainer = this.findServiceContainer(serviceName, projectMap);
      const recommendedContainer = this.recommendContainer(serviceName, service, projectMap);

      current.push({ serviceName, currentContainer, recommendedContainer: currentContainer, reason: "", confidence: 1.0 });
      recommended.push({ serviceName, currentContainer: recommendedContainer, recommendedContainer, reason: this.getPlacementReason(serviceName, recommendedContainer), confidence: 0.9 });

      if (currentContainer !== recommendedContainer) {
        misplaced.push({
          serviceName,
          currentContainer,
          correctContainer: recommendedContainer,
          reason: `Service "${serviceName}" is in ${currentContainer} but should be in ${recommendedContainer}`,
          severity: this.getPlacementSeverity(serviceName, currentContainer, recommendedContainer),
        });
      }
    }

    return { current, recommended, misplaced };
  }

  /**
   * Analyze module organization from real ModuleScript data.
   */
  analyzeModuleOrganization(modules: any[], projectMap: ProjectMap): ModuleOrganizationAnalysis {
    const clusters = this.detectModuleClusters(modules);
    const violations = this.detectDependencyViolations(projectMap);
    const currentStyle = this.determineModuleStyle(modules, projectMap);

    return {
      currentStyle,
      recommendedStyle: currentStyle,
      clusters,
      violations,
    };
  }

  /**
   * Analyze data flow from real remote and script data.
   */
  analyzeDataFlow(remotes: any[], scripts: any[], projectMap: ProjectMap): DataFlowAnalysis {
    const flows: DataFlow[] = [];
    const bottlenecks: DataFlowBottleneck[] = [];
    const singlePointsOfFailure: SinglePointOfFailure[] = [];

    // Analyze remote event data flows
    for (const remote of remotes) {
      const remoteFlows = this.analyzeRemoteFlows(remote, projectMap);
      flows.push(...remoteFlows);
    }

    // Detect bottlenecks
    if (remotes.length > 50) {
      bottlenecks.push({
        location: "ReplicatedStorage.Remotes",
        description: `High remote count (${remotes.length}) may indicate overly granular communication`,
        impact: "medium",
        suggestedFix: "Consider batching related remote events",
      });
    }

    // Detect single points of failure
    const serverScripts = scripts.filter((s: any) => s.className === "Script");
    if (serverScripts.length === 0 && remotes.length > 0) {
      singlePointsOfFailure.push({
        component: "ServerScriptService",
        description: "No server scripts found but remotes exist — server logic may be missing",
        riskLevel: "critical",
        mitigation: "Add server-side validation for all remote events",
      });
    }

    return { flows, bottlenecks, singlePointsOfFailure };
  }

  /**
   * Detect architectural patterns from real project data.
   */
  detectPatterns(
    projectMap: ProjectMap,
    services: any[],
    modules: any[],
    remotes: any[],
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Service-Oriented Architecture
    if (services.length > 2) {
      patterns.push({
        name: "Service-Oriented Architecture",
        type: "architectural",
        description: `Project uses ${services.length} services, indicating service-oriented architecture`,
        locations: services.map((s: any) => s.name || s.path || "unknown"),
        confidence: 0.85,
        examples: services.slice(0, 3).map((s: any) => s.name || "Service"),
      });
    }

    // ModuleScript Pattern
    if (modules.length > 0) {
      patterns.push({
        name: "ModuleScript Pattern",
        type: "design",
        description: `Project uses ${modules.length} ModuleScripts for code organization`,
        locations: modules.slice(0, 5).map((m: any) => m.path || m.name || "Module"),
        confidence: 0.9,
        examples: modules.slice(0, 3).map((m: any) => m.name || "Module"),
      });
    }

    // RemoteEvent Communication Pattern
    if (remotes.length > 0) {
      const remoteEvents = remotes.filter((r: any) => r.className === "RemoteEvent");
      const remoteFunctions = remotes.filter((r: any) => r.className === "RemoteFunction");

      patterns.push({
        name: "Remote Communication Pattern",
        type: "architectural",
        description: `Project uses ${remoteEvents.length} RemoteEvents and ${remoteFunctions.length} RemoteFunctions`,
        locations: remotes.slice(0, 5).map((r: any) => r.path || r.name || "Remote"),
        confidence: 0.95,
        examples: remotes.slice(0, 3).map((r: any) => r.name || "Remote"),
      });
    }

    // Client-Server Separation
    const localScripts = (projectMap.scripts || []).filter((s: any) => s.className === "LocalScript");
    const serverScripts = (projectMap.scripts || []).filter((s: any) => s.className === "Script");
    if (localScripts.length > 0 && serverScripts.length > 0) {
      patterns.push({
        name: "Client-Server Separation",
        type: "architectural",
        description: `Clear client-server separation: ${serverScripts.length} server scripts, ${localScripts.length} client scripts`,
        locations: ["ServerScriptService", "StarterPlayer"],
        confidence: 0.9,
        examples: ["Server-side logic in Script", "Client-side logic in LocalScript"],
      });
    }

    return patterns;
  }

  /**
   * Detect anti-patterns from real project data.
   */
  detectAntiPatterns(
    projectMap: ProjectMap,
    services: any[],
    modules: any[],
    remotes: any[],
    instances: any[],
  ): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];

    // God Module detection: modules with excessive responsibilities
    for (const mod of modules) {
      const source = (mod as any).source || "";
      const lineCount = source.split("\n").length;
      if (lineCount > 500) {
        antiPatterns.push({
          name: "God Module",
          description: `Module "${mod.name}" has ${lineCount} lines — may have too many responsibilities`,
          locations: [(mod as any).path || mod.name],
          severity: "medium",
          fix: "Split into smaller, focused modules following single responsibility principle",
          confidence: 0.7,
        });
      }
    }

    // Remote without server script validation
    const serverScripts = (projectMap.scripts || []).filter((s: any) => s.className === "Script");
    if (remotes.length > 0 && serverScripts.length === 0) {
      antiPatterns.push({
        name: "Missing Server Validation",
        description: `${remotes.length} remotes exist but no server scripts found for validation`,
        locations: remotes.slice(0, 3).map((r: any) => r.path || r.name),
        severity: "critical",
        fix: "Add server-side Script with RemoteEvent OnServerEvent handlers and validation",
        confidence: 0.95,
      });
    }

    // Duplicate naming patterns
    const nameCounts: Record<string, number> = {};
    for (const inst of instances) {
      const name = inst.name;
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
    for (const [name, count] of Object.entries(nameCounts)) {
      if (count > 3 && name !== "Part" && name !== "Model") {
        antiPatterns.push({
          name: "Duplicate Naming",
          description: `Instance name "${name}" appears ${count} times — consider unique naming`,
          locations: instances.filter((i: any) => i.name === name).slice(0, 3).map((i: any) => i.path),
          severity: "low",
          fix: `Use unique, descriptive names instead of reusing "${name}"`,
          confidence: 0.6,
        });
      }
    }

    // Excessive instance depth
    const deepPaths = instances.filter((i: any) => {
      const depth = (i.path || "").split(".").length;
      return depth > 6;
    });
    if (deepPaths.length > 5) {
      antiPatterns.push({
        name: "Excessive Nesting",
        description: `${deepPaths.length} instances have deep nesting (>6 levels)`,
        locations: deepPaths.slice(0, 3).map((i: any) => i.path),
        severity: "medium",
        fix: "Flatten hierarchy where possible to improve maintainability",
        confidence: 0.7,
      });
    }

    return antiPatterns;
  }

  /**
   * Generate architecture recommendations.
   */
  generateRecommendations(
    servicePlacement: ServicePlacementAnalysis,
    moduleOrganization: ModuleOrganizationAnalysis,
    dataFlow: DataFlowAnalysis,
    antiPatterns: AntiPattern[],
  ): ArchitectureRecommendation[] {
    const recommendations: ArchitectureRecommendation[] = [];

    // Misplaced services
    for (const misplaced of servicePlacement.misplaced) {
      recommendations.push({
        id: `rec-placement-${misplaced.serviceName}`,
        category: "placement",
        priority: misplaced.severity === "error" ? "high" : "medium",
        title: `Move ${misplaced.serviceName} to ${misplaced.correctContainer}`,
        description: misplaced.reason,
        rationale: `Proper service placement improves maintainability and follows Roblox conventions`,
        implementation: [{
          order: 1,
          action: `Move ${misplaced.serviceName} from ${misplaced.currentContainer} to ${misplaced.correctContainer}`,
          description: `Relocate the service module`,
          files: [],
          verification: "Verify the service still loads correctly",
        }],
        effort: "low",
        impact: "medium",
      });
    }

    // Module organization recommendations
    if (moduleOrganization.clusters.length > 3) {
      recommendations.push({
        id: "rec-modularize",
        category: "structure",
        priority: "medium",
        title: "Consider modularizing large module clusters",
        description: `${moduleOrganization.clusters.length} module clusters detected`,
        rationale: "Modular organization improves code navigability and reduces merge conflicts",
        implementation: [],
        effort: "medium",
        impact: "medium",
      });
    }

    // Data flow recommendations
    for (const bottleneck of dataFlow.bottlenecks) {
      recommendations.push({
        id: `rec-bottleneck-${bottleneck.location}`,
        category: "data-flow",
        priority: bottleneck.impact === "high" ? "high" : "medium",
        title: `Address data flow bottleneck at ${bottleneck.location}`,
        description: bottleneck.description,
        rationale: bottleneck.suggestedFix,
        implementation: [],
        effort: "medium",
        impact: bottleneck.impact as "high" | "medium" | "low",
      });
    }

    // Anti-pattern recommendations
    for (const ap of antiPatterns) {
      if (ap.severity === "critical" || ap.severity === "high") {
        recommendations.push({
          id: `rec-anti-${ap.name.replace(/\s+/g, "-").toLowerCase()}`,
          category: "maintainability",
          priority: ap.severity === "critical" ? "critical" : "high",
          title: `Fix: ${ap.name}`,
          description: ap.description,
          rationale: ap.fix,
          implementation: [],
          effort: "medium",
          impact: "high",
        });
      }
    }

    return recommendations;
  }

  /**
   * Recommend service container based on service name/type heuristics.
   */
  private recommendContainer(serviceName: string, service: any, projectMap: ProjectMap): string {
    const name = serviceName.toLowerCase();

    // Client-side services
    if (name.includes("ui") || name.includes("gui") || name.includes("hud") || name.includes("menu")) {
      return "StarterGui";
    }
    if (name.includes("input") || name.includes("camera") || name.includes("controls")) {
      return "StarterPlayer";
    }

    // Shared services
    if (name.includes("config") || name.includes("shared") || name.includes("util") || name.includes("common")) {
      return "ReplicatedStorage";
    }

    // Server-side services (default)
    if (name.includes("data") || name.includes("save") || name.includes("admin") || name.includes("moderation")) {
      return "ServerScriptService";
    }

    // Default: ServerScriptService for authoritative logic
    return "ServerScriptService";
  }

  /**
   * Find where a service currently resides.
   */
  private findServiceContainer(serviceName: string, projectMap: ProjectMap): string {
    // Check in instances
    for (const inst of projectMap.instances || []) {
      if (inst.name === serviceName) {
        return this.getServiceFromPath(inst.path);
      }
    }
    return "Unknown";
  }

  /**
   * Extract service name from instance path.
   */
  private getServiceFromPath(path: string): string {
    const parts = path.split(".");
    return parts[0] || "Unknown";
  }

  /**
   * Extract services from the project map.
   */
  private extractServicesFromMap(projectMap: ProjectMap): any[] {
    const services: any[] = [];
    const dm = projectMap.dataModel;

    if (dm?.workspace) services.push({ name: "Workspace", path: "Workspace", type: "workspace" });
    if (dm?.replicatedStorage) services.push({ name: "ReplicatedStorage", path: "ReplicatedStorage", type: "storage" });
    if (dm?.serverScriptService) services.push({ name: "ServerScriptService", path: "ServerScriptService", type: "script" });
    if (dm?.serverStorage) services.push({ name: "ServerStorage", path: "ServerStorage", type: "storage" });
    if (dm?.starterPlayer) services.push({ name: "StarterPlayer", path: "StarterPlayer", type: "starter" });
    if (dm?.starterGui) services.push({ name: "StarterGui", path: "StarterGui", type: "starter" });
    if (dm?.lighting) services.push({ name: "Lighting", path: "Lighting", type: "environment" });
    if (dm?.soundService) services.push({ name: "SoundService", path: "SoundService", type: "environment" });
    if (dm?.teams) services.push({ name: "Teams", path: "Teams", type: "gameplay" });
    if (dm?.players) services.push({ name: "Players", path: "Players", type: "core" });

    return services;
  }

  /**
   * Determine overall architecture style.
   */
  private determineArchitectureStyle(services: any[], modules: any[], remotes: any[]): ArchitectureStyle {
    if (services.length > 3 && modules.length > 5) return "service-oriented";
    if (modules.length > 10) return "modular-monolith";
    if (remotes.length > 5) return "event-driven";
    if (modules.length > 3) return "layered";
    return "custom";
  }

  /**
   * Determine module organization style.
   */
  private determineModuleStyle(modules: any[], projectMap: ProjectMap): ModuleStyle {
    const paths = modules.map((m: any) => m.path || "");
    const hasFolders = paths.some(p => p.includes("/"));
    if (hasFolders) return "folder-per-module";
    return "single-file";
  }

  /**
   * Detect module clusters.
   */
  private detectModuleClusters(modules: any[]): ModuleCluster[] {
    const clusters: ModuleCluster[] = [];
    const byPath: Record<string, any[]> = {};

    for (const mod of modules) {
      const path = (mod.path || "").split("/").slice(0, -1).join("/") || "root";
      if (!byPath[path]) byPath[path] = [];
      byPath[path].push(mod);
    }

    for (const [path, mods] of Object.entries(byPath)) {
      if (mods.length >= 2) {
        clusters.push({
          name: path,
          modules: mods.map((m: any) => m.name || m.path),
          cohesion: 0.7,
          coupling: 0.3,
          purpose: `Modules in ${path}`,
        });
      }
    }

    return clusters;
  }

  /**
   * Detect dependency violations.
   */
  private detectDependencyViolations(projectMap: ProjectMap): DependencyViolation[] {
    const violations: DependencyViolation[] = [];
    const deps = projectMap.dependencies;

    if (deps?.edges) {
      // Check for circular dependencies
      const visited = new Set<string>();
      const stack = new Set<string>();

      for (const edge of deps.edges) {
        if (edge.type === "requires" || edge.type === "imports") {
          if (stack.has(edge.to)) {
            violations.push({
              from: edge.from,
              to: edge.to,
              type: "circular",
              severity: "error",
              description: `Circular dependency detected: ${edge.from} → ${edge.to}`,
            });
          }
          visited.add(edge.from);
          stack.add(edge.to);
        }
      }
    }

    return violations;
  }

  /**
   * Analyze remote data flows.
   */
  private analyzeRemoteFlows(remote: any, projectMap: ProjectMap): DataFlow[] {
    const flows: DataFlow[] = [];

    if (remote.className === "RemoteEvent") {
      flows.push({
        id: `flow-${remote.name}`,
        source: "Client",
        destination: "Server",
        dataType: "RemoteEvent",
        direction: "client-to-server",
        frequency: "event-driven",
        validation: [],
        sensitivity: "private",
      });
    } else if (remote.className === "RemoteFunction") {
      flows.push({
        id: `flow-${remote.name}`,
        source: "Client",
        destination: "Server",
        dataType: "RemoteFunction",
        direction: "client-to-server",
        frequency: "on-demand",
        validation: [],
        sensitivity: "private",
      });
    }

    return flows;
  }

  /**
   * Get placement reason.
   */
  private getPlacementReason(serviceName: string, container: string): string {
    return `${serviceName} should be in ${container} based on its role and Roblox conventions`;
  }

  /**
   * Get placement severity.
   */
  private getPlacementSeverity(serviceName: string, current: string, recommended: string): "error" | "warning" | "info" {
    // Critical services in wrong location = error
    if (serviceName.toLowerCase().includes("data") && current !== "ServerScriptService") return "error";
    if (serviceName.toLowerCase().includes("admin") && current !== "ServerScriptService") return "error";
    // Other misplacements = warning
    return "warning";
  }
}
