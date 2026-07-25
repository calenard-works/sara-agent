import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";

const OptionSchema = z.object({
  label: z.string().min(1).max(80).describe("Short name for this option"),
  description: z.string().default("").describe("Brief summary of this approach and its trade-offs"),
});

const InputSchema = z.object({
  options: z
    .array(OptionSchema)
    .min(1)
    .max(3)
    .optional()
    .describe("When the plan contains multiple alternative approaches, list them here"),
}).strict();

export type ExitPlanModeInput = {
  options?: Array<{
    label: string;
    description?: string;
  }>;
};

type ExitPlanModeOutput =
  | {
      message: string;
    }
  | ToolErrorResult;

export const ExitPlanModeTool: Tool<ExitPlanModeInput, ExitPlanModeOutput> = {
  name: "ExitPlanMode",
  displayName: "Exit Plan Mode",
  description: `Exit plan mode and submit the plan for approval.

Use this tool when you have finished writing a plan and want to submit it.
Once approved, all tools become available for executing the plan.

If your plan has multiple distinct approaches, pass them as options so the user can choose which one to execute.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: ExitPlanModeInput,
    context: ToolExecutionContext,
  ): Promise<ExitPlanModeOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      let message = "Plan mode deactivated. All tools are now available.\n\n## Approved Plan:\n\nThe plan has been submitted. Execute each step in order.";

      if (input.options && input.options.length > 0) {
        const optionsList = input.options
          .map((opt, i) => `${i + 1}. **${opt.label}**${opt.description ? `: ${opt.description}` : ""}`)
          .join("\n");
        message += `\n\nAvailable approaches:\n${optionsList}`;
      }

      return { message };
    } catch (error) {
      return {
        isError: true,
        message: `ExitPlanMode failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
