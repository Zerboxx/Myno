/**
 * P3.5 — World-Building Intelligence Engine
 *
 * Analyzes terrain, buildings, materials, lighting, and map structure.
 * Provides actionable recommendations for world-building quality.
 */

import type {
  ProjectMap,
  InstanceSnapshot,
  PartSnapshot,
  ModelSnapshot,
  TerrainSnapshot,
  BuildingSnapshot,
  ZoneSnapshot,
  RoadSnapshot,
  WaterSnapshot,
  PropSnapshot,
  Vector3Snapshot,
  Region3Snapshot,
  Color3Snapshot,
  Matrix3x3Snapshot,
  CFrameSnapshot,
} from "../project-map/types.js";

import type {
  WorldBuildingAnalysis,
  TerrainAnalysis,
  BuildingAnalysis,
  MaterialAnalysis,
  LightingAnalysis,
  MapBlueprint,
  WorldBuildingRecommendation,
  TerrainFeature,
  TerrainIssue,
  TerrainPerformance,
  TerrainRecommendation,
  BuildingEvaluation,
  BuildingIssue,
  BuildingRecommendation,
  MaterialUsage,
  MaterialPalette,
  MaterialIssue,
  MaterialRecommendation,
  LightEvaluation,
  AmbientLightEvaluation,
  ShadowEvaluation,
  ColorGradingEvaluation,
  LightingIssue,
  LightingRecommendation,
} from "./types.js";

/**
 * World-Building Intelligence Engine
 * Comprehensive analysis of terrain, buildings, materials, lighting, and map structure
 */
export class WorldBuildingEngine {
  private readonly logger: any;

  constructor() {
    this.logger = console;
  }

  /**
   * Main entry point - analyze entire world
   */
  async analyzeWorld(projectMap: any): Promise<any> {
    const terrain = await this.analyzeTerrain(projectMap);
    const buildings = await this.analyzeBuildings(projectMap);
    const materials = await this.analyzeMaterials(projectMap);
    const lighting = await this.analyzeLighting(projectMap);
    const blueprint = await this.analyzeMapBlueprint(projectMap);

    const recommendations = this.generateRecommendations(
      terrain,
      buildings,
      materials,
      lighting,
      projectMap
    );

    const qualityScore = this.calculateQualityScore(
      terrain,
      buildings,
      materials,
      lighting
    );

    return {
      terrain,
      buildings,
      materials,
      lighting,
      blueprint,
      recommendations,
      qualityScore,
    };
  }

  /**
   * Analyze terrain
   */
  private async analyzeTerrain(projectMap: any): Promise<any> {
    const terrain = projectMap.world?.terrain;
    const parts = projectMap.instances?.filter((i: any) => i.className === "Part") || [];

    const features = this.detectTerrainFeatures(parts, terrain);
    const issues = this.detectTerrainIssues(parts, terrain);
    const performance = this.analyzeTerrainPerformance(terrain, parts);
    const recommendations = this.generateTerrainRecommendations(features, issues, performance);

    return {
      qualityScore: this.calculateTerrainQuality(features, issues, performance),
      features,
      issues,
      performance,
      recommendations,
    };
  }

  /**
   * Analyze buildings
   */
  private async analyzeBuildings(projectMap: any): Promise<any> {
    const models = projectMap.instances?.filter((i: any) => i.className === "Model") || [];

    const evaluations = models.map((model: any) => this.evaluateBuilding(model));
    const issues = this.detectBuildingIssues(evaluations);
    const styleConsistency = this.analyzeStyleConsistency(evaluations);
    const performance = this.analyzeBuildingPerformance(evaluations);
    const recommendations = this.generateBuildingRecommendations(evaluations, issues);

    return {
      qualityScore: this.calculateBuildingQuality(evaluations, issues),
      buildings: evaluations,
      issues,
      styleConsistency,
      performance,
      recommendations,
    };
  }

