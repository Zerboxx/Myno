/**
 * P3.6-C — Context Assembly
 *
 * Converts ContextSelectionResult into LLM-visible Context Package.
 * Deterministic ordering, explicit trust boundaries, no raw object dumps.
 */

import type {
  ContextEvidence,
  ContextCollection,
  ContextSelectionResult,
  SelectedContextEvidence,
  ContextSelectionStage,
  TrustLevel,
  EvidenceDetailLevel,
  SecurityClassification,
  ContextReference,
  ProgressiveDisclosureMetadata,
} from "./types.js";
import { getDeduplicationGroups } from "./collection.js";
import { isTrustAllowedFor } from "./runtime/isolation.js";

/* ============================================================================
 * ASSEMBLY SECTIONS
 * ========================================================================== */

export type AssemblySection =
  | "TASK_EVIDENCE"
  | "PROJECT_FACTS"
  | "CRITICAL_CONSTRAINTS"
  | "SECURITY_EVIDENCE"
  | "ARCHITECTURE_EVIDENCE"
  | "EXECUTION_STATE"
  | "VERIFICATION_EVIDENCE"
  | "LESSONS"
  | "UNCERTAINTIES"
  | "DEFERRED_EVIDENCE";

export interface AssembledContext {
  sections: Map<AssemblySection, string>;
  totalTokens: number;
  tokenBudget: number;
  stage: ContextSelectionStage;
  deterministicHash: string;
  disclosureMetadata: ProgressiveDisclosureMetadata;
}

/* ============================================================================
 * MAIN ASSEMBLY
 * ========================================================================== */

export function assembleContext(
  collection: ContextCollection,
  selection: ContextSelectionResult,
  references: ContextReference[],
  stage: ContextSelectionStage,
): AssembledContext {
  // Map evidence by ID for quick lookup
  const evidenceMap = new Map(collection.evidence.map(e => [e.id, e]));

  // Build sections
  const sections = new Map<AssemblySection, string>();

  // 1. TASK_EVIDENCE - user input, constraints
  const taskSection = buildSection("TASK_EVIDENCE", selection.selected, evidenceMap, ev =>
    ev.kind === "user-input" || ev.kind === "constraint"
  );
  if (taskSection) sections.set("TASK_EVIDENCE", taskSection);

  // 2. CRITICAL_CONSTRAINTS - security-critical, critical priority
  const criticalSection = buildSection("CRITICAL_CONSTRAINTS", selection.selected, evidenceMap, ev =>
    ev.securityClassification === "security-critical" || ev.criticality === "critical"
  );
  if (criticalSection) sections.set("CRITICAL_CONSTRAINTS", criticalSection);

  // 3. SECURITY_EVIDENCE
  const securitySection = buildSection("SECURITY_EVIDENCE", selection.selected, evidenceMap, ev =>
    ev.kind === "security" || ev.kind === "remote-security"
  );
  if (securitySection) sections.set("SECURITY_EVIDENCE", securitySection);

  // 4. ARCHITECTURE_EVIDENCE
  const archSection = buildSection("ARCHITECTURE_EVIDENCE", selection.selected, evidenceMap, ev =>
    ev.kind === "architecture" || ev.kind === "constitution"
  );
  if (archSection) sections.set("ARCHITECTURE_EVIDENCE", archSection);

  // 5. PROJECT_FACTS - project-map, code, placement, dependency
  const projectSection = buildSection("PROJECT_FACTS", selection.selected, evidenceMap, ev =>
    ev.kind === "project-map" || ev.kind === "code" || ev.kind === "placement" || ev.kind === "dependency"
  );
  if (projectSection) sections.set("PROJECT_FACTS", projectSection);

  // 6. EXECUTION_STATE
  const execSection = buildSection("EXECUTION_STATE", selection.selected, evidenceMap, ev =>
    ev.kind === "observation" || ev.kind === "code-error" || ev.kind === "runtime-error"
  );
  if (execSection) sections.set("EXECUTION_STATE", execSection);

  // 7. VERIFICATION_EVIDENCE
  const verSection = buildSection("VERIFICATION_EVIDENCE", selection.selected, evidenceMap, ev =>
    ev.kind === "verification"
  );
  if (verSection) sections.set("VERIFICATION_EVIDENCE", verSection);

  // 8. LESSONS
  const lessonsSection = buildSection("LESSONS", selection.selected, evidenceMap, ev =>
    ev.kind === "lesson" || ev.kind === "failure-pattern"
  );
  if (lessonsSection) sections.set("LESSONS", lessonsSection);

  // 9. UNCERTAINTIES - conflicts, stale, unknown confidence
  const uncertaintySection = buildUncertaintySection(selection, evidenceMap);
  if (uncertaintySection) sections.set("UNCERTAINTIES", uncertaintySection);

  // 10. DEFERRED_EVIDENCE
  const deferredSection = buildDeferredSection(references);
  if (deferredSection) sections.set("DEFERRED_EVIDENCE", deferredSection);

  // Compute totals
  const totalTokens = Array.from(sections.values()).reduce((sum, s) => sum + estimateTokens(s), 0);

  // Deterministic hash
  const hashInput = `${stage}|${selection.deterministicHash}|${Array.from(sections.keys()).join(",")}`;
  const deterministicHash = hashString(hashInput);

  return {
    sections,
    totalTokens,
    tokenBudget: selection.tokenBudget,
    stage,
    deterministicHash,
    disclosureMetadata: {
      totalEvidence: collection.evidence.length,
      includedEvidence: selection.selected.length,
      deferredEvidence: references.length,
      deferredByReason: {},
      retrievableCount: references.filter(r => r.availability !== "deferred-not-currently-exposed").length,
      notRetrievableCount: references.filter(r => r.availability === "deferred-not-currently-exposed").length,
    },
  };
}

