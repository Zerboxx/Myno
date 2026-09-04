/**
 * P3.5 — Project Map Types
 *
 * Core type definitions for the Project Map abstraction.
 * The Project Map represents the current reality of the Roblox project.
 */

import type { ArtifactNode, ArtifactRelation, EvidenceSource } from "../project-intelligence/graph-types.js";

/** High-level project structure */
export interface ProjectMap {
  /** Unique project identifier */
  projectId: string;
  /** Workspace root path */
  workspaceRoot: string;
  /** DataModel representation */
  dataModel: DataModelSnapshot;
  /** Service registry */
  services: ServiceRegistry;
  /** All instances in the project */
  instances: InstanceSnapshot[];
  /** Scripts and modules */
  scripts: ScriptSnapshot[];
  /** RemoteEvents and RemoteFunctions */
  remotes: RemoteSnapshot[];
  /** Tags and CollectionService usage */
  tags: TagRegistry;
  /** Attributes on instances */
  attributes: AttributeRegistry;
  /** UI hierarchies */
  uiHierarchy: UIHierarchySnapshot;
  /** World geometry and terrain */
  world: WorldSnapshot;
  /** Asset catalog */
  assets: AssetCatalog;
  /** Configuration files */
  configs: ConfigSnapshot[];
  /** Project conventions and conventions */
  conventions: ProjectConventions;
  /** Known systems and their relationships */
  systems: SystemRegistry;
  /** Dependency graph */
  dependencies: DependencyGraph;
  /** Known issues and warnings */
  issues: ProjectIssue[];
  /** Last updated timestamp */
  lastUpdated: number;
  /** Schema version */
  schemaVersion: number;
}

/** DataModel snapshot - represents the live Studio state */
export interface DataModelSnapshot {
  /** Root services */
  services: ServiceSnapshot[];
  /** Workspace hierarchy */
  workspace: WorkspaceSnapshot;
  /** ReplicatedStorage */
  replicatedStorage: StorageSnapshot;
  /** ServerScriptService */
  serverScriptService: StorageSnapshot;
  /** ServerStorage */
  serverStorage: StorageSnapshot;
  /** StarterPlayer */
  starterPlayer: StarterPlayerSnapshot;
  /** StarterGui */
  starterGui: StorageSnapshot;
  /** StarterPack */
  starterPack: StorageSnapshot;
  /** Lighting */
  lighting: LightingSnapshot;
  /** SoundService */
  soundService: SoundServiceSnapshot;
  /** Teams */
  teams: TeamsSnapshot;
  /** Players */
  players: PlayersSnapshot;
}

/** Individual service snapshot */
export interface ServiceSnapshot {
  name: string;
  className: string;
  children: InstanceSnapshot[];
}

/** Workspace hierarchy */
export interface WorkspaceSnapshot {
  parts: PartSnapshot[];
  models: ModelSnapshot[];
  folders: FolderSnapshot[];
  spawns: SpawnSnapshot[];
  terrain: TerrainSnapshot;
}

/** Storage services (ReplicatedStorage, ServerStorage, etc.) */
export interface StorageSnapshot {
  folders: FolderSnapshot[];
  scripts: ScriptSnapshot[];
  modules: ModuleSnapshot[];
  remotes: RemoteSnapshot[];
  assets: AssetSnapshot[];
}

/** StarterPlayer configuration */
export interface StarterPlayerSnapshot {
  scripts: ScriptSnapshot[];
  localScripts: ScriptSnapshot[];
  modules: ModuleSnapshot[];
  characterScripts: ScriptSnapshot[];
  characterLocalScripts: ScriptSnapshot[];
}

/** Lighting configuration */
export interface LightingSnapshot {
  properties: Record<string, unknown>;
  children: InstanceSnapshot[];
}

/** SoundService */
export interface SoundServiceSnapshot {
  properties: Record<string, unknown>;
  children: InstanceSnapshot[];
}

/** Teams configuration */
export interface TeamsSnapshot {
  teams: TeamSnapshot[];
}