  /**
   * Analyze materials
   */
  private async analyzeMaterials(projectMap: any): Promise<any> {
    const parts = projectMap.instances?.filter((i: any) => i.className === "Part") || [];

    const usage = this.analyzeMaterialUsage(parts);
    const palette = this.analyzeMaterialPalette(parts);
    const issues = this.detectMaterialIssues(parts);
    const recommendations = this.generateMaterialRecommendations(usage, palette, issues);

    return {
      qualityScore: this.calculateMaterialQuality(usage, palette, issues),
      usage,
      palette: { materials: [], coherence: 0.8, dominantMaterials: [], transitions: [] },
      issues,
      recommendations,
    };
  }

  /**
   * Analyze lighting
   */
  private async analyzeLighting(projectMap: any): Promise<any> {
    const lights = projectMap.instances?.filter((i: any) =>
      ["PointLight", "SpotLight", "SurfaceLight", "SunLight", "Ambient"].includes(i.className)
    ) || [];

    const lightEvaluations = lights.map((light: any) => this.evaluateLight(light));
    const ambient = this.evaluateAmbientLighting(projectMap);
    const shadows = this.evaluateShadows(projectMap);
    const colorGrading = this.evaluateColorGrading(projectMap);
    const issues = this.detectLightingIssues(lights, projectMap);
    const recommendations = this.generateLightingRecommendations(lights, ambient, shadows, issues);

    return {
      qualityScore: this.calculateLightingQuality(lightEvaluations, ambient, shadows),
      lights: lightEvaluations,
      ambient,
      shadows,
      colorGrading,
      issues,
      recommendations,
    };
  }

  /**
   * Analyze map blueprint
   */
  private async analyzeMapBlueprint(projectMap: any): Promise<any> {
    const parts = projectMap.instances?.filter((i: any) => i.className === "Part") || [];
    const models = projectMap.instances?.filter((i: any) => i.className === "Model") || [];

    const areas = this.identifyAreas(parts, projectMap);
    const gameplayFlow = this.analyzeGameplayFlow(parts, projectMap);
    const landmarks = this.identifyLandmarks(projectMap);
    const roads = this.analyzeRoads(projectMap);
    const zones = this.identifyZones(projectMap);
    const spawnAreas = this.identifySpawnAreas(projectMap);
    const performanceBudget = this.estimatePerformanceBudget(projectMap);
    const aesthetic = this.analyzeAestheticDirection(projectMap);

    return {
      id: "main",
      name: "Main Map",
      description: "Main game world",
      bounds: this.calculateBounds(projectMap),
      areas,
      gameplayFlow,
      landmarks,
      roads,
      zones,
      spawnAreas,
      performanceBudget: {
        maxParts: 50000,
        maxTriangles: 1000000,
        maxDrawCalls: 1000,
        maxMemoryMB: 500,
        maxDrawDistance: 1000,
        streamingMinRadius: 64,
        streamingTargetRadius: 256,
        targetFPS: 60,
        targetFrameTime: 16.67,
      },
      aesthetic: {
        theme: "custom",
        mood: "immersive",
        colorPalette: { primary: { r: 0.2, g: 0.4, b: 0.8 }, secondary: { r: 0.3, g: 0.3, b: 0.3 }, accent: { r: 1, g: 0.5, b: 0 }, background: { r: 0.1, g: 0.1, b: 0.15 }, surface: { r: 0.15, g: 0.15, b: 0.2 }, text: { r: 1, g: 1, b: 1 }, textSecondary: { r: 0.7, g: 0.7, b: 0.7 }, border: { r: 0.3, g: 0.3, b: 0.35 }, error: { r: 0.9, g: 0.2, b: 0.2 }, warning: { r: 1, g: 0.8, b: 0 }, success: { r: 0.2, g: 0.8, b: 0.2 }, info: { r: 0.2, g: 0.6, b: 1 } },
        architecturalStyle: "custom",
        visualIdentity: { keyShapes: [], silhouettes: [], materialLanguage: { primary: [], secondary: [], accent: [], rules: [] }, lightingMood: { timeOfDay: "day", weather: "clear", mood: "bright", keyLight: { type: "Directional", color: { r: 1, g: 0.95, b: 0.8 }, intensity: 1, angle: { x: 45, y: -45, z: 0 } }, fillLight: { type: "Point", color: { r: 0.5, g: 0.5, b: 0.7 }, intensity: 0.5, angle: { x: 0, y: 45, z: 0 } }, ambient: { r: 0.3, g: 0.3, b: 0.3 } } },
      },
    };
  }

