/**
 * Pure, dependency-free helpers for Roblox Studio session/context
 * resolution and related intent parsing.
 *
 * Kept deliberately free of ToolRegistry/Agent coupling so every
 * function here can be unit tested in isolation (see
 * studio-context.test.ts) without spinning up a model provider or a
 * real tool registry.
 */

export type RobloxStudioContextStatus =
  | "not-needed"
  | "unresolved"
  | "resolved"
  | "unavailable";

export interface StudioCandidate {
  id: string;
  name?: string;
}

export interface RobloxStudioContext {
  status: RobloxStudioContextStatus;
  studioId?: string;
  studioName?: string;
  placeId?: string;
  mode?: string;
  discoveredAt?: number;
  availableStudios?: StudioCandidate[];
  error?: string;
}

/* ============================================================================
 * STUDIO DISCOVERY RESULT PARSING
 * ========================================================================== */

/**
 * Used when scanning a discovery tool's RESULT DATA for studio
 * candidates. Broader than the schema pattern below (also accepts a
 * bare "id") because that scan is scoped to a discovery tool's own
 * result — it never runs over arbitrary unrelated tool output — so a
 * generic "id" field there is safe to treat as a studio identifier.
 */
const STUDIO_ID_KEY_PATTERN =
  /^(studio_?id|session_?id|guid|id)$/i;

/**
 * Used when scanning an ARBITRARY tool's input SCHEMA to decide
 * whether to auto-inject studio_id. Deliberately stricter than the
 * pattern above — a bare "id" here could just as easily mean "the
 * instance id to modify" on a completely unrelated tool, and
 * injecting a studio_id into that would corrupt the call instead of
 * fixing it.
 */
const STUDIO_ID_SCHEMA_KEY_PATTERN = /^(studio_?id)$/i;

const STUDIO_NAME_KEY_PATTERN =
  /^(studio_?name|name|title|place_?name)$/i;
const ACTIVE_KEY_PATTERN =
  /^(active|focused|current|is_?active|is_?focused|is_?current)$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Recursively scans an arbitrary tool-result payload (shape unknown —
 * it comes from a real MCP server we don't control) for
 * studio-id-shaped fields, so the runtime doesn't need to hardcode the
 * exact response shape of a specific discovery tool.
 */
function coerceStudioId(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function tryParseJsonPayload(value: string): unknown {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : trimmed).trim();

  if (
    (body.startsWith("{") && body.endsWith("}")) ||
    (body.startsWith("[") && body.endsWith("]"))
  ) {
    try {
      return JSON.parse(body);
    } catch {
      // Fall through to a first-brace slice below.
    }
  }

  const objectStart = body.indexOf("{");
  const arrayStart = body.indexOf("[");
  const start =
    objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)
      ? objectStart
      : arrayStart;

  if (start < 0) {
    return null;
  }

  const closer = body[start] === "{" ? "}" : "]";
  const end = body.lastIndexOf(closer);

  if (end <= start) {
    return null;
  }

  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

function looksLikeStudioRecord(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((key) =>
    /^(studio_?id|place_?id|place_?name|active|focused|is_?active|datamodel|placeid)$/i.test(
      key,
    ),
  );
}

export function extractStudioCandidates(
  data: unknown,
): StudioCandidate[] {
  const results: StudioCandidate[] = [];

  const visit = (node: unknown): void => {
    if (typeof node === "string") {
      const parsed = tryParseJsonPayload(node);

      if (parsed !== null) {
        visit(parsed);
      }

      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }

      return;
    }

    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;

      const idKey = Object.keys(obj).find(
        (key) => STUDIO_ID_KEY_PATTERN.test(key),
      );

      if (idKey) {
        const id = coerceStudioId(obj[idKey]);
        const explicitStudioKey = /studio_?id|session_?id|guid/i.test(
          idKey,
        );

        if (
          id &&
          (explicitStudioKey ||
            UUID_PATTERN.test(id) ||
            looksLikeStudioRecord(obj) ||
            id.length >= 8)
        ) {
          const nameKey = Object.keys(obj).find(
            (key) =>
              STUDIO_NAME_KEY_PATTERN.test(key) &&
              key.toLowerCase() !== idKey.toLowerCase(),
          );

          const name =
            nameKey && typeof obj[nameKey] === "string"
              ? (obj[nameKey] as string)
              : undefined;

          results.push({ id, name });
        }
      }

      for (const value of Object.values(obj)) {
        visit(value);
      }
    }
  };

  visit(data);

  const seen = new Set<string>();

  return results.filter((entry) => {
    if (seen.has(entry.id)) {
      return false;
    }

    seen.add(entry.id);

    return true;
  });
}

