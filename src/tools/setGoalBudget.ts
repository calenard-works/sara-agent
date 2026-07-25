import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { setGoalBudget } from "../agent/goal";

const InputSchema = z.object({
  value: z.number().positive().describe("The positive numeric budget value"),
  unit: z
    .enum(["turns", "tokens", "milliseconds", "seconds", "minutes", "hours"])
    .describe("Unit of the budget value"),
}).strict();

export type SetGoalBudgetInput = {
  value: number;
  unit: "turns" | "tokens" | "milliseconds" | "seconds" | "minutes" | "hours";
};

type SetGoalBudgetOutput =
  | {
      message: string;
      budget: string;
    }
  | ToolErrorResult;

export const SetGoalBudgetTool: Tool<SetGoalBudgetInput, SetGoalBudgetOutput> = {
  name: "SetGoalBudget",
  displayName: "Set Goal Budget",
  description: `Set a hard budget limit for the current goal.

Use this when you need to limit the resources a goal can consume.
Supported units: turns, tokens, milliseconds, seconds, minutes, hours.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: SetGoalBudgetInput,
    context: ToolExecutionContext,
  ): Promise<SetGoalBudgetOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const result = setGoalBudget(input.value, input.unit);

      if ("error" in result) {
        return { isError: true, message: result.error };
      }

      const budgetStr = `${input.value} ${input.unit}`;

      return {
        message: `Goal budget set: ${budgetStr}.`,
        budget: budgetStr,
      };
    } catch (error) {
      return {
        isError: true,
        message: `SetGoalBudget failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