/** Players service */
export interface PlayersSnapshot {
  maxPlayers: number;
  preferredPlayers: number;
  characterAutoLoads: boolean;
  respawnTime: number;
}

/** Generic instance snapshot */
export interface InstanceSnapshot {
  path: string; // Full path without game. prefix (e.g., "Workspace.Baseplate")
  className: string;
  name: string;
  parentPath?: string;
  properties: Record<string, unknown>;
  children?: InstanceSnapshot[];
  attributes?: Record<string, unknown>;
  tags?: string[];
}

/** Part instance */
export interface PartSnapshot extends InstanceSnapshot {
  className: "Part" | "MeshPart" | "UnionOperation" | "CornerWedgePart" | "WedgePart" | "CylinderPart" | "BallPart" | "TrussPart";
  size: Vector3Snapshot;
  position: Vector3Snapshot;
  cframe: CFrameSnapshot;
  color: Color3Snapshot;
  material: string;
  anchored: boolean;
  canCollide: boolean;
  canTouch: boolean;
  canQuery: boolean;
  massless: boolean;
  shape: string;
}

/** Model instance */
export interface ModelSnapshot extends InstanceSnapshot {
  className: "Model";
  primaryPartPath?: string;
  parts: PartSnapshot[];
}

/** Folder instance */
export interface FolderSnapshot extends InstanceSnapshot {
  className: "Folder";
  children: InstanceSnapshot[];
}

/** SpawnLocation */
export interface SpawnSnapshot extends InstanceSnapshot {
  className: "SpawnLocation";
  teamColor?: string;
  neutral: boolean;
  duration: number;
}

/** Terrain */
export interface TerrainSnapshot {
  size: Vector3Snapshot;
  maxExtents: Region3Snapshot;
  materials: Map<string, number>; // material -> voxel count
  waterColor: Color3Snapshot;
  waterReflectance: number;
  waterTransparency: number;
  waterWaveSize: number;
  waterWaveSpeed: number;
}

/** Vector3 */
export interface Vector3Snapshot {
  x: number;
  y: number;
  z: number;
}

/** CFrame */
export interface CFrameSnapshot {
  position: Vector3Snapshot;
  rotation: Matrix3x3Snapshot;
}

/** 3x3 rotation matrix */
export interface Matrix3x3Snapshot {
  m11: number; m12: number; m13: number;
  m21: number; m22: number; m23: number;
  m31: number; m32: number; m33: number;
}

/** Region3 */
export interface Region3Snapshot {
  min: Vector3Snapshot;
  max: Vector3Snapshot;
}

/** Color3 */
export interface Color3Snapshot {
  r: number;
  g: number;
  b: number;
}

/** Script */
export interface ScriptSnapshot extends InstanceSnapshot {
  className: "Script" | "LocalScript" | "ModuleScript";
  source: string;
  enabled?: boolean;
  runContext?: "Legacy" | "Server" | "Client";
}

/** ModuleScript */
export interface ModuleSnapshot extends InstanceSnapshot {
  className: "ModuleScript";
  source: string;
}

/** RemoteEvent */
export interface RemoteEventSnapshot extends InstanceSnapshot {
  className: "RemoteEvent";
}

/** RemoteFunction */
export interface RemoteFunctionSnapshot extends InstanceSnapshot {
  className: "RemoteFunction";
}

/** RemoteEvent or RemoteFunction */
export type RemoteSnapshot = RemoteEventSnapshot | RemoteFunctionSnapshot;

/** BindableEvent */
export interface BindableEventSnapshot extends InstanceSnapshot {
  className: "BindableEvent";
}

/** BindableFunction */
export interface BindableFunctionSnapshot extends InstanceSnapshot {
  className: "BindableFunction";
}

/** Team */
export interface TeamSnapshot extends InstanceSnapshot {
  className: "Team";
  teamColor: string;
  autoAssignable: boolean;
}

/** Asset */
export interface AssetSnapshot extends InstanceSnapshot {
  className: string; // ImageLabel, Sound, MeshPart, etc.
  assetId?: string;
}

/** Service registry - maps service names to their snapshots */
export interface ServiceRegistry {
  services: Map<string, ServiceSnapshot>;
}

