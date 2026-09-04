/**
 * P3.5 — Placement Intelligence Types
 *
 * Types for Roblox service/container placement intelligence.
 */

import type { ProjectMap, InstanceSnapshot, ScriptSnapshot, ModuleSnapshot } from "../project-map/types.js";

/** Placement analysis result */
export interface PlacementAnalysis {
  /** Instance placements */
  instances: InstancePlacement[];
  /** Script placements */
  scripts: ScriptPlacement[];
  /** Module placements */
  modules: ModulePlacement[];
  /** UI placements */
  ui: UIPlacement[];
  /** Misplaced items */
  misplaced: MisplacedItem[];
  /** Recommendations */
  recommendations: PlacementRecommendation[];
}

/** Instance placement */
export interface InstancePlacement {
  instance: InstanceSnapshot;
  currentContainer: string;
  recommendedContainer: string;
  reason: string;
  confidence: number;
  rule: PlacementRule;
}

/** Script placement */
export interface ScriptPlacement {
  script: ScriptSnapshot;
  currentContainer: string;
  recommendedContainer: string;
  reason: string;
  confidence: number;
  runContext: "Server" | "Client" | "Shared";
  rule: PlacementRule;
}

/** Module placement */
export interface ModulePlacement {
  module: ModuleSnapshot;
  currentContainer: string;
  recommendedContainer: string;
  reason: string;
  confidence: number;
  rule: PlacementRule;
}

/** UI placement */
export interface UIPlacement {
  ui: any;
  currentContainer: string;
  recommendedContainer: string;
  reason: string;
  confidence: number;
  rule: PlacementRule;
}

/** Misplaced item */
export interface MisplacedItem {
  id: string;
  type: "instance" | "script" | "module" | "ui" | "remote" | "asset";
  name: string;
  currentPath: string;
  currentContainer: string;
  recommendedContainer: string;
  reason: string;
  severity: "error" | "warning" | "info";
  fix: PlacementFix;
}

/** Placement fix */
export interface PlacementFix {
  action: "move" | "create" | "delete" | "reparent";
  targetContainer: string;
  steps: string[];
  automated: boolean;
}

/** Placement rule */
export interface PlacementRule {
  id: string;
  name: string;
  description: string;
  appliesTo: string[]; // class names or patterns
  condition: PlacementCondition;
  action: PlacementAction;
  priority: number;
  category: "service" | "script" | "module" | "ui" | "instance" | "remote" | "asset";
  tags: string[];
}

/** Placement condition */
export interface PlacementCondition {
  classNames?: string[];
  namePatterns?: string[];
  propertyConstraints?: Record<string, any>;
  parentConstraints?: string[];
  customCheck?: (instance: any, projectMap: any) => boolean;
}

/** Placement action */
export interface PlacementAction {
  action: "move" | "create" | "reparent" | "recommend";
  targetContainer: string;
  targetPath?: string;
  reason: string;
}

/** Placement recommendation */
export interface PlacementRecommendation {
  id: string;
  type: "move" | "create" | "reparent" | "delete" | "reorganize";
  target: string;
  currentLocation: string;
  recommendedLocation: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  automated: boolean;
  steps: PlacementStep[];
  validation: ValidationStep[];
}

/** Placement step */
export interface PlacementStep {
  order: number;
  action: "move" | "create" | "reparent" | "configure" | "verify";
  target: string;
  details: string;
  validation: string;
}

/** Validation step */
export interface ValidationStep {
  check: string;
  method: "inspect" | "verify" | "test";
  expected: string;
}

/** Placement rule registry */
export interface PlacementRuleRegistry {
  rules: Map<string, PlacementRule>;
  register(rule: PlacementRule): void;
  unregister(id: string): void;
  getRulesForType(type: string): PlacementRule[];
  getAllRules(): PlacementRule[];
}

