/**
 * Pure verification-evidence helpers.
 *
 * These decide whether the agent produced build evidence and whether it
 * inspected the created object afterward. They are intentionally free of
 * Agent/state coupling so the exact class of bug where a mutating tool
 * (e.g. `roblox_multi_edit`) was mis-classified as read-only can be unit
 * tested directly.
 */

export interface ToolExecutionLike {
  name: string;
  success: boolean;
}

export function isBuildEvidenceToolByName(
  name: string,
  getGroup?: (name: string) => string | undefined,
): boolean {
  if (getGroup) {
    if (getGroup(name) === "roblox-building") {
      return true;
    }
  }

  const lower = name.toLowerCase();

  if (
    /create|build|insert|modify|update|set_|move_|clone_|duplicate_/.test(
      lower,
    )
  ) {
    return true;
  }

  /*
   * Official Studio MCP often mutates via execute_luau / generate_*
   * rather than a dedicated create_part tool.
   */
  return (
    lower.includes("execute_luau") ||
    lower.includes("execute_code") ||
    lower.includes("run_luau") ||
    lower.includes("generate_procedural") ||
    lower.includes("generate_mesh")
  );
}

export function hasBuildEvidence(
  executions: ToolExecutionLike[],
  getGroup?: (name: string) => string | undefined,
): boolean {
  return executions.some(
    (execution) =>
      execution.success &&
      isBuildEvidenceToolByName(
        execution.name,
        getGroup,
      ),
  );
}

export function hasPostBuildInspection(
  executions: ToolExecutionLike[],
  getGroup?: (name: string) => string | undefined,
  isStudioDiscovery: (
    name: string,
  ) => boolean = () => false,
): boolean {
  let lastBuildIndex = -1;

  for (
    let index = 0;
    index < executions.length;
    index++
  ) {
    const execution =
      executions[index];

    if (
      execution.success &&
      isBuildEvidenceToolByName(
        execution.name,
        getGroup,
      )
    ) {
      lastBuildIndex = index;
    }
  }

  if (lastBuildIndex < 0) {
    return false;
  }

  return executions
    .slice(lastBuildIndex + 1)
    .some(
      (execution) =>
        execution.success &&
        getGroup?.(execution.name) ===
          "roblox-inspection" &&
        !isStudioDiscovery(
          execution.name,
        ),
    );
}