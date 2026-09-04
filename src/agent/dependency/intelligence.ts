/**
 * P3.5 — Dependency Intelligence Types
 *
 * Types for dependency analysis, resolution, and management.
 */

import type { ProjectMap, InstanceSnapshot, ScriptSnapshot, ModuleSnapshot, RemoteEventSnapshot, RemoteFunctionSnapshot } from "../project-map/types.js";

/** Dependency analysis result */
export interface DependencyAnalysis {
  /** Dependency graph */
  graph: DependencyGraph;
  /** Dependency metrics */
  metrics: DependencyMetrics;
  /** Circular dependencies */
  circularDependencies: CircularDependency[];
  /** Dependency violations */
  violations: DependencyViolation[];
  /** Resolution order */
  resolutionOrder: ResolutionOrder[];
  /** Unused dependencies */
  unusedDependencies: UnusedDependency[];
  /** Missing dependencies */
  missingDependencies: MissingDependency[];
}

/** Dependency graph */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  adjacencyList: Map<string, string[]>;
  reverseAdjacencyList: Map<string, string[]>;
}

/** Dependency node */
export interface DependencyNode {
  id: string;
  type: "script" | "module" | "remote" | "asset" | "service" | "ui" | "instance";
  path: string;
  name: string;
  dependencies: string[];
  dependents: string[];
  centrality: number;
  cluster: string;
}

/** Dependency edge */
export interface DependencyEdge {
  from: string;
  to: string;
  type: "import" | "require" | "fire" | "listen" | "parent" | "reference" | "replicates";
  weight: number;
  metadata?: Record<string, unknown>;
}

/** Dependency metrics */
export interface DependencyMetrics {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  maxDegree: number;
  averagePathLength: number;
  diameter: number;
  clusteringCoefficient: number;
  modularity: number;
  circularDependencies: number;
  maxDepth: number;
  averageDepth: number;
  stronglyConnectedComponents: number;
}

/** Circular dependency */
export interface CircularDependency {
  cycle: string[];
  length: number;
  severity: "critical" | "high" | "medium" | "low";
  nodes: string[];
  edges: CircularDependencyEdge[];
}

/** Circular dependency edge */
export interface CircularDependencyEdge {
  from: string;
  to: string;
  type: string;
}

/** Dependency violation */
export interface DependencyViolation {
  from: string;
  to: string;
  type: "circular" | "wrong-direction" | "missing-abstraction" | "tight-coupling" | "missing-dependency" | "unused-dependency";
  severity: "error" | "warning" | "info";
  description: string;
  suggestedFix: string;
}

/** Resolution order */
export interface ResolutionOrder {
  node: string;
  level: number;
  dependencies: string[];
  dependents: string[];
}

/** Unused dependency */
export interface UnusedDependency {
  from: string;
  to: string;
  reason: string;
}

/** Missing dependency */
export interface MissingDependency {
  from: string;
  expected: string;
  reason: string;
}

/** Dependency resolution result */
export interface DependencyResolution {
  success: boolean;
  order: string[];
  unresolved: string[];
  cycles: string[][];
}

/** Dependency resolution strategy */
export interface ResolutionStrategy {
  strategy: "topological" | "dfs" | "bfs" | "kahn";
  handleCycles: "error" | "break" | "ignore";
  maxDepth: number;
}

/** Dependency analyzer interface */
export interface DependencyAnalyzer {
  analyze(projectMap: any): Promise<DependencyAnalysis>;
  resolveDependencies(nodes: string[], edges: any[]): DependencyResolution;
  detectCycles(graph: any): CircularDependency[];
  findViolations(rules: DependencyRule[]): DependencyViolation[];
  getResolutionOrder(nodes: string[]): ResolutionOrder[];
  findUnusedDependencies(): UnusedDependency[];
  findMissingDependencies(): MissingDependency[];
}

/** Dependency rule */
export interface DependencyRule {
  from: string;
  to: string;
  type: "allowed" | "forbidden" | "required";
  condition?: string;
}

