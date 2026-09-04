/**
 * P3.6-D — Tool Execution Effects
 *
 * Computes the observable side effects of a single tool execution on a
 * project. The agent uses this to decide whether model-visible context
 * must be invalidated before the next model call.
 *
 * SECURITY RULE (fail-safe direction):
 * Anything we cannot prove to be read-only is treated as a potential
 * project mutation. Unknown mutations MUST NOT be treated as "no
 * mutation" — they are conservatively invalidating.
 */

import type {
  ContextInvalidationReason,
  ContextEvidence,
} from "../types.js";
import { isInvalidatedByMutation } from "../freshness.js";

/* ============================================================================
 * CONTRACT
 * ========================================================================== */

export interface ToolExecutionEffects {
  /** Whether the tool may have changed project/live-Studio state. */
  projectMutation: boolean;
  /** Whether the exact set of affected paths is known. */
  pathsKnown: boolean;
  /** Paths the tool modified (best-effort, when args expose them). */
  modifiedPaths: string[];
  /** Paths the tool created (best-effort). */
  createdPaths: string[];
  /** Paths the tool deleted (best-effort). */
  deletedPaths: string[];
  /**
   * Whether the mutation touches security-relevant surface
   * (remotes, auth, validation, permissions, ...).
   */
  securityRelevant: boolean;
}

/* ============================================================================
 * TOOL CLASSIFICATION
 * ========================================================================== */

/**
 * Tools proven read-only. This is the only safe whitelist: anything not
 * listed here (and not otherwise proven non-mutating by the registry) is
 * treated conservatively as a potential project mutation.
 */
const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  // Filesystem inspection
  "read_file",
  "read",
  "list_files",
  "list",
  "glob",
  "grep",
  "rg",
  "get_system_info",
  "cat",
  "head",
  "tail",
  // External information sources
  "webfetch",
  "websearch",
  "search",
  // Interaction (no project side effects)
  "question",
  "skill",
  "help",
  // Roblox Studio inspection (read-only surface)
  "get_studio_state",
  "list_studios",
  "get_studio_output",
  "get_output",
  "read_output",
  "get_game_state",
  "get_runtime_errors",
  "get_runtime_output",
  "inspect",
  "inspect_instance",
  "browse",
  "list_models",
  "list_scripts",
  "get_workspace",
  "get_remote_hierarchy",
  "get_remote_tree",
  "describe_studio",
  "identify_studio",
  "get_roblox_version",
]);

/**
 * Tools that execute arbitrary code/commands. Cannot know affected paths
 * statically — always conservatively invalidating when they mutate.
 */
const EXECUTION_TOOLS: ReadonlySet<string> = new Set([
  "run_command",
  "bash",
  "powershell",
  "execute_luau",
  "run_luau",
  "run_code",
  "execute_code",
]);

/** Path-like argument keys read from a raw tool input object. */
const PATH_ARGUMENT_KEYS: readonly string[] = [
  "file_path",
  "filePath",
  "path",
  "target",
  "destination",
  "new_path",
  "old_path",
  "source",
  "file",
  "script_path",
  "instance_path",
];

/** Tool names that create a new file/asset (arg.exposes target path). */
const CREATE_TOOLS: ReadonlySet<string> = new Set([
  "write_file",
  "create_file",
  "mkdir",
  "create_instance",
  "add_script",
  "create_script",
  "clone",
  "duplicate",
]);

/** Tool names that delete a file/asset (arg.exposes target path). */
const DELETE_TOOLS: ReadonlySet<string> = new Set([
  "delete_file",
  "remove",
  "delete_instance",
  "destroy",
  "remove_instance",
  "unlink",
]);

/** Tool names that rename/move a path (args expose old + new path). */
const RENAME_TOOLS: ReadonlySet<string> = new Set([
  "rename",
  "move",
  "mv",
  "rename_file",
]);

