/**
 * P3.5 — Performance Intelligence Engine
 *
 * Analyzes project for performance bottlenecks, optimization opportunities,
 * and resource usage patterns. All scores derived from actual project data.
 */

import type {
  ProjectMap,
  InstanceSnapshot,
  ScriptSnapshot,
} from "../project-map/types.js";

/**
 * Performance Intelligence Engine
 * Analyzes project for performance bottlenecks and optimization opportunities
 */
export class PerformanceIntelligenceEngine {
  async analyzePerformance(projectMap: any): Promise<any> {
    const instances = projectMap.instances || [];
    const scripts = projectMap.scripts || [];
    const remotes = projectMap.remotes || [];
    const worldParts = projectMap.world?.parts || [];

    const instanceAnalysis = this.analyzeInstances(projectMap);
    const scriptAnalysis = this.analyzeScripts(projectMap);
    const networkAnalysis = this.analyzeNetwork(projectMap);
    const renderingAnalysis = this.analyzeRendering(projectMap);
    const physicsAnalysis = this.analyzePhysics(projectMap);

    const opportunities = this.identifyOpportunities(
      instanceAnalysis, scriptAnalysis, networkAnalysis, renderingAnalysis, physicsAnalysis
    );

    const score = this.calculateOverallScore(instanceAnalysis, scriptAnalysis, networkAnalysis, renderingAnalysis, physicsAnalysis);

    return {
      score,
      instances: instanceAnalysis,
      scripts: scriptAnalysis,
      network: networkAnalysis,
      rendering: renderingAnalysis,
      physics: physicsAnalysis,
      opportunities,
      recommendations: this.generateRecommendations(opportunities),
    };
  }

  private analyzeInstances(projectMap: any): any {
    const instances = projectMap.instances || [];
    const worldParts = projectMap.world?.parts || [];
    const partCount = worldParts.length + instances.filter((i: any) => i.className === "Part").length;
    const modelCount = instances.filter((i: any) => i.className === "Model").length;
    const scriptCount = projectMap.scripts?.length || 0;

    const issues: any[] = [];
    if (partCount > 10000) {
      issues.push({ severity: "high", description: `${partCount} parts — consider merging or using terrain`, category: "instance-count" });
    } else if (partCount > 5000) {
      issues.push({ severity: "medium", description: `${partCount} parts — monitor for performance`, category: "instance-count" });
    }

    // Check for unanchored parts in world
    const unanchoredParts = worldParts.filter((p: any) => p.anchored === false);
    if (unanchoredParts.length > 50) {
      issues.push({ severity: "high", description: `${unanchoredParts.length} unanchored parts — physics overhead`, category: "anchoring" });
    }

    // Check for scripts count
    if (scriptCount > 100) {
      issues.push({ severity: "medium", description: `${scriptCount} scripts — consider module consolidation`, category: "script-count" });
    }

    const score = Math.max(0, Math.min(100,
      90 - (partCount > 10000 ? 30 : partCount > 5000 ? 15 : 0)
        - (unanchoredParts.length > 50 ? 20 : 0)
        - (scriptCount > 100 ? 10 : 0)
    ));

    return { partCount, modelCount, scriptCount, issues, score };
  }

  private analyzeScripts(projectMap: any): any {
    const scripts = projectMap.scripts || [];
    const totalLines = scripts.reduce((sum: number, s: any) => sum + (s.source?.split("\n").length || 0), 0);

    const issues: any[] = [];

    // Check for scripts with potential performance issues
    for (const script of scripts) {
      const source = script.source || "";
      if (source.includes("while true") && !source.includes("task.wait") && !source.includes("wait(")) {
        issues.push({ severity: "high", description: `Script "${script.name}" has tight loop without yield`, location: script.path, category: "tight-loop" });
      }
      if (source.includes("game:GetService") && source.split("game:GetService").length > 5) {
        issues.push({ severity: "low", description: `Script "${script.name}" has repeated GetService calls — cache the result`, location: script.path, category: "repeated-lookup" });
      }
    }

    const score = Math.max(0, Math.min(100,
      85 - issues.filter((i: any) => i.severity === "high").length * 15
        - issues.filter((i: any) => i.severity === "medium").length * 5
    ));

    return { scriptCount: scripts.length, totalLines, issues, score };
  }

