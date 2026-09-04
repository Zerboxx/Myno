/**
 * P3.5 — World-Building Intelligence Types
 *
 * Types for terrain, building, material, lighting, and map blueprint intelligence.
 */

import type { ProjectMap, InstanceSnapshot, PartSnapshot, ModelSnapshot, TerrainSnapshot, BuildingSnapshot } from "../project-map/types.js";

/** World-building intelligence analysis result */
export interface WorldBuildingAnalysis {
  /** Terrain analysis */
  terrain: TerrainAnalysis;
  /** Building analysis */
  buildings: BuildingAnalysis;
  /** Material analysis */
  materials: MaterialAnalysis;
  /** Lighting analysis */
  lighting: LightingAnalysis;
  /** Map blueprint */
  blueprint: MapBlueprint;
  /** Overall quality score */
  qualityScore: number;
  /** Recommendations */
  recommendations: WorldBuildingRecommendation[];
}

/** Terrain analysis */
export interface TerrainAnalysis {
  /** Overall terrain quality */
  qualityScore: number;
  /** Terrain features */
  features: TerrainFeature[];
  /** Issues detected */
  issues: TerrainIssue[];
  /** Performance metrics */
  performance: TerrainPerformance;
  /** Recommendations */
  recommendations: TerrainRecommendation[];
}

/** Terrain feature */
export interface TerrainFeature {
  id: string;
  type: "mountain" | "valley" | "river" | "lake" | "coastline" | "plateau" | "cliff" | "cave" | "plateau" | "ridge";
  bounds: Region3Snapshot;
  elevation: ElevationProfile;
  materials: string[];
  vegetation: VegetationInfo;
  traversable: boolean;
  gameplayRelevance: "critical" | "high" | "medium" | "low" | "none";
}

/** Elevation profile */
export interface ElevationProfile {
  min: number;
  max: number;
  average: number;
  variation: number;
  slopeMap: SlopeMapEntry[];
}

/** Slope map entry */
export interface SlopeMapEntry {
  region: Region3Snapshot;
  averageSlope: number;
  maxSlope: number;
  traversable: boolean;
}

/** Vegetation info */
export interface VegetationInfo {
  density: number;
  types: string[];
  coverage: number;
}

/** Region3 snapshot */
export interface Region3Snapshot {
  min: Vector3Snapshot;
  max: Vector3Snapshot;
}

/** Vector3 snapshot */
export interface Vector3Snapshot {
  x: number;
  y: number;
  z: number;
}

/** Terrain issue */
export interface TerrainIssue {
  id: string;
  type: "hole" | "seam" | "floating" | "underground" | "seam" | "texture-stretch" | "material-transition" | "water-leak" | "collision-gap" | "navigation-block" | "visual-artifact";
  severity: "critical" | "high" | "medium" | "low" | "cosmetic";
  location: Region3Snapshot;
  description: string;
  impact: "gameplay" | "visual" | "performance" | "navigation";
  fix: string;
  autoFixable: boolean;
}

/** Terrain performance metrics */
export interface TerrainPerformance {
  voxelCount: number;
  maxExtents: Region3Snapshot;
  materialCount: number;
  averageVoxelsPerChunk: number;
  estimatedMemoryMB: number;
  renderCost: "low" | "medium" | "high" | "extreme";
  streamingOptimized: boolean;
}

/** Terrain recommendation */
export interface TerrainRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  type: "fix" | "optimize" | "enhance" | "redesign";
  title: string;
  description: string;
  location?: Region3Snapshot;
  effort: "low" | "medium" | "high";
  impact: "high" | "medium" | "low";
}

/** Building analysis */
export interface BuildingAnalysis {
  /** Overall building quality */
  qualityScore: number;
  /** Buildings analyzed */
  buildings: BuildingEvaluation[];
  /** Issues detected */
  issues: BuildingIssue[];
  /** Style consistency */
  styleConsistency: StyleConsistency;
  /** Performance metrics */
  performance: BuildingPerformance;
  /** Recommendations */
  recommendations: BuildingRecommendation[];
}