/** Path patterns that indicate security-relevant surface. */
const SECURITY_PATH_PATTERNS: readonly RegExp[] = [
  /RemoteEvent/,
  /RemoteFunction/,
  /Remote/i,
  /Authentication/,
  /Authorization/,
  /Permission/,
  /Security/,
  /Auth/i,
  /payment/,
  /currency/,
  /credit/,
  /server.*authority/,
  /validation/,
];

/** Path patterns whose mutation invalidates mutation-sensitive evidence. */
const MUTATION_RELEVANT_PATH_PATTERNS: readonly RegExp[] = [
  /\.luau$/,
  /\.lua$/,
  /\.ts$/,
  /\.tsx$/,
  /\.js$/,
  /\.json$/,
  /\.rbxl$/,
  /\.rbxlx$/,
  /\.rbxm$/,
  /\.rbxmx$/,
  /Script/,
  /ModuleScript/,
  /LocalScript/,
  /RemoteEvent/,
  /RemoteFunction/,
  /ServerScriptService/,
  /StarterPlayer/,
  /ReplicatedStorage/,
  /Placement/,
  /Dependency/,
];

/* ============================================================================
 * PATH EXTRACTION
 * ========================================================================== */

/**
 * Extract path-like arguments from a raw tool input object.
 * Pure and deterministic; returns uniqueness-preserving path list.
 */
export function extractPathArgs(input: unknown): string[] {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return [];
  }

  const paths: string[] = [];
  const record = input as Record<string, unknown>;

  for (const key of PATH_ARGUMENT_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      paths.push(value.trim());
    }
  }

  // Nested `edits[]` objects (e.g. multi-edit tools) expose `path`.
  const edits = record["edits"];
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      if (typeof edit !== "object" || edit === null) continue;
      const p = (edit as Record<string, unknown>)["path"];
      if (typeof p === "string" && p.trim().length > 0) {
        paths.push(p.trim());
      }
    }
  }

  return Array.from(new Set(paths));
}

/* ============================================================================
 * EFFECT COMPUTATION
 * ========================================================================== */

export interface RegisteredToolFlags {
  mutating: boolean;
  destructive: boolean;
  executes: boolean;
}

/**
 * Compute the side effects of a tool execution.
 *
 * `registered` carries the ToolRegistry's authoritative flags when the
 * tool is registered (mutating/destructive/executes). When absent the
 * tool is UNKNOWN and is therefore treated conservatively: a potential
 * project mutation with unknown paths.
 */
export function computeToolExecutionEffects(
  name: string,
  input?: unknown,
  registered?: RegisteredToolFlags,
): ToolExecutionEffects {
  const empty: ToolExecutionEffects = {
    projectMutation: false,
    pathsKnown: true,
    modifiedPaths: [],
    createdPaths: [],
    deletedPaths: [],
    securityRelevant: false,
  };

  if (READ_ONLY_TOOLS.has(name)) {
    return empty;
  }

  // Execute-as-arbitrary-code tools: mutation is possible and the exact
  // outcome cannot be derived from arguments.
  if (EXECUTION_TOOLS.has(name)) {
    const paths = extractPathArgs(input);
    return {
      projectMutation: true,
      pathsKnown: paths.length > 0 && hasExplicitPathArgs(input),
      modifiedPaths: paths,
      createdPaths: [],
      deletedPaths: [],
      securityRelevant: false,
    };
  }

  const isRegistered = registered !== undefined;
  const registeredReadOnly =
    isRegistered &&
    !registered.mutating &&
    !registered.destructive;

  if (registeredReadOnly) {
    return empty;
  }

  // Unknown tool: registrable read-only tools are covered by the
  // whitelist; everything else is a potential mutation.
  const paths = extractPathArgs(input);

  if (isRegistered && registered.executes) {
    return {
      projectMutation: true,
      pathsKnown: false,
      modifiedPaths: paths,
      createdPaths: [],
      deletedPaths: [],
      securityRelevant: false,
    };
  }

  // Paths are only "known" for REGISTERED tools, where the registry flags
  // bound the tool's behavior. An UNREGISTERED tool may do anything the
  // path argument implies and more (hidden scripts, side effects) — it is
  // conservatively treated as paths-unknown so the decision can never
  // downgrade it to a non-relevant "known-path" mutation.
  const pathsKnown = isRegistered && paths.length > 0;

  const effects: ToolExecutionEffects = {
    projectMutation: true,
    pathsKnown,
    modifiedPaths: paths,
    createdPaths: CREATE_TOOLS.has(name) ? paths : [],
    deletedPaths: DELETE_TOOLS.has(name)
      ? paths
      : RENAME_TOOLS.has(name)
        ? [extractOldPath(input)].filter((p): p is string => p !== undefined)
        : [],
    securityRelevant: isSecurityRelevantPath(paths),
  };

  return effects;
}

