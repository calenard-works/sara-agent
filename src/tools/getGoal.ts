import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { getGoal } from "../agent/goal";

const InputSchema = z.object({}).strict();

export type GetGoalInput = Record<string, never>;

type GetGoalOutput =
  | {
      goal: {
        goalId: string;
        objective: string;
        completionCriterion?: string;
        status: string;
        turnsUsed: number;
        tokensUsed: number;
      } | null;
    }
  | ToolErrorResult;

export const GetGoalTool: Tool<GetGoalInput, GetGoalOutput> = {
  name: "GetGoal",
  displayName: "Get Goal",
  description: `Read the current goal and its status.

Use this tool to check if a goal is active, what its objective is, and how much progress has been made.
Returns null if no goal is currently set.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    _input: GetGoalInput,
    context: ToolExecutionContext,
  ): Promise<GetGoalOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const goal = getGoal();

      if (!goal) {
        return { goal: null };
      }

      return {
        goal: {
          goalId: goal.goalId,
          objective: goal.objective,
          completionCriterion: goal.completionCriterion,
          status: goal.status,
          turnsUsed: goal.turnsUsed,
          tokensUsed: goal.tokensUsed,
        },
      };
    } catch (error) {
      return {
        isError: true,
        message: `GetGoal failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