/** Building evaluation */
export interface BuildingEvaluation {
  id: string;
  building: BuildingSnapshot;
  qualityScore: number;
  structural: StructuralEvaluation;
  aesthetic: AestheticEvaluation;
  functional: FunctionalEvaluation;
  issues: BuildingIssue[];
}

/** Structural evaluation */
export interface StructuralEvaluation {
  stability: number;
  integrity: number;
  anchoring: number;
  foundation: number;
  loadBearing: number;
}

/** Aesthetic evaluation */
export interface AestheticEvaluation {
  proportions: number;
  silhouette: number;
  materialHarmony: number;
  detailLevel: number;
  cohesion: number;
}

/** Functional evaluation */
export interface FunctionalEvaluation {
  accessibility: number;
  usability: number;
  purposeFit: number;
  interiorFlow: number;
  exteriorFlow: number;
}

/** Building issue */
export interface BuildingIssue {
  id: string;
  buildingId: string;
  type: "structural" | "aesthetic" | "functional" | "performance" | "accessibility" | "collision" | "zoning" | "material" | "scale" | "proportion";
  severity: "critical" | "high" | "medium" | "low" | "cosmetic";
  location: Region3Snapshot;
  description: string;
  impact: "structural" | "gameplay" | "visual" | "performance" | "accessibility";
  fix: string;
  autoFixable: boolean;
}

/** Style consistency */
export interface StyleConsistency {
  score: number;
  dominantStyle: string;
  styleVariance: number;
  outliers: StyleOutlier[];
  palette: StylePalette;
}

/** Style outlier */
export interface StyleOutlier {
  buildingId: string;
  deviation: number;
  aspects: string[];
}

/** Color palette entry */
export interface ColorPaletteEntry {
  color: Color3Snapshot;
  usage: number;
  name: string;
}

/** Shape palette entry */
export interface ShapePaletteEntry {
  shape: string;
  usage: number;
  name: string;
}

/** Style palette */
export interface StylePalette {
  materials: MaterialPaletteEntry[];
  colors: ColorPaletteEntry[];
  shapes: ShapePaletteEntry[];
}

/** Building performance */
export interface BuildingPerformance {
  partCount: number;
  triangleCount: number;
  drawCalls: number;
  memoryMB: number;
  collisionComplexity: number;
  streamingOptimized: boolean;
  lodConfigured: boolean;
}

/** Building recommendation */
export interface BuildingRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  type: "fix" | "optimize" | "enhance" | "redesign";
  title: string;
  description: string;
  buildingId?: string;
  effort: "low" | "medium" | "high";
  impact: "high" | "medium" | "low";
}

/** Material analysis */
export interface MaterialAnalysis {
  /** Overall material quality */
  qualityScore: number;
  /** Material usage */
  usage: MaterialUsage[];
  /** Palette coherence */
  palette: MaterialPalette;
  /** Issues */
  issues: MaterialIssue[];
  /** Recommendations */
  recommendations: MaterialRecommendation[];
}

/** Material usage */
export interface MaterialUsage {
  material: string;
  count: number;
  surfaceArea: number;
  contexts: MaterialContext[];
  appropriateness: number;
}

/** Material context */
export interface MaterialContext {
  instancePath: string;
  instanceType: string;
  appropriateness: number;
  context: string;
}

/** Material palette */
export interface MaterialPalette {
  materials: MaterialPaletteEntry[];
  coherence: number;
  dominantMaterials: string[];
  transitions: MaterialTransition[];
}

/** Material palette entry */
export interface MaterialPaletteEntry {
  material: string;
  color: Color3Snapshot;
  usage: number;
  appropriateContexts: string[];
}

/** Material transition */
export interface MaterialTransition {
  from: string;
  to: string;
  location: Region3Snapshot;
  quality: "seamless" | "noticeable" | "jarring";
}

/** Material issue */
export interface MaterialIssue {
  id: string;
  type: "inappropriate" | "inconsistent" | "missing" | "conflict" | "performance" | "visual" | "gameplay";
  severity: "critical" | "high" | "medium" | "low" | "cosmetic";
  location: Region3Snapshot;
  material: string;
  expected: string;
  description: string;
  fix: string;
  autoFixable: boolean;
}