/* ============================================================================
 * SECTION BUILDERS
 * ========================================================================== */

function buildSection(
  sectionName: AssemblySection,
  selected: SelectedContextEvidence[],
  evidenceMap: Map<string, ContextEvidence>,
  filter: (ev: ContextEvidence) => boolean,
): string | null {
  const items: string[] = [];

  for (const sel of selected) {
    const ev = evidenceMap.get(sel.evidenceId);
    if (!ev) continue;
    if (!filter(ev)) continue;

    const rendered = renderEvidence(ev, sel.detailLevel, sel.reasons);
    if (rendered) items.push(rendered);
  }

  if (items.length === 0) return null;

  // Add section header
  return `=== ${sectionName} ===\n${items.join("\n\n")}`;
}

function buildUncertaintySection(
  selection: ContextSelectionResult,
  evidenceMap: Map<string, ContextEvidence>,
): string | null {
  const items: string[] = [];

  // Dropped evidence with reasons. METADATA ONLY — dropped evidence is
  // never exposed in the model-visible assembly, and outside the
  // instruction trust allowlist ("system"/"project-data") it is omitted
  // entirely so a hostile external note inspected by a collector can
  // never echo itself into the instruction context.
  for (const dropped of selection.dropped) {
    const ev = evidenceMap.get(dropped.evidenceId);
    if (!ev) continue;
    if (!isTrustAllowedFor(ev.trustLevel, "instruction")) continue;
    items.push(`DROPPED [${dropped.reason}]: ${ev.kind} from ${ev.source.sourceName} (trust: ${ev.trustLevel})`);
  }

  // Deferred evidence. METADATA ONLY — never the content.
  for (const deferredId of selection.deferred) {
    const ev = evidenceMap.get(deferredId);
    if (!ev) continue;
    if (!isTrustAllowedFor(ev.trustLevel, "instruction")) continue;
    items.push(`DEFERRED: ${ev.kind} from ${ev.source.sourceName} (trust: ${ev.trustLevel})`);
  }

  // Low confidence. METADATA ONLY (already content-free).
  for (const sel of selection.selected) {
    const ev = evidenceMap.get(sel.evidenceId);
    if (!ev) continue;
    if (ev.confidence === "unknown" || (typeof ev.confidence === "number" && ev.confidence < 0.5)) {
      if (!isTrustAllowedFor(ev.trustLevel, "instruction")) continue;
      items.push(`LOW CONFIDENCE: ${ev.kind} from ${ev.source.sourceName} (confidence: ${ev.confidence === "unknown" ? "unknown" : ev.confidence})`);
    }
  }

  if (items.length === 0) return null;

  return `=== UNCERTAINTIES ===\n${items.join("\n")}`;
}

function buildDeferredSection(references: ContextReference[]): string | null {
  if (references.length === 0) return null;

  // References carry a METADATA-ONLY summary (kind + source) produced by
  // progressive disclosure — never raw content — so a deferred entry can
  // inform the model about existence without leaking the content itself.
  const items = references.map(ref =>
    `[${ref.kind}] ${ref.summary} (deferred: ${ref.reasonDeferred})`
  );

  return `=== DEFERRED EVIDENCE ===\n${items.join("\n")}`;
}

/* ============================================================================
 * EVIDENCE RENDERING WITH TRUST BOUNDARIES
 * ========================================================================== */

function renderEvidence(
  evidence: ContextEvidence,
  detailLevel: EvidenceDetailLevel,
  reasons: string[],
): string {
  const trustTag = formatTrustTag(evidence.trustLevel);
  const sourceTag = formatSourceTag(evidence);
  const detailTag = formatDetailTag(detailLevel);

  let content = renderContent(evidence.content, detailLevel);

  // Apply trust boundary formatting
  content = applyTrustBoundary(content, evidence.trustLevel, evidence.securityClassification);

  const header = `[${evidence.kind}]${sourceTag}${trustTag}${detailTag}`;
  const reasonStr = reasons.length > 0 ? ` (selected: ${reasons.join(", ")})` : "";

  return `${header}\n${content}${reasonStr}`;
}