/** Default Roblox placement rules */
export const DEFAULT_PLACEMENT_RULES: PlacementRule[] = [
  // ServerScriptService rules
  {
    id: "server-script-service-scripts",
    name: "Server Scripts in ServerScriptService",
    description: "Server-side scripts must be in ServerScriptService",
    appliesTo: ["Script"],
    condition: {
      classNames: ["Script"],
      propertyConstraints: { RunContext: "Server" },
    },
    action: {
      action: "move",
      targetContainer: "ServerScriptService",
      reason: "Server scripts must run in ServerScriptService for server authority",
    },
    priority: 100,
    category: "script",
    tags: ["server", "authority", "security"],
  },
  {
    id: "server-script-service-folders",
    name: "Organized Folders in ServerScriptService",
    description: "Scripts in ServerScriptService should be organized into Systems, Handlers, etc.",
    appliesTo: ["Script"],
    condition: {
      parentConstraints: ["ServerScriptService"],
    },
    action: {
      action: "recommend",
      targetContainer: "ServerScriptService.Systems",
      reason: "Organize scripts into Systems/Handlers for maintainability",
    },
    priority: 50,
    category: "script",
    tags: ["organization", "maintainability"],
  },

  // ReplicatedStorage rules
  {
    id: "replicated-storage-shared",
    name: "Shared Modules in ReplicatedStorage",
    description: "Shared ModuleScripts must be in ReplicatedStorage",
    appliesTo: ["ModuleScript"],
    condition: {
      classNames: ["ModuleScript"],
      propertyConstraints: { RunContext: "Client" },
    },
    action: {
      action: "move",
      targetContainer: "ReplicatedStorage",
      reason: "Client-accessible modules must be in ReplicatedStorage",
    },
    priority: 100,
    category: "module",
    tags: ["replication", "client-access"],
  },
  {
    id: "replicated-storage-remotes",
    name: "Remotes in ReplicatedStorage",
    description: "RemoteEvents and RemoteFunctions must be in ReplicatedStorage",
    appliesTo: ["RemoteEvent", "RemoteFunction"],
    condition: {
      classNames: ["RemoteEvent", "RemoteFunction"],
    },
    action: {
      action: "move",
      targetContainer: "ReplicatedStorage.Remotes",
      reason: "Remotes must be accessible to both client and server",
    },
    priority: 100,
    category: "remote",
    tags: ["networking", "replication"],
  },

  // ServerStorage rules
  {
    id: "server-storage-assets",
    name: "Server-Only Assets in ServerStorage",
    description: "Server-only assets (models, sounds, etc.) belong in ServerStorage",
    appliesTo: ["Model", "Sound", "Animation", "MeshPart"],
    condition: {
      propertyConstraints: { Archived: true },
    },
    action: {
      action: "move",
      targetContainer: "ServerStorage",
      reason: "Server-only assets should not replicate to clients",
    },
    priority: 80,
    category: "asset",
    tags: ["security", "replication"],
  },

  // StarterGui rules
  {
    id: "starter-gui-screen-guis",
    name: "ScreenGuis in StarterGui",
    description: "ScreenGuis must be in StarterGui to replicate to players",
    appliesTo: ["ScreenGui"],
    condition: {
      classNames: ["ScreenGui"],
    },
    action: {
      action: "move",
      targetContainer: "StarterGui",
      reason: "ScreenGuis in StarterGui automatically replicate to PlayerGui",
    },
    priority: 100,
    category: "ui",
    tags: ["replication", "ui"],
  },
  {
    id: "starter-gui-local-scripts",
    name: "LocalScripts in StarterGui",
    description: "LocalScripts for UI belong in StarterGui or StarterPlayerScripts",
    appliesTo: ["LocalScript"],
    condition: {
      classNames: ["LocalScript"],
      parentConstraints: ["StarterGui", "StarterPlayerScripts"],
    },
    action: {
      action: "move",
      targetContainer: "StarterGui",
      reason: "Client-side UI logic runs in StarterGui/StarterPlayerScripts",
    },
    priority: 90,
    category: "script",
    tags: ["client", "ui"],
  },

  // StarterPlayerScripts rules
  {
    id: "starter-player-scripts-client",
    name: "Client Scripts in StarterPlayerScripts",
    description: "Client-side logic modules belong in StarterPlayerScripts",
    appliesTo: ["ModuleScript", "LocalScript"],
    condition: {
      classNames: ["ModuleScript", "LocalScript"],
      propertyConstraints: { RunContext: "Client" },
    },
    action: {
      action: "move",
      targetContainer: "StarterPlayerScripts",
      reason: "Client modules load via StarterPlayerScripts",
    },
    priority: 90,
    category: "module",
    tags: ["client", "replication"],
  },

  // ServerStorage for server-only scripts
  {
    id: "server-storage-server-scripts",
    name: "Server-Only Scripts in ServerStorage",
    description: "Scripts that should never replicate go in ServerStorage",
    appliesTo: ["Script"],
    condition: {
      classNames: ["Script"],
      propertyConstraints: { RunContext: "Server" },
      customCheck: (instance: any) => {
        // Check if script contains server-only logic
        return instance.Source?.includes("ServerStorage") || 
               instance.Source?.includes("DataStoreService") ||
               instance.Source?.includes("ServerScriptService");
      },
    },
    action: {
      action: "move",
      targetContainer: "ServerStorage",
      reason: "Server-only logic should not replicate to clients",
    },
    priority: 90,
    category: "script",
    tags: ["security", "server-authority"],
  },

  // Lighting
  {
    id: "lighting-properties",
    name: "Lighting Properties in Lighting Service",
    description: "Lighting properties belong in Lighting service",
    appliesTo: ["Atmosphere", "Sky", "BloomEffect", "SunRaysEffect", "ColorCorrectionEffect"],
    condition: {
      classNames: ["Atmosphere", "Sky", "BloomEffect", "SunRaysEffect", "ColorCorrectionEffect"],
    },
    action: {
      action: "move",
      targetContainer: "Lighting",
      reason: "Lighting effects must be in Lighting service to take effect",
    },
    priority: 100,
    category: "instance",
    tags: ["lighting", "rendering"],
  },

  // Teams
  {
    id: "teams-in-teams-service",
    name: "Teams in Teams Service",
    description: "Team objects belong in Teams service",
    appliesTo: ["Team"],
    condition: {
      classNames: ["Team"],
    },
    action: {
      action: "move",
      targetContainer: "Teams",
      reason: "Teams must be in Teams service for proper team assignment",
    },
    priority: 100,
    category: "instance",
    tags: ["teams", "multiplayer"],
  },

  // SoundService
  {
    id: "sound-service-sounds",
    name: "Global Sounds in SoundService",
    description: "Global sounds belong in SoundService",
    appliesTo: ["Sound"],
    condition: {
      classNames: ["Sound"],
      propertyConstraints: { SoundId: { $exists: true } },
      customCheck: (instance: any) => {
        return instance.Parent?.Name === "SoundService" || 
               instance.Name?.includes("Global") ||
               instance.Name?.includes("Ambient");
      },
    },
    action: {
      action: "move",
      targetContainer: "SoundService",
      reason: "Global sounds play from SoundService",
    },
    priority: 70,
    category: "asset",
    tags: ["audio", "ambience"],
  },

  // ReplicatedFirst
  {
    id: "replicated-first-loading",
    name: "Loading Assets in ReplicatedFirst",
    description: "Loading screen assets go in ReplicatedFirst",
    appliesTo: ["LocalScript", "ScreenGui", "Model", "Folder"],
    condition: {
      classNames: ["LocalScript", "ScreenGui", "Model", "Folder"],
      customCheck: (instance: any) => {
        return instance.Name?.includes("Loading") ||
               instance.Name?.includes("LoadingScreen") ||
               instance.Name?.includes("Splash");
      },
    },
    action: {
      action: "move",
      targetContainer: "ReplicatedFirst",
      reason: "ReplicatedFirst content loads before everything else",
    },
    priority: 80,
    category: "instance",
    tags: ["loading", "first-replication"],
  },
];