/**
 * When multiple Studios are open, look for an explicit
 * active/focused/current signal in the raw discovery payload before
 * ever guessing. Returns null if no such signal exists — callers must
 * NOT fall back to picking one arbitrarily.
 */
export function findActiveStudioCandidate(
  data: unknown,
  candidates: StudioCandidate[],
): StudioCandidate | null {
  let found: StudioCandidate | null = null;

  const visit = (node: unknown): void => {
    if (found) {
      return;
    }

    if (typeof node === "string") {
      const parsed = tryParseJsonPayload(node);

      if (parsed !== null) {
        visit(parsed);
      }

      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }

      return;
    }

    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;

      const idKey = Object.keys(obj).find(
        (key) => STUDIO_ID_KEY_PATTERN.test(key),
      );

      const activeKey = Object.keys(obj).find((key) =>
        ACTIVE_KEY_PATTERN.test(key),
      );

      if (idKey && activeKey) {
        const activeValue = obj[activeKey];
        const isActive =
          activeValue === true ||
          activeValue === 1 ||
          activeValue === "true";

        if (!isActive) {
          for (const value of Object.values(obj)) {
            visit(value);
          }

          return;
        }

        const id = coerceStudioId(obj[idKey]);
        const match = candidates.find((c) => c.id === id);

        if (match) {
          found = match;

          return;
        }
      }

      for (const value of Object.values(obj)) {
        visit(value);
      }
    }
  };

  visit(data);

  return found;
}

/* ============================================================================
 * STALE SESSION DETECTION
 * ========================================================================== */

const STALE_STUDIO_ERROR_PATTERNS = [
  /not connected/i,
  /target is closed/i,
  /target closed/i,
  /session (is )?(closed|invalid|stale)/i,
  /studio (is )?(disconnected|unreachable|closed)/i,
  /invalid.*studio_?id/i,
  /unreachable/i,
];

export function looksLikeStaleStudioError(
  error: string | undefined,
): boolean {
  if (!error) {
    return false;
  }

  return STALE_STUDIO_ERROR_PATTERNS.some((pattern) =>
    pattern.test(error),
  );
}

/* ============================================================================
 * SCHEMA-DRIVEN ARGUMENT NORMALIZATION
 * ========================================================================== */

/**
 * Finds the studio_id-shaped key in a tool's JSON-schema properties,
 * so injection is driven by what the tool's ACTUAL schema declares
 * rather than a hardcoded per-tool argument name.
 */
export function findStudioIdParameterKey(
  schemaProperties: Record<string, unknown> | undefined,
): string | null {
  if (!schemaProperties) {
    return null;
  }

  const key = Object.keys(schemaProperties).find((k) =>
    STUDIO_ID_SCHEMA_KEY_PATTERN.test(k),
  );

  return key ?? null;
}

/**
 * Detects literal placeholder junk that models frequently emit when a
 * schema marks a field required but the value is unknown — e.g. the
 * literal string "studio_id", "<studio_id>", "TODO", "default", or a
 * too-short dummy. Such a value must be treated as MISSING so the
 * resolved studio_id gets injected instead of the placeholder being
 * sent to the MCP server. Genuine Roblox Studio plugin ids are always
 * 36-character UUIDs, so anything shorter is never a real id either.
 */