/** Material recommendation */
export interface MaterialRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  type: "replace" | "add" | "remove" | "blend" | "standardize";
  title: string;
  description: string;
  location?: Region3Snapshot;
  effort: "low" | "medium" | "high";
  impact: "high" | "medium" | "low";
}

/** Lighting analysis */
export interface LightingAnalysis {
  /** Overall lighting quality */
  qualityScore: number;
  /** Light sources */
  lights: LightEvaluation[];
  /** Ambient lighting */
  ambient: AmbientLightEvaluation;
  /** Shadows */
  shadows: ShadowEvaluation;
  /** Color grading */
  colorGrading: ColorGradingEvaluation;
  /** Issues */
  issues: LightingIssue[];
  /** Recommendations */
  recommendations: LightingRecommendation[];
}

/** Light evaluation */
export interface LightEvaluation {
  id: string;
  light: any;
  type: "PointLight" | "SpotLight" | "SurfaceLight" | "SunLight" | "Ambient";
  quality: number;
  purpose: string;
  placement: PlacementEvaluation;
  performance: LightPerformance;
}

/** Placement evaluation */
export interface PlacementEvaluation {
  position: number;
  direction: number;
  coverage: number;
  shadows: number;
}

/** Light performance */
export interface LightPerformance {
  shadowCost: number;
  drawCalls: number;
  shadowResolution: number;
  castsShadows: boolean;
}

/** Ambient light evaluation */
export interface AmbientLightEvaluation {
  ambient: Color3Snapshot;
  outdoorAmbient: Color3Snapshot;
  brightness: number;
  contrast: number;
  mood: string;
}

/** Shadow evaluation */
export interface ShadowEvaluation {
  quality: number;
  coverage: number;
  artifacts: ShadowArtifact[];
  resolution: number;
  distance: number;
}

/** Shadow artifact */
export interface ShadowArtifact {
  type: "acne" | "peter-panning" | "cascades" | "resolution" | "flicker" | "disappearing";
  location: Region3Snapshot;
  severity: "critical" | "high" | "medium" | "low";
}

/** Color grading evaluation */
export interface ColorGradingEvaluation {
  contrast: number;
  saturation: number;
  temperature: number;
  tint: Color3Snapshot;
  mood: string;
  appropriate: boolean;
}

/** Lighting issue */
export interface LightingIssue {
  id: string;
  type: "overbright" | "underexposed" | "color-cast" | "shadow-artifact" | "light-leak" | "missing-shadow" | "overdraw" | "performance" | "mood-mismatch" | "readability";
  severity: "critical" | "high" | "medium" | "low" | "cosmetic";
  location: Region3Snapshot;
  description: string;
  fix: string;
  autoFixable: boolean;
}

/** Lighting recommendation */
export interface LightingRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  type: "add" | "remove" | "adjust" | "replace" | "optimize";
  title: string;
  description: string;
  location?: Region3Snapshot;
  effort: "low" | "medium" | "high";
  impact: "high" | "medium" | "low";
}

/** Map blueprint */
export interface MapBlueprint {
  id: string;
  name: string;
  description: string;
  bounds: Region3Snapshot;
  areas: BlueprintArea[];
  gameplayFlow: GameplayFlow;
  landmarks: Landmark[];
  roads: RoadNetwork;
  zones: ZonePlan[];
  spawnAreas: SpawnAreaPlan[];
  performanceBudget: PerformanceBudget;
  aesthetic: AestheticDirection;
}

/** Blueprint area */
export interface BlueprintArea {
  id: string;
  name: string;
  type: "gameplay" | "social" | "economy" | "spawn" | "transition" | "secret" | "boss" | "puzzle" | "traversal";
  bounds: Region3Snapshot;
  purpose: string;
  connections: AreaConnection[];
  requirements: AreaRequirement[];
  assets: BlueprintAsset[];
}