/** Placement analyzer engine */
export class PlacementAnalyzer {
  private readonly rules: PlacementRule[];
  private readonly logger: any;

  constructor(customRules: PlacementRule[] = []) {
    this.rules = [...DEFAULT_PLACEMENT_RULES, ...customRules];
    this.logger = console;
  }

  /**
   * Analyze all placements in the project
   */
  async analyze(projectMap: any): Promise<any> {
    const instances = this.analyzeInstances(projectMap);
    const scripts = this.analyzeScripts(projectMap);
    const modules = this.analyzeModules(projectMap);
    const ui = this.analyzeUI(projectMap);
    const remotes = this.analyzeRemotes(projectMap);

    const misplaced = [
      ...instances.misplaced,
      ...scripts.misplaced,
      ...modules.misplaced,
      ...ui.misplaced,
      ...remotes.misplaced,
    ];

    const recommendations = this.generateRecommendations(
      instances.placements,
      scripts.placements,
      modules.placements,
      ui.placements,
    );

    return {
      instances: instances.placements,
      scripts: scripts.placements,
      modules: modules.placements,
      ui: ui.placements,
      misplaced: misplaced,
      recommendations,
    };
  }

  private analyzeInstances(projectMap: any): { placements: any[]; misplaced: any[] } {
    const placements: any[] = [];
    const misplaced: any[] = [];

    for (const instance of projectMap.instances || []) {
      const placement = this.evaluatePlacement(instance, "instance");
      if (placement) {
        if (placement.currentContainer !== placement.recommendedContainer) {
          misplaced.push({
            id: instance.path,
            type: "instance",
            name: instance.name,
            currentPath: instance.path,
            currentContainer: placement.currentContainer,
            recommendedContainer: placement.recommendedContainer,
            reason: placement.reason,
            severity: "warning",
            fix: {
              action: "move",
              targetContainer: placement.recommendedContainer,
              steps: [`Move ${instance.name} to ${placement.recommendedContainer}`],
              automated: true,
            },
          });
        }
        placements.push(placement);
      }
    }

    return { placements, misplaced };
  }

