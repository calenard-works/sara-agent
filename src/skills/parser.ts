/**
 * Skill parser — extracts YAML frontmatter from .md skill files
 * and expands placeholders in skill bodies.
 *
 * Ported from kimi-code's skill parser (packages/agent-core/src/skill/parser.ts).
 */

import fs from "fs";
import path from "path";
import type { SkillDefinition, SkillType } from "./types";

/** Aliases for frontmatter keys */
const KEY_ALIASES: Record<string, string> = {
  "disable-model-invocation": "disableModelInvocation",
  "disable_model_invocation": "disableModelInvocation",
  "when-to-use": "whenToUse",
  "when_to_use": "whenToUse",
  "has-sub-skill": "hasSubSkill",
  "has_sub_skill": "hasSubSkill",
};

function normalizeKey(key: string): string {
  return KEY_ALIASES[key] || key;
}

function parseYamlFrontmatter(text: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const lines = text.split("\n");
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return { frontmatter: {}, body: text };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, body: text };
  }

  const yamlLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join("\n").trim();
  const frontmatter: Record<string, unknown> = {};

  for (const line of yamlLines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = normalizeKey(line.slice(0, colonIndex).trim());
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Parse simple values
    if (typeof value === "string") {
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (value.startsWith("[") && value.endsWith("]")) {
        value = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      }
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Parse a skill markdown file into a SkillDefinition.
 */
export function parseSkillText(
  text: string,
  filePath: string,
  overrides?: Partial<SkillDefinition>,
): SkillDefinition | null {
  const { frontmatter, body } = parseYamlFrontmatter(text);

  const name =
    (frontmatter.name as string) ||
    overrides?.name ||
    path.basename(path.dirname(filePath));

  if (!name || name === "SKILL") return null;

  const type = (frontmatter.type as SkillType) || "prompt";
  if (!["prompt", "inline", "flow", "reference"].includes(type)) return null;

  return {
    name,
    description: (frontmatter.description as string) || "",
    type,
    body: body || text,
    source: overrides?.source || "project",
    dir: overrides?.dir || path.dirname(filePath),
    isSubSkill: (frontmatter.isSubSkill as boolean) || overrides?.isSubSkill || false,
    parentName: overrides?.parentName,
    disableModelInvocation:
      (frontmatter.disableModelInvocation as boolean) || false,
    arguments: (frontmatter.arguments as string[]) || overrides?.arguments,
    hasSubSkill: (frontmatter.hasSubSkill as boolean) || false,
    whenToUse: (frontmatter.whenToUse as string) || undefined,
  };
}

/**
 * Parse a skill from a file path.
 */
export function parseSkillFile(
  filePath: string,
  overrides?: Partial<SkillDefinition>,
): SkillDefinition | null {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return parseSkillText(text, filePath, overrides);
  } catch {
    return null;
  }
}

/**
 * Expand placeholder variables in a skill body.
 */
export function expandSkillParameters(
  body: string,
  rawArgs: string,
  skillDir: string,
): string {
  let result = body;

  // Tokenize args by whitespace (respect quotes)
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;
  for (const ch of rawArgs) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
        tokens.push(current);
        current = "";
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === " ") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  // Replace $0, $1, $2...
  for (let i = 0; i < tokens.length; i++) {
    result = result.replace(new RegExp(`\\$${i}`, "g"), tokens[i]);
  }

  // Replace $ARGUMENTS
  result = result.replace(/\$ARGUMENTS/g, rawArgs);

  // Replace $ARGUMENTS[0], $ARGUMENTS[1]...
  for (let i = 0; i < tokens.length; i++) {
    result = result.replace(new RegExp(`\\$ARGUMENTS\\[${i}\\]`, "g"), tokens[i]);
  }

  // Replace ${KIMI_SKILL_DIR}
  result = result.replace(/\$\{KIMI_SKILL_DIR\}/g, skillDir);

  // Replace ${KIMI_SESSION_ID} (will be filled by caller if available)
  result = result.replace(/\$\{KIMI_SESSION_ID\}/g, "");

  // If no placeholder was found but args exist, append
  if (rawArgs.trim() && !body.includes("$0") && !body.includes("$ARGUMENTS")) {
    result += `\n\nARGUMENTS: ${rawArgs}`;
  }

  return result;
}
