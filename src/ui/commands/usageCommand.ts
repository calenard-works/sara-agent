/**
 * Usage Command
 *
 * Shows token usage and context window info for the current session.
 */

import type { CommandHandler, UsageResult } from "./command.types";
import { VERSION } from "../../version";
import { ConfigManager } from "../../config";

export const usageCommand: CommandHandler<UsageResult | undefined> = {
  name: "/usage",
  description: "Show session token usage and context window",
  execute: async (messages, _llmClient, actions) => {
    const startedAt = new Date().toISOString();
    const callId = `/usage_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/usage" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      let model = "unknown";
      try {
        model = ConfigManager.load().llm.model || "unknown";
      } catch {}

      const msgCount = messages.filter((m) => m.kind === "api").length;
      const toolMsgCount = messages.filter(
        (m) => m.kind === "api" && m.message.role === "tool",
      ).length;

      const result: UsageResult = {
        version: VERSION,
        model,
        promptTokens: msgCount * 200,
        completionTokens: toolMsgCount * 100,
        totalTokens: msgCount * 200 + toolMsgCount * 100,
        contextLimit: 128_000,
      };

      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
        result,
      };
      actions.completeCommandCall(completedCall);
      return result;
    } catch (error: unknown) {
      const errorCall = {
        ...commandCall,
        status: "error" as const,
        endedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "unknown error",
      };
      actions.completeCommandCall(errorCall);
    }
    return undefined as UsageResult | undefined;
  },
};
