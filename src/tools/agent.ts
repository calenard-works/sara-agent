import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { runSubagent, runSubagentInBackground } from "../agent/subagent";

const InputSchema = z.object({
  prompt: z.string().min(1).describe("Full task prompt for the subagent"),
  description: z
    .string()
    .min(1)
    .describe("Short task description (3-5 words) for UI display"),
  subagent_type: z
    .string()
    .optional()
    .describe("Type of subagent (default: 'coder')"),
  resume: z
    .string()
    .optional()
    .describe("Optional agent ID to resume instead of creating a new instance"),
  run_in_background: z
    .boolean()
    .optional()
    .describe("If true, run as a background task and return immediately"),
}).strict();

export type AgentInput = {
  prompt: string;
  description: string;
  subagent_type?: string;
  resume?: string;
  run_in_background?: boolean;
};

type AgentOutput =
  | {
      agentId: string;
      actualSubagentType: string;
      status: string;
      summary?: string;
      taskId?: string;
    }
  | ToolErrorResult;

export const AgentTool: Tool<AgentInput, AgentOutput> = {
  name: "Agent",
  displayName: "Agent",
  description: `Launch a subagent to handle a task. The subagent runs as an independent Sara instance with its own context.

Use this when you need to delegate work to a separate agent that can work independently.
The subagent has access to all Sara tools (read, write, bash, grep, etc.).

For simple lookups or small tasks, prefer doing the work directly instead of spawning a subagent.
The overhead of spawning a subagent is significant, so only use it for substantial tasks.

Supports both foreground (blocking) and background execution.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: AgentInput,
    context: ToolExecutionContext,
  ): Promise<AgentOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const {
        prompt,
        description,
        subagent_type,
        run_in_background = false,
      } = input;

      if (run_in_background) {
        const { taskId, agentId } = runSubagentInBackground(
          prompt,
          context.cwd,
          subagent_type,
          description,
        );

        return {
          agentId,
          actualSubagentType: subagent_type || "coder",
          status: "running",
          taskId,
          summary: `task_id: ${taskId}\nstatus: running\nagent_id: ${agentId}\nbackground: true\nautomatic_notification: true`,
        };
      }

      // Foreground execution
      const result = await runSubagent(
        prompt,
        context.cwd,
        subagent_type,
        description,
      );

      // If subagent was aborted, report it
      if (result.status === "aborted") {
        return { isError: true, isAborted: true, message: result.error || "Subagent aborted" };
      }

      if (result.status === "failed") {
        return { isError: true, message: result.error || "Subagent failed" };
      }

      return {
        agentId: result.agentId,
        actualSubagentType: result.actualSubagentType,
        status: "completed",
        summary: `agent_id: ${result.agentId}\nactual_subagent_type: ${result.actualSubagentType}\nstatus: completed\n\n${result.summary || ""}`,
      };
    } catch (error) {
      return {
        isError: true,
        message: `Agent failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