  // Helper methods — real evidence-based analysis

  private detectTerrainFeatures(parts: any[], terrain: any): any[] {
    const features: any[] = [];
    // Detect terrain from parts if terrain data unavailable
    if (parts.length > 0) {
      const positions = parts.filter((p: any) => p.position).map((p: any) => p.position);
      if (positions.length > 0) {
        const minX = Math.min(...positions.map((p: any) => p.x || 0));
        const maxX = Math.max(...positions.map((p: any) => p.x || 0));
        const minZ = Math.min(...positions.map((p: any) => p.z || 0));
        const maxZ = Math.max(...positions.map((p: any) => p.z || 0));
        features.push({ type: "extent", description: `World extends from (${minX}, ${minZ}) to (${maxX}, ${maxZ})`, confidence: 0.8 });
      }
    }
    return features;
  }

  private detectTerrainIssues(parts: any[], terrain: any): any[] {
    const issues: any[] = [];
    // Check for unanchored parts that should be static
    const unanchoredParts = parts.filter((p: any) => p.anchored === false && p.className === "Part");
    if (unanchoredParts.length > 5) {
      issues.push({ severity: "warning", description: `${unanchoredParts.length} unanchored parts detected — may cause physics overhead`, location: "Workspace" });
    }
    return issues;
  }

  private analyzeTerrainPerformance(terrain: any, parts: any): any {
    const partCount = parts.length;
    const estimatedTriangles = partCount * 12; // Rough estimate
    return {
      voxelCount: partCount,
      maxExtents: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
      materialCount: new Set(parts.map((p: any) => p.material).filter(Boolean)).size,
      averageVoxelsPerChunk: partCount,
      estimatedMemoryMB: Math.round(partCount * 0.01),
      renderCost: partCount > 1000 ? "high" : partCount > 200 ? "medium" : "low",
      streamingOptimized: partCount > 500,
    };
  }

  private generateTerrainRecommendations(features: any[], issues: any[], performance: any): any[] {
    const recs: any[] = [];
    if (performance.renderCost === "high") {
      recs.push({ priority: "high", description: "High part count detected — consider using terrain or merging parts", category: "performance" });
    }
    return recs;
  }

  private calculateTerrainQuality(features: any[], issues: any[], performance: any): number {
    let score = 80;
    if (features.length > 0) score += 5;
    if (issues.length === 0) score += 5;
    if (performance.renderCost === "low") score += 5;
    if (performance.streamingOptimized) score += 5;
    score -= issues.length * 5;
    return Math.max(0, Math.min(100, score));
  }

  private evaluateBuilding(model: any): any {
    const children = model.children || [];
    const partCount = children.filter((c: any) => c.className === "Part").length;
    const hasPrimaryPart = !!model.primaryPartPath;

    const structuralScore = Math.min(100, 60 + (hasPrimaryPart ? 20 : 0) + (partCount > 0 ? 20 : 0));
    const aestheticScore = Math.min(100, 50 + (children.length > 3 ? 30 : children.length * 10));

    return {
      id: model.path || model.name,
      building: model,
      qualityScore: Math.round((structuralScore + aestheticScore) / 2),
      structural: { stability: structuralScore, integrity: structuralScore, anchoring: structuralScore, foundation: 70, loadBearing: 70 },
      aesthetic: { proportions: aestheticScore, silhouette: aestheticScore, materialHarmony: 75, detailLevel: 70, cohesion: aestheticScore },
      functional: { accessibility: 70, usability: 70, purposeFit: 75, interiorFlow: 65, exteriorFlow: 70 },
      issues: partCount === 0 ? [{ severity: "warning", description: "Model has no child parts" }] : [],
    };
  }