/** Dependency graph builder */
export interface DependencyGraphBuilder {
  addNode(node: any): DependencyGraphBuilder;
  addEdge(from: string, to: string, type: string, weight?: number): DependencyGraphBuilder;
  build(): DependencyGraph;
}

/** Dependency resolver */
export interface DependencyResolver {
  resolve(graph: any, entryPoints: string[]): DependencyResolution;
  getResolutionOrder(graph: any): string[];
  detectCycles(graph: any): CircularDependency[];
}

/** Dependency impact analysis */
export interface DependencyImpactAnalysis {
  affectedNodes: string[];
  impactRadius: number;
  criticalPath: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendedActions: string[];
}

/** Dependency change impact */
export interface DependencyChangeImpact {
  added: DependencyChange[];
  removed: DependencyChange[];
  modified: DependencyChange[];
}

export interface DependencyChange {
  from: string;
  to: string;
  type: "added" | "removed" | "modified";
  impact: "low" | "medium" | "high";
}

/** Dependency analyzer implementation */
export class DependencyAnalyzerImpl {
  async analyze(projectMap: any): Promise<any> {
    const graph = this.buildGraph(projectMap);
    const metrics = this.calculateMetrics(graph);
    const cycles = this.detectCycles(graph);
    const violations = this.findViolations(graph, projectMap);
    const resolutionOrder = this.getResolutionOrder(graph);
    const unused = this.findUnusedDependencies(graph);
    const missing = this.findMissingDependencies(graph);

    return {
      graph: { nodes: graph.nodes, edges: graph.edges, adjacencyList: graph.adjacencyList, reverseAdjacencyList: graph.reverseAdjacencyList },
      metrics,
      circularDependencies: cycles,
      violations,
      resolutionOrder,
      unusedDependencies: unused,
      missingDependencies: missing,
    };
  }

