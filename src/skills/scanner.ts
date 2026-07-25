/**
 * Skill scanner — discovers skill .md files from skill root directories.
 *
 * Ported from kimi-code's skill scanner (packages/agent-core/src/skill/scanner.ts).
 */

import fs from "fs";
import path from "path";

import { parseSkillFile } from "./parser";
import type { SkillDefinition, SkillSource } from "./types";

/** Default skill root names to check */
const PROJECT_SKILL_DIRS = [".agents/skills", ".sara/skills"];
const USER_SKILL_DIRS = [".agents/skills", ".sara/skills"];

/**
 * Resolve skill root directories to scan.
 */
export function resolveSkillRoots(
  cwd: string,
  homeDir?: string,
): { path: string; source: SkillSource }[] {
  const roots: { path: string; source: SkillSource }[] = [];

  // Project roots
  for (const dir of PROJECT_SKILL_DIRS) {
    const absPath = path.join(cwd, dir);
    if (fs.existsSync(absPath)) {
      roots.push({ path: absPath, source: "project" });
    }
  }

  // User roots
  const userHome = homeDir || (
    process.platform === "win32"
      ? process.env.USERPROFILE || ""
      : process.env.HOME || ""
  );
  if (userHome) {
    for (const dir of USER_SKILL_DIRS) {
      const absPath = path.join(userHome, dir);
      if (fs.existsSync(absPath) && absPath !== path.join(cwd, dir)) {
        roots.push({ path: absPath, source: "user" });
      }
    }
  }

  return roots;
}

/**
 * Discover skills from a single root directory.
 * Returns flat files (name.md) and directory bundles (dir/SKILL.md).
 */
export function discoverSkills(
  root: string,
  source: SkillSource,
  parentName?: string,
): SkillDefinition[] {
  const skills: SkillDefinition[] = [];

  if (!fs.existsSync(root)) return skills;

  let entries: string[];
  try {
    entries = fs.readdirSync(root).sort();
  } catch {
    return skills;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry);

    // Directory bundle: dir/SKILL.md
    if (fs.statSync(fullPath).isDirectory()) {
      const skillFilePath = path.join(fullPath, "SKILL.md");
      if (fs.existsSync(skillFilePath)) {
        const skill = parseSkillFile(skillFilePath, {
          source,
          name: entry,
          dir: fullPath,
          parentName,
        });
        if (skill) {
          skills.push(skill);

          // If skill has sub-skills, scan subdirectories
          if (skill.hasSubSkill) {
            const subSkills = discoverSubSkills(fullPath, source, skill.name);
            skills.push(...subSkills);
          }
        }
      }
      continue;
    }

    // Flat file: name.md (skip SKILL.md at non-bundle level)
    if (entry.endsWith(".md") && entry !== "SKILL.md") {
      const skillName = entry.slice(0, -3);
      const skill = parseSkillFile(fullPath, {
        source,
        name: skillName,
        dir: path.dirname(fullPath),
        parentName,
      });
      if (skill) {
        skills.push(skill);
      }
    }
  }

  return skills;
}

/**
 * Discover sub-skills in a bundle directory.
 */
function discoverSubSkills(
  parentDir: string,
  source: SkillSource,
  parentName: string,
): SkillDefinition[] {
  const subSkills: SkillDefinition[] = [];

  let entries: string[];
  try {
    entries = fs.readdirSync(parentDir).sort();
  } catch {
    return subSkills;
  }

  for (const entry of entries) {
    if (entry === "SKILL.md") continue;
    const fullPath = path.join(parentDir, entry);

    if (fs.statSync(fullPath).isDirectory()) {
      const subSkillPath = path.join(fullPath, "SKILL.md");
      if (fs.existsSync(subSkillPath)) {
        const skill = parseSkillFile(subSkillPath, {
          source,
          name: `${parentName}.${entry}`,
          dir: fullPath,
          isSubSkill: true,
          parentName,
        });
        if (skill) {
          subSkills.push(skill);
        }
      }
    }
  }

  return subSkills;
}
