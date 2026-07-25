import { clearCommand } from "./clearCommand";
import { compactCommand } from "./compactCommand";
import { configCommand } from "./configCommand";
import { helpCommand } from "./helpCommand";
import { initCommand } from "./initCommand";
import { loginCommand } from "./loginCommand";
import { mcpCommand } from "./mcpCommand";
import { modelCommand } from "./modelCommand";
import { sessionsCommand } from "./sessionsCommand";
import { statusCommand } from "./statusCommand";
import { updateCommand } from "./updateCommand";

import type { CommandName, CommandHandler } from "./command.types";

/**
 * All available command handlers with their names
 */
export const ALL_COMMANDS = [
  clearCommand,
  compactCommand,
  configCommand,
  helpCommand,
  initCommand,
  loginCommand,
  mcpCommand,
  modelCommand,
  sessionsCommand,
  statusCommand,
  updateCommand,
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
  "/clear": clearCommand,
  "/compact": compactCommand,
  "/config": configCommand,
  "/help": helpCommand,
  "/init": initCommand,
  "/login": loginCommand,
  "/mcp": mcpCommand,
  "/model": modelCommand,
  "/status": statusCommand,
  "/update": updateCommand,
};

// Re-export types and executor
export type { CommandName, CommandCall, CommandHandler } from "./command.types";
export { executeCommand } from "./executor";
