/**
 * Builtin skills — registered automatically on first skill load.
 *
 * Each skill is a reusable prompt block that the LLM can invoke via the Skill tool,
 * or the user can activate via a slash command (`/skill:name`).
 */

import { getSkillRegistry } from "../registry";

/**
 * Register all builtin skills into the global skill registry.
 * Safe to call multiple times — the registry's `registerBuiltin` method
 * only registers if the skill name is not already taken.
 */
export function registerBuiltinSkills(): void {
  const registry = getSkillRegistry();

  // ── check-sara-docs ────────────────────────────────────────────
  registry.registerBuiltinFromText(
    "check-sara-docs",
    "Answer questions about the Sara product using the official documentation — CLI usage, configuration, slash commands, features, and setup.",
    `Answer questions about Sara (the CLI agent) using your knowledge of the product.

When the user asks how Sara works, what commands are available, or how to configure it, use this skill to give a clear, accurate answer.

Key topics:
- CLI usage: sara [prompt], flags (-a, -w, -s, -c, --version)
- Configuration: ~/.config/sara/config.toml, llm.model, llm.baseURL, llm.apiKey
- Slash commands: /login, /model, /clear, /help, /config, /init, /sessions, /status, /export, /compact, /update, /plan, /yolo, /usage, /version, /reload-tui, /btw, /mcp
- Interactive modes: login, model selection, session management, permission picker
- Permission modes: default, autoEdit, yolo
- Shell mode: prefix with ! to run shell commands directly
- Multi-line input: Alt+Enter or Shift+Enter
- Session persistence: ~/.sara/sessions/*.json

When the user asks about a specific command or feature, provide the relevant details concisely.`,
    {
      whenToUse: "The user asks how Sara works, what commands are available, or how to configure it.",
    },
  );

  // ── update-config ──────────────────────────────────────────────
  registry.registerBuiltinFromText(
    "update-config",
    "Inspect or edit Sara's own config files — config.toml (model, provider, permission, hooks) and related settings.",
    `Sara stores configuration in ~/.config/sara/config.toml and CLI-level settings in environment variables.

Use this skill when the user wants to change how Sara behaves.

Configuration fields:
- \`llm.model\`: Model ID (default: "gpt-4o")
- \`llm.baseURL\`: API base URL
- \`llm.apiKey\`: API key (use ConfigManager.getApiKey / ConfigManager.setApiKey for secure storage)
- \`llm.planModel\`: Model used for planning mode
- \`theme\`: "light" or "dark"
- \`approvalMode\`: "default" | "autoEdit" | "yolo"

To read or write config, use the appropriate tools (fileRead, fileEdit) on the config files:
- Global: ~/.config/sara/config.toml
- Project: .sara/config.toml

Use ConfigManager (src/config) to programmatically read/write config.`,
    {
      whenToUse: "The user asks about changing a setting, viewing current config, or editing configuration files.",
    },
  );

  // ── write-goal ─────────────────────────────────────────────────
  registry.registerBuiltinFromText(
    "write-goal",
    "Help the user craft a well-specified /goal objective for goal mode — turn a rough intention into a completion contract with a clear finish line, proof, boundaries, and stop rule.",
    `Help the user write a clear, verifiable goal for Sara's goal mode.

A good goal has:
1. **Objective**: What exactly needs to be done (verifiable, not vague)
2. **Completion criterion**: How to verify it's done (specific test, output, or observable state)
3. **Boundaries**: What the goal does NOT include (optional but helpful)
4. **Stop rule**: When to stop even if not "perfect" (e.g., "stop after 10 iterations" or "stop when tests pass")

Examples:
- "Refactor the auth module to use async/await. Completion: all existing tests pass and no TypeScript errors."
- "Add a dark mode toggle to the settings page. Completion: the toggle renders, persists to localStorage, and switches CSS variables."
- "Find and fix the memory leak in the WebSocket connection handler. Completion: heap snapshot shows no detached DOM nodes after 10 connect/disconnect cycles."

Ask the user clarifying questions until the goal is concrete enough to pursue autonomously.`,
    {
      whenToUse: "The user asks for help writing, refining, or improving a goal for autonomous mode.",
    },
  );
}
