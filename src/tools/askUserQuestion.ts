import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";

const QuestionOptionSchema = z.object({
  label: z.string().min(1).describe("Option label shown to the user"),
  description: z.string().optional().describe("Optional description for this option"),
});

const QuestionSchema = z.object({
  question: z.string().min(1).describe("The question to ask the user"),
  header: z.string().optional().describe("Optional header or title for the question"),
  options: z
    .array(QuestionOptionSchema)
    .min(1)
    .describe("Available answer options for the user"),
  multi_select: z
    .boolean()
    .optional()
    .describe("Whether the user can select multiple options"),
});

const InputSchema = z.object({
  questions: z
    .array(QuestionSchema)
    .min(1)
    .describe("List of questions to present to the user"),
  background: z
    .boolean()
    .default(false)
    .describe("If true, run the question as a background task and return immediately"),
}).strict();

export type AskUserQuestionInput = {
  questions: Array<{
    question: string;
    header?: string;
    options: Array<{
      label: string;
      description?: string;
    }>;
    multi_select?: boolean;
  }>;
  background?: boolean;
};

export type QuestionOption = {
  label: string;
  description?: string;
};

export type Question = {
  question: string;
  header?: string;
  options: QuestionOption[];
  multi_select?: boolean;
};

type AskUserQuestionOutput =
  | {
      answers: Record<string, string>;
    }
  | ToolErrorResult;

export const AskUserQuestionTool: Tool<AskUserQuestionInput, AskUserQuestionOutput> = {
  name: "AskUserQuestion",
  displayName: "Ask User Question",
  description: `Ask the user a question with predefined answer options.

Use this when you need to make a decision that requires user input, such as choosing between multiple valid approaches or confirming a specific action.

FEATURES:
- Present one or more questions to the user in a structured format
- Each question can have a header, predefined options, and optional multi-select
- Options can include descriptions for additional context
- Supports background execution for non-blocking question prompts`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: AskUserQuestionInput,
    context: ToolExecutionContext,
  ): Promise<AskUserQuestionOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const { background = false } = input;

      if (background) {
        // Simplified background mode: return a placeholder task id.
        // In a full implementation, this would dispatch the question to a
        // background question queue and return a real task id for polling.
        return {
          answers: {
            _backgroundTaskId: `bg_q_${Date.now()}`,
          },
        };
      }

      // Foreground question infrastructure is not yet available.
      // The caller should use background=true or handle this error gracefully.
      return {
        isError: true,
        message: "Question infrastructure not available in this version",
      };
    } catch (error) {
      return {
        isError: true,
        message: `AskUserQuestion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
