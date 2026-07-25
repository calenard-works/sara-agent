/**
 * Btw (By The Way) Command
 *
 * Runs a quick side question through the LLM without affecting the main conversation.
 * Ported from kimi-code's /btw command.
 */

import type { CommandHandler } from "./command.types";

export const btwCommand: CommandHandler<string | undefined> = {
  name: "/btw",
  description: "Ask a quick side question",
  execute: async (_messages, _llmClient, actions, onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/btw_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/btw" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    const prompt = (args ?? "").trim();
    if (prompt.length === 0) {
      const errorCall = {
        ...commandCall,
        status: "error" as const,
        endedAt: new Date().toISOString(),
        error: "Usage: /btw <question>",
      };
      actions.completeCommandCall(errorCall);
      return undefined;
    }

    try {
      // Run the question as a separate prompt
      await onExecutePrompt(prompt);

      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
        result: prompt,
      };
      actions.completeCommandCall(completedCall);
      return prompt;
    } catch (error: unknown) {
      const errorCall = {
        ...commandCall,
        status: "error" as const,
        endedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "unknown error",
      };
      actions.completeCommandCall(errorCall);
      return undefined;
    }
  },
};
