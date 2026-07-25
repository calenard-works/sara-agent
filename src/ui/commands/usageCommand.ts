/**
 * Usage Command
 *
 * Shows token usage and context window info for the current session.
 * Displays per-model usage in Kimi Code style format.
 */

import type { CommandHandler, UsageResult, ModelUsageEntry } from "./command.types";
import { VERSION } from "../../version";
import { ConfigManager } from "../../config";
import { fetchAllProviderModels } from "../../models/registry";

/**
 * Rough token estimation: ~4 characters per token for most text.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Format a number with SI suffix (e.g. 84300000 → "84.3M").
 */
function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1);
    return v.endsWith(".0") ? v.slice(0, -2) + "M" : v + "M";
  }
  if (n >= 1_000) {
    const v = (n / 1_000).toFixed(1);
    return v.endsWith(".0") ? v.slice(0, -2) + "K" : v + "K";
  }
  return String(n);
}

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
      // Gather model info
      const config = ConfigManager.load();
      const modelId = config.llm.model || "unknown";
      const providerId = ConfigManager.getProvider() || "unknown";

      // Try to resolve display name
      let modelDisplayName = modelId;
      try {
        const models = await fetchAllProviderModels(providerId);
        const found = models.find((m) => m.id === modelId);
        if (found) modelDisplayName = found.name;
      } catch {}

      // Compute actual token usage from messages
      let inputTokens = 0;
      let outputTokens = 0;

      for (const msg of messages) {
        if (msg.kind !== "api") continue;
        const role = msg.message.role;
        const content =
          typeof msg.message.content === "string" ? msg.message.content : "";
        if (role === "assistant") {
          outputTokens += estimateTokens(content);
          // Also count tool call arguments
          if ((msg.message as any).tool_calls) {
            for (const tc of (msg.message as any).tool_calls) {
              if (tc.function?.arguments) {
                outputTokens += estimateTokens(tc.function.arguments);
              }
            }
          }
        } else if (role === "tool") {
          inputTokens += estimateTokens(content);
        } else {
          inputTokens += estimateTokens(content);
        }
      }

      // Use at least some minimum for display purposes
      if (inputTokens === 0 && outputTokens === 0) {
        inputTokens = 1;
        outputTokens = 1;
      }

      const totalTokens = inputTokens + outputTokens;
      const contextLimit = 128_000;
      const contextPercent = Math.min(
        100,
        Math.round((totalTokens / contextLimit) * 100),
      );

      // Build model entry
      const modelIdFull = `${providerId}/${modelId}`;
      const entry: ModelUsageEntry = {
        id: modelIdFull,
        displayName: modelDisplayName,
        inputTokens,
        outputTokens,
        totalTokens,
        inputFormatted: formatTokens(inputTokens),
        outputFormatted: formatTokens(outputTokens),
        totalFormatted: formatTokens(totalTokens),
      };

      const result: UsageResult = {
        models: [entry],
        totalInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
        totalTokens,
        totalInputFormatted: formatTokens(inputTokens),
        totalOutputFormatted: formatTokens(outputTokens),
        totalFormatted: formatTokens(totalTokens),
        contextLimit,
        contextPercent,
        contextUsed: totalTokens,
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