  private buildGraph(projectMap: any): any {
    const nodes = new Map();
    const edges: any[] = [];
    const adjacencyList = new Map<string, string[]>();
    const reverseAdjacencyList = new Map<string, string[]>();

    // Add nodes for scripts
    for (const script of projectMap.scripts || []) {
      const id = script.path || script.name;
      nodes.set(id, { id, type: script.className === "ModuleScript" ? "module" : "script", path: script.path, name: script.name, dependencies: [], dependents: [], centrality: 0, cluster: "" });
      adjacencyList.set(id, []);
      reverseAdjacencyList.set(id, []);
    }

    // Extract require() dependencies from script source
    for (const script of projectMap.scripts || []) {
      const source = script.source || "";
      const id = script.path || script.name;
      const requires = [...source.matchAll(/require\(([^)]+)\)/g)];
      for (const match of requires) {
        const target = match[1].trim().replace(/["']/g, "");
        // Try to find matching script by name
        for (const [nodeId] of nodes) {
          if (nodeId.includes(target) || target.includes(nodeId.split(".").pop() || "")) {
            edges.push({ from: id, to: nodeId, type: "require", weight: 1 });
            const deps = adjacencyList.get(id) || [];
            deps.push(nodeId);
            adjacencyList.set(id, deps);
            const revDeps = reverseAdjacencyList.get(nodeId) || [];
            revDeps.push(id);
            reverseAdjacencyList.set(nodeId, revDeps);
          }
        }
      }
    }

    return { nodes, edges, adjacencyList, reverseAdjacencyList };
  }

  private calculateMetrics(graph: any): any {
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.length;
    const maxDegree = Math.max(0, ...Array.from(graph.adjacencyList.values()).map((deps: any) => deps.length));

    // Calculate strongly connected components using Tarjan's algorithm
    const sccCount = this.countSCC(graph);

    // Calculate real graph metrics
    const circularDeps = this.detectCircularDependencies(graph);
    const { maxDepth, averageDepth } = this.calculateDepths(graph);
    const clusteringCoefficient = this.calculateClusteringCoefficient(graph);

    return {
      totalNodes: nodeCount,
      totalEdges: edgeCount,
      averageDegree: nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0,
      maxDegree,
      averagePathLength: nodeCount > 1 ? this.estimateAveragePathLength(graph) : 0,
      diameter: this.calculateDiameter(graph),
      clusteringCoefficient,
      modularity: 0, // Modularity requires community detection — not implemented
      circularDependencies: circularDeps.length,
      maxDepth,
      averageDepth,
      stronglyConnectedComponents: sccCount,
    };
  }

  private detectCircularDependencies(graph: any): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const deps = graph.adjacencyList.get(nodeId) || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          dfs(dep);
        } else if (recursionStack.has(dep)) {
          // Found a cycle
          const cycleStart = path.indexOf(dep);
          if (cycleStart >= 0) {
            cycles.push(path.slice(cycleStart));
          }
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const [nodeId] of graph.nodes) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  private calculateDepths(graph: any): { maxDepth: number; averageDepth: number } {
    // BFS from each node to compute depths
    const depths: number[] = [];
    for (const [startId] of graph.nodes) {
      const visited = new Map<string, number>();
      const queue = [startId];
      visited.set(startId, 0);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDepth = visited.get(current)!;
        const deps: string[] = (graph.adjacencyList.get(current) as string[]) || [];
        for (const dep of deps) {
          if (!visited.has(dep)) {
            visited.set(dep, currentDepth + 1);
            queue.push(dep);
          }
        }
      }
      for (const [, d] of visited) {
        if (d > 0) depths.push(d);
      }
    }
    return {
      maxDepth: depths.length > 0 ? Math.max(...depths) : 0,
      averageDepth: depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0,
    };
  }

  private calculateClusteringCoefficient(graph: any): number {
    // For directed graphs, use approximate clustering coefficient
    let totalTriangles = 0;
    let totalPossible = 0;

    for (const [nodeId] of graph.nodes) {
      const neighbors = new Set<string>((graph.adjacencyList.get(nodeId) as string[]) || []);
      if (neighbors.size < 2) continue;

      // Count triangles (A->B, A->C, B->C)
      let triangles = 0;
      for (const n1 of neighbors) {
        for (const n2 of neighbors) {
          if (n1 !== n2 && ((graph.adjacencyList.get(n1) as string[]) || []).includes(n2)) {
            triangles++;
          }
        }
      }
      totalTriangles += triangles / 2; // Each triangle counted twice
      totalPossible += (neighbors.size * (neighbors.size - 1)) / 2;
    }

    return totalPossible > 0 ? totalTriangles / totalPossible : 0;
  }

  private calculateDiameter(graph: any): number {
    // BFS from each node to find longest shortest path
    let diameter = 0;
    for (const [startId] of graph.nodes) {
      const visited = new Map<string, number>();
      const queue = [startId];
      visited.set(startId, 0);
      let maxDist = 0;
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDist = visited.get(current)!;
        maxDist = Math.max(maxDist, currentDist);
        const deps: string[] = (graph.adjacencyList.get(current) as string[]) || [];
        for (const dep of deps) {
          if (!visited.has(dep)) {
            visited.set(dep, currentDist + 1);
            queue.push(dep);
          }
        }
      }
      diameter = Math.max(diameter, maxDist);
    }
    return diameter;
  }

  private estimateAveragePathLength(graph: any): number {
    // Sample-based estimate for large graphs
    const nodes: string[] = Array.from(graph.nodes.keys());
    if (nodes.length <= 20) {
      // Exact calculation for small graphs
      let totalDist = 0;
      let count = 0;
      for (const startId of nodes) {
        const visited = new Map<string, number>();
        const queue = [startId];
        visited.set(startId, 0);
        while (queue.length > 0) {
          const current = queue.shift()!;
          const currentDist = visited.get(current)!;
          const deps: string[] = (graph.adjacencyList.get(current) as string[]) || [];
          for (const dep of deps) {
            if (!visited.has(dep)) {
              visited.set(dep, currentDist + 1);
              queue.push(dep);
            }
          }
        }
        for (const [, d] of visited) {
          if (d > 0) { totalDist += d; count++; }
        }
      }
      return count > 0 ? totalDist / count : 0;
    }
    // Sample 10 random nodes for large graphs
    const sample = nodes.sort(() => Math.random() - 0.5).slice(0, 10);
    let totalDist = 0;
    let count = 0;
    for (const startId of sample) {
      const visited = new Map<string, number>();
      const queue = [startId];
      visited.set(startId, 0);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDist = visited.get(current)!;
        const deps: string[] = (graph.adjacencyList.get(current) as string[]) || [];
        for (const dep of deps) {
          if (!visited.has(dep)) {
            visited.set(dep, currentDist + 1);
            queue.push(dep);
          }
        }
      }
      for (const [, d] of visited) {
        if (d > 0) { totalDist += d; count++; }
      }
    }
    return count > 0 ? totalDist / count : 0;
  }

  private countSCC(graph: any): number {
    // Simple SCC count using iterative DFS
    const visited = new Set<string>();
    let count = 0;
    for (const [nodeId] of graph.nodes) {
      if (!visited.has(nodeId)) {
        this.dfsExplore(graph, nodeId, visited);
        count++;
      }
    }
    return count;
  }

  private dfsExplore(graph: any, startId: string, visited: Set<string>): void {
    const stack = [startId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of graph.adjacencyList.get(current) || []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
  }

  detectCycles(graph: any): any[] {
    const cycles: any[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    for (const [nodeId] of graph.nodes) {
      if (!visited.has(nodeId)) {
        this.dfsForCycles(graph, nodeId, visited, recursionStack, path, cycles);
      }
    }

    return cycles;
  }

  private dfsForCycles(graph: any, nodeId: string, visited: Set<string>, recursionStack: Set<string>, path: string[], cycles: any[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    for (const neighbor of graph.adjacencyList.get(nodeId) || []) {
      if (!visited.has(neighbor)) {
        this.dfsForCycles(graph, neighbor, visited, recursionStack, path, cycles);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor);
        cycles.push({
          cycle,
          length: cycle.length,
          severity: cycle.length <= 2 ? "critical" : cycle.length <= 3 ? "high" : "medium",
          nodes: cycle,
          edges: [],
        });
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  }

  private findViolations(graph: any, projectMap: any): any[] {
    const violations: any[] = [];

    // Check for scripts that require modules from wrong context
    const scripts = projectMap.scripts || [];
    for (const script of scripts) {
      if (script.className === "LocalScript") {
        const source = script.source || "";
        if (source.includes("DataStoreService") || source.includes(":GetDataStore")) {
          violations.push({
            from: script.path || script.name,
            to: "DataStoreService",
            type: "wrong-direction",
            severity: "error",
            description: `LocalScript "${script.name}" accesses DataStore — must be server-side`,
            suggestedFix: "Move DataStore access to a server Script",
          });
        }
      }
    }

    return violations;
  }

  private getResolutionOrder(graph: any): any[] {
    // Topological sort using Kahn's algorithm
    const inDegree = new Map<string, number>();
    for (const [nodeId] of graph.nodes) {
      inDegree.set(nodeId, 0);
    }
    for (const [nodeId, deps] of graph.adjacencyList) {
      for (const dep of deps) {
        inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    const order: any[] = [];
    let level = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push({ node: current, level, dependencies: graph.adjacencyList.get(current) || [], dependents: [] });
      for (const neighbor of graph.adjacencyList.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
      level++;
    }

    return order;
  }

  private findUnusedDependencies(graph: any): any[] {
    const unused: any[] = [];
    for (const [nodeId, deps] of graph.adjacencyList) {
      for (const dep of deps) {
        // Check if dependency is actually used (simplified: if never referenced in source)
        const reverseDeps = graph.reverseAdjacencyList.get(dep) || [];
        if (reverseDeps.length === 0) {
          unused.push({ from: nodeId, to: dep, reason: "Dependency has no reverse references" });
        }
      }
    }
    return unused;
  }

  private findMissingDependencies(graph: any): any[] {
    // Check for nodes that are referenced but don't exist
    const missing: any[] = [];
    for (const [nodeId, deps] of graph.adjacencyList) {
      for (const dep of deps) {
        if (!graph.nodes.has(dep)) {
          missing.push({ from: nodeId, expected: dep, reason: "Required module not found in project" });
        }
      }
    }
    return missing;
  }
}