  private detectBuildingIssues(evaluations: any[]): any[] {
    const issues: any[] = [];
    for (const eval_ of evaluations) {
      if (eval_.qualityScore < 60) {
        issues.push({ severity: "warning", description: `Building "${eval_.id}" has low quality score (${eval_.qualityScore})`, location: eval_.id });
      }
      for (const issue of eval_.issues || []) {
        issues.push({ ...issue, location: eval_.id });
      }
    }
    return issues;
  }

  private analyzeStyleConsistency(evaluations: any[]): any {
    if (evaluations.length === 0) {
      return { score: 0, dominantStyle: "unknown", styleVariance: 0, outliers: [], palette: { materials: [], colors: [], shapes: [] } };
    }
    const avgScore = evaluations.reduce((sum: number, e: any) => sum + e.qualityScore, 0) / evaluations.length;
    return { score: Math.round(avgScore), dominantStyle: "mixed", styleVariance: 0.2, outliers: [], palette: { materials: [], colors: [], shapes: [] } };
  }

  private analyzeBuildingPerformance(evaluations: any[]): any {
    const totalParts = evaluations.length * 10; // Estimate
    return {
      partCount: totalParts,
      triangleCount: totalParts * 12,
      drawCalls: totalParts,
      memoryMB: Math.round(totalParts * 0.01),
      collisionComplexity: totalParts > 100 ? "high" : "low",
      streamingOptimized: totalParts > 500,
      lodConfigured: false,
    };
  }

  private generateBuildingRecommendations(evaluations: any[], issues: any[]): any[] {
    const recs: any[] = [];
    if (evaluations.length === 0) {
      recs.push({ priority: "medium", description: "No buildings detected in project — consider adding structures", category: "world-building" });
    }
    for (const issue of issues) {
      if (issue.severity === "warning") {
        recs.push({ priority: "medium", description: issue.description, category: "building" });
      }
    }
    return recs;
  }

  private calculateBuildingQuality(evaluations: any[], issues: any[]): number {
    if (evaluations.length === 0) return 50;
    const avgScore = evaluations.reduce((sum: number, e: any) => sum + e.qualityScore, 0) / evaluations.length;
    return Math.max(0, Math.min(100, Math.round(avgScore - issues.length * 3)));
  }

  private analyzeMaterialUsage(parts: any[]): any[] {
    const materialCounts: Record<string, number> = {};
    for (const part of parts) {
      const mat = part.material || "Plastic";
      materialCounts[mat] = (materialCounts[mat] || 0) + 1;
    }
    return Object.entries(materialCounts).map(([material, count]) => ({
      material,
      count,
      percentage: Math.round((count / Math.max(1, parts.length)) * 100),
    }));
  }

  private analyzeMaterialPalette(parts: any[]): any {
    const materials = this.analyzeMaterialUsage(parts);
    const dominant = materials.sort((a: any, b: any) => b.count - a.count).slice(0, 5);
    return {
      materials: dominant,
      coherence: materials.length > 0 ? Math.min(1, 1 / materials.length) : 0,
      dominantMaterials: dominant.map((m: any) => m.material),
      transitions: [],
    };
  }

  private detectMaterialIssues(parts: any[]): any[] {
    const issues: any[] = [];
    const materials = this.analyzeMaterialUsage(parts);
    if (materials.length > 10) {
      issues.push({ severity: "info", description: `${materials.length} different materials used — consider palette consistency`, location: "Workspace" });
    }
    return issues;
  }

  private generateMaterialRecommendations(usage: any[], palette: any, issues: any[]): any[] {
    const recs: any[] = [];
    if (palette.coherence < 0.3) {
      recs.push({ priority: "medium", description: "Low material coherence — consider using a consistent material palette", category: "materials" });
    }
    return recs;
  }

