import { btwCommand } from "./btwCommand";
import { clearCommand } from "./clearCommand";
import { compactCommand } from "./compactCommand";
import { configCommand } from "./configCommand";
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
  btwCommand,
  clearCommand,
  compactCommand,
  configCommand,
  exportCommand,
  helpCommand,
  initCommand,
  loginCommand,
  mcpCommand,
  modelCommand,
  reloadTuiCommand,
  sessionsCommand,
  statusCommand,
  updateCommand,
  usageCommand,
  versionCommand,
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
  "/btw": btwCommand,
  "/clear": clearCommand,
  "/compact": compactCommand,
  "/config": configCommand,
  "/export": exportCommand,
  "/help": helpCommand,
  "/init": initCommand,
  "/login": loginCommand,
  "/mcp": mcpCommand,
  "/model": modelCommand,
  "/reload-tui": reloadTuiCommand,
  "/sessions": sessionsCommand,
  "/status": statusCommand,
  "/update": updateCommand,
  "/usage": usageCommand,
  "/version": versionCommand,
};

// Re-export types and executor
export type { CommandName, CommandCall, CommandHandler } from "./command.types";
export { executeCommand } from "./executor";
