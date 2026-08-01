import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";
import { runSubagent, SubagentResult } from "../agent/subagent";
import { registerTask, completeTask, failTask } from "../agent/background";

const InputSchema = z.object({
  description: z
    .string()
    .min(1)
    .describe("Short description for the whole swarm"),
  subagent_type: z
    .string()
    .optional()
    .describe("Subagent type used for every new subagent spawned from items"),
  prompt_template: z
    .string()
    .optional()
    .describe("Prompt template for each subagent. Use {{item}} placeholder."),
  items: z
    .array(z.string())
    .min(1)
    .max(128)
    .optional()
    .describe("Values used to fill {{item}}. Each item launches one subagent."),
  resume_agent_ids: z
    .record(z.string(), z.string())
    .optional()
    .describe("Map of existing agent_id to prompt to resume that subagent"),
}).strict();

export type AgentSwarmInput = {
  description: string;
  subagent_type?: string;
  prompt_template?: string;
  items?: string[];
  resume_agent_ids?: Record<string, string>;
};

type AgentSwarmOutput =
  | {
      summary: string;
      results: Array<{
        agentId: string;
        item?: string;
        outcome: "completed" | "failed" | "aborted";
        summary?: string;
      }>;
      taskId?: string;
    }
  | ToolErrorResult;

export const AgentSwarmTool: Tool<AgentSwarmInput, AgentSwarmOutput> = {
  name: "AgentSwarm",
  displayName: "Agent Swarm",
  description: `Launch multiple subagents from one prompt template.

Use AgentSwarm when many subagents should run the same kind of task over different inputs.
The placeholder is exactly {{item}}.

Supports both foreground (all subagents run sequentially) and background execution patterns.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: AgentSwarmInput,
    context: ToolExecutionContext,
  ): Promise<AgentSwarmOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    try {
      const {
        description,
        subagent_type,
        prompt_template,
        items = [],
        resume_agent_ids,
      } = input;

      // Validate: if items are provided, prompt_template is required
      if (items.length > 0 && !prompt_template) {
        return {
          isError: true,
          message: "prompt_template is required when items are provided",
        };
      }

      // Validate: if prompt_template is provided but doesn't contain {{item}}
      if (prompt_template && !prompt_template.includes("{{item}}")) {
        return {
          isError: true,
          message: "prompt_template must contain {{item}} placeholder",
        };
      }

      // Build all subagent tasks
      interface SwarmTask {
        agentId: string;
        prompt: string;
        item?: string;
        isResume: boolean;
      }

      const tasks: SwarmTask[] = [];

      // Add resumed agents
      if (resume_agent_ids) {
        for (const [agentId, prompt] of Object.entries(resume_agent_ids)) {
          tasks.push({
            agentId: `resume-${agentId}`,
            prompt,
            isResume: true,
          });
        }
      }

      // Add item-based agents
      for (const item of items) {
        // Replace every {{item}} occurrence, not just the first
        const prompt = prompt_template!.split("{{item}}").join(item);
        tasks.push({
          agentId: `swarm-${tasks.length}`,
          prompt,
          item,
          isResume: false,
        });
      }

      if (tasks.length === 0) {
        return { isError: true, message: "No tasks provided for swarm" };
      }

      // Run all subagents sequentially in foreground
      // (parallel execution would require more complex orchestration)
      const results: Array<{
        agentId: string;
        item?: string;
        outcome: "completed" | "failed" | "aborted";
        summary?: string;
      }> = [];

      for (const task of tasks) {
        if (context.signal?.aborted) {
          results.push({
            agentId: task.agentId,
            item: task.item,
            outcome: "aborted",
            summary: "Swarm was aborted",
          });
          break;
        }

        const result: SubagentResult = await runSubagent(
          task.prompt,
          context.cwd,
          subagent_type,
          description,
        );

        results.push({
          agentId: result.agentId,
          item: task.item,
          outcome: result.status,
          summary: result.summary || result.error,
        });
      }

      const completed = results.filter((r) => r.outcome === "completed").length;
      const failed = results.filter((r) => r.outcome === "failed").length;
      const aborted = results.filter((r) => r.outcome === "aborted").length;

      return {
        summary: `completed: ${completed}, failed: ${failed}, aborted: ${aborted}`,
        results,
      };
    } catch (error) {
      return {
        isError: true,
        message: `AgentSwarm failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
