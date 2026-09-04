/**
 * P3.5 — Architecture Intelligence Types
 *
 * Types for architecture analysis, service placement, and system design.
 */

/** Architecture analysis result */
export interface ArchitectureAnalysis {
  /** Overall architecture style */
  style: ArchitectureStyle;
  /** Service placement analysis */
  servicePlacement: ServicePlacementAnalysis;
  /** Module organization analysis */
  moduleOrganization: ModuleOrganizationAnalysis;
  /** Data flow analysis */
  dataFlow: DataFlowAnalysis;
  /** Detected patterns */
  patterns: DetectedPattern[];
  /** Anti-patterns detected */
  antiPatterns: AntiPattern[];
  /** Recommendations */
  recommendations: ArchitectureRecommendation[];
}

/** Architecture style */
export type ArchitectureStyle =
  | "service-oriented"
  | "modular-monolith"
  | "layered"
  | "event-driven"
  | "data-oriented"
  | "ecs"
  | "mvc"
  | "custom";

/** Service placement analysis */
export interface ServicePlacementAnalysis {
  /** Current placement */
  current: ServicePlacement[];
  /** Recommended placement */
  recommended: ServicePlacement[];
  /** Misplaced services */
  misplaced: MisplacedService[];
}

/** Service placement info */
export interface ServicePlacement {
  serviceName: string;
  currentContainer: string;
  recommendedContainer: string;
  reason: string;
  confidence: number;
}

/** Misplaced service */
export interface MisplacedService {
  serviceName: string;
  currentContainer: string;
  correctContainer: string;
  reason: string;
  severity: "error" | "warning" | "info";
}

/** Module organization analysis */
export interface ModuleOrganizationAnalysis {
  /** Current organization style */
  currentStyle: ModuleStyle;
  /** Recommended style */
  recommendedStyle: ModuleStyle;
  /** Module clusters */
  clusters: ModuleCluster[];
  /** Dependency violations */
  violations: DependencyViolation[];
}

/** Module organization style */
export type ModuleStyle =
  | "folder-per-module"
  | "single-file"
  | "feature-based"
  | "layered"
  | "domain-driven";

/** Module cluster */
export interface ModuleCluster {
  name: string;
  modules: string[];
  cohesion: number;
  coupling: number;
  purpose: string;
}

/** Dependency violation */
export interface DependencyViolation {
  from: string;
  to: string;
  type: "circular" | "wrong-direction" | "missing-abstraction" | "tight-coupling";
  severity: "error" | "warning" | "info";
  description: string;
}

/** Data flow analysis */
export interface DataFlowAnalysis {
  /** Data flows */
  flows: DataFlow[];
  /** Bottlenecks */
  bottlenecks: DataFlowBottleneck[];
  /** Single points of failure */
  singlePointsOfFailure: SinglePointOfFailure[];
}

/** Data flow */
export interface DataFlow {
  id: string;
  source: string;
  destination: string;
  dataType: string;
  direction: "server-to-client" | "client-to-server" | "server-internal" | "client-internal";
  frequency: "continuous" | "event-driven" | "periodic" | "on-demand";
  validation: string[];
  sensitivity: "public" | "private" | "sensitive";
}

/** Data flow bottleneck */
export interface DataFlowBottleneck {
  location: string;
  description: string;
  impact: "high" | "medium" | "low";
  suggestedFix: string;
}

/** Single point of failure */
export interface SinglePointOfFailure {
  component: string;
  description: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  mitigation: string;
}

/** Detected architectural pattern */
export interface DetectedPattern {
  name: string;
  type: "architectural" | "design" | "concurrency" | "data";
  description: string;
  locations: string[];
  confidence: number;
  examples: string[];
}

/** Anti-pattern */
export interface AntiPattern {
  name: string;
  description: string;
  locations: string[];
  severity: "critical" | "high" | "medium" | "low";
  fix: string;
  confidence: number;
}

/** Architecture recommendation */
export interface ArchitectureRecommendation {
  id: string;
  category: "structure" | "placement" | "data-flow" | "security" | "performance" | "maintainability";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  rationale: string;
  implementation: ArchitectureImplementationStep[];
  effort: "low" | "medium" | "high";
  impact: "high" | "medium" | "low";
}

/** Implementation step */
export interface ArchitectureImplementationStep {
  order: number;
  action: string;
  description: string;
  files: string[];
  verification: string;
}

