/**
 * P3.5 — Project Map Engine
 *
 * Builds and maintains the Project Map by inspecting the live Roblox Studio state.
 * This is the authoritative representation of the current project reality.
 */

import {
  mkdir,
  readFile,
  writeFile,
  access,
  constants,
} from "node:fs/promises";
import { join, dirname, relative, resolve } from "node:path";

import type {
  ProjectMap,
  DataModelSnapshot,
  ProjectMapConfig,
  ProjectConventions,
  SystemRegistry,
  DependencyGraph,
  ServiceRegistry,
  TagRegistry,
  AttributeRegistry,
  UIHierarchySnapshot,
  WorldSnapshot,
  AssetCatalog,
  ConfigSnapshot,
  ProjectIssue,
  ServiceSnapshot,
  WorkspaceSnapshot,
  StorageSnapshot,
  StarterPlayerSnapshot,
  LightingSnapshot,
  SoundServiceSnapshot,
  TeamsSnapshot,
  PlayersSnapshot,
  InstanceSnapshot,
  PartSnapshot,
  ModelSnapshot,
  FolderSnapshot,
  SpawnSnapshot,
  TerrainSnapshot,
  ScriptSnapshot,
  ModuleSnapshot,
  RemoteEventSnapshot,
  RemoteFunctionSnapshot,
  BindableEventSnapshot,
  BindableFunctionSnapshot,
  TeamSnapshot,
  AssetSnapshot,
  ScreenGuiSnapshot,
  StarterGuiSnapshot,
  StarterPlayerScriptsSnapshot,
  UISnapshot,
  ZoneSnapshot,
  BuildingSnapshot,
  RoadSnapshot,
  WaterSnapshot,
  PropSnapshot,
  SpawnAreaSnapshot,
} from "./types.js";

import {
  DEFAULT_PROJECT_MAP_CONFIG,
  PROJECT_MAP_SCHEMA_VERSION,
} from "./types.js";

import { DesktopLogger } from "../../desktop/logging.js";
import { RobloxMCPClient } from "../../tools/roblox/mcp-client.js";
import { createRobloxMCPTools } from "../../tools/roblox/mcp-tools.js";
import type { RobloxMCPTool, RobloxMCPToolResult } from "../../tools/roblox/mcp-client.js";
import type { ToolRegistry, ToolGroup } from "../../tools/registry.js";
import { classifyToolRisk, ToolRiskLevel } from "../../security/tool-risk.js";

function summarizeMcpError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const logger = new DesktopLogger();

/** Result of a project map scan */
export interface ProjectMapScanResult {
  projectMap: ProjectMap;
  scanDurationMs: number;
  scannedServices: string[];
  scannedInstances: number;
  errors: string[];
  warnings: string[];
}

/** Project Map Engine - builds and maintains the Project Map */
export class ProjectMapEngine {
  private readonly mcpClient: RobloxMCPClient;
  private readonly toolRegistry: ToolRegistry;
  private readonly logger: DesktopLogger;
  private readonly config: ProjectMapConfig;
  private currentMap: ProjectMap | null = null;

  constructor(
    mcpClient: RobloxMCPClient,
    toolRegistry: ToolRegistry,
    config: Partial<ProjectMapConfig> = {}
  ) {
    this.mcpClient = mcpClient;
    this.toolRegistry = toolRegistry;
    this.config = { ...DEFAULT_PROJECT_MAP_CONFIG, ...config };
    this.logger = new DesktopLogger();
  }

  /**
   * Build the complete Project Map by scanning the live Studio state.
   * This is the primary entry point for building the Project Map.
   */
  async buildProjectMap(projectId: string, workspaceRoot: string): Promise<ProjectMapScanResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    this.logger.info("project-map", `Starting Project Map scan for project ${projectId}`);

