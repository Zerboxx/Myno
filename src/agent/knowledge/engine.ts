/**
 * P3.5 — Roblox Knowledge Layer
 *
 * Structured knowledge base for Roblox development best practices,
 * API references, and platform knowledge.
 */

import type { ProjectMap } from "../project-map/types.js";

/** Roblox Knowledge Entry */
export interface KnowledgeEntry {
  id: string;
  topic: string;
  category: KnowledgeCategory;
  title: string;
  summary: string;
  content: string;
  source: KnowledgeSource;
  version: string;
  lastValidated: number;
  confidence: number;
  tags: string[];
  relatedApis: string[];
  relatedEntries: string[];
  examples: KnowledgeExample[];
  warnings: KnowledgeWarning[];
  deprecated: boolean;
  deprecatedSince?: number;
  replacement?: string;
}

export type KnowledgeCategory =
  | "api"
  | "architecture"
  | "security"
  | "performance"
  | "ui"
  | "world-building"
  | "scripting"
  | "networking"
  | "physics"
  | "animation"
  | "audio"
  | "localization"
  | "analytics"
  | "monetization"
  | "moderation"
  | "accessibility";

export interface KnowledgeSource {
  type: "official" | "community" | "empirical" | "inferred";
  url?: string;
  author?: string;
  date?: number;
  version: string;
}

export interface KnowledgeExample {
  title: string;
  code: string;
  description: string;
  context: string;
}

export interface KnowledgeWarning {
  message: string;
  severity: "info" | "warning" | "critical";
  condition?: string;
}

/** Roblox Knowledge Base */
export interface RobloxKnowledgeBase {
  entries: Map<string, KnowledgeEntry>;
  categories: Map<KnowledgeCategory, string[]>;
  lastUpdated: number;
  version: string;
}

/** Knowledge Base Engine */
export class RobloxKnowledgeEngine {
  private knowledgeBase: RobloxKnowledgeBase;
  private readonly logger: any;

  constructor() {
    this.knowledgeBase = { entries: new Map(), categories: new Map(), lastUpdated: Date.now(), version: "1.0" };
    this.logger = console;
    this.initializeCoreKnowledge();
  }

  private initializeCoreKnowledge(): void {
    // Core Roblox API knowledge
    this.addEntry({
      id: "api-datastore",
      topic: "DataStoreService",
      category: "api",
      title: "DataStoreService - Persistent Data Storage",
      summary: "DataStoreService provides persistent data storage for Roblox experiences.",
      content: "DataStoreService allows you to save and load data that persists across game sessions. Use GetDataStore to get a data store, then SetAsync/GetAsync to write/read data. Always use pcall for error handling.",
      source: { type: "official", url: "https://create.roblox.com/docs/reference/engine/classes/DataStoreService", version: "1.0" },
      confidence: 1.0,
      tags: ["datastore", "persistence", "server"],
      relatedApis: ["GlobalDataStore", "OrderedDataStore", "DataStorePages"],
      relatedEntries: [],
      examples: [
        { title: "Basic DataStore Usage", code: `local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("PlayerData")

local success, result = pcall(function()
    return store:GetAsync("player_" .. player.UserId)
end)

if success then
    print("Loaded data:", result)
else
    warn("Failed to load:", result)
end`, description: "Basic DataStore get/set pattern", context: "Server-side data persistence" },
      ],
      warnings: [{ message: "Always use pcall with DataStore operations", severity: "warning" }],
      deprecated: false,
      version: "1.0",
      lastValidated: Date.now(),
    } as any);

    this.initializeSecurityKnowledge();
    this.initializeBuildingKnowledge();
    this.initializeNetworkingKnowledge();
    this.initializeUIKnowledge();
    this.initializePerformanceKnowledge();
    this.initializeNPCKnowledge();
    this.initializeWorldBuildingKnowledge();
  }

  private initializeSecurityKnowledge(): void {
    const entries = [
      {
        id: "security-remote-validation",
        topic: "Remote Validation",
        category: "security",
        title: "Remote Event/Function Validation",
        summary: "Always validate RemoteEvent and RemoteFunction arguments on the server.",
        content: "Never trust client input. Always validate type, range, ownership, and permissions on the server before processing remote calls.",
        tags: ["security", "remote", "validation"],
        relatedApis: ["RemoteEvent", "RemoteFunction"],
        warnings: [{ message: "Never trust client input", severity: "critical" }],
      },
      {
        id: "security-server-authority",
        topic: "Server Authority",
        category: "security",
        title: "Server-Side Authority for Gameplay",
        summary: "Critical gameplay logic (damage, currency, rewards) must run on the server.",
        content: "The server is authoritative for all gameplay-affecting state. Never let the client directly modify health, currency, inventory ownership, or quest completion. Use RemoteEvents to request actions, validate server-side, then apply.",
        tags: ["security", "server", "authority"],
        relatedApis: ["RemoteEvent"],
        warnings: [{ message: "Client-modified gameplay state is a security vulnerability", severity: "critical" }],
      },
      {
        id: "security-rate-limiting",
        topic: "Rate Limiting",
        category: "security",
        title: "Remote Rate Limiting",
        summary: "Rate-limit client remote calls to prevent abuse.",
        content: "Track the last time each player called a remote. Reject calls that come too frequently. This prevents exploiters from spamming server operations.",
        tags: ["security", "remote", "rate-limit"],
        relatedApis: ["RemoteEvent"],
        warnings: [{ message: "Unlimited remote calls can be exploited for DoS", severity: "high" }],
      },
    ];
    for (const entry of entries) {
      this.addEntry({ ...entry, source: { type: "official", version: "1.0" }, confidence: 1.0, relatedEntries: [], examples: [], deprecated: false, version: "1.0", lastValidated: Date.now() } as any);
    }
  }

