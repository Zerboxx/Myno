import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

import {
  normalizeMemoryText,
  rankMemories,
  searchMemories,
} from "./recall.js";
import type {
  MemoryEntry,
  MemoryInput,
  MemoryRecallOptions,
  MemoryRecallResult,
} from "./types.js";

/* ============================================================================
 * PERSISTENT MEMORY STORE
 *
 * Thin file wrapper around the pure recall helpers: JSON on disk by default
 * (data/memory.json, overridable via $MEMORY_FILE or the constructor),
 * atomic-ish writes, best-effort corruption recovery, and a fixed entry cap
 * (oldest evicted). Never throws into the agent loop — all I/O failures are
 * converted to empty/no-op results with a console warning, so the agent
 * works fine with or without memory.
 * ========================================================================== */

const DEFAULT_MAX_ENTRIES = 500;

const DEFAULT_FILE = "data/memory.json";

interface MemoryFileShape {
  version: number;
  entries: MemoryEntry[];
}

export class MemoryStore {
  private entries: MemoryEntry[] = [];

  private enabled = true;

  private loaded = false;

  private readonly filePath: string;

  private readonly maxEntries: number;

  constructor(
    filePath: string = process.env.MEMORY_FILE ?? DEFAULT_FILE,
    maxEntries: number = Number(process.env.MEMORY_MAX_ENTRIES) ||
      DEFAULT_MAX_ENTRIES,
  ) {
    this.filePath = filePath;
    this.maxEntries = Math.max(1, maxEntries);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  get file(): string {
    return this.filePath;
  }

  /* ------------------------------------------------------------------ */
  /* Persistence                                                         */
  /* ------------------------------------------------------------------ */

  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    this.loaded = true;

    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<MemoryFileShape>;

      if (
        parsed &&
        Array.isArray(parsed.entries)
      ) {
        this.entries = parsed.entries
          .filter(
            (entry): entry is MemoryEntry =>
              !!entry &&
              typeof entry.id === "string" &&
              typeof entry.content === "string" &&
              typeof entry.type === "string",
          )
          .slice(0, this.maxEntries);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      /*
       * ENOENT (file not created yet) is normal on first run. A parse
       * failure means the file is corrupt: back it up, start fresh, and
       * tell the user — never silently kill memory.
       */
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== "ENOENT") {
        const backup = `${this.filePath}.corrupt-${Date.now()}`;

        try {
          await rename(this.filePath, backup);
        } catch {
          // Backup best-effort only.
        }

        console.warn(
          `[Memory] Corrupt memory file at ${this.filePath} — moved to ${backup} ` +
            `and starting fresh. (${message})`,
        );
      }
    }
  }

  private async save(): Promise<void> {
    if (this.loaded === false) {
      await this.load();
    }

    const payload: MemoryFileShape = {
      version: 1,
      entries: this.entries,
    };

    const temporary = `${this.filePath}.tmp`;

    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(temporary, JSON.stringify(payload, null, 2), "utf8");
      await rename(temporary, this.filePath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.warn(
        `[Memory] Could not persist memory to ${this.filePath} — ` +
          `continuing in-memory only. (${message})`,
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Write API                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Stores a memory entry. Exact-duplicate content is merged (hitCount++,
   * tags unioned, updatedAt refreshed) instead of appended, so repeated
   * triggers — like the user's standing rule or Arabic replies — settle
   * into one strong entry rather than a pile of copies.
   */
  async remember(input: MemoryInput): Promise<MemoryEntry | null> {
    if (!this.enabled) {
      return null;
    }

    await this.load();

    const content = input.content.trim();
    const key = normalizeMemoryText(content);

    const existing = this.entries.find(
      (entry) => normalizeMemoryText(entry.content) === key,
    );

    if (existing) {
      existing.hitCount += 1;
      existing.updatedAt = new Date().toISOString();

      const merged = new Set([...existing.tags, ...(input.tags ?? [])]);

      existing.tags = [...merged].slice(0, 16);

      await this.save();

      return existing;
    }

    const now = new Date().toISOString();

    const tags = [...new Set(input.tags ?? [])].slice(0, 16);

    const entry: MemoryEntry = {
      id: randomUUID(),
      type: input.type,
      content,
      tags,
      createdAt: now,
      updatedAt: now,
      hitCount: 1,
      source: input.source ?? "manual",
    };

    this.entries.push(entry);

    if (this.entries.length > this.maxEntries) {
      /*
       * Evict oldest first, newest last (array order is insertion order).
       */
      this.entries = this.entries.slice(-this.maxEntries);
    }

    await this.save();

    return entry;
  }

  /* ------------------------------------------------------------------ */
  /* Read API                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Ranked recall for the current request — injected into the system prompt
   * by the agent. Returns [] when memory is off, empty, or unrelated.
   */
  async recall(
    query: string,
    options: MemoryRecallOptions = {},
  ): Promise<MemoryRecallResult> {
    if (!this.enabled) {
      return { query, entries: [] };
    }

    await this.load();

    const entries = rankMemories(query, this.entries, {
      boostTypes: options.boostTypes,
      limit: options.limit,
    });

    for (const entry of entries) {
      entry.hitCount += 1;
    }

    if (entries.length > 0) {
      await this.save();
    }

    return { query, entries };
  }

  /** Substring/tag search, newest first — for the memory: CLI. */
  async search(query: string, limit = 20): Promise<MemoryEntry[]> {
    if (!this.enabled) {
      return [];
    }

    await this.load();

    return searchMemories(query, this.entries, limit);
  }

  async list(): Promise<MemoryEntry[]> {
    await this.load();

    return [...this.entries]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async count(): Promise<number> {
    await this.load();

    return this.entries.length;
  }

  async clear(): Promise<number> {
    await this.load();

    const removed = this.entries.length;

    this.entries = [];

    await this.save();

    return removed;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}