/**
 * Usage Command
 *
 * Shows token usage and context window info for the current session.
 */

import type { CommandHandler } from "./command.types";
import { VERSION } from "../../version";
import { ConfigManager } from "../../config";

export const usageCommand: CommandHandler<UsageResult> = {
  name: "/usage",
  description: "Show session token usage and context window",
  execute: async (messages) => {
    let model = "unknown";
    try {
      model = ConfigManager.load().llm.model;
    } catch {}

    const msgCount = messages.filter((m) => m.kind === "api").length;
    const toolMsgCount = messages.filter(
      (m) => m.kind === "api" && m.message.role === "tool",
    ).length;

    return {
      version: VERSION,
      model,
      promptTokens: msgCount * 200, // rough estimate
      completionTokens: toolMsgCount * 100, // rough estimate
      totalTokens: msgCount * 200 + toolMsgCount * 100,
      contextLimit: 128_000,
    };
  },
};