/** Tag registry - CollectionService tags */
export interface TagRegistry {
  tags: Map<string, TagInfo>;
}

export interface TagInfo {
  name: string;
  instances: string[]; // Instance paths
  category?: string;
}

/** Attribute registry */
export interface AttributeRegistry {
  attributes: Map<string, AttributeInfo>;
}

export interface AttributeInfo {
  instancePath: string;
  attributeName: string;
  value: unknown;
  type: string;
}

/** UI hierarchy */
export interface UIHierarchySnapshot {
  screenGuis: ScreenGuiSnapshot[];
  starterGui: StarterGuiSnapshot;
  starterPlayerScripts: StarterPlayerScriptsSnapshot;
}

/** ScreenGui */
export interface ScreenGuiSnapshot extends InstanceSnapshot {
  className: "ScreenGui";
  resetOnSpawn: boolean;
  zIndexBehavior: "Sibling" | "Global";
  displayOrder: number;
  children: UISnapshot[];
}

/** StarterGui */
export interface StarterGuiSnapshot {
  screenGuis: ScreenGuiSnapshot[];
}

/** StarterPlayerScripts */
export interface StarterPlayerScriptsSnapshot {
  localScripts: ScriptSnapshot[];
  modules: ModuleSnapshot[];
}

/** Generic UI element */
export interface UISnapshot extends InstanceSnapshot {
  className: string;
  properties: Record<string, unknown>;
  children?: UISnapshot[];
}

/** World snapshot - terrain, buildings, zones */
export interface WorldSnapshot {
  terrain: TerrainSnapshot;
  zones: ZoneSnapshot[];
  buildings: BuildingSnapshot[];
  roads: RoadSnapshot[];
  water: WaterSnapshot[];
  props: PropSnapshot[];
  spawnAreas: SpawnAreaSnapshot[];
}

/** Zone */
export interface ZoneSnapshot {
  id: string;
  name: string;
  bounds: Region3Snapshot;
  type: "gameplay" | "safe" | "combat" | "social" | "economy" | "spawn" | "custom";
  properties: Record<string, unknown>;
  connectedZones: string[];
}

/** Building */
export interface BuildingSnapshot {
  id: string;
  name: string;
  modelPath: string;
  footprint: Region3Snapshot;
  floors: number;
  entrancePoints: Vector3Snapshot[];
  purpose: "residential" | "commercial" | "industrial" | "government" | "recreational" | "utility" | "custom";
  architecturalStyle?: string;
  materials: string[];
  height: number;
  footprintArea: number;
}

/** Road */
export interface RoadSnapshot {
  id: string;
  name: string;
  path: Vector3Snapshot[]; // waypoints
  width: number;
  material: string;
  lanes: number;
  connects: string[]; // zone/building IDs
}

/** Water body */
export interface WaterSnapshot {
  id: string;
  name: string;
  type: "lake" | "river" | "ocean" | "pool" | "fountain";
  bounds: Region3Snapshot;
  waterColor: Color3Snapshot;
  waterReflectance: number;
  waterTransparency: number;
}

/** Prop */
export interface PropSnapshot {
  id: string;
  name: string;
  modelPath: string;
  position: Vector3Snapshot;
  rotation: CFrameSnapshot;
  scale: Vector3Snapshot;
  category: "nature" | "urban" | "industrial" | "interior" | "decoration" | "gameplay";
}

/** Spawn area */
export interface SpawnAreaSnapshot {
  id: string;
  name: string;
  bounds: Region3Snapshot;
  teamColor?: string;
  capacity: number;
  priority: number;
}

/** Asset catalog */
export interface AssetCatalog {
  meshes: MeshAsset[];
  images: ImageAsset[];
  sounds: SoundAsset[];
  animations: AnimationAsset[];
  fonts: FontAsset[];
}

export interface MeshAsset {
  id: string;
  name: string;
  assetId: string;
  meshId: string;
  scale: Vector3Snapshot;
  format: "MeshPart" | "SpecialMesh" | "FileMesh";
}

