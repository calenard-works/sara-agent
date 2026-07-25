import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { getTaskOutput, BackgroundTaskInfo } from "../agent/background";

const InputSchema = z.object({
  task_id: z.string().describe("The background task ID to inspect"),
  block: z
    .boolean()
    .default(false)
    .describe("Whether to wait for the task to finish before returning"),
  timeout: z
    .number()
    .int()
    .min(0)
    .max(3600)
    .default(30)
    .describe("Maximum number of seconds to wait when block=true"),
}).strict();

export type TaskOutputInput = {
  task_id: string;
  block?: boolean;
  timeout?: number;
};

type TaskOutputOutput =
  | {
      taskId: string;
      description: string;
      status: string;
      startedAt: number;
      endedAt: number | null;
      stopReason?: string;
      exitCode?: number | null;
      command?: string;
      output?: string;
      outputPreview?: string;
    }
  | ToolErrorResult;

export const TaskOutputTool: Tool<TaskOutputInput, TaskOutputOutput> = {
  name: "TaskOutput",
  displayName: "Task Output",
  description: `Retrieve a snapshot of a running or completed background task.

Use this tool to check progress on background tasks or read the output of completed tasks.
Provides structured task metadata and a preview of the output.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: TaskOutputInput,
    context: ToolExecutionContext,
  ): Promise<TaskOutputOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const { task_id, block = false, timeout = 30 } = input;
      const task = getTaskOutput(task_id);

      if (!task) {
        return { isError: true, message: `Task not found: ${task_id}` };
      }

      // In a full implementation, block=true would wait for the task.
      // For the simplified version, we just return the current state.
      if (block) {
        // Simple blocking: return current state with a note
        // Full implementation would poll the task status
      }

      const outputPreview = task.output
        ? task.output.length > 500
          ? task.output.slice(0, 500) + "\n...[output truncated]"
          : task.output
        : undefined;

      return {
        taskId: task.taskId,
        description: task.description,
        status: task.status,
        startedAt: task.startedAt,
        endedAt: task.endedAt,
        stopReason: task.stopReason,
        exitCode: task.exitCode,
        command: task.command,
        output: task.output,
        outputPreview,
      };
    } catch (error) {
      return {
        isError: true,
        message: `TaskOutput failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
