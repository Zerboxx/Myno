import { Workspace } from "./workspace.js";

export function createWorkspace(): Workspace {
  const rootPath =
    process.env.WORKSPACE_PATH ??
    process.cwd();

  return new Workspace(rootPath);
}