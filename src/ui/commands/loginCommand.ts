import { CommandHandler } from "./command.types";
import { ConfigManager } from "../../config";
import { getAllProviders } from "../../models/registry";

export type LoginResult = void;

export const loginCommand: CommandHandler<LoginResult> = {
  name: "/login",
  description: "Set API key for a provider",
  execute: async (messages, llmClient, actions, _onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/login_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/login" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      const providers = await getAllProviders();

      // Direct mode: /login <provider> <api-key>
      if (args && args.trim().length > 0) {
        const parts = args.trim().split(/\s+/);
        const providerId = parts[0];
        const apiKey = parts.slice(1).join(" ");

        if (apiKey) {
          const provider = providers.find((p) => p.id === providerId);
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

      // Interactive mode
      actions.setInteractiveMode({
        type: "login-provider",
        providers: providers.map((p) => ({ id: p.id, name: p.name })),
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