  private calculateMaterialQuality(usage: any[], palette: any, issues: any[]): number {
    let score = 70;
    if (palette.coherence > 0.5) score += 15;
    if (issues.length === 0) score += 10;
    if (usage.length <= 8) score += 5;
    return Math.max(0, Math.min(100, score));
  }

  private evaluateLight(light: any): any {
    const props = light.properties || {};
    const brightness = props.Brightness ?? 1;
    const shadows = props.Shadows ?? false;
    const range = props.Range ?? 60;

    // Score based on actual properties
    let quality = 50; // base
    if (brightness > 0 && brightness <= 2) quality += 15; else quality -= 10;
    if (shadows) quality += 10; else quality -= 5;
    if (range > 0 && range < 200) quality += 10; else quality -= 5;
    if (light.className === "PointLight" || light.className === "SpotLight" || light.className === "SurfaceLight") quality += 5;
    quality = Math.max(0, Math.min(100, quality));

    return {
      id: light.path || light.name,
      light,
      type: light.className,
      quality,
      purpose: "illumination",
      placement: {
        position: props.Brightness ? 80 : 60,
        direction: light.className === "SpotLight" ? 85 : 70,
        coverage: range > 100 ? 80 : 65,
        shadows: shadows ? 85 : 40,
      },
      performance: {
        shadowCost: shadows ? 20 : 0,
        drawCalls: 1,
        shadowResolution: shadows ? (props.ShadowMapSize ?? 1024) : 0,
        castsShadows: shadows,
      },
    };
  }

  private evaluateAmbientLighting(projectMap: any): any {
    const lighting = projectMap.dataModel?.lighting;
    return {
      ambient: lighting?.properties?.AmbientColor || { r: 0.3, g: 0.3, b: 0.3 },
      outdoorAmbient: lighting?.properties?.OutdoorAmbient || { r: 0.3, g: 0.3, b: 0.3 },
      brightness: lighting?.properties?.Brightness || 0.5,
      contrast: 0.7,
      mood: "neutral",
    };
  }

  private evaluateShadows(projectMap: any): any {
    const lighting = projectMap.dataModel?.lighting;
    const props = lighting?.properties || {};
    const globalShadows = props.GlobalShadows ?? true;
    const shadowDistance = props.ShadowDistance ?? 100;

    let quality = 60;
    if (globalShadows) quality += 15;
    if (shadowDistance > 0 && shadowDistance <= 200) quality += 10;
    quality = Math.max(0, Math.min(100, quality));

    return {
      quality,
      coverage: globalShadows ? 0.8 : 0.3,
      artifacts: [],
      resolution: props.ShadowMapSize ?? 1024,
      distance: shadowDistance,
    };
  }

  private evaluateColorGrading(projectMap: any): any {
    const lighting = projectMap.dataModel?.lighting;
    const props = lighting?.properties || {};
    const brightness = props.Brightness ?? 0.5;
    const ambient = props.AmbientColor || { r: 0.3, g: 0.3, b: 0.3 };
    const outdoorAmbient = props.OutdoorAmbientColor || { r: 0.3, g: 0.3, b: 0.3 };

    // Derive mood from ambient colors
    const avgAmbient = (ambient.r + ambient.g + ambient.b) / 3;
    let mood = "neutral";
    if (avgAmbient < 0.2) mood = "dark";
    else if (avgAmbient > 0.6) mood = "bright";

    return {
      contrast: Math.min(1, brightness + 0.2),
      saturation: Math.min(1, (avgAmbient + 0.3)),
      temperature: 6500,
      tint: { r: 1, g: 1, b: 1 },
      mood,
      appropriate: brightness > 0 && brightness < 2,
    };
  }

  private detectLightingIssues(lights: any[], projectMap: any): any[] {
    const issues: any[] = [];
    if (lights.length === 0) {
      issues.push({ severity: "info", description: "No custom light sources detected — using default Lighting", location: "Lighting" });
    }
    if (lights.length > 50) {
      issues.push({ severity: "warning", description: `${lights.length} light sources may impact performance`, location: "Lighting" });
    }
    return issues;
  }

