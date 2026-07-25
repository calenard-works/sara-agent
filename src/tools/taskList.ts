import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { listTasks, BackgroundTaskInfo } from "../agent/background";

const InputSchema = z.object({
  active_only: z
    .boolean()
    .default(true)
    .describe("Whether to list only non-terminal background tasks"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of tasks to return"),
}).strict();

export type TaskListInput = {
  active_only?: boolean;
  limit?: number;
};

type TaskListOutput =
  | {
      activeCount: number;
      tasks: Array<{
        taskId: string;
        description: string;
        status: string;
        command?: string;
        agentId?: string;
        startedAt: number;
        endedAt: number | null;
      }>;
    }
  | ToolErrorResult;

export const TaskListTool: Tool<TaskListInput, TaskListOutput> = {
  name: "TaskList",
  displayName: "Task List",
  description: `List background tasks and their current status.

Use this tool to discover which background tasks are running and where each one stands.
It is the entry point for inspecting background work.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: TaskListInput,
    context: ToolExecutionContext,
  ): Promise<TaskListOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const activeOnly = input.active_only ?? true;
      const limit = input.limit ?? 20;

      const tasks = listTasks(activeOnly, limit);
      const activeCount = tasks.filter((t) => t.status === "running").length;

      return {
        activeCount,
        tasks: tasks.map((t: BackgroundTaskInfo) => ({
          taskId: t.taskId,
          description: t.description,
          status: t.status,
          command: t.command,
          agentId: t.agentId,
          startedAt: t.startedAt,
          endedAt: t.endedAt,
        })),
      };
    } catch (error) {
      return {
        isError: true,
        message: `TaskList failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
