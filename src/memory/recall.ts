import type { MemoryEntry, MemoryInput } from "./types.js";

/* ============================================================================
 * PURE MEMORY RECALL — DETERMINISTIC MATCHING
 *
 * Everything in this module is a pure function over strings/entries: no
 * model calls, no file I/O, no side effects. The same query yields the same
 * ranked memories, so recall is testable and does not depend on the model.
 *
 * Matching is deliberately simple (token overlap) and language-neutral:
 * Arabic and Latin tokens are both extracted with the same Unicode-aware
 * tokenizer. There is no stemming, no embeddings, no external services —
 * enough signal to surface "the leaderboard we already built" for
 * "حسّن لوحة المتصدرين" without any new dependency.
 * ========================================================================== */

export const MEMORY_DEFAULT_LIMIT = 6;

/**
 * Lowercase + NFC-normalize + collapse whitespace. NFC folds precomposed
 * vs decomposed forms (combined Arabic/vocalized marks, accents) so that
 * identical text always hashes/tokens the same way.
 */
export function normalizeMemoryText(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Stop words that carry no retrieval signal (mixed AR/EN). */
const MEMORY_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "these", "those", "you",
  "your", "not", "are", "was", "were", "from", "into", "its", "has", "have",
  "but", "can", "will", "would", "should", "all", "any", "make", "made",
  "create", "build", "do", "does", "did", "about", "then", "them",
  "اللي", "الذي", "التي", "في", "من", "علي", "على", "الي", "الى", "انا",
  "أنا", "هذا", "هذه", "دي", "ده", "ديه", "بس", "برضو", "كده", "كدا",
  "عايز", "عاوز", "مع", "عند", "كل", "أي", "اي", "لو", "اذا",
]);

/**
 * Extracts normalized matchable tokens (words of >= 2 chars, Arabic or
 * Latin letters/digits/underscore), deduplicated, in order of first
 * appearance.
 */
export function tokenizeMemoryText(text: string): string[] {
  const matches =
    normalizeMemoryText(text).match(/[\p{L}\p{M}\p{N}_]{2,}/gu) ?? [];

  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const token of matches) {
    if (MEMORY_STOP_WORDS.has(token)) {
      continue;
    }

    if (!seen.has(token)) {
      seen.add(token);
      tokens.push(token);
    }
  }

  return tokens;
}

/** Recency decay: 1 for today, falling to 0 over a window. */
const RECENCY_WINDOW_DAYS = 30;

export function getMemoryAgeDays(
  entry: MemoryEntry,
  now = Date.now(),
): number {
  const updated = Date.parse(entry.updatedAt);

  if (Number.isNaN(updated)) {
    return RECENCY_WINDOW_DAYS;
  }

  return Math.max(0, (now - updated) / 86_400_000);
}

/**
 * Scores one entry against the query tokens. Tag hits weigh most, content
 * token hits next, then raw substrings. A strong type (preference/artifact
 * over generic conversation) and newer entries get small boosts. Returns 0
 * when the entry has no overlap at all.
 */
export function scoreMemoryEntry(
  queryTokens: string[],
  entry: MemoryEntry,
  now = Date.now(),
): number {
  const contentTokens = tokenizeMemoryText(entry.content);
  const tagTokens = entry.tags.flatMap((tag) => tokenizeMemoryText(tag));
  const contentLower = entry.content.toLowerCase();

  let score = 0;

  for (const query of queryTokens) {
    if (tagTokens.includes(query)) {
      score += 3;
    } else if (contentTokens.includes(query)) {
      score += 2;
    } else if (contentLower.includes(query)) {
      score += 1;
    }
  }

  if (score <= 0) {
    return 0;
  }

  const typeWeight: Record<string, number> = {
    preference: 2,
    artifact: 2,
    decision: 1.5,
    lesson: 1.25,
    fact: 1,
    "project-state": 1,
    conversation: 0.5,
  };

  score += typeWeight[entry.type] ?? 0;

  const ageDays = getMemoryAgeDays(entry, now);

  score += Math.max(0, 1 - ageDays / RECENCY_WINDOW_DAYS);

  return score;
}

/**
 * Ranks entries for a query. `boostTypes` additionally weights entries of
 * those types (e.g. artifacts while planning a Roblox build). Only entries
 * with a positive overlap are returned, sorted by score desc, capped at
 * `limit`.
 */