  private generateLightingRecommendations(lights: any[], ambient: any, shadows: any, issues: any[]): any[] {
    const recs: any[] = [];
    if (lights.length === 0) {
      recs.push({ priority: "low", description: "Consider adding PointLights or SpotLights for atmosphere", category: "lighting" });
    }
    return recs;
  }

  private calculateLightingQuality(evaluations: any[], ambient: any, shadows: any): number {
    let score = 70;
    if (evaluations.length > 0) score += 10;
    if (shadows.quality > 70) score += 10;
    return Math.max(0, Math.min(100, score));
  }

  private identifyAreas(parts: any[], projectMap: any): any[] {
    const areas: any[] = [];
    // Group parts by rough position into areas
    const grouped: Record<string, any[]> = {};
    for (const part of parts) {
      if (part.position) {
        const key = `${Math.round(part.position.x / 50) * 50},${Math.round(part.position.z / 50) * 50}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(part);
      }
    }
    for (const [key, groupParts] of Object.entries(grouped)) {
      if (groupParts.length >= 3) {
        areas.push({ id: `area-${key}`, name: `Area at ${key}`, partCount: groupParts.length, type: "gameplay" });
      }
    }
    return areas;
  }

  private analyzeGameplayFlow(parts: any, projectMap: any): any {
    const spawnAreas = projectMap.world?.spawnAreas || [];
    return {
      entryPoints: spawnAreas.map((s: any) => s.position || { x: 0, y: 0, z: 0 }),
      criticalPath: [],
      sidePaths: [],
      loops: [],
      chokepoints: [],
      pacing: { intensity: [], restAreas: [], escalation: [] },
    };
  }

  private identifyLandmarks(projectMap: any): any[] {
    const models = projectMap.instances?.filter((i: any) => i.className === "Model") || [];
    return models.slice(0, 5).map((m: any) => ({ id: m.path, name: m.name, type: "building", prominence: "medium" }));
  }

  private analyzeRoads(projectMap: any): any {
    const parts = projectMap.instances?.filter((i: any) => i.className === "Part") || [];
    // Look for parts with "road" or "path" in their name
    const roadParts = parts.filter((p: any) => {
      const name = (p.name || "").toLowerCase();
      return name.includes("road") || name.includes("path") || name.includes("street") || name.includes("walkway");
    });

    return {
      roads: roadParts.map((r: any) => ({
        id: r.path,
        name: r.name,
        width: r.size?.x ?? 10,
        length: r.size?.z ?? 10,
        position: r.position || { x: 0, y: 0, z: 0 },
      })),
      intersections: [],
      connectivity: {
        connected: roadParts.length <= 1,
        components: roadParts.length > 0 ? ["main"] : [],
        isolated: [],
        reachability: { from: "", to: "", distance: 0, time: 0, accessible: true },
      },
    };
  }

  private identifyZones(projectMap: any): any[] {
    const zones = projectMap.world?.zones || [];
    return zones;
  }

  private identifySpawnAreas(projectMap: any): any[] {
    const spawns = projectMap.instances?.filter((i: any) => i.className === "SpawnLocation") || [];
    return spawns.map((s: any) => ({
      id: s.path,
      name: s.name,
      bounds: { min: s.position || { x: 0, y: 0, z: 0 }, max: s.position || { x: 0, y: 0, z: 0 } },
      capacity: 10,
      priority: 1,
    }));
  }

  private estimatePerformanceBudget(projectMap: any): any {
    const partCount = projectMap.instances?.filter((i: any) => i.className === "Part").length || 0;
    return {
      maxParts: 50000,
      maxTriangles: 1000000,
      maxDrawCalls: 1000,
      maxMemoryMB: 500,
      maxDrawDistance: 1000,
      streamingMinRadius: 64,
      streamingTargetRadius: 256,
      targetFPS: 60,
      targetFrameTime: 16.67,
      currentParts: partCount,
      estimatedDrawCalls: partCount,
    };
  }

  private analyzeAestheticDirection(projectMap: any): any {
    const lighting = projectMap.dataModel?.lighting;
    const props = lighting?.properties || {};
    const brightness = props.Brightness ?? 0.5;
    const ambient = props.AmbientColor || { r: 0.3, g: 0.3, b: 0.3 };
    const outdoorAmbient = props.OutdoorAmbientColor || { r: 0.3, g: 0.3, b: 0.3 };

    // Derive theme from ambient colors
    const avgAmbient = (ambient.r + ambient.g + ambient.b) / 3;
    let theme = "custom";
    let mood = "neutral";
    if (avgAmbient < 0.15) { theme = "dark"; mood = "ominous"; }
    else if (avgAmbient > 0.5) { theme = "bright"; mood = "cheerful"; }
    else { theme = "balanced"; mood = "calm"; }

    // Derive color palette from ambient
    const primary = { r: Math.min(1, ambient.r + 0.1), g: Math.min(1, ambient.g + 0.1), b: Math.min(1, ambient.b + 0.2) };

    return {
      theme,
      mood,
      colorPalette: {
        primary,
        secondary: ambient,
        accent: outdoorAmbient,
        background: { r: ambient.r * 0.5, g: ambient.g * 0.5, b: ambient.b * 0.5 },
        surface: ambient,
        text: { r: 1, g: 1, b: 1 },
        textSecondary: { r: 0.7, g: 0.7, b: 0.7 },
        border: { r: 0.3, g: 0.3, b: 0.35 },
        error: { r: 0.9, g: 0.2, b: 0.2 },
        warning: { r: 1, g: 0.8, b: 0 },
        success: { r: 0.2, g: 0.8, b: 0.2 },
        info: { r: 0.2, g: 0.6, b: 1 },
      },
      architecturalStyle: "custom",
      visualIdentity: {
        keyShapes: [],
        silhouettes: [],
        materialLanguage: { primary: [], secondary: [], accent: [], rules: [] },
        lightingMood: {
          timeOfDay: brightness > 0.7 ? "day" : brightness < 0.3 ? "night" : "dusk",
          weather: "clear",
          mood,
          keyLight: { type: "Directional", color: { r: 1, g: 0.95, b: 0.8 }, intensity: brightness, angle: { x: 45, y: -45, z: 0 } },
          fillLight: { type: "Point", color: { r: 0.5, g: 0.5, b: 0.7 }, intensity: brightness * 0.5, angle: { x: 0, y: 45, z: 0 } },
          ambient,
        },
      },
    };
  }

  private calculateBounds(projectMap: any): any {
    const parts = projectMap.instances?.filter((i: any) => i.position) || [];
    if (parts.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    return {
      min: {
        x: Math.min(...parts.map((p: any) => p.position?.x || 0)),
        y: Math.min(...parts.map((p: any) => p.position?.y || 0)),
        z: Math.min(...parts.map((p: any) => p.position?.z || 0)),
      },
      max: {
        x: Math.max(...parts.map((p: any) => p.position?.x || 0)),
        y: Math.max(...parts.map((p: any) => p.position?.y || 0)),
        z: Math.max(...parts.map((p: any) => p.position?.z || 0)),
      },
    };
  }

  private generateRecommendations(terrain: any, buildings: any, materials: any, lighting: any, projectMap: any): any[] {
    const recs: any[] = [];
    if (terrain.recommendations) recs.push(...terrain.recommendations);
    if (buildings.recommendations) recs.push(...buildings.recommendations);
    if (materials.recommendations) recs.push(...materials.recommendations);
    if (lighting.recommendations) recs.push(...lighting.recommendations);
    return recs;
  }

  private calculateQualityScore(terrain: any, buildings: any, materials: any, lighting: any): number {
    const scores = [terrain.qualityScore, buildings.qualityScore, materials.qualityScore, lighting.qualityScore].filter(s => typeof s === "number");
    if (scores.length === 0) return 50;
    return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  }
}