import type { CommandHandler } from "./command.types";
import { listTasks } from "../../agent/background";

export type TasksResult = string | undefined;

export const tasksCommand: CommandHandler<TasksResult> = {
  name: "/tasks",
  description: "List and manage background tasks",
  execute: async (_messages, _llmClient, actions, _onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/tasks_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/tasks" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      const trimmed = (args || "").trim().toLowerCase();
      const activeOnly = trimmed !== "all";
      const limit = 20;

      const tasks = listTasks(activeOnly, limit);

      if (tasks.length === 0) {
        const result = activeOnly ? "No active background tasks." : "No background tasks.";
        const completedCall = {
          ...commandCall,
          status: "success" as const,
          endedAt: new Date().toISOString(),
          result,
        };
        actions.completeCommandCall(completedCall);
        return result;
      }

      const lines = tasks.map((t) => {
        const time = t.endedAt
          ? `ended ${formatRelativeTime(t.endedAt)}`
          : `running (started ${formatRelativeTime(t.startedAt)})`;
        return `  ${t.taskId}  ${t.status}  ${t.description}  ${time}`;
      });

      const header = `${tasks.length} task${tasks.length === 1 ? "" : "(s)"}${activeOnly ? " (active)" : ""}`;
      const result = [header, ...lines].join("\n");

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
      return undefined;
    }
  },
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