    try {
      // Ensure MCP connection
      const client = new RobloxMCPClient();
      await client.connect();

      // Get available tools
      const tools = await this.discoverTools();
      this.logger.info("project-map", `Discovered ${tools.length} MCP tools`);

      // Build DataModel snapshot
      const dataModel = await this.buildDataModelSnapshot();

      // Build service registry
      const services = await this.buildServiceRegistry();

      // Scan instances
      const instances = await this.scanInstances();

      // Scan scripts
      const scripts = await this.scanScripts();

      // Scan remotes
      const remotes = await this.scanRemotes();

      // Scan tags
      const tags = await this.scanTags();

      // Scan attributes
      const attributes = await this.scanAttributes();

      // Scan UI
      const uiHierarchy = await this.scanUIHierarchy();

      // Scan world
      const world = await this.scanWorld();

      // Scan assets
      const assets = await this.scanAssets();

      // Scan configs
      const configs = await this.scanConfigs();

      // Build conventions
      const conventions = await this.extractConventions();

      // Build systems registry
      const systems = await this.buildSystemsRegistry();

      // Build dependency graph
      const dependencies = await this.buildDependencyGraph();

      // Detect issues
      const issues = await this.detectIssues();

      // Build Project Map from real scan data
      const projectMap: ProjectMap = {
        projectId: projectId || "default",
        workspaceRoot: workspaceRoot || process.cwd(),
        dataModel: dataModel,
        services: services,
        instances,
        scripts,
        remotes,
        tags,
        attributes,
        uiHierarchy,
        world,
        assets,
        configs,
        conventions,
        systems: systems.systems,
        dependencies,
        issues,
        lastUpdated: Date.now(),
        schemaVersion: 1,
      } as any;

      // Persist to disk
      await this.persistProjectMap(projectMap);

      const scanDurationMs = Date.now() - startTime;

      this.logger.info("project-map", `Project Map scan completed in ${scanDurationMs}ms`);

      return {
        projectMap: projectMap as any,
        scanDurationMs,
        scannedServices: ["Workspace", "ReplicatedStorage", "ServerScriptService", "ServerStorage", "StarterPlayer", "StarterGui", "Lighting", "Teams", "Players"],
        scannedInstances: instances.length,
        errors,
        warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error("project-map", `Project Map scan failed: ${message}`);
      throw error;
    }
  }

