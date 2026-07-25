import { CommandHandler, type ConfigResult } from "./command.types";
import { ConfigManager } from "../../config/manager";

export const configCommand: CommandHandler<ConfigResult | undefined> = {
  name: "/config",
  description:
    "Show or change configuration (args: <field> <value> | no args = show all)",
  execute: async (messages, llmClient, actions, onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/config_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/config" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      const provider = ConfigManager.getProvider();
      const llmConfig = {
        baseURL: ConfigManager.get("llm.baseURL"),
        model: ConfigManager.get("llm.model"),
        planModel: ConfigManager.get("llm.planModel"),
      };
      const apiKeys: Record<string, boolean> = {};

      // Check which providers have keys
      for (const p of ["deepseek", "openai", "glm", "opencode"] as const) {
        const key = ConfigManager.getApiKey(p);
        apiKeys[p] = !!key;
      }

      if (args) {
        // Parse args: field value
        const spaceIdx = args.indexOf(" ");
        if (spaceIdx === -1) {
          throw new Error(
            `Usage: /config <field> <value>\nFields: llm.baseURL, llm.model, llm.planModel, theme`,
          );
        }
        const field = args.slice(0, spaceIdx).trim() as any;
        const value = args.slice(spaceIdx + 1).trim();
        ConfigManager.set(field, value as any);
      }

      const result: ConfigResult = {
        provider: provider || "none",
        llm: llmConfig,
        apiKeys,
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
    return undefined as ConfigResult | undefined;
  },
};
