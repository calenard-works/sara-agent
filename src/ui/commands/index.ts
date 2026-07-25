import { clearCommand } from "./clearCommand";
import { compactCommand } from "./compactCommand";
import { configCommand } from "./configCommand";
import { helpCommand } from "./helpCommand";
import { initCommand } from "./initCommand";
import { loginCommand } from "./loginCommand";
import { mcpCommand } from "./mcpCommand";
import { modelCommand } from "./modelCommand";
import { statusCommand } from "./statusCommand";

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
  statusCommand,
] as const;

/**
 * Mapping of command names to command handlers
 */
export const COMMANDS_BY_NAME = {
  "/clear": clearCommand,
  "/compact": compactCommand,
  "/config": configCommand,
  "/help": helpCommand,
  "/init": initCommand,
  "/login": loginCommand,
  "/mcp": mcpCommand,
  "/model": modelCommand,
  "/status": statusCommand,
};

// Re-export types and executor
export type { CommandName, CommandCall, CommandHandler } from "./command.types";
export { executeCommand } from "./executor";
