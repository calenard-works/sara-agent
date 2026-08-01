import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { requestQuestion } from "../permissions/questionRequest";

const QuestionOptionSchema = z.object({
  label: z.string().min(1).describe("Option label shown to the user"),
  description: z.string().optional().describe("Optional description for this option"),
});

const QuestionSchema = z.object({
  question: z.string().min(1).describe("The question to ask the user"),
  header: z.string().optional().describe("Optional header or title for the question"),
  body: z
    .string()
    .optional()
    .describe("Optional detailed description shown under the question"),
  options: z
    .array(QuestionOptionSchema)
    .min(1)
    .describe("Available answer options for the user"),
  multi_select: z
    .boolean()
    .optional()
    .describe("Whether the user can select multiple options"),
  other_label: z
    .string()
    .optional()
    .describe("Label for the custom 'Other' answer option (default: 'Other')"),
  other_description: z
    .string()
    .optional()
    .describe("Optional description for the 'Other' option"),
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
    body?: string;
    options: Array<{
      label: string;
      description?: string;
    }>;
    multi_select?: boolean;
    other_label?: string;
    other_description?: string;
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
  body?: string;
  options: QuestionOption[];
  multi_select?: boolean;
  other_label?: string;
  other_description?: string;
};

type AskUserQuestionOutput =
  | {
      answers: Record<string, string>;
    }
  | ToolErrorResult;

export const AskUserQuestionTool: Tool<AskUserQuestionInput, AskUserQuestionOutput> = {
  name: "AskUserQuestion",
  displayName: "Ask User Question",
  description: `Ask the user one or more questions with predefined answer options.

Use this when you need to make a decision that requires user input, such as choosing between multiple valid approaches or confirming a specific action.

FEATURES:
- Present one or more questions to the user; each question gets its own tab, and a final Submit tab reviews every answer before confirmation
- Each question can have a header, an optional detailed body, predefined options, and optional multi-select
- Options can include descriptions for additional context
- Each question automatically includes a custom "Other" option (label configurable via other_label) where the user can type their own answer
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
      const { questions, background = false } = input;

      // Set up abort handler: if the signal fires while we're waiting,
      // we need to throw so the promise rejection is caught below.
      const waitPromise = requestQuestion(questions, background);

      const answers = await Promise.race([
        waitPromise,
        new Promise<never>((_, reject) => {
          if (!context.signal) return;
          const onAbort = () => {
            context.signal!.removeEventListener("abort", onAbort);
            reject(new Error("Aborted"));
          };
          context.signal.addEventListener("abort", onAbort);
        }),
      ]);

      return { answers };
    } catch (error) {
      if (error instanceof Error && error.message === "Aborted") {
        return { isError: true, isAborted: true, message: "Aborted" };
      }
      return {
        isError: true,
        message: `AskUserQuestion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