  private analyzeScripts(projectMap: any): { placements: any[]; misplaced: any[] } {
    const placements: any[] = [];
    const misplaced: any[] = [];

    for (const script of projectMap.scripts || []) {
      const placement = this.evaluateScriptPlacement(script);
      if (placement) {
        if (placement.currentContainer !== placement.recommendedContainer) {
          misplaced.push({
            id: script.path,
            type: "script",
            name: script.name,
            currentPath: script.path,
            currentContainer: placement.currentContainer,
            recommendedContainer: placement.recommendedContainer,
            reason: placement.reason,
            severity: "warning",
            fix: {
              action: "move",
              targetContainer: placement.recommendedContainer,
              steps: [`Move ${script.name} to ${placement.recommendedContainer}`],
              automated: true,
            },
          });
        }
        placements.push(placement);
      }
    }

    return { placements, misplaced };
  }

  private analyzeModules(projectMap: any): { placements: any[]; misplaced: any[] } {
    const placements: any[] = [];
    const misplaced: any[] = [];

    for (const module of projectMap.modules || []) {
      const placement = this.evaluateModulePlacement(module);
      if (placement) {
        if (placement.currentContainer !== placement.recommendedContainer) {
          misplaced.push({
            id: module.path,
            type: "module",
            name: module.name,
            currentPath: module.path,
            currentContainer: placement.currentContainer,
            recommendedContainer: placement.recommendedContainer,
            reason: placement.reason,
            severity: "warning",
            fix: {
              action: "move",
              targetContainer: placement.recommendedContainer,
              steps: [`Move ${module.name} to ${placement.recommendedContainer}`],
              automated: true,
            },
          });
        }
        placements.push(placement);
      }
    }

    return { placements, misplaced };
  }

  private analyzeUI(projectMap: any): { placements: any[]; misplaced: any[] } {
    const placements: any[] = [];
    const misplaced: any[] = [];

    for (const ui of projectMap.uiHierarchy?.screenGuis || []) {
      const placement = this.evaluateUIPlacement(ui);
      if (placement) {
        if (placement.currentContainer !== placement.recommendedContainer) {
          misplaced.push({
            id: ui.path,
            type: "ui",
            name: ui.name,
            currentPath: ui.path,
            currentContainer: placement.currentContainer,
            recommendedContainer: placement.recommendedContainer,
            reason: placement.reason,
            severity: "warning",
            fix: {
              action: "move",
              targetContainer: placement.recommendedContainer,
              steps: [`Move ${ui.name} to ${placement.recommendedContainer}`],
              automated: true,
            },
          });
        }
        placements.push(placement);
      }
    }

    return { placements, misplaced };
  }

  private analyzeRemotes(projectMap: any): { placements: any[]; misplaced: any[] } {
    const placements: any[] = [];
    const misplaced: any[] = [];

    const remotes = projectMap.remotes || [];
    for (const remote of remotes) {
      const name = remote.name || "";
      const parentPath = remote.parentPath || "";

      // Remotes should be in ReplicatedStorage (client-accessible) or ServerScriptService (server-only)
      const isReplicatedStorage = parentPath.includes("ReplicatedStorage");
      const isServerOnly = parentPath.includes("ServerScriptService") || parentPath.includes("ServerStorage");

      // Determine expected location based on name patterns
      let expectedLocation = "ReplicatedStorage";
      let reason = "RemoteEvents are typically in ReplicatedStorage for client access";

      if (name.includes("Server") || name.includes("Internal")) {
        expectedLocation = "ServerScriptService";
        reason = "Server-only remotes should be in ServerScriptService";
      }

      // Check if correctly placed: must be in the EXPECTED location
      const isCorrectlyPlaced = expectedLocation === "ReplicatedStorage"
        ? isReplicatedStorage
        : isServerOnly;

      placements.push({
        remote,
        currentLocation: parentPath,
        recommendedLocation: expectedLocation,
        isCorrectlyPlaced,
        reason: isCorrectlyPlaced ? "Correctly placed" : reason,
      });

      if (!isCorrectlyPlaced) {
        misplaced.push({
          name,
          currentLocation: parentPath,
          recommendedLocation: expectedLocation,
          reason,
        });
      }
    }

    return { placements, misplaced };
  }

