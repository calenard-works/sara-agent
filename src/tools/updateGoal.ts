import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { updateGoalStatus } from "../agent/goal";

const InputSchema = z.object({
  status: z
    .enum(["active", "complete", "blocked"])
    .describe("New status for the goal"),
}).strict();

export type UpdateGoalInput = {
  status: "active" | "complete" | "blocked";
};

type UpdateGoalOutput =
  | {
      status: string;
      message: string;
    }
  | ToolErrorResult;

export const UpdateGoalTool: Tool<UpdateGoalInput, UpdateGoalOutput> = {
  name: "UpdateGoal",
  displayName: "Update Goal",
  description: `Update the status of the current goal.

Use this tool to mark a goal as complete, blocked, or active.
- 'complete': The objective is satisfied and validation has passed.
- 'blocked': An external condition prevents useful progress.
- 'active': Resume a paused or blocked goal.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: UpdateGoalInput,
    context: ToolExecutionContext,
  ): Promise<UpdateGoalOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const result = updateGoalStatus(input.status);

      if ("error" in result) {
        return { isError: true, message: result.error };
      }

      let message: string;
      switch (input.status) {
        case "active":
          message = "Goal resumed.";
          break;
        case "complete":
          message = `Goal completed: ${result.goal.objective}`;
          break;
        case "blocked":
          message = "Goal blocked.";
          break;
      }

      return {
        status: input.status,
        message,
      };
    } catch (error) {
      return {
        isError: true,
        message: `UpdateGoal failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
