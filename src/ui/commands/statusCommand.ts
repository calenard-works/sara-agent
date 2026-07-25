import { CommandHandler, type StatusResult } from "./command.types";

const VERSION = "0.2.3";

export const statusCommand: CommandHandler<StatusResult | undefined> = {
  name: "/status",
  description: "Show session and configuration summary",
  execute: async (messages, llmClient, actions, onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/status_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/status" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      const msgCount = messages.filter((m) => m.kind === "api").length;
      const toolMsgCount = messages.filter(
        (m) => m.kind === "api" && m.message.role === "tool",
      ).length;
      const cmdMsgCount = messages.filter((m) => m.kind === "cmd").length;

      const result: StatusResult = {
        version: VERSION,
        messages: msgCount,
        toolMessages: toolMsgCount,
        commandMessages: cmdMsgCount,
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
    return undefined as StatusResult | undefined;
  },
};
