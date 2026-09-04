/**
 * Semantic Artifact Graph — Project Intelligence Layer
 * =====================================================
 *
 * A deterministic, evidence-backed graph representing the project's
 * artifact topology, relationships, lineage, and verification state.
 *
 * This is NOT a general-purpose graph database. It is a purpose-built,
 * evidence-backed, deterministic data structure for the agent's
 * project intelligence layer.
 */

import type { SkillDefinition } from "../skills/types.js";

/* ============================================================================
 * ARTIFACT NODE
 * ========================================================================== */

/**
 * Kinds of artifacts in the project graph.
 * Kept intentionally coarse — fine-grained Roblox class distinctions
 * are captured via metadata, not the type enum.
 */
export type ArtifactType =
  | "gui"           // ScreenGui, Frame, TextButton, etc.
  | "script"        // Script, LocalScript, ModuleScript
  | "remote"        // RemoteEvent, RemoteFunction
  | "data"          // DataStore, DataStoreService, leaderstats
  | "model"         // Model, Part, MeshPart, NPC
  | "asset"         // MeshPart, Decal, Sound, Animation
  | "config"        // ModuleScript configs, settings
  | "service"       // Services in ServerScriptService
  | "remote"        // RemoteEvent, RemoteFunction
  | "module"        // ModuleScript
  | "part"          // Part, MeshPart, Terrain
  | "model"         // Model (NPC, building, etc.)
  | "service"       // Service in ServerScriptService
  | "unknown";

/**
 * Stable artifact identifier.
 * Uses UUID for global uniqueness.
 */
export type ArtifactId = string & { readonly __brand: unique symbol };

/**
 * Kinds of relationships between artifacts.
 * These are the ONLY relationship types in the graph.
 * The list is intentionally finite and closed.
 */
export type RelationType =
  | "depends-on"       // A depends on B (A requires B to function)
  | "uses"             // A uses B (A calls B, A reads B)
  | "contains"         // A contains B (parent-child hierarchy)
  | "controls"         // A controls B (A orchestrates B)
  | "fires"            // A fires B (RemoteEvent firing)
  | "invokes"          // A invokes B (RemoteFunction invocation)
  | "handles"          // A handles B (event handler)
  | "reads"            // A reads B (DataStore read)
  | "writes"           // A writes B (DataStore write)
  | "configures"       // A configures B
  | "validates"        // A validates B
  | "contains-script"  // Parent contains script
  | "handles-event"    // A handles B's event
  | "listens-to"       // A listens to B's events
  | "spawns"           // A spawns B
  | "references";      // Generic reference

/**
 * Source of truth for an artifact or relationship.
 * Every claim in the graph must be traceable to evidence.
 */
export type EvidenceSource =
  | { type: "inspection"; tool: string; timestamp: number; details?: string }
  | { type: "tool-result"; tool: string; timestamp: number; toolResult: unknown }
  | { type: "execution"; tool: string; timestamp: number; result: unknown }
  | { type: "source-analysis"; file: string; timestamp: number; details?: string }
  | { type: "verification"; tool: string; timestamp: number; result: unknown }
  | { type: "placement"; placement: string; timestamp: number }
  | { type: "memory"; memoryId: string; timestamp: number }
  | { type: "placement-engine"; rule: string; timestamp: number }
  | { type: "skill-output"; skill: string; timestamp: number; tool: string }
  | { type: "manual"; author: string; timestamp: number; reason: string };

/**
 * Evidence reference — lightweight pointer to evidence.
 */
export interface EvidenceRef {
  source: EvidenceSource;
  timestamp: number;
}

/**
 * Relationship between two artifacts.
 * Every relationship MUST be backed by at least one EvidenceRef.
 */
export interface ArtifactRelation {
  id: string;                          // UUID
  source: string;                      // source artifact id
  target: string;                      // target artifact id
  type: RelationType;
  evidence: EvidenceRef[];             // MUST have at least one
  createdAt: number;                   // timestamp
  metadata?: Record<string, unknown>;  // optional: weight, confidence, etc.
}