function renderContent(content: ContextEvidence["content"], detailLevel: EvidenceDetailLevel): string {
  switch (content.type) {
    case "text":
      if (detailLevel === "reference") {
        return truncate(content.value, 80);
      }
      return content.value;

    case "structured":
      if (detailLevel === "reference") {
        return `{ ${Object.keys(content.value).slice(0, 3).join(", ")}... }`;
      }
      if (detailLevel === "compressed") {
        return JSON.stringify(compressStructured(content.value), null, 0);
      }
      return JSON.stringify(content.value, null, 0);

    case "code":
      if (detailLevel === "reference") {
        return `[${content.language} code: ${truncate(content.value, 60)}]`;
      }
      if (detailLevel === "compressed") {
        return `[${content.language}] ${compressCode(content.value)}`;
      }
      return `\`\`\`${content.language}\n${content.value}\n\`\`\``;

    case "error":
      if (detailLevel === "reference") {
        return `Error: ${truncate(content.message, 80)}`;
      }
      return `Error: ${content.message}${content.stack ? `\n${truncate(content.stack, 200)}` : ""}`;

    case "reference":
      return `Reference to ${content.targetKind}: ${content.targetId} — ${content.description}`;

    case "null":
    default:
      return "(empty)";
  }
}

function applyTrustBoundary(
  content: string,
  trustLevel: TrustLevel,
  securityClassification: SecurityClassification,
): string {
  // Security-critical evidence gets special handling
  if (securityClassification === "security-critical") {
    return `[SECURITY-CRITICAL] ${content}`;
  }

  // Trust level determines how content is framed
  switch (trustLevel) {
    case "system":
      return `[SYSTEM] ${content}`;
    case "project-data":
      return `[PROJECT DATA] ${content}`;
    case "user-input":
      return `[USER REQUEST] ${content}`;
    case "external":
      return `[EXTERNAL] ${content}`;
    case "unknown":
    default:
      return `[UNVERIFIED] ${content}`;
  }
}

function formatTrustTag(trustLevel: TrustLevel): string {
  const tags: Record<TrustLevel, string> = {
    system: " [trust:system]",
    "project-data": " [trust:project]",
    "user-input": " [trust:user]",
    external: " [trust:external]",
    unknown: " [trust:unknown]",
  };
  return tags[trustLevel] ?? "";
}

function formatSourceTag(evidence: ContextEvidence): string {
  return ` [src:${evidence.source.sourceId}]`;
}

function formatDetailTag(detailLevel: EvidenceDetailLevel): string {
  const tags: Record<EvidenceDetailLevel, string> = {
    full: "",
    compressed: " [compressed]",
    reference: " [reference]",
  };
  return tags[detailLevel] ?? "";
}

/* ============================================================================
 * COMPRESSION HELPERS
 * ========================================================================== */

function compressStructured(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.length > 100) {
      result[key] = truncate(value, 100) + "...";
    } else if (Array.isArray(value) && value.length > 5) {
      result[key] = [...value.slice(0, 5), `... +${value.length - 5} more`];
    } else {
      result[key] = value;
    }
  }
  return result;
}

function compressCode(code: string): string {
  const lines = code.split("\n");
  if (lines.length <= 10) return code;
  return lines.slice(0, 5).join("\n") + "\n... + " + (lines.length - 5) + " lines";
}

/* ============================================================================
 * FINAL CONTEXT PACKAGE RENDERING
 * ========================================================================== */

export function renderContextPackage(assembled: AssembledContext): string {
  const lines = [
    "<MYNO_CONTEXT>",
    `stage=${assembled.stage}`,
    `tokens=${assembled.totalTokens}/${assembled.tokenBudget}`,
    `hash=${assembled.deterministicHash}`,
    "",
  ];

  // Deterministic section order
  const sectionOrder: AssemblySection[] = [
    "CRITICAL_CONSTRAINTS",
    "TASK_EVIDENCE",
    "SECURITY_EVIDENCE",
    "ARCHITECTURE_EVIDENCE",
    "PROJECT_FACTS",
    "EXECUTION_STATE",
    "VERIFICATION_EVIDENCE",
    "LESSONS",
    "UNCERTAINTIES",
    "DEFERRED_EVIDENCE",
  ];

  for (const section of sectionOrder) {
    const content = assembled.sections.get(section);
    if (content) {
      lines.push(content);
      lines.push("");
    }
  }

  lines.push("</MYNO_CONTEXT>");

  return lines.join("\n");
}

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "..." : str;
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `asm-${Math.abs(hash).toString(16)}`;
}