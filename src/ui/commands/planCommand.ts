import type { CommandHandler } from "./command.types";

export type PlanResult = string | undefined;

export const planCommand: CommandHandler<PlanResult> = {
  name: "/plan",
  description: "Toggle plan mode — agent plans without executing any changes",
  execute: async (_messages, _llmClient, actions, _onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/plan_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/plan" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      // Toggle plan mode
      actions.togglePlanMode();

      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
        result: "Plan mode toggled",
      };
      actions.completeCommandCall(completedCall);
      return "Plan mode toggled";
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