export interface ImageAsset {
  id: string;
  name: string;
  assetId: string;
  imageType: "decal" | "texture" | "image" | "sprite";
  format: string;
}

export interface SoundAsset {
  id: string;
  name: string;
  assetId: string;
  soundId: string;
  volume: number;
  pitch: number;
  looped: boolean;
}

export interface AnimationAsset {
  id: string;
  name: string;
  assetId: string;
  animationId: string;
  looped: boolean;
  priority: "Core" | "Movement" | "Idle" | "Action";
}

export interface FontAsset {
  id: string;
  name: string;
  assetId: string;
  fontFamily: string;
  weight: string;
  style: string;
}

/** Config snapshot */
export interface ConfigSnapshot {
  path: string;
  name: string;
  format: "json" | "lua" | "yaml" | "toml";
  content: Record<string, unknown>;
  schemaVersion?: number;
}

/** Project conventions */
export interface ProjectConventions {
  naming: NamingConventions;
  folderStructure: FolderStructureConventions;
  scriptConventions: ScriptConventions;
  uiConventions: UIConventions;
  buildingConventions: BuildingConventions;
  namingPatterns: NamingPatterns;
  securityRules: SecurityConventions;
  performanceRules: PerformanceConventions;
}

export interface NamingConventions {
  services: NamingRule;
  scripts: NamingRule;
  modules: NamingRule;
  remotes: NamingRule;
  instances: NamingRule;
  assets: NamingRule;
  uiElements: NamingRule;
  variables: NamingRule;
  functions: NamingRule;
  constants: NamingRule;
  attributes: NamingRule;
  tags: NamingRule;
}

export interface NamingRule {
  pattern: string;
  caseStyle: "PascalCase" | "camelCase" | "snake_case" | "SCREAMING_SNAKE_CASE";
  prefix?: string;
  suffix?: string;
  examples: string[];
}

export interface FolderStructureConventions {
  workspace: FolderRule[];
  replicatedStorage: FolderRule[];
  serverScriptService: FolderRule[];
  serverStorage: FolderRule[];
  starterPlayer: FolderRule[];
  starterGui: FolderRule[];
  starterPack: FolderRule[];
  lighting: FolderRule[];
}

export interface FolderRule {
  name: string;
  purpose: string;
  required: boolean;
  children?: FolderRule[];
}

export interface ScriptConventions {
  moduleStructure: "single-file" | "folder-per-module";
  strictTyping: boolean;
  requirePaths: "relative" | "absolute";
  lifecycleManagement: "manual" | "auto";
  errorHandling: "try-catch" | "pcall" | "xpcall" | "Result";
  eventPatterns: "Signal" | "BindableEvent" | "RemoteEvent" | "Custom";
  stateManagement: "values" | "attributes" | "module-state" | "external";
}

export interface UIConventions {
  designSystem: "custom" | "rojo" | "roact" | "fusion" | "none";
  colorPalette: ColorPalette;
  spacing: SpacingScale;
  typography: TypographyScale;
  borderRadius: BorderRadiusScale;
  shadows: ShadowScale;
  animation: AnimationConventions;
  responsiveBreakpoints: BreakpointMap;
}

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

export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface TypographyScale {
  fontFamily: string;
  h1: FontStyle;
  h2: FontStyle;
  h3: FontStyle;
  body: FontStyle;
  caption: FontStyle;
  button: FontStyle;
}

export interface FontStyle {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: number;
}

