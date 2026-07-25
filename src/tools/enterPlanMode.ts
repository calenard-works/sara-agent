import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";

const InputSchema = z.object({}).strict();

export type EnterPlanModeInput = Record<string, never>;

type EnterPlanModeOutput =
  | {
      message: string;
    }
  | ToolErrorResult;

export const EnterPlanModeTool: Tool<EnterPlanModeInput, EnterPlanModeOutput> = {
  name: "EnterPlanMode",
  displayName: "Enter Plan Mode",
  description: `Switch to plan mode — the agent will only use read-only tools and produce a plan without executing any changes.

Use this tool when you need to:
- Plan a complex implementation before making changes
- Analyze the codebase and design an architecture
- Get a step-by-step plan reviewed before execution

In plan mode:
- Only read-only tools (Read, Grep, Glob, ListFiles, etc.) are available
- Write tools (Write, Edit, Bash, etc.) are restricted
- The output should be a detailed plan stored in a plan file`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    _input: EnterPlanModeInput,
    context: ToolExecutionContext,
  ): Promise<EnterPlanModeOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      return {
        message: `Plan mode is now active. Your workflow:

1. **Explore & Analyze** — Use read-only tools to understand the codebase
   - Read files to understand current implementation
   - Grep to find relevant code patterns
   - Glob to discover project structure

2. **Design & Plan** — Write a step-by-step plan to the plan file
   - List specific, verifiable steps grounded in the actual codebase
   - Each step should be concrete enough to act on and to check
   - Include real files, functions, and commands in a sensible order

3. **Review** — Review the plan for completeness and correctness

4. **Exit Plan Mode** — Use ExitPlanMode to submit the plan for approval
   - Once approved, all tools become available for execution`,
      };
    } catch (error) {
      return {
        isError: true,
        message: `EnterPlanMode failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
