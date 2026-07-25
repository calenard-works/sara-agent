import { CommandHandler } from "./command.types";
import { ConfigManager } from "../../config";
import { getAllProviders, getConfiguredProviders } from "../../models/registry";

export type ProviderResult = void;

export const providerCommand: CommandHandler<ProviderResult> = {
  name: "/provider",
  description: "Manage AI providers (add / delete / select)",
  execute: async (messages, llmClient, actions, _onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/provider_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/provider" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      const allProviders = await getAllProviders();
      const configured = await getConfiguredProviders();
      const configuredIds = new Set(configured.map((p) => p.id));

      // Direct mode: /provider <provider> <api-key>
      if (args && args.trim().length > 0) {
        const parts = args.trim().split(/\s+/);
        const providerId = parts[0];
        const apiKey = parts.slice(1).join(" ");

        if (apiKey) {
          const provider = allProviders.find((p) => p.id === providerId);
          if (!provider) {
            throw new Error(`Unknown provider: "${providerId}"`);
          }
          ConfigManager.setApiKey(providerId, apiKey);
          ConfigManager.setProvider(providerId);
          if (provider.baseURL) {
            ConfigManager.set("llm.baseURL", provider.baseURL);
          }

          const completedCall = {
            ...commandCall,
            status: "success" as const,
            endedAt: new Date().toISOString(),
            result: `Logged in to ${provider.name}.\nSelect a model with: /model`,
          };
          actions.completeCommandCall(completedCall);
          return;
        }
      }

      // Interactive mode - show all providers with configured ones marked
      const providersWithStatus = allProviders.map((p) => ({
        id: p.id,
        name: p.name,
        baseURL: p.baseURL,
        configured: configuredIds.has(p.id),
      }));

      actions.setInteractiveMode({
        type: "provider-provider",
        providers: providersWithStatus,
      });

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
