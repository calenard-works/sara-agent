import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { createGoal } from "../agent/goal";

const InputSchema = z.object({
  objective: z.string().min(1).describe("The objective to pursue"),
  completionCriterion: z.string().optional().describe("How to verify the goal is complete"),
  replace: z.boolean().optional().describe("Replace an existing active goal"),
}).strict();

export type CreateGoalInput = {
  objective: string;
  completionCriterion?: string;
  replace?: boolean;
};

type CreateGoalOutput =
  | {
      goal: {
        goalId: string;
        objective: string;
        completionCriterion?: string;
        status: string;
      };
    }
  | ToolErrorResult;

export const CreateGoalTool: Tool<CreateGoalInput, CreateGoalOutput> = {
  name: "CreateGoal",
  displayName: "Create Goal",
  description: `Create a durable, structured goal that the runtime will pursue across multiple turns.

Use this when you need to set a long-running objective with a clear completion criterion.
The goal system tracks progress and can enforce budget limits.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: CreateGoalInput,
    context: ToolExecutionContext,
  ): Promise<CreateGoalOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const result = createGoal(input.objective, input.completionCriterion, input.replace);

      if ("error" in result) {
        return { isError: true, message: result.error };
      }

      return {
        goal: {
          goalId: result.goal.goalId,
          objective: result.goal.objective,
          completionCriterion: result.goal.completionCriterion,
          status: result.goal.status,
        },
      };
    } catch (error) {
      return {
        isError: true,
        message: `CreateGoal failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
