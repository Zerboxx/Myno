/* ============================================================================
 * SECRET DETECTION & REDACTION (B9)
 *
 * Deterministic, bounded redaction of common secret patterns from
 * LOGS / TOOL OUTPUT / MODEL HISTORY. This module is a hygiene helper for
 * output surfaces only. It NEVER rewrites user source code and NEVER
 * treats detection as a security authority — its only job is to stop raw
 * secret values from leaking into diagnostics and model prompts.
 *
 * Design rules:
 *  - Deterministic: same input yields identical findings/redaction.
 *  - Bounded: line count and per-line match count are capped so untrusted
 *    output cannot cause pathological CPU/time usage.
 *  - Explainable: findings carry a stable `kind`; redacted output replaces
 *    matches with a fixed placeholder so it is obvious something was masked.
 *  - No false confidence: detection is conservative and pattern-based. We
 *    flag values that sit behind a known assignment keyword (api_key, token,
 *    secret, password, bearer, private key) or use a well-known token prefix
 *    (sk-, ghp_, AKIA). We never guess at random high-entropy strings.
 * ========================================================================== */

export type SecretKind =
  | "openai-key"
  | "github-token"
  | "aws-access-key"
  | "private-key"
  | "bearer-token"
  | "api-key"
  | "generic-secret";

export const SECRET_MASK = "[REDACTED]";

export interface SecretFinding {
  /** Stable classifier of the matched secret. */
  kind: SecretKind;
  /** 0-based line index the match occurred on. */
  line: number;
  /** Short, non-sensitive reason describing what was masked. */
  reason: string;
}

export interface RedactionResult {
  /** Redacted copy of the input (safe to log/serialize). */
  redacted: string;
  /** True when at least one secret was found and replaced. */
  changed: boolean;
  /** Findings for every match (never includes raw secret values). */
  findings: SecretFinding[];
}

interface SecretRule {
  kind: SecretKind;
  /** Regex whose match (whole or value region) is replaced. */
  pattern: RegExp;
  reason: string;
}

const RULES: readonly SecretRule[] = [
  {
    kind: "openai-key",
    pattern: /sk-[A-Za-z0-9_-]{12,}/g,
    reason: "OpenAI-style API key",
  },
  {
    kind: "github-token",
    pattern: /gh[pousr]_[A-Za-z0-9]{20,}/g,
    reason: "GitHub token",
  },
  {
    kind: "aws-access-key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    reason: "AWS access key",
  },
  {
    kind: "private-key",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    reason: "PEM private key block",
  },
  {
    kind: "bearer-token",
    pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{12,}/gi,
    reason: "Bearer token",
  },
  {
    kind: "api-key",
    pattern: /\b(?:api[_-]?key|apikey)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{8,}["']?/gi,
    reason: "API key assignment",
  },
  {
    kind: "generic-secret",
    pattern: /\b(?:access[_-]?token|auth[_-]?token|client[_-]?secret|refresh[_-]?token|password|passwd|secret)\s*[:=]\s*["']?[A-Za-z0-9._~+/=@!?-]{4,}["']?/gi,
    reason: "Secret/token assignment",
  },
];

/** Hard cap on lines scanned so untrusted output stays bounded. */
export const MAX_REDACTION_LINES = 10_000;
/** Hard cap on matches per line to bound replacement work. */
const MAX_MATCHES_PER_LINE = 64;

/**
 * Detects secret-like values in `text` deterministically, without
 * rewriting anything. Returns findings only (line + kind + reason).
 * Multi-line secrets (private key blocks) are matched against the whole
 * text; line-scoped rules operate per line (line index reported, or -1
 * for multi-line matches).
 */
export function detectSecrets(text: string): SecretFinding[] {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  const findings: SecretFinding[] = [];

  // Multi-line pass: private key blocks span newlines.
  const privateKeyRe = new RegExp(RULES[3].pattern.source, RULES[3].pattern.flags);
  let keyHit: RegExpExecArray | null;
  while (
    (keyHit = privateKeyRe.exec(text)) !== null
  ) {
    findings.push({ kind: "private-key", line: -1, reason: RULES[3].reason });
    if (keyHit[0].length === 0) {
      privateKeyRe.lastIndex += 1;
    }
  }

  const lines = text.split("\n").slice(0, MAX_REDACTION_LINES);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let matchesOnLine = 0;

    for (let r = 0; r < RULES.length; r += 1) {
      const rule = RULES[r];
      if (rule.kind === "private-key") {
        continue; // handled by the whole-text pass above
      }
      if (matchesOnLine >= MAX_MATCHES_PER_LINE) {
        break;
      }

      const re = new RegExp(rule.pattern.source, rule.pattern.flags);
      let hit: RegExpExecArray | null;

      while (
        (hit = re.exec(line)) !== null &&
        matchesOnLine < MAX_MATCHES_PER_LINE
      ) {
        findings.push({
          kind: rule.kind,
          line: i,
          reason: rule.reason,
        });
        matchesOnLine += 1;

        if (hit[0].length === 0) {
          re.lastIndex += 1;
        }
      }
    }
  }

  return findings;
}

/**
 * Returns a redacted copy of `text`. All secret matches are replaced with
 * a fixed placeholder. Never returns raw secret values and never mutates
 * the input.
 */
export function redactSecrets(text: string): RedactionResult {
  const original = String(text);

  if (original.length === 0) {
    return { redacted: original, changed: false, findings: [] };
  }

  const collected: SecretFinding[] = [];

  // Multi-line pass: replace whole private key blocks first.
  let body = original.replace(
    new RegExp(RULES[3].pattern.source, RULES[3].pattern.flags),
    (raw) => {
      collected.push({ kind: "private-key", line: -1, reason: RULES[3].reason });
      return SECRET_MASK;
    },
  );

  const lines = body.split("\n").slice(0, MAX_REDACTION_LINES);

  const outLines = lines.map((line, index) => {
    let out = line;
    let count = 0;

    for (let r = 0; r < RULES.length; r += 1) {
      const rule = RULES[r];
      if (rule.kind === "private-key") {
        continue;
      }
      if (count >= MAX_MATCHES_PER_LINE) {
        break;
      }

      const re = new RegExp(rule.pattern.source, rule.pattern.flags);
      out = out.replace(re, (raw) => {
        count += 1;
        collected.push({
          kind: rule.kind,
          line: index,
          reason: rule.reason,
        });
        return maskToken(raw, rule);
      });
    }

    return out;
  });

  return {
    redacted: outLines.join("\n"),
    changed: collected.length > 0,
    findings: collected,
  };
}

/** Preserves the assignment prefix (e.g. `password=`) and masks the value. */
function maskToken(fullValue: string, rule: SecretRule): string {
  if (rule.kind === "api-key" || rule.kind === "generic-secret") {
    const eq = fullValue.search(/[:=]/);
    const quote = fullValue.search(/["']/);
    const valueStart = Math.max(eq, quote) + 1;
    if (valueStart > 0 && valueStart < fullValue.length) {
      return `${fullValue.slice(0, valueStart)}${SECRET_MASK}`;
    }
  }

  return SECRET_MASK;
}

/**
 * True when a string contains a secret-like value. Convenience predicate
 * for callers that only need a boolean (e.g. to gate a diagnostic).
 */
export function containsSecrets(text: string): boolean {
  return detectSecrets(text).length > 0;
}