export interface BorderRadiusScale {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface ShadowScale {
  none: ShadowStyle;
  sm: ShadowStyle;
  md: ShadowStyle;
  lg: ShadowStyle;
  xl: ShadowStyle;
}

/** Vector2 */
export interface Vector2Snapshot {
  x: number;
  y: number;
}

export interface ShadowStyle {
  offset: Vector2Snapshot;
  blur: number;
  color: Color3Snapshot;
  transparency: number;
}

export interface AnimationConventions {
  durations: DurationMap;
  easings: EasingMap;
}

export interface DurationMap {
  instant: number;
  fast: number;
  normal: number;
  slow: number;
}

export interface EasingMap {
  linear: string;
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  bounce: string;
  elastic: string;
}

export interface BreakpointMap {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

export interface BuildingConventions {
  gridSize: number;
  defaultMaterial: string;
  defaultColor: Color3Snapshot;
  defaultScale: Vector3Snapshot;
  defaultAnchored: boolean;
  defaultCanCollide: boolean;
  modular: boolean;
  componentLibrary: ComponentLibraryEntry[];
}

export interface ComponentLibraryEntry {
  id: string;
  name: string;
  category: string;
  modelPath: string;
  boundingBox: Region3Snapshot;
  defaultScale: Vector3Snapshot;
  tags: string[];
}

export interface NamingPatterns {
  services: string;
  scripts: string;
  modules: string;
  remotes: string;
  instances: string;
  assets: string;
  ui: string;
  variables: string;
  functions: string;
  constants: string;
  attributes: string;
  tags: string;
}

export interface SecurityConventions {
  validationRules: ValidationRule[];
  forbiddenPatterns: ForbiddenPattern[];
  requiredValidations: RequiredValidation[];
}

export interface ValidationRule {
  name: string;
  description: string;
  appliesTo: string[];
  severity: "error" | "warning" | "info";
}

export interface ForbiddenPattern {
  pattern: string;
  description: string;
  severity: "error" | "warning";
}

export interface RequiredValidation {
  context: string;
  requiredChecks: string[];
}

export interface PerformanceConventions {
  maxPartsPerModel: number;
  maxInstancesPerFolder: number;
  maxScriptsPerService: number;
  maxRemoteEvents: number;
  maxRemoteFunctions: number;
  maxAttributesPerInstance: number;
  maxTagsPerInstance: number;
  textureSizeLimit: number;
  meshComplexityLimit: number;
  streamingEnabled: boolean;
  streamingMinRadius: number;
  streamingTargetRadius: number;
}

/** System registry - known systems and their metadata */
export interface SystemRegistry {
  systems: Map<string, SystemInfo>;
}

export interface SystemInfo {
  id: string;
  name: string;
  type: "gameplay" | "ui" | "economy" | "inventory" | "combat" | "npc" | "social" | "progression" | "utility" | "infrastructure";
  status: "active" | "deprecated" | "experimental" | "broken";
  description: string;
  entryPoints: string[]; // Script/Module paths
  dependencies: string[];
  dependents: string[];
  owner?: string;
  version: string;
  lastModified: number;
  tags: string[];
}

/** Dependency graph */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  type: "script" | "module" | "remote" | "asset" | "service" | "ui" | "instance";
  path: string;
  name: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "requires" | "imports" | "fires" | "listens" | "parents" | "references" | "replicates";
  strength: "strong" | "weak";
}

/** Project issue/warning */
export interface ProjectIssue {
  id: string;
  severity: "critical" | "error" | "warning" | "info";
  category: "architecture" | "security" | "performance" | "maintainability" | "duplication" | "naming" | "placement" | "verification" | "missing" | "configuration";
  message: string;
  location?: string;
  affectedPaths: string[];
  suggestedFix?: string;
  confidence: number;
}

/** Project Map schema version */
export const PROJECT_MAP_SCHEMA_VERSION = 1;

/** Project Map configuration */
export interface ProjectMapConfig {
  includeInstances: boolean;
  includeScripts: boolean;
  includeRemotes: boolean;
  includeUI: boolean;
  includeWorld: boolean;
  includeAssets: boolean;
  includeConfigs: boolean;
  includeConventions: boolean;
  includeSystems: boolean;
  includeDependencies: boolean;
  includeIssues: boolean;
  maxDepth: number;
  scanTimeoutMs: number;
}

/** Default project map configuration */
export const DEFAULT_PROJECT_MAP_CONFIG = {
  includeInstances: true,
  includeScripts: true,
  includeRemotes: true,
  includeUI: true,
  includeWorld: true,
  includeAssets: true,
  includeConfigs: true,
  includeConventions: true,
  includeSystems: true,
  includeDependencies: true,
  includeIssues: true,
  maxDepth: 10,
  scanTimeoutMs: 30000,
};