export function looksLikePlaceholderValue(
  value: string,
): boolean {
  const trimmed = value.trim();

  if (
    /^(studio_?id|session_?id|<[^>]*>|default|example|any|todo|fixme|tbd|placeholder|unknown|none|null|undefined|n\/a|your|your[\s_-]*studio[\s_-]*id|x{2,}|-{2,}|\s*)$/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  return trimmed.length < 8;
}

/**
 * Injects the resolved studio_id into a tool call's arguments, but
 * only when the tool's schema actually has a studio_id-shaped
 * parameter and the model didn't already supply a real value. The
 * literal placeholder strings models hoist into required fields
 * (e.g. "studio_id") are treated as missing, never passed through.
 */
export function normalizeRobloxToolArguments(
  args: Record<string, unknown>,
  studioIdKey: string | null,
  resolvedStudioId: string | undefined,
): {
  normalized: Record<string, unknown>;
  studioIdInjected: boolean;
} {
  if (!studioIdKey || !resolvedStudioId) {
    return { normalized: args, studioIdInjected: false };
  }

  const existing = args[studioIdKey];

  const hasRealExisting =
    typeof existing === "string" &&
    existing.trim().length > 0 &&
    !looksLikePlaceholderValue(existing);

  if (hasRealExisting) {
    return { normalized: args, studioIdInjected: false };
  }

  return {
    normalized: {
      ...args,
      [studioIdKey]: resolvedStudioId,
    },
    studioIdInjected: true,
  };
}

/* ============================================================================
 * READ-ONLY / SCOPED PROTECTION INTENT
 * ========================================================================== */

/**
 * Detects an UNSCOPED "do not modify/build/change anything" style
 * instruction — i.e. genuine full read-only mode.
 *
 * Deliberately narrower than matching any occurrence of "do not
 * modify" anywhere in the message: that naive approach also matches
 * "do not modify the existing house" in "build a bed but do not
 * modify the existing house", which is a SCOPED protection alongside
 * a real, permitted build request — not full read-only. Only a bare,
 * unscoped negation ("anything"/"everything") or an explicit
 * "read-only" phrase counts here.
 */
const FULL_READ_ONLY_PATTERNS = [
  /\b(do not|don't|dont)\s+(modify|change|alter|edit|build|create|add)\s+(anything|everything)\b/,
  /\bread[\s-]?only\b/,
  /\bmake no changes\b/,
  /\bno changes\b/,

  /*
   * Arabic users phrase full read-only differently: "لا تعدل أي حاجة",
   * "متغيرش حاجة", "ممنوع أي تعديل", "فقط مشاهدة". These are matched
   * with ل-ب without tashkeel (as users actually type them).
   */
  /لا\s+تعدل\s+أي\s+(?:حاجة|شيء|شئ)/,
  /لا\s+(?:تغيّر|تغير)\s+أي\s+(?:حاجة|شيء|شئ)/,
  /لا\s+تبدل\s+أي\s+(?:حاجة|شيء|شئ)/,
  /متغيرش\s+(?:أي|اي)?\s*(?:حاجة|شيء|شئ)/,
  /متعدلش\s+(?:أي|اي)?\s*(?:حاجة|شيء|شئ)/,
  /ممنوع\s+(?:أي|اي)\s+(?:تعديل|تغيير)/,
  /فقط\s+(?:مشاهدة|قراءة)/,
];

export function detectFullReadOnlyIntent(
  text: string,
): boolean {
  return FULL_READ_ONLY_PATTERNS.some((pattern) =>
    pattern.test(text),
  );
}

/**
 * Detects a SCOPED protection target ("do not modify the existing
 * house") that should be surfaced to the model as an instruction to
 * respect, without converting the whole request into read-only mode.
 *
 * This is intentionally a lightweight heuristic, not full NL parsing:
 * it captures the phrase following "do not <verb> the/my [existing]
 * <noun phrase>" and hands it back as free text. The architecture has
 * no way to resolve "the existing house" to a specific Roblox
 * instance without semantic understanding, so this is surfaced as
 * prompt-level guidance only — a soft protection, not a hard
 * per-object tool block. That limitation is intentional and should
 * stay documented rather than silently pretended away.
 */
const SCOPED_PROTECTION_PATTERN =
  /\b(?:do not|don't|dont)\s+(?:modify|change|alter|touch|edit)\s+((?:the|my)\s+(?:existing\s+)?[a-z0-9][a-z0-9 _-]{1,40})/gi;

/*
 * Arabic scoped protection: "لا تعدل البيت القديم"، "متدخلش في اللوحة",
 * "متغيرش السيرفر". Uses Unicode property escapes so Arabic noun phrases
 * (with الـ forms) are captured as the protected target.
 */
const ARABIC_SCOPED_PROTECTION_PATTERN =
  /(?:لا\s+)?(?:تعدل|تغيّر|تغير|تبدّل|تبدل|تلمس|تمس)\s+(?:في\s+)?((?:ال)[\p{L}\p{N}][\p{L}\p{N}_\s-]{1,40})/giu;

const ARABIC_SCOPED_PROTECTION_COLLOQUIAL_PATTERN =
  /(?:متعدلش|متغيرش|متدخلش)\s+(?:في\s+)?((?:ال)?[\p{L}\p{N}][\p{L}\p{N}_\s-]{1,30})/giu;

export function detectScopedProtectionTargets(
  text: string,
): string[] {
  const matches: string[] = [];

  const patterns = [
    new RegExp(SCOPED_PROTECTION_PATTERN.source, "gi"),
    new RegExp(ARABIC_SCOPED_PROTECTION_PATTERN.source, "giu"),
    new RegExp(ARABIC_SCOPED_PROTECTION_COLLOQUIAL_PATTERN.source, "giu"),
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      matches.push(match[1].trim());
    }
  }

  return matches;
}