/**
 * Skill system types for Sara.
 * Ported from kimi-code's skill system.
 */

export type SkillType = "prompt" | "inline" | "flow" | "reference";

export type SkillSource = "builtin" | "user" | "project" | "plugin";

export interface SkillDefinition {
  /** Skill name (normalized) */
  name: string;
  /** Human-readable description */
  description: string;
  /** Skill type */
  type: SkillType;
  /** Raw body content (markdown instructions) */
  body: string;
  /** Where the skill came from */
  source: SkillSource;
  /** Absolute path to skill directory (for $KIMI_SKILL_DIR expansion) */
  dir: string;
  /** Whether this skill is a sub-skill */
  isSubSkill?: boolean;
  /** Parent skill name (if sub-skill) */
  parentName?: string;
  /** Whether model tool invocation is disabled (slash-only) */
  disableModelInvocation?: boolean;
  /** Named argument placeholders */
  arguments?: string[];
  /** Whether this skill has sub-skills in subdirectories */
  hasSubSkill?: boolean;
  /** When-to-use guidance shown in model skill listing */
  whenToUse?: string;
}

export interface SkillSummary {
  name: string;
  description: string;
  source: SkillSource;
  isSubSkill?: boolean;
  parentName?: string;
}

export function isUserActivatableSkill(skill: SkillDefinition): boolean {
  if (skill.type === "reference") return false;
  return true;
}

export function normalizeSkillName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