function hasExplicitPathArgs(input: unknown): boolean {
  return extractPathArgs(input).length > 0;
}

function extractOldPath(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const record = input as Record<string, unknown>;
  const oldPath = record["old_path"] ?? record["source"] ?? record["from"];
  return typeof oldPath === "string" ? oldPath : undefined;
}

/** True when any path touches security-relevant surface. */
export function isSecurityRelevantPath(paths: string[]): boolean {
  return paths.some(path =>
    SECURITY_PATH_PATTERNS.some(pattern => pattern.test(path)),
  );
}

/** True when a path, if modified, invalidates mutation-sensitive evidence. */
export function isMutationRelevantPath(path: string): boolean {
  return MUTATION_RELEVANT_PATH_PATTERNS.some(pattern => pattern.test(path));
}

/* ============================================================================
 * INVALIDATION DECISION
 * ========================================================================== */

export interface ExecutionEffectsDecision {
  invalidate: boolean;
  reason?: ContextInvalidationReason;
  /** True when invalidation is conservative (paths unknown). */
  conservative: boolean;
  /** Evidence kinds the mutation may have invalidated. */
  affectedKinds: readonly string[];
}

/**
 * Convert execution effects into an invalidation decision for the
 * current scope's evidence.
 *
 * Conservative rule: unknown mutation => invalidate (never "no mutation").
 */
export function executionEffectsToDecision(
  effects: ToolExecutionEffects,
  evidence: ContextEvidence[],
): ExecutionEffectsDecision {
  const mutationSensitiveKinds = Array.from(
    new Set(
      evidence
        .filter(e => e.status !== "superseded" && isInvalidatedByMutation(e.kind))
        .map(e => e.kind),
    ),
  );

  const securityCriticalKinds = Array.from(
    new Set(
      evidence
        .filter(e => e.securityClassification === "security-critical")
        .map(e => e.kind),
    ),
  );

  // 1. Security-relevant mutation — highest priority, always invalidates.
  if (effects.securityRelevant && effects.projectMutation) {
    return {
      invalidate: true,
      reason: "security-critical-change",
      conservative: !effects.pathsKnown,
      affectedKinds: [...new Set([...securityCriticalKinds, ...mutationSensitiveKinds])],
    };
  }

  // 2. Unknown-path mutation — conservative invalidation.
  if (effects.projectMutation && !effects.pathsKnown) {
    return {
      invalidate: true,
      reason: "execution-invalidated",
      conservative: true,
      affectedKinds: mutationSensitiveKinds,
    };
  }

  // 3. Known-path mutation — invalidate when it touches sensitive surface.
  if (effects.projectMutation && effects.pathsKnown) {
    const touchedRelevant = effects.modifiedPaths.some(isMutationRelevantPath);
    if (touchedRelevant) {
      return {
        invalidate: true,
        reason: "execution-invalidated",
        conservative: false,
        affectedKinds: [...mutationSensitiveKinds, ...securityCriticalKinds],
      };
    }
    return { invalidate: false, conservative: false, affectedKinds: [] };
  }

  // 4. No mutation.
  return { invalidate: false, conservative: false, affectedKinds: [] };
}