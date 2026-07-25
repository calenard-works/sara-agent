import type { CommandHandler, CommandName } from "./command.types";
import type { LlmClient } from "../../llm/client";
import type { UIFeedMessage } from "../types";
import type { AppActions } from "../hooks/useAppState";
import { ALL_COMMANDS } from "./index";

interface HelpResult {
  commands: { name: CommandName; description: string }[];
}

/**
 * /help command — displays all available commands.
 * Registers a command call with the list of commands as result.
 */
export const helpCommand: CommandHandler<HelpResult> = {
  name: "/help",
  description: "Show this help message with all available commands",
  execute: async (
    _messages: UIFeedMessage[],
    _llmClient: LlmClient,
    actions: AppActions,
    _onExecutePrompt: (prompt: string) => Promise<void>,
    _args?: string,
  ): Promise<HelpResult> => {
    const commands = ALL_COMMANDS.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
    }));

    // Register as command call for UI display
    const callId = `help_${Date.now()}`;
    actions.addCommandCall({
      kind: "cmd",
      commandName: "/help",
      callId,
      status: "success",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      result: { commands },
    });

    return { commands };
  },
};