export function rankMemories(
  query: string,
  entries: MemoryEntry[],
  options: { boostTypes?: MemoryEntry["type"][]; limit?: number; now?: number } = {},
): MemoryEntry[] {
  const queryTokens = tokenizeMemoryText(query);

  if (queryTokens.length === 0) {
    return [];
  }

  const now = options.now ?? Date.now();
  const limit = Math.max(1, options.limit ?? MEMORY_DEFAULT_LIMIT);
  const boost = new Set(options.boostTypes ?? []);

  const scored = entries
    .map((entry) => {
      let score = scoreMemoryEntry(queryTokens, entry, now);

      if (score > 0 && boost.has(entry.type)) {
        score += 1;
      }

      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((item) => item.entry);
}

/**
 * Simple substring/tag search, newest first — for the `memory:search` CLI
 * and debugging, not for prompt injection.
 */
export function searchMemories(
  query: string,
  entries: MemoryEntry[],
  limit = 20,
): MemoryEntry[] {
  const tokens = tokenizeMemoryText(query);

  if (tokens.length === 0) {
    return [];
  }

  return entries
    .filter((entry) => {
      const haystack = `${entry.content} ${entry.tags.join(" ")}`.toLowerCase();

      return tokens.some((token) => haystack.includes(token));
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

/** Serializes ranked memories into the system-prompt memory block. */
export function buildMemoryPrompt(
  entries: MemoryEntry[],
  query: string,
): string {
  if (entries.length === 0) {
    return "";
  }

  const rows = entries.map((entry, index) => {
    const detail =
      entry.tags.length > 0 ? `  (tags: ${entry.tags.join(", ")})` : "";

    return `  ${index + 1}. [${entry.type}] ${entry.content}${detail}`;
  });

  return [
    "==================================================",
    "PROJECT MEMORY (from earlier sessions)",
    "==================================================",
    "Durable facts learned from past tasks. Use them to prefer EXISTING",
    "artifacts and avoid repeating past mistakes. If the user refers to",
    "something remembered here, work on that exact instance — never",
    "silently create a sibling or a duplicate.",
    `(recalled for: ${query.slice(0, 160)}${query.length > 160 ? "…" : ""})`,
    ...rows,
    "",
  ].join("\n");
}

/* ============================================================================
 * USER PREFERENCES / STANDING RULES
 *
 * Detect durable rules from a request so they persist across sessions and
 * bias every future task — e.g. the user's standing rule "do EXACTLY what
 * I asked and nothing else" (the justification for the hardened creation
 * guidance) and the language to reply in.
 * ========================================================================== */

const EXACTNESS_RULE_PATTERNS: RegExp[] = [
  /do\s+(?:exactly|only|just)\s+what\s+i\s+(?:ask(?:ed)?|asked)\b/i,
  /only\s+do\s+what\s+i\s+ask/i,
  /nothing\s+(?:else|extra)\b/i,
  /anything\s+(?:else|extra)\b/i,
  /no\s+extra\s+(?:features|stuff|things|artifacts)/i,
  /لا\s+أي\s+شيء\s+(?:زيادة|إضافي|غير)/,
  /متلمسش\s+أي\s+حاجة\s+(?:تانية|زيادة|غير)/,
  /متغيرش\s+أي\s+حاجة\s+(?:تانية|زيادة|غير)/,
  /بلاش\s+(?:إضافات|أي\s+إضافات)/,
  /من\s+غير\s+ما\s+(?:تضيف|أضيف|تكبر|تزيد)/,
];

const EXACTNESS_RULE_CONTENT =
  "قاعدة المستخدم: نفّذ بالظبط اللي اتطلب، ومن غير أي إضافات أو أشياء زيادة. " +
  "(User standing rule: do exactly what was asked, and nothing extra.)";

/**
 * Returns stable preference MemoryInputs derivable from a message. Dedup is
 * the store's job — repeat messages collapse into one entry with a higher
 * hit count. Returns [] when nothing durable is detected.
 */
export function detectUserPreferences(message: string): MemoryInput[] {
  const preferences: MemoryInput[] = [];
  const text = message.trim();

  if (EXACTNESS_RULE_PATTERNS.some((pattern) => pattern.test(text))) {
    preferences.push({
      type: "preference",
      content: EXACTNESS_RULE_CONTENT,
      tags: [
        "user preference",
        "exactness",
        "no extra",
        "لا إضافات",
        "بالظبط",
      ],
      source: "user",
    });
  }

  if (/[\u0600-\u06FF]/.test(text)) {
    preferences.push({
      type: "preference",
      content:
        "المستخدم يكتب بالعربية (أو عربي/إنجليزي معًا): رد دائمًا بالعربية لما يكون الطلب بالعربي.",
      tags: ["user preference", "language", "arabic", "اللغة", "عربي"],
      source: "user",
    });
  }

  return preferences;
}