  private analyzeNetwork(projectMap: any): any {
    const remotes = projectMap.remotes || [];
    const remoteEvents = remotes.filter((r: any) => r.className === "RemoteEvent").length;
    const remoteFunctions = remotes.filter((r: any) => r.className === "RemoteFunction").length;

    const issues: any[] = [];
    if (remoteEvents + remoteFunctions > 50) {
      issues.push({ severity: "medium", description: `${remoteEvents + remoteFunctions} remotes — consider batching or multiplexing`, category: "remote-count" });
    }
    if (remoteFunctions > 10) {
      issues.push({ severity: "medium", description: `${remoteFunctions} RemoteFunctions — prefer RemoteEvents for non-blocking`, category: "remote-function" });
    }

    const score = Math.max(0, Math.min(100,
      90 - (remoteFunctions > 10 ? 15 : 0) - ((remoteEvents + remoteFunctions) > 50 ? 10 : 0)
    ));

    return { remoteEvents, remoteFunctions, issues, score };
  }

  private analyzeRendering(projectMap: any): any {
    const instances = projectMap.instances || [];
    const worldParts = projectMap.world?.parts || [];
    const partCount = worldParts.length + instances.filter((i: any) => i.className === "Part").length;

    // Estimate triangle count (rough: 12 tris per Part)
    const estimatedTriangles = partCount * 12;

    const issues: any[] = [];
    if (estimatedTriangles > 500000) {
      issues.push({ severity: "high", description: `~${estimatedTriangles} estimated triangles — consider LOD or mesh optimization`, category: "triangle-count" });
    }

    // Check for transparency/overdraw
    const transparentParts = worldParts.filter((p: any) => p.properties?.Transparency > 0);
    if (transparentParts.length > 100) {
      issues.push({ severity: "medium", description: `${transparentParts.length} transparent parts — potential overdraw`, category: "overdraw" });
    }

    const score = Math.max(0, Math.min(100,
      90 - (estimatedTriangles > 500000 ? 25 : 0) - (transparentParts.length > 100 ? 10 : 0)
    ));

    return { partCount, estimatedTriangles, issues, score };
  }

  private analyzePhysics(projectMap: any): any {
    const worldParts = projectMap.world?.parts || [];
    const unanchoredParts = worldParts.filter((p: any) => p.anchored === false);

    const issues: any[] = [];
    if (unanchoredParts.length > 20) {
      issues.push({ severity: "high", description: `${unanchoredParts.length} unanchored parts participate in physics simulation`, category: "physics-cost" });
    }

    const score = Math.max(0, Math.min(100,
      85 - (unanchoredParts.length > 20 ? 20 : unanchoredParts.length > 10 ? 10 : 0)
    ));

    return { unanchoredParts: unanchoredParts.length, issues, score };
  }

  private identifyOpportunities(
    instances: any, scripts: any, network: any, rendering: any, physics: any
  ): any[] {
    const opps: any[] = [];
    for (const analysis of [instances, scripts, network, rendering, physics]) {
      for (const issue of analysis.issues || []) {
        if (issue.severity === "high") {
          opps.push({ priority: "high", description: issue.description, category: issue.category });
        }
      }
    }
    return opps;
  }

  private calculateOverallScore(instances: any, scripts: any, network: any, rendering: any, physics: any): number {
    const scores = [instances.score, scripts.score, network.score, rendering.score, physics.score];
    return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  }

  private generateRecommendations(opportunities: any[]): any[] {
    return opportunities.map(o => ({ priority: o.priority, description: o.description, category: o.category }));
  }
}

export function createPerformanceIntelligence(): PerformanceIntelligenceEngine {
  return new PerformanceIntelligenceEngine();
}