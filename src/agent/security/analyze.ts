/* ============================================================================
 * SECURITY & SERVER-AUTHORITY REVIEW — deterministic Luau analyzer
 *
 * Every rule is a fixed regex/pattern keyed to a run context. Context is
 * derived from className + placement path so the same source string is
 * judged differently on a Script vs a LocalScript vs a ModuleScript.
 * Severity is table-driven; HIGH means "must not ship unresolved".
 * ========================================================================== */

import type {
  RunContext,
  SecurityArtifact,
  SecurityFinding,
  SecurityGateResult,
  SecurityReview,
  SecuritySeverity,
} from "./types.js";

export function classifyRunContext(
  className: string,
  path: string,
): RunContext {
  if (className === "ModuleScript") {
    return "Shared";
  }

  if (className === "LocalScript") {
    return "Client";
  }

  if (
    /^(StarterPlayer|StarterGui|StarterPack|StarterCharacterScripts|Players)/.test(
      path,
    )
  ) {
    return "Client";
  }

  if (
    /^(ServerScriptService|ServerStorage)/.test(
      path,
    )
  ) {
    return "Server";
  }

  if (className === "Script") {
    return "Server";
  }

  return "Unknown";
}

interface PatternRule {
  code: string;

  category: SecurityFinding["category"];

  /** Contexts where the pattern is a violation → severity there. */
  contexts: Partial<
    Record<RunContext, SecuritySeverity>
  >;

  /** Where a rule ALSO should be noticed when shared/unknown. */
  sharedSeverity?: SecuritySeverity;

  test: RegExp;

  /** Optional richer check for rules regex alone cannot express. */
  predicate?: (
    source: string,
  ) => boolean;

  message: string;

  fix: string;
}

