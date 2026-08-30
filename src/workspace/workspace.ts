import path from "node:path";

export class Workspace {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
  }

  getRoot(): string {
    return this.rootPath;
  }

  resolve(relativePath: string): string {
    const resolvedPath = path.resolve(
      this.rootPath,
      relativePath,
    );

    const relative = path.relative(
      this.rootPath,
      resolvedPath,
    );

    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      throw new Error(
        `Access denied outside workspace: ${relativePath}`,
      );
    }

    return resolvedPath;
  }
}