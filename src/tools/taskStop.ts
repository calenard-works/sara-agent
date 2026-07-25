import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { stopTask } from "../agent/background";

const InputSchema = z.object({
  task_id: z.string().describe("The background task ID to stop"),
  reason: z
    .string()
    .default("Stopped by TaskStop")
    .describe("Short reason recorded when the task is stopped"),
}).strict();

export type TaskStopInput = {
  task_id: string;
  reason?: string;
};

type TaskStopOutput =
  | {
      taskId: string;
      status: string;
      reason: string;
    }
  | ToolErrorResult;

export const TaskStopTool: Tool<TaskStopInput, TaskStopOutput> = {
  name: "TaskStop",
  displayName: "Task Stop",
  description: `Stop a running background task.

Use this tool when a task must genuinely be cancelled.
Stopping a task may leave partial side effects behind — use with care.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: TaskStopInput,
    context: ToolExecutionContext,
  ): Promise<TaskStopOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const { task_id, reason = "Stopped by TaskStop" } = input;
      const task = stopTask(task_id, reason);

      if (!task) {
        return { isError: true, message: `Task not found: ${task_id}` };
      }

      return {
        taskId: task.taskId,
        status: task.status,
        reason: reason,
      };
    } catch (error) {
      return {
        isError: true,
        message: `TaskStop failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