/**
 * Operation kind used for pre-execution impact analysis.
 */
export type OperationKind =
  | "create"
  | "modify"
  | "delete"
  | "execute"
  | "refine"
  | "refine-visual"
  | "refine-behavior"
  | "refine-logic"
  | "test"
  | "debug"
  | "diagnose"
  | "remove"
  | "inspect";

/**
 * Artifact kind classification.
 * Used for filtering and UI.
 */
export type ArtifactKind =
  | "gui"           // ScreenGui, Frame, TextButton, etc.
  | "script"        // Script, LocalScript, ModuleScript
  | "remote"        // RemoteEvent, RemoteFunction
  | "data"          // DataStore, leaderstats
  | "model"         // Model, Part, MeshPart, NPC
  | "asset"         // MeshPart, Decal, Sound, Animation
  | "config"        // ModuleScript config
  | "service"       // Service in ServerScriptService
  | "module"        // ModuleScript
  | "part"          // Part, MeshPart
  | "model-instance" // Model instance
  | "unknown";

/**
 * Artifact verification state.
 * Tracks the lifecycle of verification for an artifact.
 */
export type VerificationState =
  | "unverified"      // Never verified
  | "verified"        // Verified and current
  | "stale"           // Verified but source changed since
  | "failed"          // Verification failed
  | "blocked"         // Blocked by security gate

/**
 * Artifact metadata — flexible key-value for extensibility.
 */
export interface ArtifactMetadata {
  // Roblox-specific
  robloxPath?: string;           // e.g., "Workspace.Map.Walls"
  robloxClassName?: string;      // "Script", "LocalScript", "ScreenGui", etc.
  robloxClassNameExact?: string; // Exact class name from Roblox
  robloxParentPath?: string;     // Parent path in hierarchy
  robloxProperties?: Record<string, unknown>; // Key properties

  // Filesystem
  filesystemPath?: string;       // Relative path in workspace

  // Skill attribution
  originatingSkill?: string;     // Skill that created this artifact
  originatingTaskId?: string;    // Task that created this

  // Configuration
  configKeys?: string[];         // Config keys if it's a config artifact
  tags?: string[];               // Free-form tags

  // Security
  securityReviewed?: boolean;
  securityFindings?: string[];

  // Extensibility
  [key: string]: unknown;
}

/**
 * Core artifact node in the project graph.
 */
export interface ArtifactNode {
  id: string;                          // UUID
  name: string;                        // Human-readable name
  kind: string;                        // Artifact kind (see ArtifactKind)
  type: string;                        // Specific type (e.g., "ScreenGui", "Script")
  kindCategory: "gui" | "script" | "remote" | "data" | "model" | "asset" | "config" | "service" | "module" | "part" | "unknown";
  
  // Identification
  nameExact: string;                   // Exact name as in Roblox/FS
  robloxPath?: string;                 // Full Roblox path (e.g., "StarterGui.ShopGui")
  filesystemPath?: string;             // Filesystem path if file-backed

  // Placement
  robloxParentPath?: string;           // Parent in Roblox hierarchy
  robloxService?: string;              // Service name (e.g., "ServerScriptService")
  folder?: string;                     // Folder name if in a folder

  // Metadata
  metadata: ArtifactMetadata;

  // Lineage
  createdAt: number;                   // Creation timestamp
  updatedAt: number;                   // Last modification timestamp
  createdBySkill?: string;             // Skill that created this
  createdByTaskId?: string;            // Task that created this

  // Verification
  verificationState: "unverified" | "verified" | "stale" | "failed" | "blocked";
  lastVerifiedAt?: number;
  verificationEvidence?: string[];     // Evidence IDs

  // Relationships (outgoing)
  outgoingRelations: string[];         // Relation IDs where this is source
  incomingRelations: string[];         // Relation IDs where this is target

  // System
  createdAtTimestamp: number;
  updatedAtTimestamp: number;
}