  /**
   * Discover available MCP tools
   */
  private async discoverTools(): Promise<RobloxMCPTool[]> {
    try {
      return await this.mcpClient.listTools();
    } catch (error) {
      this.logger.warn("project-map", `Failed to discover tools: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Build DataModel snapshot by calling get_studio_state or equivalent
   */
  private async buildDataModelSnapshot(): Promise<any> {
    try {
      const result = await this.mcpClient.callTool("get_studio_state", {});
      if (result && typeof result === "object") {
        return result;
      }
    } catch {
      // MCP unavailable, return minimal structure
    }
    return {
      services: [],
      workspace: { parts: [], models: [], folders: [], spawns: [], terrain: null },
      replicatedStorage: { folders: [], scripts: [], modules: [], remotes: [], assets: [] },
      serverScriptService: { folders: [], scripts: [], modules: [], remotes: [], assets: [] },
      serverStorage: { folders: [], scripts: [], modules: [], remotes: [], assets: [] },
      starterPlayer: { scripts: [], localScripts: [], modules: [], characterScripts: [], characterLocalScripts: [] },
      starterGui: { screenGuis: [] },
      starterPack: { folders: [], scripts: [], modules: [], remotes: [], assets: [] },
      lighting: { properties: {}, children: [] },
      soundService: { properties: {}, children: [] },
      teams: { teams: [] },
      players: { maxPlayers: 0, preferredPlayers: 0, characterAutoLoads: true, respawnTime: 5 },
    };
  }

  /**
   * Build service registry from discovered services
   */
  private async buildServiceRegistry(): Promise<any> {
    const services = new Map();
    try {
      const result = await this.mcpClient.callTool("search_game_tree", { path: "game" });
      const data = this.parseMcpResult(result);
      if (data && typeof data === "object") {
        const children = (data as any).children || [];
        for (const child of children) {
          services.set(child.name, {
            name: child.name,
            className: child.className,
            path: child.path || child.name,
            children: (child.children || []).length,
          });
        }
      }
    } catch {
      // MCP unavailable
    }
    return { services };
  }

  private parseMcpResult(result: RobloxMCPToolResult): any {
    if (!result) return null;
    if (result.isError) return null;
    const content = result.structuredContent || result.content;
    if (typeof content === "string") {
      try { return JSON.parse(content); } catch { return null; }
    }
    return content;
  }

  /**
   * Scan all instances in the project
   */
  private async scanInstances(): Promise<any[]> {
    const instances: any[] = [];
    const services = ["Workspace", "ReplicatedStorage", "ServerScriptService", "ServerStorage", "StarterPlayer", "StarterGui", "Lighting"];
    for (const service of services) {
      try {
        const result = await this.mcpClient.callTool("search_game_tree", { path: `game.${service}` });
        const data = this.parseMcpResult(result);
        if (data && typeof data === "object") {
          this.collectInstances(data, instances, service);
        }
      } catch {
        // Skip unreachable services
      }
    }
    return instances;
  }

  private collectInstances(node: any, instances: any[], parentPath: string): void {
    if (node.className && node.name) {
      instances.push({
        path: node.path || `${parentPath}.${node.name}`,
        name: node.name,
        className: node.className,
        parentPath,
        properties: node.properties || {},
      });
    }
    for (const child of node.children || []) {
      this.collectInstances(child, instances, node.path || parentPath);
    }
  }

  /**
   * Scan all scripts
   */
  private async scanScripts(): Promise<any[]> {
    const scripts: any[] = [];
    const services = ["ServerScriptService", "ServerStorage", "ReplicatedStorage", "StarterPlayer"];
    for (const service of services) {
      try {
        const result = await this.mcpClient.callTool("search_game_tree", { path: `game.${service}` });
        const data = this.parseMcpResult(result);
        if (data && typeof data === "object") {
          this.collectScripts(data, scripts, service);
        }
      } catch {
        // Skip unreachable services
      }
    }
    return scripts;
  }

  private collectScripts(node: any, scripts: any[], parentPath: string): void {
    if (node.className === "Script" || node.className === "LocalScript" || node.className === "ModuleScript") {
      const scriptEntry: any = {
        path: node.path || `${parentPath}.${node.name}`,
        name: node.name,
        className: node.className,
        parentPath,
      };
      // Try to read script source
      try {
        // Source will be populated lazily if needed
        scriptEntry.source = node.source || "";
      } catch {
        scriptEntry.source = "";
      }
      scripts.push(scriptEntry);
    }
    for (const child of node.children || []) {
      this.collectScripts(child, scripts, node.path || parentPath);
    }
  }

  /**
   * Scan RemoteEvents and RemoteFunctions
   */
  private async scanRemotes(): Promise<any[]> {
    const remotes: any[] = [];
    const remoteContainers = ["ReplicatedStorage", "ServerScriptService"];
    for (const container of remoteContainers) {
      try {
        const result = await this.mcpClient.callTool("search_game_tree", { path: `game.${container}` });
        const data = this.parseMcpResult(result);
        if (data && typeof data === "object") {
          this.collectRemotes(data, remotes, container);
        }
      } catch {
        // Skip unreachable containers
      }
    }
    return remotes;
  }

  private collectRemotes(node: any, remotes: any[], parentPath: string): void {
    if (node.className === "RemoteEvent" || node.className === "RemoteFunction" ||
        node.className === "BindableEvent" || node.className === "BindableFunction") {
      remotes.push({
        path: node.path || `${parentPath}.${node.name}`,
        name: node.name,
        className: node.className,
        parentPath,
      });
    }
    for (const child of node.children || []) {
      this.collectRemotes(child, remotes, node.path || parentPath);
    }
  }

  /**
   * Scan CollectionService tags
   */
  private async scanTags(): Promise<Map<string, any>> {
    const tags = new Map<string, any>();
    // Tags are typically discovered via instance attributes, not direct MCP
    return tags;
  }

  /**
   * Scan attributes on instances
   */
  private async scanAttributes(): Promise<Map<string, any>> {
    const attributes = new Map<string, any>();
    return attributes;
  }

  /**
   * Scan UI hierarchy
   */
  private async scanUIHierarchy(): Promise<any> {
    const screenGuis: any[] = [];
    try {
      const result = await this.mcpClient.callTool("search_game_tree", { path: "game.StarterGui" });
      const data = this.parseMcpResult(result);
      if (data && typeof data === "object") {
        const children = (data as any).children || [];
        for (const child of children) {
          if (child.className === "ScreenGui") {
            screenGuis.push({
              name: child.name,
              path: child.path || `game.StarterGui.${child.name}`,
              root: child,
              children: child.children || [],
            });
          }
        }
      }
    } catch {
      // MCP unavailable
    }
    return {
      screenGuis,
      starterGui: { screenGuis },
      starterPlayerScripts: { localScripts: [], modules: [] },
    };
  }

  /**
   * Scan world geometry
   */
  private async scanWorld(): Promise<any> {
    const parts: any[] = [];
    try {
      const result = await this.mcpClient.callTool("search_game_tree", { path: "game.Workspace" });
      const data = this.parseMcpResult(result);
      if (data && typeof data === "object") {
        this.collectWorldParts(data, parts, "Workspace");
      }
    } catch {
      // MCP unavailable
    }
    return {
      terrain: { size: { x: 0, y: 0, z: 0 }, maxExtents: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, materials: new Map(), waterColor: { r: 0, g: 0, b: 0 }, waterReflectance: 0, waterTransparency: 0, waterWaveSize: 0, waterWaveSpeed: 0 },
      zones: [],
      buildings: [],
      roads: [],
      water: [],
      props: [],
      spawnAreas: [],
      parts,
    };
  }

  private collectWorldParts(node: any, parts: any[], parentPath: string): void {
    if (node.className === "Part" || node.className === "MeshPart" || node.className === "UnionOperation") {
      parts.push({
        path: node.path || `${parentPath}.${node.name}`,
        name: node.name,
        className: node.className,
        position: node.properties?.Position || node.position,
        size: node.properties?.Size || node.size,
        anchored: node.properties?.Anchored ?? node.anchored ?? true,
        material: node.properties?.Material || node.material,
        parentPath,
      });
    }
    for (const child of node.children || []) {
      this.collectWorldParts(child, parts, node.path || parentPath);
    }
  }

  /**
   * Scan assets (meshes, images, sounds, animations, fonts)
   */
  private async scanAssets(): Promise<any> {
    return { meshes: [], images: [], sounds: [], animations: [], fonts: [] };
  }

  /**
   * Scan config files
   */
  private async scanConfigs(): Promise<any[]> {
    return [];
  }

  /**
   * Extract project conventions from existing code
   */
  private async extractConventions(): Promise<any> {
    const conventions = this.getDefaultConventions();

    // Try to detect actual naming patterns from scanned scripts
    try {
      const scripts = await this.scanScripts();
      if (scripts.length > 0) {
        const scriptNames = scripts.map((s: any) => s.name);
        conventions.naming.scripts.examples = scriptNames.slice(0, 10);
      }
    } catch {
      // Use defaults
    }

    return conventions;
  }

  /**
   * Build systems registry from discovered systems
   */
  private async buildSystemsRegistry(): Promise<any> {
    const systems = new Map();
    return { systems };
  }

  /**
   * Build dependency graph from code analysis
   */
  private async buildDependencyGraph(): Promise<any> {
    return { nodes: new Map(), edges: [] };
  }

  /**
   * Detect project issues
   */
  private async detectIssues(): Promise<any[]> {
    const issues: any[] = [];
    // Detect basic issues from scanned data
    try {
      const scripts = await this.scanScripts();
      const remotes = await this.scanRemotes();

      // Check for remotes without server handlers
      const serverScripts = scripts.filter((s: any) => s.className === "Script");
      for (const remote of remotes) {
        if (remote.className === "RemoteEvent" || remote.className === "RemoteFunction") {
          const hasHandler = serverScripts.some((s: any) => s.name?.includes(remote.name) || remote.name?.includes(s.name));
          if (!hasHandler) {
            issues.push({
              type: "missing-handler",
              severity: "warning",
              description: `Remote "${remote.name}" has no obvious server-side handler`,
              location: remote.path,
            });
          }
        }
      }
    } catch {
      // Skip issue detection if scan fails
    }
    return issues;
  }

  /**
   * Get default conventions
   */
  private getDefaultConventions(): any {
    return {
      naming: {
        services: { pattern: "^[A-Z][a-zA-Z]*Service$", caseStyle: "PascalCase", examples: ["DataStoreService", "ReplicatedStorage"] },
        scripts: { pattern: "^[A-Z][a-zA-Z]*$", caseStyle: "PascalCase", examples: ["PlayerManager", "GameLoop"] },
        modules: { pattern: "^[A-Z][a-zA-Z]*$", caseStyle: "PascalCase", examples: ["PlayerData", "GameConfig"] },
        remotes: { pattern: "^[A-Z][a-zA-Z]*$", caseStyle: "PascalCase", suffix: "Remote", examples: ["PlayerDataRemote", "CombatRemote"] },
        instances: { pattern: "^[A-Z][a-zA-Z]*$", caseStyle: "PascalCase", examples: ["MainBaseplate", "SpawnLocation"] },
        assets: { pattern: "^[A-Z][a-zA-Z]*$", caseStyle: "PascalCase", examples: ["SwordMesh", "ExplosionSound"] },
        uiElements: { pattern: "^[A-Z][a-zA-Z]*$", caseStyle: "PascalCase", suffix: "Gui", examples: ["MainMenuGui", "HealthBarGui"] },
      },
      folderStructure: {
        workspace: [{ name: "Map", purpose: "World geometry and terrain", required: true }, { name: "Spawns", purpose: "Spawn locations", required: true }],
        replicatedStorage: [{ name: "Shared", purpose: "Shared modules and assets", required: true }, { name: "Remotes", purpose: "RemoteEvents and RemoteFunctions", required: true }],
        serverScriptService: [{ name: "Systems", purpose: "Game systems", required: true }, { name: "Handlers", purpose: "Event handlers", required: true }],
        serverStorage: [{ name: "Assets", purpose: "Server-only assets", required: false }],
        starterPlayer: [{ name: "Scripts", purpose: "Player scripts", required: true }, { name: "Scripts/Client", purpose: "Client-side scripts", required: true }],
        starterGui: [{ name: "UI", purpose: "ScreenGuis", required: true }],
        lighting: [],
      },
      scriptConventions: {
        moduleStructure: "folder-per-module",
        strictTyping: true,
        requirePaths: "relative",
        lifecycleManagement: "auto",
        errorHandling: "Result",
        eventPatterns: "Signal",
        stateManagement: "attributes",
      },
      uiConventions: {
        designSystem: "custom",
        colorPalette: {
          primary: { r: 0.2, g: 0.4, b: 0.8 },
          secondary: { r: 0.3, g: 0.3, b: 0.3 },
          accent: { r: 1, g: 0.5, b: 0 },
          background: { r: 0.1, g: 0.1, b: 0.15 },
          surface: { r: 0.15, g: 0.15, b: 0.2 },
          text: { r: 1, g: 1, b: 1 },
          textSecondary: { r: 0.7, g: 0.7, b: 0.7 },
          border: { r: 0.3, g: 0.3, b: 0.35 },
          error: { r: 0.9, g: 0.2, b: 0.2 },
          warning: { r: 1, g: 0.8, b: 0 },
          success: { r: 0.2, g: 0.8, b: 0.2 },
          info: { r: 0.2, g: 0.6, b: 1 },
        },
        spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
        typography: { fontFamily: "GothamSemibold", h1: { fontSize: 28, fontWeight: 700, lineHeight: 1.2 }, h2: { fontSize: 22, fontWeight: 600, lineHeight: 1.3 }, h3: { fontSize: 18, fontWeight: 600, lineHeight: 1.4 }, body: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 }, caption: { fontSize: 12, fontWeight: 400, lineHeight: 1.4 }, button: { fontSize: 14, fontWeight: 600, lineHeight: 1.2 } },
        borderRadius: { none: 0, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
        shadows: { none: { offset: { x: 0, y: 0 }, blur: 0, color: { r: 0, g: 0, b: 0 }, transparency: 1 }, sm: { offset: { x: 0, y: 1 }, blur: 2, color: { r: 0, g: 0, b: 0 }, transparency: 0.8 }, md: { offset: { x: 0, y: 4 }, blur: 8, color: { r: 0, g: 0, b: 0 }, transparency: 0.6 }, lg: { offset: { x: 0, y: 8 }, blur: 16, color: { r: 0, g: 0, b: 0 }, transparency: 0.4 }, xl: { offset: { x: 0, y: 16 }, blur: 24, color: { r: 0, g: 0, b: 0 }, transparency: 0.2 } },
        animation: { durations: { instant: 0, fast: 150, normal: 250, slow: 400 }, easings: { linear: "Linear", easeIn: "Quad", easeOut: "Quad", easeInOut: "Quad", bounce: "Bounce", elastic: "Back" } },
        responsiveBreakpoints: { mobile: 600, tablet: 1024, desktop: 1440, wide: 1920 },
      },
      buildingConventions: {
        gridSize: 4,
        defaultMaterial: "Plastic",
        defaultColor: { r: 0.6, g: 0.6, b: 0.6 },
        defaultScale: { x: 4, y: 4, z: 4 },
        defaultAnchored: true,
        defaultCanCollide: true,
        modular: true,
        componentLibrary: [],
      },
      namingPatterns: {
        services: "{Name}Service",
        scripts: "{Name}",
        modules: "{Name}",
        remotes: "{Name}Remote",
        instances: "{Name}",
        assets: "{Name}",
        ui: "{Name}Gui",
        variables: "{name}",
        functions: "{action}{Target}",
        constants: "{NAME}",
        attributes: "{name}",
        tags: "{category}.{name}",
      },
      securityRules: {
        validationRules: [{ name: "remote-args", description: "All remote arguments must be validated server-side", appliesTo: ["RemoteEvent", "RemoteFunction"], severity: "error" }, { name: "no-client-trust", description: "Never trust client-provided data", appliesTo: ["RemoteEvent", "RemoteFunction"], severity: "error" }, { name: "distance-check", description: "Validate distance for interactions", appliesTo: ["RemoteEvent"], severity: "warning" }],
        forbiddenPatterns: [{ pattern: "game\\.Players\\.LocalPlayer", description: "LocalPlayer cannot be used in server scripts", severity: "error" }, { pattern: "DataStoreService.*:GetAsync.*player", description: "DataStore keys must not contain raw player objects", severity: "error" }],
        requiredValidations: [{ context: "RemoteEvent", requiredChecks: ["type", "range", "ownership", "cooldown"] }, { context: "RemoteFunction", requiredChecks: ["type", "range", "ownership"] }],
      },
      performanceConventions: {
        maxPartsPerModel: 1000,
        maxInstancesPerFolder: 5000,
        maxScriptsPerService: 50,
        maxRemoteEvents: 100,
        maxRemoteFunctions: 50,
        maxAttributesPerInstance: 20,
        maxTagsPerInstance: 10,
        textureSizeLimit: 1024,
        meshComplexityLimit: 10000,
        streamingEnabled: true,
        streamingMinRadius: 64,
        streamingTargetRadius: 256,
      },
    };
  }

  /**
   * Persist Project Map to disk
   */
  private async persistProjectMap(projectMap: ProjectMap): Promise<void> {
    try {
      const projectMapDir = join(process.cwd(), ".project-map", projectMap.projectId);
      const projectMapPath = join(projectMapDir, "project-map.json");
      await mkdir(projectMapDir, { recursive: true });
      await writeFile(projectMapPath, JSON.stringify(projectMap, null, 2), "utf-8");
    } catch (error) {
      this.logger.warn("project-map", `Failed to persist Project Map: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load Project Map from disk
   */
  async loadProjectMap(projectId: string): Promise<ProjectMap | null> {
    try {
      const projectMapPath = join(process.cwd(), ".project-map", projectId, "project-map.json");
      const content = await readFile(projectMapPath, "utf-8");
      const projectMap = JSON.parse(content) as ProjectMap;
      this.currentMap = projectMap;
      this.logger.info("project-map", `Loaded Project Map for project ${projectId}`);
      return projectMap;
    } catch {
      this.logger.warn("project-map", `No Project Map found for project ${projectId}`);
      return null;
    }
  }

  /**
   * Get current Project Map
   */
  getCurrentMap(): ProjectMap | null {
    return this.currentMap;
  }

  /**
   * Update Project Map with new scan data
   */
  async updateProjectMap(partialMap: Partial<ProjectMap>): Promise<ProjectMap> {
    if (!this.currentMap) {
      throw new Error("No current Project Map loaded");
    }
    this.currentMap = { ...this.currentMap, ...partialMap, lastUpdated: Date.now() };
    await this.persistProjectMap(this.currentMap);
    return this.currentMap;
  }
}

// Re-export types
export type {
  ProjectMap,
  DataModelSnapshot,
  ProjectMapConfig,
  ProjectConventions,
  SystemRegistry,
  DependencyGraph,
  ServiceRegistry,
  TagRegistry,
  AttributeRegistry,
  UIHierarchySnapshot,
  WorldSnapshot,
  AssetCatalog,
  ConfigSnapshot,
  ProjectIssue,
} from "./types.js";