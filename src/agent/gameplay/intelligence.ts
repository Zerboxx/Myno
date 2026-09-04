/**
 * P3.5 — Gameplay System Intelligence Engine
 *
 * Analyzes gameplay systems for architecture, dependencies, and design quality.
 * Different user requests produce proportionally different analysis.
 */

import type { ProjectMap } from "../project-map/types.js";

/**
 * Gameplay System Intelligence Engine
 * Analyzes gameplay systems for architecture, dependencies, and design quality
 */
export class GameplaySystemsEngine {
  /**
   * Analyze gameplay requirements from user request.
   * Proportional to task complexity — a simple kill line does NOT get a giant architecture.
   */
  async analyzeGameplaySystems(projectMap: any, userRequest?: string): Promise<any> {
    const scripts = projectMap.scripts || [];
    const remotes = projectMap.remotes || [];
    const instances = projectMap.instances || [];

    const systems = this.identifySystems(projectMap);
    const dependencies = this.analyzeDependencies(projectMap);
    const requirements = this.analyzeRequirements(userRequest || "", projectMap);

    return {
      systems,
      dependencies,
      requirements,
      recommendations: this.generateRecommendations(requirements, systems),
    };
  }

  private identifySystems(projectMap: any): any[] {
    const systems: any[] = [];
    const scripts = projectMap.scripts || [];
    const remotes = projectMap.remotes || [];

    // Detect existing systems from naming patterns
    const systemPatterns = [
      { pattern: /combat|fight|damage|health|kill/i, name: "combat", keywords: ["damage", "health", "attack"] },
      { pattern: /trade|shop|store|buy|sell|coin|money|currency/i, name: "economy", keywords: ["currency", "inventory", "trade"] },
      { pattern: /quest|mission|objective|task/i, name: "quest", keywords: ["quest", "objective", "reward"] },
      { pattern: /npc|enemy|mob|monster|ai/i, name: "npc", keywords: ["npc", "pathfinding", "ai"] },
      { pattern: /inventory|backpack|item|equip/i, name: "inventory", keywords: ["inventory", "items", "equipment"] },
      { pattern: /spawn|respawn|lobby/i, name: "spawning", keywords: ["spawn", "respawn"] },
    ];

    for (const sys of systemPatterns) {
      const matchingScripts = scripts.filter((s: any) => sys.pattern.test(s.name));
      const matchingRemotes = remotes.filter((r: any) => sys.pattern.test(r.name));
      if (matchingScripts.length > 0 || matchingRemotes.length > 0) {
        systems.push({
          name: sys.name,
          scripts: matchingScripts.map((s: any) => s.name),
          remotes: matchingRemotes.map((r: any) => r.name),
          maturity: (matchingScripts.length + matchingRemotes.length) > 3 ? "established" : "emerging",
        });
      }
    }

    return systems;
  }

  private analyzeDependencies(projectMap: any): any {
    const scripts = projectMap.scripts || [];
    const nodes = scripts.map((s: any) => ({ id: s.path || s.name, name: s.name, type: s.className }));
    // Simple dependency detection from source code requires
    const edges: any[] = [];
    for (const script of scripts) {
      const source = script.source || "";
      const requires = source.match(/require\(([^\)]+)\)/g) || [];
      for (const req of requires) {
        const match = req.match(/require\(([^\)]+)\)/);
        if (match) {
          edges.push({ from: script.path || script.name, to: match[1], type: "require" });
        }
      }
    }
    return { nodes, edges, circular: [], criticalPath: [] };
  }

  private analyzeRequirements(userRequest: string, projectMap: any): any {
    const lower = userRequest.toLowerCase();
    const requirements: any[] = [];

    // Detect what systems the user request implies
    if (/trad(e|ing)|shop|store|buy|sell|coin|money|currency|economy/.test(lower)) {
      requirements.push(
        { type: "inventory", required: true, reason: "Trading requires item management" },
        { type: "currency", required: true, reason: "Trading requires currency system" },
        { type: "server-authority", required: true, reason: "Economy must be server-authoritative" },
        { type: "validation", required: true, reason: "Trade requests must be validated" },
        { type: "ui", required: true, reason: "Trading requires UI" },
        { type: "networking", required: true, reason: "Trading requires remotes" },
      );
      if (/persistent|save|load/.test(lower)) {
        requirements.push({ type: "persistence", required: true, reason: "User requested persistence" });
      }
    } else if (/kill|damage|health|combat|fight|weapon|sword/.test(lower)) {
      requirements.push(
        { type: "server-authority", required: true, reason: "Damage must be server-authoritative" },
        { type: "health-system", required: true, reason: "Combat requires health tracking" },
      );
      if (!/simple|basic|line/.test(lower)) {
        requirements.push({ type: "cooldown", required: true, reason: "Combat needs cooldowns" });
      }
    } else if (/npc|enemy|mob|chase|patrol|ai/.test(lower)) {
      requirements.push(
        { type: "pathfinding", required: /chase|patrol|wander|follow/.test(lower), reason: "NPC movement requires pathfinding" },
        { type: "state-machine", required: true, reason: "NPCs need behavior states" },
        { type: "target-selection", required: /chase|attack|follow/.test(lower), reason: "NPC needs target selection" },
      );
    } else if (/quest|mission|objective/.test(lower)) {
      requirements.push(
        { type: "quest-state", required: true, reason: "Quests need state tracking" },
        { type: "progress-tracking", required: true, reason: "Quests need progress" },
        { type: "reward-system", required: true, reason: "Quests give rewards" },
        { type: "ui", required: true, reason: "Quests need UI display" },
      );
    } else if (/ui|interface|menu|screen|button|gui/.test(lower)) {
      requirements.push(
        { type: "ui", required: true, reason: "UI task" },
        { type: "responsive", required: /mobile|responsive|phone/.test(lower), reason: "Responsive design requested" },
      );
    } else if (/red.*line|kill.*line|touch.*die|touched/.test(lower)) {
      // Simple task — minimal requirements
      requirements.push(
        { type: "server-authority", required: true, reason: "Kill logic must be server-side" },
      );
    } else if (/build|create|make|design/.test(lower)) {
      requirements.push(
        { type: "placement", required: true, reason: "Building requires placement intelligence" },
      );
    }

    return requirements;
  }

  private generateRecommendations(requirements: any[], systems: any[]): any[] {
    const recs: any[] = [];
    const existingSystemNames = systems.map(s => s.name);

    for (const req of requirements) {
      if (req.required && !existingSystemNames.includes(req.type)) {
        recs.push({ priority: "high", description: `Need to create ${req.type} system: ${req.reason}`, category: req.type });
      }
    }

    return recs;
  }
}

export function createGameplaySystemsEngine(): GameplaySystemsEngine {
  return new GameplaySystemsEngine();
}