/** Area connection */
export interface AreaConnection {
  from: string;
  to: string;
  type: "path" | "portal" | "teleport" | "transition" | "locked" | "conditional";
  traversable: boolean;
  conditions?: string[];
}

/** Area requirement */
export interface AreaRequirement {
  type: "terrain" | "building" | "prop" | "lighting" | "gameplay" | "navigation" | "spawn";
  description: string;
  mandatory: boolean;
}

/** Blueprint asset */
export interface BlueprintAsset {
  id: string;
  type: "terrain" | "building" | "prop" | "road" | "water" | "vegetation" | "lighting" | "effect" | "sound" | "script";
  name: string;
  location: Region3Snapshot;
  properties: Record<string, unknown>;
  dependencies: string[];
}

/** Gameplay flow */
export interface GameplayFlow {
  entryPoints: FlowEntry[];
  criticalPath: FlowPath[];
  sidePaths: FlowPath[];
  loops: FlowLoop[];
  chokepoints: FlowChokepoint[];
  pacing: FlowPacing;
}

/** Flow entry */
export interface FlowEntry {
  id: string;
  name: string;
  position: Vector3Snapshot;
  type: "spawn" | "entrance" | "portal" | "transition";
}

/** Flow path */
export interface FlowPath {
  id: string;
  name: string;
  waypoints: Vector3Snapshot[];
  type: "main" | "side" | "secret" | "shortcut" | "backtrack";
  difficulty: number;
  estimatedTime: number;
}

/** Flow loop */
export interface FlowLoop {
  id: string;
  areas: string[];
  type: "exploration" | "combat" | "puzzle" | "traversal" | "economy";
  repeatable: boolean;
}

/** Flow chokepoint */
export interface FlowChokepoint {
  id: string;
  location: Region3Snapshot;
  severity: "critical" | "high" | "medium" | "low";
  type: "natural" | "designed" | "accidental";
  mitigation?: string;
}

/** Flow pacing */
export interface FlowPacing {
  intensity: FlowIntensityCurve[];
  restAreas: RestArea[];
  escalation: EscalationPoint[];
}

/** Flow intensity curve */
export interface FlowIntensityCurve {
  area: string;
  intensity: number;
  duration: number;
}

/** Rest area */
export interface RestArea {
  id: string;
  location: Region3Snapshot;
  type: "safe" | "healing" | "save" | "shop" | "social";
  capacity: number;
}

/** Escalation point */
export interface EscalationPoint {
  area: string;
  trigger: string;
  intensityDelta: number;
}

/** Landmark */
export interface Landmark {
  id: string;
  name: string;
  type: "structure" | "natural" | "prop" | "lighting" | "effect";
  position: Vector3Snapshot;
  visibility: number;
  significance: "global" | "regional" | "local";
  purpose: "navigation" | "identity" | "gameplay" | "aesthetic";
}

/** Road network */
export interface RoadNetwork {
  roads: RoadSegment[];
  intersections: Intersection[];
  connectivity: RoadConnectivity;
}

/** Road segment */
export interface RoadSegment {
  id: string;
  name: string;
  path: Vector3Snapshot[];
  width: number;
  material: string;
  lanes: number,
  connects: string[];
  type: "highway" | "street" | "path" | "trail" | "bridge" | "tunnel";
}

/** Intersection */
export interface Intersection {
  id: string;
  position: Vector3Snapshot;
  roads: string[];
  type: "intersection" | "roundabout" | "t-junction" | "dead-end";
  trafficControl: "none" | "yield" | "stop" | "signal";
}

/** Road connectivity */
export interface RoadConnectivity {
  connected: boolean;
  components: string[][];
  isolated: string[];
  reachability: ReachabilityMatrix;
}

/** Reachability matrix */
export interface ReachabilityMatrix {
  from: string;
  to: string;
  distance: number;
  time: number;
  accessible: boolean;
}

/** Zone plan */
export interface ZonePlan {
  id: string;
  name: string;
  type: "gameplay" | "social" | "economy" | "spawn" | "transition" | "secret" | "boss" | "puzzle" | "traversal";
  bounds: Region3Snapshot;
  purpose: string;
  gameplay: ZoneGameplay;
  requirements: ZoneRequirement[];
  assets: BlueprintAsset[];
}