/** Service placement analyzer */
export interface ServicePlacementAnalyzer {
  analyze(services: any[]): ServicePlacementAnalysis;
  recommendPlacement(service: string, projectContext: any): ServicePlacement;
}

/** Module organization analyzer */
export interface ModuleOrganizationAnalyzer {
  analyze(modules: any[]): ModuleOrganizationAnalysis;
  detectClusters(modules: any[]): ModuleCluster[];
}

/** Dependency analyzer */
export interface DependencyAnalyzer {
  analyze(graph: any): DependencyGraphAnalysis;
  detectCycles(graph: any): CircularDependency[];
  findViolations(rules: DependencyRule[]): DependencyViolation[];
}

/** Dependency graph analysis */
export interface DependencyGraphAnalysis {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  clusters: DependencyCluster[];
  metrics: DependencyMetrics;
}

/** Dependency node */
export interface DependencyNode {
  id: string;
  type: string;
  dependencies: string[];
  dependents: string[];
  centrality: number;
}

/** Dependency edge */
export interface DependencyEdge {
  from: string;
  to: string;
  type: "import" | "require" | "fire" | "listen" | "parent" | "reference";
  weight: number;
}

/** Dependency cluster */
export interface DependencyCluster {
  id: string;
  nodes: string[];
  cohesion: number;
  coupling: number;
}

/** Dependency metrics */
export interface DependencyMetrics {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  maxDepth: number;
  circularDependencies: number;
  modularity: number;
}

/** Circular dependency */
export interface CircularDependency {
  cycle: string[];
  length: number;
  severity: "critical" | "high" | "medium" | "low";
}

/** Dependency rule */
export interface DependencyRule {
  from: string;
  to: string;
  type: "allowed" | "forbidden" | "required";
  condition?: string;
}

/** Architecture analyzer - main entry point */
export interface ArchitectureAnalyzer {
  analyzeProject(projectMap: any): Promise<ArchitectureAnalysis>;
  analyzeServicePlacement(services: any[]): Promise<ServicePlacementAnalysis>;
  analyzeModuleOrganization(modules: any[]): Promise<ModuleOrganizationAnalysis>;
  analyzeDataFlow(projectMap: any): Promise<DataFlowAnalysis>;
  detectPatterns(projectMap: any): Promise<DetectedPattern[]>;
  detectAntiPatterns(projectMap: any): Promise<AntiPattern[]>;
  generateRecommendations(analysis: ArchitectureAnalysis): Promise<ArchitectureRecommendation[]>;
}

/** Project map reference for architecture analysis */
export interface ProjectMapReference {
  services: any[];
  modules: any[];
  scripts: any[];
  remotes: any[];
  instances: any[];
  dependencies: any;
}

/**
 * Creates an architecture analyzer
 */
export function createArchitectureAnalyzer(): ArchitectureAnalyzer {
  return {
    async analyzeProject(projectMap: ProjectMapReference): Promise<ArchitectureAnalysis> {
      // This would be implemented with the actual analysis logic
      return {
        style: "service-oriented",
        servicePlacement: { current: [], recommended: [], misplaced: [] },
        moduleOrganization: { currentStyle: "folder-per-module", recommendedStyle: "folder-per-module", clusters: [], violations: [] },
        dataFlow: { flows: [], bottlenecks: [], singlePointsOfFailure: [] },
        patterns: [],
        antiPatterns: [],
        recommendations: [],
      };
    },

    async analyzeServicePlacement(services: any[]): Promise<ServicePlacementAnalysis> {
      return { current: [], recommended: [], misplaced: [] };
    },

    async analyzeModuleOrganization(modules: any[]): Promise<ModuleOrganizationAnalysis> {
      return { currentStyle: "folder-per-module", recommendedStyle: "folder-per-module", clusters: [], violations: [] };
    },

    async analyzeDataFlow(projectMap: any): Promise<DataFlowAnalysis> {
      return { flows: [], bottlenecks: [], singlePointsOfFailure: [] };
    },

    async detectPatterns(projectMap: any): Promise<DetectedPattern[]> {
      return [];
    },

    async detectAntiPatterns(projectMap: any): Promise<AntiPattern[]> {
      return [];
    },

    async generateRecommendations(analysis: ArchitectureAnalysis): Promise<ArchitectureRecommendation[]> {
      return [];
    },
  };
}
