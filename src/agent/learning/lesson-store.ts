/**
 * P3.5 — Lesson Store
 *
 * Stores extracted lessons for retrieval across tasks within a session.
 * Supports relevance-based retrieval and confidence filtering.
 *
 * Limitation: In-memory only. Does not persist across process restarts.
 * Future: Could be backed by project-local file persistence.
 */

/* ============================================================================
 * TYPES
 * ========================================================================== */

export interface StoredLesson {
  /** Unique lesson ID */
  id: string;
  /** The lesson content */
  content: string;
  /** Category of lesson */
  category: "security" | "architecture" | "performance" | "gameplay" | "uiux" | "placement" | "dependency" | "code-quality" | "general";
  /** Source task ID */
  sourceTaskId: string;
  /** When the lesson was learned */
  learnedAt: number;
  /** Confidence in this lesson (0-1) */
  confidence: number;
  /** Keywords for relevance matching */
  keywords: string[];
  /** How many times this lesson has been retrieved and applied */
  retrievalCount: number;
}

/* ============================================================================
 * LESSON STORE
 * ========================================================================== */

export class LessonStore {
  private readonly lessons: StoredLesson[] = [];
  private readonly MAX_LESSONS = 200;
  private readonly MIN_CONFIDENCE = 0.5;

  /**
   * Store a lesson. Deduplicates by content similarity.
   */
  store(lesson: Omit<StoredLesson, "id" | "learnedAt" | "retrievalCount">): void {
    // Deduplicate by content similarity
    const existing = this.lessons.find(
      (l) => this.contentSimilarity(l.content, lesson.content) > 0.8,
    );

    if (existing) {
      // Update confidence to max of both
      existing.confidence = Math.max(existing.confidence, lesson.confidence);
      existing.keywords = [...new Set([...existing.keywords, ...lesson.keywords])];
      return;
    }

    this.lessons.push({
      ...lesson,
      id: `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      learnedAt: Date.now(),
      retrievalCount: 0,
    });

    // Trim to max
    if (this.lessons.length > this.MAX_LESSONS) {
      // Remove lowest confidence lessons
      this.lessons.sort((a, b) => b.confidence - a.confidence);
      this.lessons.splice(this.MAX_LESSONS);
    }
  }

  /**
   * Retrieve lessons relevant to a task description.
   * Returns lessons sorted by relevance * confidence.
   */
  retrieve(taskDescription: string, options?: { maxLessons?: number; minConfidence?: number }): StoredLesson[] {
    const max = options?.maxLessons ?? 10;
    const minConf = options?.minConfidence ?? this.MIN_CONFIDENCE;
    const lower = taskDescription.toLowerCase();
    const tokens = lower.split(/\s+/).filter((t) => t.length > 2);

    const scored = this.lessons
      .filter((l) => l.confidence >= minConf)
      .map((lesson) => {
        let relevance = 0;

        // Keyword matching
        for (const kw of lesson.keywords) {
          if (lower.includes(kw.toLowerCase())) {
            relevance += 0.3;
          }
        }

        // Token matching
        for (const token of tokens) {
          if (lesson.content.toLowerCase().includes(token)) {
            relevance += 0.1;
          }
          if (lesson.keywords.some((kw) => kw.toLowerCase().includes(token))) {
            relevance += 0.15;
          }
        }

        return { lesson, score: relevance * lesson.confidence };
      })
      .filter((s) => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, max);

    // Mark as retrieved
    for (const s of scored) {
      s.lesson.retrievalCount++;
    }

    return scored.map((s) => s.lesson);
  }

  /**
   * Get all lessons (for debugging/testing).
   */
  getAll(): StoredLesson[] {
    return [...this.lessons];
  }

  /**
   * Get lesson count.
   */
  count(): number {
    return this.lessons.length;
  }

  /**
   * Simple content similarity (Jaccard on word tokens).
   */
  private contentSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.toLowerCase().split(/\s+/));
    const tokensB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...tokensA].filter((t) => tokensB.has(t)));
    const union = new Set([...tokensA, ...tokensB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}