  private initializeBuildingKnowledge(): void {
    const entries = [
      {
        id: "building-part-anchoring",
        topic: "Part Anchoring",
        category: "building",
        title: "Always Anchor Static Parts",
        summary: "Static parts must be anchored to prevent physics simulation overhead.",
        content: "Unanchored parts that don't move should be anchored. Unanchored parts participate in physics simulation which costs performance.",
        tags: ["building", "performance", "anchoring"],
        relatedApis: ["Part", "Anchored"],
        warnings: [{ message: "Unanchored parts fall and cause physics calculations", severity: "warning" }],
      },
      {
        id: "building-terrain",
        topic: "Terrain",
        category: "building",
        title: "Terrain for Large Environments",
        summary: "Use Terrain for large natural environments instead of individual parts.",
        content: "Terrain uses voxels which are more memory-efficient than individual parts for large environments. Terrain also renders more efficiently.",
        tags: ["building", "terrain", "performance"],
        relatedApis: ["Terrain"],
        warnings: [],
      },
    ];
    for (const entry of entries) {
      this.addEntry({ ...entry, source: { type: "official", version: "1.0" }, confidence: 1.0, relatedEntries: [], examples: [], deprecated: false, version: "1.0", lastValidated: Date.now() } as any);
    }
  }

  private initializeNetworkingKnowledge(): void {
    const entries = [
      {
        id: "networking-remote-event-vs-function",
        topic: "RemoteEvent vs RemoteFunction",
        category: "networking",
        title: "Prefer RemoteEvent over RemoteFunction",
        summary: "RemoteEvents are non-blocking; RemoteFunctions block the client thread.",
        content: "RemoteFunction calls block the calling thread until the server responds. Use RemoteEvent for most communication. Only use RemoteFunction when you absolutely need a synchronous response.",
        tags: ["networking", "remote", "performance"],
        relatedApis: ["RemoteEvent", "RemoteFunction"],
        warnings: [{ message: "RemoteFunction can freeze the client if the server is slow", severity: "medium" }],
      },
    ];
    for (const entry of entries) {
      this.addEntry({ ...entry, source: { type: "official", version: "1.0" }, confidence: 1.0, relatedEntries: [], examples: [], deprecated: false, version: "1.0", lastValidated: Date.now() } as any);
    }
  }

  private initializeUIKnowledge(): void {
    const entries = [
      {
        id: "ui-responsive-design",
        topic: "Responsive UI Design",
        category: "ui",
        title: "Responsive UI Design",
        summary: "Design UIs that work across all device sizes and aspect ratios.",
        content: "Use UIScale, UIAspectRatioConstraint, and flexible layouts. Test on mobile, tablet, and desktop. Use SafeArea to avoid notch/home indicator overlap.",
        tags: ["ui", "responsive", "mobile"],
        relatedApis: ["UIScale", "UIAspectRatioConstraint", "SafeArea"],
        warnings: [],
      },
      {
        id: "ui-touch-targets",
        topic: "Touch Target Size",
        category: "ui",
        title: "Minimum Touch Target Size",
        summary: "Interactive elements must be large enough for touch input.",
        content: "Minimum touch target should be 44x44 pixels. On Roblox, this translates to approximately 44 studs at default camera distance. Buttons that are too small cause frustration on mobile.",
        tags: ["ui", "mobile", "touch"],
        relatedApis: ["TextButton", "ImageButton"],
        warnings: [{ message: "Small buttons cause frustration on mobile devices", severity: "warning" }],
      },
    ];
    for (const entry of entries) {
      this.addEntry({ ...entry, source: { type: "official", version: "1.0" }, confidence: 1.0, relatedEntries: [], examples: [], deprecated: false, version: "1.0", lastValidated: Date.now() } as any);
    }
  }