const RULES: PatternRule[] = [
  {
    code: "AUTH-LOCALPLAYER-SERVER",
    category: "server-authority",
    contexts: {
      Server: "HIGH",
    },
    sharedSeverity: "MEDIUM",
    test:
      /game\s*\.\s*Players\.\s*LocalPlayer|Players\.\s*LocalPlayer|GetService\(\s*["']Players["']\s*\)\s*\.\s*LocalPlayer/,
    message:
      'game.Players.LocalPlayer is nil in a server-side Script — it is a client-only singleton. Code using it on the server errors at runtime.',
    fix:
      'Iterate server-side players instead: local players = game:GetService("Players"); for _, player in players:GetPlayers() do ... end',
  },
  {
    code: "AUTH-DATASTORE-CLIENT",
    category: "server-authority",
    contexts: {
      Client: "HIGH",
    },
    sharedSeverity: "INFO",
    test: /DataStoreService|GetDataStore/,
    message:
      "DataStoreService is server-only: a LocalScript/client cannot call GetDataStore and must never be trusted to persist or decide authoritative state.",
    fix:
      "Move DataStore reads/writes and any authoritative decision into a server Script; expose read operations to the client via RemoteFunction and writes via RemoteEvent with server-side validation.",
  },
  {
    code: "CLIENT-SERVICE-ON-SERVER",
    category: "client-service-misuse",
    contexts: {
      Server: "MEDIUM",
      Shared: "MEDIUM",
    },
    test:
      /UserInputService|ContextActionService|VirtualUser/,
    message:
      "UserInputService/ContextActionService are client-side input services; wiring them in a server Script does nothing (no input events fire server-side).",
    fix:
      "Handle input in a LocalScript on the client; have it send validated requests to the server rather than acting authoritatively.",
  },
  {
    code: "REMOTE-DIRECTION-SERVER",
    category: "remote-direction",
    contexts: {
      Server: "MEDIUM",
    },
    test: /:\s*FireServer\s*\(|:\s*InvokeServer\s*\(/,
    message:
      "FireServer/InvokeServer is the client→server direction; issuing it from a server Script is usually backwards (server controls, it does not ask itself).",
    fix:
      "Send client→server signals from the client and handle them server-side; push updates to clients with FireClient / InvokeClient.",
  },
  {
    code: "REMOTE-HANDLER-MISMATCH",
    category: "remote-direction",
    contexts: {
      Client: "MEDIUM",
      Shared: "INFO",
    },
    test: /OnServerEvent/,
    message:
      "OnServerEvent is wired on the server; connecting it inside a LocalScript (client) never receives the server's events.",
    fix:
      "Connect OnServerEvent in a server Script; use OnClientEvent in the LocalScript to receive server-initiated updates.",
  },
  {
    code: "PAYLOAD-UNVALIDATED",
    category: "payload-validation",
    contexts: {
      Server: "HIGH",
      Shared: "MEDIUM",
    },
    test: /OnServerEvent\s*:|OnInvoke\s*\(/,
    predicate: (source) =>
      /SetAsync|UpdateAsync|AddAsync|RemoveAsync|\.Value\s*=\s*|\bValue\s*=\s*/.test(
        source,
      ) &&
      !/tonumber|typeof|pcall|math\.clamp|math\.min|math\.max|whitelist|allowlist|cooldown|assert|GetAttribute|>=|<=|type\s*\(|:IsA\(/.test(
        source,
      ),
    message:
      "Server receives a client payload over a Remote and the handler mutates state with no visible type/range validation — treat every argument as untrusted input.",
    fix:
      "Validate each received argument server-side: typeof(...), tonumber or math.clamp/range checks, ownership checks, rate limiting, and double-check before mutating state (e.g. before SetAsync).",
  },
];

function lineSnippet(
  source: string,
  pattern: RegExp,
): string | undefined {
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line
      .trim()
      .slice(0, 200);

    if (
      trimmed.length > 0 &&
      pattern.test(trimmed)
    ) {
      return trimmed;
    }
  }

  return undefined;
}

/**
 * Runs the full rule set against every provided artifact. Each rule
 * yields at most one finding per artifact (deduped by code + path).
 */
export function analyzeArtifacts(
  artifacts: SecurityArtifact[],
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const artifact of artifacts) {
    const source = artifact.source ?? "";

    const context = classifyRunContext(
      artifact.className,
      artifact.path,
    );

    for (const rule of RULES) {
      const matcher =
        rule.test;

      if (
        !matcher.test(source)
      ) {
        continue;
      }

      if (
        rule.predicate &&
        !rule.predicate(source)
      ) {
        continue;
      }

      const severity =
        rule.contexts[context] ??
        (rule.sharedSeverity !==
          undefined &&
        (context === "Shared" ||
          context === "Unknown")
          ? rule.sharedSeverity
          : undefined);

      if (
        severity ===
        undefined
      ) {
        continue;
      }

      findings.push({
        code: rule.code,
        severity,
        category:
          rule.category,
        path: artifact.path,
        className:
          artifact.className,
        context,
        message: rule.message,
        fix: rule.fix,
        snippet: lineSnippet(
          source,
          rule.test,
        ),
      });
    }
  }

  return findings;
}

export function buildSecurityReview(
  artifacts: SecurityArtifact[],
): SecurityReview {
  const findings =
    analyzeArtifacts(artifacts);

  const blocking = findings.filter(
    (finding) =>
      finding.severity ===
      "HIGH" &&
      (finding.context ===
        "Server" ||
        finding.context ===
          "Client"),
  );

  return {
    artifactsScanned:
      artifacts.length,
    findings,
    blocking,
    rendered:
      renderReview(findings),
  };
}

export function renderReview(
  findings: SecurityFinding[],
): string {
  if (findings.length === 0) {
    return "no security findings";
  }

  const lines = findings.map(
    (finding) =>
      `${finding.severity} [${
        finding.code
      }] ${finding.category} — ${
        finding.path
      } (${finding.className}): ${
        finding.message
      }${finding.snippet ? ` | in: "${finding.snippet}"` : ""}`,
  );

  return `scanned ${findings.length} finding(s)\n- ${lines.join("\n- ")}`;
}

/**
 * Renders the deterministic security block for the verification prompt:
 * lists the HIGH blocking findings and the evidence rule for clearing them
 * (re-inspected Source that no longer triggers the pattern). Empty string
 * when there is nothing blocking.
 */
export function renderBlockingFindingsSection(
  review: SecurityReview,
): string {
  if (review.blocking.length === 0) {
    return "";
  }

  const lines = review.blocking.map(
    (finding) =>
      `- HIGH [${finding.code}] ${finding.path} (${finding.className}): ${finding.message}
  Fix: ${finding.fix}`,
  );

  return [
    "==================================================",
    "SECURITY & SERVER-AUTHORITY (deterministic gate)",
    "==================================================",
    "",
    "The security analyzer flagged HIGH server-authority defects that MUST be",
    "resolved before this task is complete. Fix each flagged artifact IN PLACE,",
    "then re-inspect so the live Studio Source no longer contains the pattern.",
    'A claim of "fixed" is not evidence — the inspected Source must match.',
    "",
    ...lines,
    "",
  ].join("\n");
}

/**
 * Evidence-based clearance: a finding is cleared only when a supplied
 * (inspected) source for the SAME artifact no longer triggers the rule.
 * A model's word that "it is fixed" is not evidence.
 */
export function findingClearedBySources(
  finding: SecurityFinding,
  sources: SecurityArtifact[],
): boolean {
  const updated = sources.find(
    (candidate) =>
      candidate.path ===
      finding.path,
  );

  if (!updated) {
    return false;
  }

  const rule = RULES.find(
    (candidate) =>
      candidate.code ===
      finding.code,
  );

  if (!rule) {
    return false;
  }

  return !rule.test.test(
    updated.source ?? "",
  );
}

export function evaluateSecurityGate(
  review: SecurityReview,
  verifiedSources: SecurityArtifact[],
): SecurityGateResult {
  if (review.blocking.length === 0) {
    return {
      satisfied: true,
      unresolved: [],
    };
  }

  const unresolved =
    review.blocking.filter(
      (finding) =>
        !findingClearedBySources(
          finding,
          verifiedSources,
        ),
    );

  return {
    satisfied:
      unresolved.length ===
      0,
    unresolved,
  };
}