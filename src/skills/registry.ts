/**
 * Skill registry — holds all discovered skills and provides lookup methods.
 *
 * Ported from kimi-code's SessionSkillRegistry.
 */

import type { SkillDefinition, SkillSource, SkillSummary } from "./types";
import { normalizeSkillName, isUserActivatableSkill } from "./types";
import { discoverSkills, resolveSkillRoots } from "./scanner";
import { expandSkillParameters, parseSkillText } from "./parser";

export class SkillRegistry {
  private byName = new Map<string, SkillDefinition>();
  private byPluginAndName = new Map<string, SkillDefinition>();
  private loaded = false;

  /**
   * Check if registry has been loaded.
   */
  get isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Load skills from project and user skill roots.
   */
  loadRoots(cwd: string, homeDir?: string): void {
    const roots = resolveSkillRoots(cwd, homeDir);
    for (const { path: rootPath, source } of roots) {
      const skills = discoverSkills(rootPath, source);
      for (const skill of skills) {
        this.register(skill);
      }
    }
    this.loaded = true;
  }

  /**
   * Register a skill (builtin or discovered).
   */
  register(skill: SkillDefinition): void {
    const key = normalizeSkillName(skill.name);
    // Project skills override user skills; builtin skills are lowest priority
    if (!this.byName.has(key) || skill.source === "project") {
      this.byName.set(key, skill);
    }
  }

  /**
   * Register a plugin-scoped skill.
   */
  registerPluginSkill(pluginId: string, skill: SkillDefinition): void {
    const key = `${pluginId}:${normalizeSkillName(skill.name)}`;
    this.byPluginAndName.set(key, skill);
  }

  /**
   * Register builtin skills from code.
   */
  registerBuiltin(skill: SkillDefinition): void {
    const key = normalizeSkillName(skill.name);
    if (!this.byName.has(key)) {
      this.byName.set(key, { ...skill, source: "builtin" });
    }
  }

  /**
   * Get a skill by name.
   */
  getSkill(name: string): SkillDefinition | undefined {
    const key = normalizeSkillName(name);
    return this.byName.get(key) || this.byPluginAndName.get(name);
  }

  /**
   * List all registered skills.
   */
  listSkills(): SkillDefinition[] {
    return [...this.byName.values(), ...this.byPluginAndName.values()];
  }

  /**
   * List skills as summaries (for UI / slash commands).
   */
  listSkillSummaries(): SkillSummary[] {
    return this.listSkills().map((s) => ({
      name: s.name,
      description: s.description,
      source: s.source,
      isSubSkill: s.isSubSkill,
      parentName: s.parentName,
    }));
  }

  /**
   * List skills that the model can invoke via SkillTool.
   */
  listInvocableSkills(): SkillDefinition[] {
    return this.listSkills().filter(
      (s) => s.type !== "reference" && !s.disableModelInvocation,
    );
  }

  /**
   * Build the "Current available skills" listing block for the system prompt.
   */
  renderModelSkillListing(): string {
    const skills = this.listInvocableSkills();
    if (skills.length === 0) return "";

    const lines: string[] = [
      "## Available skills",
      "",
      "Skills are reusable, composable capabilities that enhance your abilities. Each skill is either a self-contained directory with a `SKILL.md` file or a standalone `.md` file that contains instructions, examples, and/or reference material.",
      "",
      "Identify the skills relevant to your current task and read the skill file for its instructions; only read further skill details when needed, to conserve the context window.",
      "",
    ];

    // Group by source
    const groups: Record<string, SkillDefinition[]> = {};
    for (const skill of skills) {
      const group = skill.source === "builtin" ? "Built-in" : "Project";
      if (!groups[group]) groups[group] = [];
      groups[group].push(skill);
    }

    for (const [groupName, groupSkills] of Object.entries(groups)) {
      lines.push(`### ${groupName}`);
      for (const skill of groupSkills) {
        let entry = `- ${skill.name}`;
        if (skill.description) {
          entry += `: ${skill.description}`;
        }
        if (skill.whenToUse) {
          entry += `\n  Use when: ${skill.whenToUse}`;
        }
        lines.push(entry);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Render a skill prompt for model invocation.
   */
  renderSkillPrompt(
    skill: SkillDefinition,
    rawArgs: string,
  ): string {
    const expandedBody = expandSkillParameters(skill.body, rawArgs, skill.dir);

    return [
      `Skill "${skill.name}" loaded. Follow the skill instructions.`,
      "",
      `<sara-skill-loaded name="${skill.name}" source="${skill.source}" dir="${skill.dir}" args="${rawArgs.replace(/"/g, "&quot;")}">`,
      expandedBody,
      "</sara-skill-loaded>",
    ].join("\n");
  }

  /**
   * Render a skill prompt for user slash activation.
   */
  renderUserSkillPrompt(
    skill: SkillDefinition,
    rawArgs: string,
  ): string {
    const expandedBody = expandSkillParameters(skill.body, rawArgs, skill.dir);

    return [
      `User activated the skill "${skill.name}". Follow the loaded skill instructions.`,
      "",
      `<sara-skill-loaded name="${skill.name}" trigger="user-slash" source="${skill.source}" dir="${skill.dir}" args="${rawArgs.replace(/"/g, "&quot;")}">`,
      expandedBody,
      "</sara-skill-loaded>",
    ].join("\n");
  }

  /**
   * Register a builtin skill from raw text (for inline builtins).
   */
  registerBuiltinFromText(
    name: string,
    description: string,
    body: string,
    overrides?: Partial<SkillDefinition>,
  ): void {
    const skill: SkillDefinition = {
      name,
      description,
      type: "prompt",
      body,
      source: "builtin",
      dir: __dirname,
      ...overrides,
    };
    this.registerBuiltin(skill);
  }
}

/**
 * Global singleton instance.
 */
let globalRegistry: SkillRegistry | null = null;

export function getSkillRegistry(): SkillRegistry {
  if (!globalRegistry) {
    globalRegistry = new SkillRegistry();
  }
  return globalRegistry;
}

export function resetSkillRegistry(): void {
  globalRegistry = null;
}