  private initializePerformanceKnowledge(): void {
    const entries = [
      {
        id: "perf-tight-loops",
        topic: "Tight Loops",
        category: "performance",
        title: "Avoid Tight Loops Without Yield",
        summary: "while true without wait() or task.wait() freezes the thread.",
        content: "Every while true loop must yield periodically using task.wait() or RunService.Heartbeat:Wait(). A tight loop will freeze the game thread.",
        tags: ["performance", "loop", "freeze"],
        relatedApis: ["task.wait", "RunService"],
        warnings: [{ message: "Tight loops freeze the game", severity: "critical" }],
      },
      {
        id: "perf-instance-count",
        topic: "Instance Count",
        category: "performance",
        title: "Instance Count Limits",
        summary: "Excessive instances degrade performance. Use models and terrain efficiently.",
        content: "Each instance has overhead. Keep part counts under 10,000 for good performance. Use terrain for large environments. Merge small parts into larger ones where possible.",
        tags: ["performance", "instances", "parts"],
        relatedApis: ["Part", "Model", "Terrain"],
        warnings: [{ message: "High instance counts degrade rendering and physics performance", severity: "warning" }],
      },
    ];
    for (const entry of entries) {
      this.addEntry({ ...entry, source: { type: "empirical", version: "1.0" }, confidence: 0.9, relatedEntries: [], examples: [], deprecated: false, version: "1.0", lastValidated: Date.now() } as any);
    }
  }

  private initializeNPCKnowledge(): void {
    const entries = [
      {
        id: "npc-pathfinding",
        topic: "NPC Pathfinding",
        category: "scripting",
        title: "PathfindingService for NPC Movement",
        summary: "Use PathfindingService:ComputeAsync() for NPC pathfinding.",
        content: "PathfindingService computes paths around obstacles. Use MoveTo() on Humanoid after computing path. Cache paths and recalculate only when target moves significantly.",
        tags: ["npc", "pathfinding", "ai"],
        relatedApis: ["PathfindingService", "Humanoid"],
        warnings: [],
      },
    ];
    for (const entry of entries) {
      this.addEntry({ ...entry, source: { type: "official", version: "1.0" }, confidence: 1.0, relatedEntries: [], examples: [], deprecated: false, version: "1.0", lastValidated: Date.now() } as any);
    }
  }

  private initializeWorldBuildingKnowledge(): void {
    const entries = [
      {
        id: "world-lighting",
        topic: "Lighting Setup",
        category: "world-building",
        title: "Lighting and Atmosphere",
        summary: "Proper lighting creates atmosphere and improves player experience.",
        content: "Use Lighting for ambient light, DirectionalLight for sun, PointLights and SpotLights for local illumination. Consider Atmosphere and Sky for outdoor environments.",
        tags: ["world-building", "lighting", "atmosphere"],
        relatedApis: ["Lighting", "DirectionalLight", "PointLight", "SpotLight", "Atmosphere"],
        warnings: [],
      },
    ];
    for (const entry of entries) {
      this.addEntry({ ...entry, source: { type: "official", version: "1.0" }, confidence: 1.0, relatedEntries: [], examples: [], deprecated: false, version: "1.0", lastValidated: Date.now() } as any);
    }
  }

  /**
   * Query knowledge by topic
   */
  async query(query: string, category?: string): Promise<any[]> {
    const results: any[] = [];
    for (const entry of this.knowledgeBase.entries.values()) {
      if (entry.topic.toLowerCase().includes(query.toLowerCase()) ||
          entry.title.toLowerCase().includes(query.toLowerCase()) ||
          entry.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))) {
        if (!category || entry.category === category) {
          results.push(entry);
        }
      }
    }
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get knowledge by category
   */
  async getByCategory(category: string): Promise<any[]> {
    const ids = this.knowledgeBase.categories.get(category as KnowledgeCategory) || [];
    return ids.map(id => this.knowledgeBase.entries.get(id)).filter(Boolean);
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): any | null {
    return this.knowledgeBase.entries.get(id) || null;
  }

  /**
   * Add or update knowledge entry
   */
  addEntry(entry: any): void {
    this.knowledgeBase.entries.set(entry.id, entry);
    if (!this.knowledgeBase.categories.has(entry.category)) {
      this.knowledgeBase.categories.set(entry.category, []);
    }
    this.knowledgeBase.categories.get(entry.category)!.push(entry.id);
    this.knowledgeBase.lastUpdated = Date.now();
  }

  /**
   * Get knowledge statistics
   */
  getStats(): { totalEntries: number; categories: Record<string, number>; lastUpdated: number } {
    const categories: Record<string, number> = {};
    for (const [cat, ids] of this.knowledgeBase.categories) {
      categories[cat] = ids.length;
    }
    return {
      totalEntries: this.knowledgeBase.entries.size,
      categories,
      lastUpdated: this.knowledgeBase.lastUpdated,
    };
  }
}

export function createRobloxKnowledgeEngine(): any {
  return new RobloxKnowledgeEngine();
}