  private evaluatePlacement(instance: any, type: string): any {
    // Match against rules
    for (const rule of DEFAULT_PLACEMENT_RULES) {
      if (rule.appliesTo.includes("instance") || rule.appliesTo.includes("*")) {
        if (this.matchesCondition(instance, rule.condition)) {
          return {
            instance: instance,
            currentContainer: instance.parentPath || "Unknown",
            recommendedContainer: rule.action.targetContainer,
            reason: rule.action.reason,
            confidence: 0.9,
            rule: rule,
          };
        }
      }
    }
    return null;
  }

  private evaluateScriptPlacement(script: any): any {
    for (const rule of DEFAULT_PLACEMENT_RULES) {
      if (rule.appliesTo.includes("script") || rule.appliesTo.includes("*") || rule.appliesTo.includes(script.className)) {
        if (this.matchesCondition(script, rule.condition)) {
          return {
            script: script,
            currentContainer: script.parentPath || "Unknown",
            recommendedContainer: rule.action.targetContainer,
            reason: rule.action.reason,
            confidence: 0.9,
            runContext: script.RunContext || "Server",
            rule: rule,
          };
        }
      }
    }
    return null;
  }

  private evaluateModulePlacement(module: any): any {
    for (const rule of DEFAULT_PLACEMENT_RULES) {
      if (rule.appliesTo.includes("module") || rule.appliesTo.includes("*") || rule.appliesTo.includes(module.className)) {
        if (this.matchesCondition(module, rule.condition)) {
          return {
            module: module,
            currentContainer: module.parentPath || "Unknown",
            recommendedContainer: rule.action.targetContainer,
            reason: rule.action.reason,
            confidence: 0.9,
            rule: rule,
          };
        }
      }
    }
    return null;
  }

  private evaluateUIPlacement(ui: any): any {
    for (const rule of DEFAULT_PLACEMENT_RULES) {
      if (rule.appliesTo.includes("ui") || rule.appliesTo.includes("*") || rule.appliesTo.includes(ui.className)) {
        if (this.matchesCondition(ui, rule.condition)) {
          return {
            ui: ui,
            currentContainer: ui.parentPath || "Unknown",
            recommendedContainer: rule.action.targetContainer,
            reason: rule.action.reason,
            confidence: 0.9,
            rule: rule,
          };
        }
      }
    }
    return null;
  }

  private matchesCondition(instance: any, condition: any): boolean {
    if (!condition) return true;

    // Check class names
    if (condition.classNames && !condition.classNames.includes(instance.className)) {
      return false;
    }

    // Check property constraints
    if (condition.propertyConstraints) {
      for (const [key, expected] of Object.entries(condition.propertyConstraints)) {
        const actual = instance.properties?.[key];
        if (typeof expected === "object" && expected !== null && "$exists" in expected) {
          if (!instance.properties?.[key]) return false;
        } else if (actual !== expected) {
          return false;
        }
      }
    }

    // Check parent constraints
    if (condition.parentConstraints) {
      const parent = instance.parentPath;
      if (!parent || !condition.parentConstraints.some((p: string) => parent?.includes(p))) {
        return false;
      }
    }

    // Custom check
    if (condition.customCheck && !condition.customCheck({ properties: {}, Parent: { Name: "" } })) {
      return false;
    }

    return true;
  }

  private generateRecommendations(
    instancePlacements: any[],
    scriptPlacements: any[],
    modulePlacements: any[],
    uiPlacements: any[]
  ): any[] {
    const recommendations: any[] = [];

    // Collect all misplaced items
    const allPlacements = [...instancePlacements, ...scriptPlacements, ...modulePlacements, ...uiPlacements];

    for (const placement of allPlacements) {
      if (placement.currentContainer !== placement.recommendedContainer) {
        recommendations.push({
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "move",
          target: placement.instance?.name || placement.script?.name || placement.module?.name || placement.ui?.name,
          currentLocation: placement.currentContainer,
          recommendedLocation: placement.recommendedContainer,
          reason: placement.reason,
          priority: "high",
          effort: "low",
          automated: true,
          steps: [
            { order: 1, action: "move", target: placement.instance?.name || placement.script?.name || placement.module?.name, details: `Move to ${placement.recommendedContainer}`, validation: "Verify in Studio Explorer" },
          ],
          validation: [{ check: "Verify new parent", method: "inspect", expected: placement.recommendedContainer }],
        });
      }
    }

    return recommendations;
  }
}

/**
 * Creates a placement analyzer with default rules
 */
export function createPlacementAnalyzer(customRules: any[] = []): PlacementAnalyzer {
  return new PlacementAnalyzer(customRules);
}

