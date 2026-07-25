import { autoeditCommand } from "./autoeditCommand";
import { planCommand } from "./planCommand";
import { permissionCommand } from "./permissionCommand";
import { yoloCommand } from "./yoloCommand";
import { btwCommand } from "./btwCommand";
import { clearCommand } from "./clearCommand";
import { compactCommand } from "./compactCommand";
import { configCommand } from "./configCommand";
import { copyCommand } from "./copyCommand";
import { exportCommand } from "./exportCommand";
import { helpCommand } from "./helpCommand";
import { initCommand } from "./initCommand";
import { loginCommand } from "./loginCommand";
import { mcpCommand } from "./mcpCommand";
import { modelCommand } from "./modelCommand";
import { reloadTuiCommand } from "./reloadTuiCommand";
import { sessionsCommand } from "./sessionsCommand";
import { statusCommand } from "./statusCommand";
import { updateCommand } from "./updateCommand";
import { usageCommand } from "./usageCommand";
import { versionCommand } from "./versionCommand";

import type { CommandName, CommandHandler } from "./command.types";

/**
 * All available command handlers with their names
 */
export const ALL_COMMANDS = [
  autoeditCommand,
  btwCommand,
  clearCommand,
  compactCommand,
  configCommand,
  copyCommand,
  exportCommand,
  helpCommand,
  initCommand,
  loginCommand,
  mcpCommand,
  modelCommand,
  permissionCommand,
  planCommand,
  reloadTuiCommand,
  sessionsCommand,
  statusCommand,
  updateCommand,
  usageCommand,
  versionCommand,
  yoloCommand,
] as const;

/**
 * Helper: a command handler that accepts any CommandName.
 */
type AnyCommandHandler = CommandHandler<unknown>;

/**
 * Mapping of command names to command handlers.
 * Partial — `/welcome` is not a real command.
 */
export const COMMANDS_BY_NAME: Partial<Record<CommandName, AnyCommandHandler>> = {
  "/autoedit": autoeditCommand,
  "/btw": btwCommand,
  "/clear": clearCommand,
  "/compact": compactCommand,
  "/config": configCommand,
  "/copy": copyCommand,
  "/export": exportCommand,
  "/help": helpCommand,
  "/init": initCommand,
  "/login": loginCommand,
  "/mcp": mcpCommand,
  "/model": modelCommand,
  "/permission": permissionCommand,
  "/plan": planCommand,
  "/reload-tui": reloadTuiCommand,
  "/sessions": sessionsCommand,
  "/status": statusCommand,
  "/update": updateCommand,
  "/usage": usageCommand,
  "/version": versionCommand,
  "/yolo": yoloCommand,
};

// Re-export types and executor
export type { CommandName, CommandCall, CommandHandler } from "./command.types";
export { executeCommand } from "./executor";