/** Zone gameplay */
export interface ZoneGameplay {
  primary: string[];
  secondary: string[];
  mechanics: string[];
  difficulty: number;
  pacing: "slow" | "medium" | "fast" | "variable";
}

/** Zone requirement */
export interface ZoneRequirement {
  type: "terrain" | "building" | "prop" | "lighting" | "gameplay" | "navigation" | "spawn";
  description: string;
  mandatory: boolean;
}

/** Spawn area plan */
export interface SpawnAreaPlan {
  id: string;
  name: string;
  bounds: Region3Snapshot;
  teamColor?: string;
  capacity: number,
  priority: number;
  protection: "none" | "safe" | "invulnerable" | "contested";
}

/** Performance budget */
export interface PerformanceBudget {
  maxParts: number;
  maxTriangles: number;
  maxDrawCalls: number;
  maxMemoryMB: number;
  maxDrawDistance: number;
  streamingMinRadius: number;
  streamingTargetRadius: number;
  targetFPS: number;
  targetFrameTime: number;
}

/** Aesthetic direction */
export interface AestheticDirection {
  theme: string;
  mood: string;
  colorPalette: ColorPalette;
  architecturalStyle: string;
  visualIdentity: VisualIdentity;
}

/** Color palette */
export interface ColorPalette {
  primary: Color3Snapshot;
  secondary: Color3Snapshot;
  accent: Color3Snapshot;
  background: Color3Snapshot;
  surface: Color3Snapshot;
  text: Color3Snapshot;
  textSecondary: Color3Snapshot;
  border: Color3Snapshot;
  error: Color3Snapshot;
  warning: Color3Snapshot;
  success: Color3Snapshot;
  info: Color3Snapshot;
}

/** Visual identity */
export interface VisualIdentity {
  keyShapes: ShapeDescriptor[];
  silhouettes: SilhouetteDescriptor[];
  materialLanguage: MaterialLanguage;
  lightingMood: LightingMood;
}

/** Shape descriptor */
export interface ShapeDescriptor {
  name: string;
  primitive: string;
  proportions: Vector3Snapshot;
  recurrence: number;
}

/** Silhouette descriptor */
export interface SilhouetteDescriptor {
  angle: number;
  profile: Vector3Snapshot[];
  distinctiveness: number;
}

/** Material language */
export interface MaterialLanguage {
  primary: MaterialPaletteEntry[];
  secondary: MaterialPaletteEntry[];
  accent: MaterialPaletteEntry[];
  rules: MaterialRule[];
}

/** Material rule */
export interface MaterialRule {
  context: string;
  required: string[];
  forbidden: string[];
}

/** Lighting mood */
export interface LightingMood {
  timeOfDay: string;
  weather: string;
  mood: string;
  keyLight: LightDescriptor;
  fillLight: LightDescriptor;
  ambient: Color3Snapshot;
}

/** Light descriptor */
export interface LightDescriptor {
  type: string;
  color: Color3Snapshot;
  intensity: number;
  angle: Vector3Snapshot;
}

/** World-building recommendation */
export interface WorldBuildingRecommendation {
  id: string;
  category: "terrain" | "building" | "material" | "lighting" | "map" | "performance" | "gameplay" | "navigation" | "visual";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  location?: Region3Snapshot;
  effort: "low" | "medium" | "high";
  impact: "high" | "medium" | "low";
  actionable: boolean;
}

/** Color3 snapshot */
export interface Color3Snapshot {
  r: number;
  g: number;
  b: number;
}

/** Vector2 snapshot */
export interface Vector2Snapshot {
  x: number;
  y: number;
}

/** Matrix3x3 snapshot */
export interface Matrix3x3Snapshot {
  m11: number; m12: number; m13: number;
  m21: number; m22: number; m23: number;
  m31: number; m32: number; m33: number;
}

/** CFrame snapshot */
export interface CFrameSnapshot {
  position: Vector3Snapshot;
  rotation: Matrix3x3Snapshot;
}