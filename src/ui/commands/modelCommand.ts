import { CommandHandler } from "./command.types";
import { ConfigManager } from "../../config";
import {
  getAllProviders,
  getProvider,
  fetchAllProviderModels,
  getConfiguredProviders,
} from "../../models/registry";

export type ModelResult = void;

export const modelCommand: CommandHandler<ModelResult> = {
  name: "/model",
  description: "Select or view available models",
  execute: async (messages, llmClient, actions, _onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/model_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/model" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      // Direct mode: /model <provider> <model-id>
      if (args && args.trim().length > 0) {
        const parts = args.trim().split(/\s+/);
        const providerId = parts[0];
        const modelId = parts[1];

        if (modelId) {
          const provider = await getProvider(providerId);
          if (!provider) {
            throw new Error(`Unknown provider: "${providerId}"`);
          }
          ConfigManager.set("llm.model", modelId);
          if (provider.baseURL) {
            ConfigManager.set("llm.baseURL", provider.baseURL);
          }
          ConfigManager.setProvider(providerId);

          const completedCall = {
            ...commandCall,
            status: "success" as const,
            endedAt: new Date().toISOString(),
            result: `Model set to ${modelId} (${provider.name})`,
          };
          actions.completeCommandCall(completedCall);
          return;
        }
      }

      // Interactive mode - check if we have configured providers
      const configured = await getConfiguredProviders();

      if (configured.length > 0) {
        // Show configured providers first, then all others
        const all = await getAllProviders();
        const configuredIds = new Set(configured.map((p) => p.id));
        const notConfigured = all.filter((p) => !configuredIds.has(p.id));

        // Configured providers first, marked with ✓
        const providersWithStatus = [
          ...configured.map((p) => ({ id: p.id, name: `${p.name} ✓` })),
          ...notConfigured.map((p) => ({ id: p.id, name: p.name })),
        ];

        actions.setInteractiveMode({
          type: "model-provider",
          providers: providersWithStatus,
        });
      } else {
        // No configured providers - show all
        const all = await getAllProviders();
        actions.setInteractiveMode({
          type: "model-provider",
          providers: all.map((p) => ({ id: p.id, name: p.name })),
        });
      }

      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
      };
      actions.completeCommandCall(completedCall);
    } catch (error) {
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
