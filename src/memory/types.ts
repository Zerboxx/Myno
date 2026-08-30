/* ============================================================================
 * MEMORY SYSTEM — PERSISTENT PROJECT MEMORY
 *
 * The agent has two memory layers:
 *
 *   1. In-session context (state.messages) — what the model sees while one
 *      task runs. Dies with the process.
 *
 *   2. Persistent project memory (this module) — durable JSON stored under
 *      data/memory.json (or $MEMORY_FILE). Survives restarts so future
 *      sessions can:
 *        - prefer EXISTING artifacts instead of creating duplicates
 *          (e.g. a "لوحة المتصدرين" the agent already built), resolving the
 *          refinement "which one do you mean?" class of failure,
 *        - honour long-standing user rules ("نفّذ بالظبط اللي قاله، غير كده
 *          متلمسش حاجة") across conversations,
 *        - avoid repeating past mistakes (lessons from failed tasks).
 *
 * DESIGN CONSTRAINTS (same as the skills layer):
 *   - Passive, deterministic, language-neutral core (see recall.ts).
 *   - No new runtime dependencies — Node built-ins only.
 *   - Selection/recall is a pure function; the store is a thin file wrapper
 *     around it. Both are unit-testable in isolation.
 * ========================================================================== */

/** Kinds of durable knowledge. */
export type MemoryType =
  /* A Roblox/Studio object the agent created or verified. */
  | "artifact"
  /* A durable project/place fact observed or asserted. */
  | "fact"
  /* An explicit architectural/product decision. */
  | "decision"
  /* A mistake + corrective note, to avoid repeating it. */
  | "lesson"
  /* A standing user rule or preference. */
  | "preference"
  /* A snapshot of observed project state. */
  | "project-state"
  /* A completed task summary. */
  | "conversation";

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  /** Human-readable content (may be Arabic, English, or both). */
  content: string;
  /**
   * Normalized matchable tags. Derived from content plus explicit tags at
   * write time; matched against the current request by recall.ts.
   */
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** Incremented on every recall hit (useful for future ranking). */
  hitCount: number;
  /** Task id, "user", or "manual" — provenance for audits. */
  source: string;
}

export interface MemoryInput {
  type: MemoryType;
  content: string;
  tags?: string[];
  source?: string;
}

export interface MemoryRecallOptions {
  /** Only return these MemoryTypes (e.g. artifacts when plan.needsRoblox). */
  boostTypes?: MemoryType[];
  limit?: number;
}

export interface MemoryRecallResult {
  query: string;
  entries: MemoryEntry[];
}