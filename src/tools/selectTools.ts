import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { ALL_TOOLS, getToolsByName } from "./index";

const InputSchema = z.object({
  names: z
    .array(z.string())
    .min(1)
    .describe("Tool names to enable — these will be added to the session's available tools"),
}).strict();

export type SelectToolsInput = {
  names: string[];
};

type SelectToolsOutput =
  | {
      message: string;
      loaded: string[];
      alreadyAvailable: string[];
      unknown: string[];
    }
  | ToolErrorResult;

/**
 * Module-level set of explicitly selected (enabled) tool names.
 * Tools not in this set that are in a default-disabled state remain unavailable.
 */
const enabledTools = new Set<string>();

/**
 * Check if a tool name is currently enabled.
 */
export function isToolEnabled(name: string): boolean {
  // All tools that are in the default ALL_TOOLS are always enabled
  // This function is for tools that are hidden by default
  return true; // For now, all tools are enabled by default
}

/**
 * Get the currently enabled subset of ALL_TOOLS.
 */
export function getEnabledTools(): readonly string[] {
  return ALL_TOOLS.map((t) => t.name);
}

export const SelectToolsTool: Tool<SelectToolsInput, SelectToolsOutput> = {
  name: "select_tools",
  displayName: "Select Tools",
  description: `Explicitly enable specific tools for the current session.

Use this tool when you need to ensure certain tools are available for your task.
This helps manage which tools the AI can access.

FEATURES:
- Enable one or more tools by name
- Reports which tools were newly loaded, already available, or unknown
- Helps the AI understand what tools are at its disposal`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: SelectToolsInput,
    context: ToolExecutionContext,
  ): Promise<SelectToolsOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const { names } = input;
      const toolsByName = getToolsByName();
      const allToolNames = ALL_TOOLS.map((t) => t.name);

      const loaded: string[] = [];
      const alreadyAvailable: string[] = [];
      const unknown: string[] = [];

      for (const name of names) {
        if (!toolsByName[name]) {
          unknown.push(name);
          continue;
        }

        if (allToolNames.includes(name)) {
          alreadyAvailable.push(name);
        } else {
          loaded.push(name);
        }
      }

      let message = "";
      if (loaded.length > 0) {
        message += `Loaded: ${loaded.join(", ")}\n`;
      }
      if (alreadyAvailable.length > 0) {
        message += `Already available: ${alreadyAvailable.join(", ")}\n`;
      }
      if (unknown.length > 0) {
        message += `Unknown tool: ${unknown.join(", ")}\n`;
      }

      return {
        message: message.trim() || "No tools were selected.",
        loaded,
        alreadyAvailable,
        unknown,
      };
    } catch (error) {
      return {
        isError: true,
        message: `Select tools failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
