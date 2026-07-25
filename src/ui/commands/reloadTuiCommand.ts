/**
 * Reload TUI Command
 *
 * Reloads the Sara configuration and applies changes without restarting.
 * Ported from kimi-code's /reload-tui command.
 */

import type { CommandHandler } from "./command.types";
import { ConfigManager } from "../../config";

export const reloadTuiCommand: CommandHandler<void> = {
  name: "/reload-tui",
  description: "Reload configuration and apply changes",
  execute: async (_messages, _llmClient, actions) => {
    const startedAt = new Date().toISOString();
    const callId = `/reload-tui_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/reload-tui" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      // Reload config by re-reading from disk
      ConfigManager.load();

      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
        result: undefined,
      };
      actions.completeCommandCall(completedCall);
    } catch (error: unknown) {
      const errorCall = {
        ...commandCall,
        status: "error" as const,
        endedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "unknown error",
      };
      actions.completeCommandCall(errorCall);
    }
  },
};
