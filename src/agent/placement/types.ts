/**
 * Placement engine types: deterministic resolution of where an element
 * belongs inside Roblox Studio, and which instance class it should be.
 *
 * Kept pure and dependency-free so rules can be unit tested in isolation.
 */

export type RobloxInstanceClassName =
  | "Script"
  | "LocalScript"
  | "ModuleScript"
  | "RemoteEvent"
  | "RemoteFunction"
  | "ScreenGui"
  | "Folder"
  | "Part"
  | "Model";

export type ElementRole =
  | "overhead-player-ui"
  | "server-system"
  | "server-data"
  | "server-command"
  | "client-controller"
  | "client-input"
  | "client-camera"
  | "client-ui"
  | "client-ui-script"
  | "shared-module"
  | "shared-config"
  | "shared-remote"
  | "world"
  | "npc"
  | "template"
  | "character-script";

/**
 * The root container path (without the game. prefix) the element lives
 * under. For player-script folders this is the full service path, e.g.
 * "StarterPlayer.StarterPlayerScripts".
 */
export type RobloxContainerRoot =
  | "Workspace"
  | "ReplicatedStorage"
  | "ReplicatedFirst"
  | "ServerScriptService"
  | "ServerStorage"
  | "StarterGui"
  | "StarterPlayer.StarterPlayerScripts"
  | "StarterCharacterScripts"
  | "Lighting";

export interface EnvironmentPlacement {
  element: string;

  role: ElementRole;

  root: RobloxContainerRoot;

  folder?: string;

  className: RobloxInstanceClassName;

  indexPath: string;

  rule: string;
}

export interface EnvironmentLayout {
  placements: EnvironmentPlacement[];

  folders: string[];

  instruction: string;
}