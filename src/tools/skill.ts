/**
 * SkillTool — allows the LLM to load and follow a skill's instructions inline.
 *
 * Ported from kimi-code's SkillTool (agent-core/src/tools/builtin/collaboration/skill-tool.ts).
 */

import { z } from "zod";
import { Tool, ToolErrorResult } from "./types";
import { getSkillRegistry } from "../skills/registry";

const MAX_SKILL_QUERY_DEPTH = 3;

// Track skill invocation depth via a module-level counter
let currentDepth = 0;

const SkillInput = z.object({
  skill: z.string().describe("The exact name of the skill to invoke, spelled as it appears in the current skill listing."),
  args: z.string().optional().describe("Optional argument string for the skill, written like a command line."),
});

type SkillOutput =
  | { output: string }
  | ToolErrorResult;

export const SkillTool: Tool<z.infer<typeof SkillInput>, SkillOutput> = {
  name: "Skill",
  displayName: "Invoke Skill",
  description: `Use this tool to load and activate a skill from the available skill listing.

Each skill is a reusable, composable capability. Invoking a skill loads its instructions into the current turn so you can follow them.

## Usage
- Call with the exact \`skill\` name as shown in the "Available skills" listing
- Pass optional \`args\` string (command-line style) that gets expanded into the skill's placeholders
- The skill's instructions are loaded inline and you should follow them to complete the task

## When to use
- The current task matches a skill's purpose
- A skill description says "Use when: ..." and that condition applies
- You need specialized knowledge or procedures defined in a skill`,
  readonly: true,
  inputSchema: SkillInput,
  async execute(input, context) {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    // Depth limit
    if (currentDepth >= MAX_SKILL_QUERY_DEPTH) {
      return {
        isError: true,
        message: `Skill depth limit (${MAX_SKILL_QUERY_DEPTH}) reached. Cannot load more skills in this chain.`,
      };
    }

    const registry = getSkillRegistry();
    const skill = registry.getSkill(input.skill);

    if (!skill) {
      const skills = registry.listInvocableSkills();
      const listing = skills.length > 0
        ? `Available skills: ${skills.map((s) => s.name).join(", ")}`
        : "No skills available.";
      return {
        isError: true,
        message: `Unknown skill: "${input.skill}". ${listing}`,
      };
    }

    if (skill.disableModelInvocation) {
      return {
        isError: true,
        message: `Skill "${skill.name}" cannot be invoked via the Skill tool (it is slash-only). Use the /${skill.name} command instead.`,
      };
    }

    if (skill.type === "reference") {
      return {
        isError: true,
        message: `Skill "${skill.name}" is a reference type and cannot be invoked directly.`,
      };
    }

    currentDepth++;

    try {
      const rawArgs = input.args || "";
      const rendered = registry.renderSkillPrompt(skill, rawArgs);

      return {
        output: `Skill "${skill.name}" loaded inline. Follow its instructions.\n\n${rendered}`,
      };
    } finally {
      currentDepth--;
    }
  },
};
