# Changelog

## 0.8.0 (2026-07-25)

### Added
- `FetchURL` tool — fetches web page content (HTTP/HTTPS), converts HTML to markdown
- `WebSearch` tool — web search via DuckDuckGo HTML API, returns title/url/snippet

## 0.7.0 (2026-07-25)

### Added
- `/autoedit` command — switches approval mode to Auto-Edit (auto-approve file edits)
- Command palette now shows max 6 items when typing `/` in the input

### Changed
- `/autoedit` and `/yolo` are now separate commands (previously only `/yolo` existed)

## 0.6.1 (2026-07-25)

### Fixed
- Update notification no longer appears when local version is ahead of npm (now uses semver comparison)
- Version display now correctly reads from `src/version.ts` instead of falling back to `0.5.0`

## 0.6.0 (2026-07-25)

### Added
- Skills/plugins system — ported from kimi-code:
  - Skill types (`src/skills/types.ts`) — SkillDefinition, SkillSource, SkillType
  - Skill parser (`src/skills/parser.ts`) — YAML frontmatter + `$0`, `$1`, `$ARGUMENTS` placeholder expansion
  - Skill scanner (`src/skills/scanner.ts`) — discovers `.md` and `SKILL.md` from `.sara/skills` / `.agents/skills`
  - Skill registry (`src/skills/registry.ts`) — singleton with `getSkill()`, `listSkills()`, `renderModelSkillListing()`
  - Skill tool (`src/tools/skill.ts`) — LLM-invokable tool that loads skill instructions inline (depth limit 3)
  - Builtin skills: `check-sara-docs`, `update-config`, `write-goal`
  - Skill listing auto-appended to system prompt when skills are available

### Changed
- Todo widget border: full box replaced with a small label border around "Todo" header, items below without border
- Status bar separator dots: `●` (thick) → `·` (middle dot) for a cleaner look

## 0.5.0 (2026-07-25)

### Added
- `/copy` command — copy content to clipboard
- `/permission` command — change approval mode (default/autoEdit/yolo) with interactive picker
- `/plan` command — toggle plan mode (agent plans without executing)
- `/yolo` command — switch directly to YOLO approval mode
- Plan mode indicator in header ("═══ Plan Mode ═══")
- Fixed todo widget — todo list rendered as a pinned panel above the prompt input instead of inline in the message feed
- Model picker shows only 6 models at a time with scroll arrows

### Changed
- All decorative UI dots replaced with fat dots (`●` instead of `•`)
- Model name in header updates in real-time when changed via `/model`

### Fixed
- `/usage` command now properly registers and displays its result in the feed
- `/version` command now properly registers and displays its result in the feed
- Todo tool messages no longer clutter the message feed (rendered in dedicated widget)

## 0.4.0 (2026-07-25)

### Added
- `/version` command — shows Sara version and description
- `/usage` command — shows session token usage, model, and context window
- `/export` command — exports current session as Markdown file
- `/btw` command — runs a quick side question through the LLM
- `/reload-tui` command — reloads configuration without restarting

## 0.3.3 (2026-07-25)

### Added
- Home/End keys for cursor navigation in input field
- Shift+Enter as alternative to Option+Enter for multi-line input
- Session persistence: sessions now saved to `~/.sara/sessions/` and restored on restart
- `-s, --session <id>` CLI flag to resume a specific session
- `-c, --continue` CLI flag to continue the last session
- `/sessions` command: list, switch (Enter), rename (R), delete (double D) sessions
- Resume message on exit: `To resume this session, run sara -s {id} or continue with sara -c`
- Session titles auto-generated from first user message
- Relative time display in session list (e.g. "1h 16min")
- Header shows "Directory:" and "Model:" prefixes
- Status bar items separated with dots (•)

### Changed
- Header Sara title now perfectly centered
- Version removed from status bar (already done in 0.3.2)

## 0.3.2 (2026-07-25)

### Added
- Headers now show human-readable model names (e.g. "DeepSeek V3" instead of "deepseek-chat")
- First-run state shows "not signed, run /login" instead of a model ID
- Completely redesigned two-line status bar: approval mode, model name, dir, git branch, context usage, and hints

### Changed
- Status bar no longer shows version number
- Header description text added below the model line

## 0.3.1 (2026-07-25)

### Added
- Shell mode — type `!` on empty input to get a purple-bordered shell prompt; everything after `!` runs as a shell command
- Base URL shown in gray next to each provider in the `/login` provider selector
- Status bar shows approval mode, model name, directory, git branch, context usage
- Human-readable model names in header
- First-run state shows "not signed, run /login" instead of a model ID

### Changed
- Bottom status bar redesigned with two-line layout
- Version removed from the status bar

### Fixed
- Publish workflow — version bumped to publish pending changes

## 0.3.0 (2026-07-25)

### Added
- `sara update` CLI command — runs `npm i -g --ignore-scripts sara-agent` with streaming output
- Update notification box at the top of the TUI when a newer version is available on npm
- Bordered notification panel with "Update Available!" message and instructions
- Shell mode (initial) — type `!` on empty input to enter shell mode (purple border). Everything after `!` is executed as a shell command, output shown inline
- Base URL is now displayed in gray next to each provider in the `/login` provider selector

### Changed
- Update notification moved from yellow inline text in the help bar to a prominent bordered box at the top of the interface
- Help bar no longer shows "esc to cancel"; always displays "? for shortcuts"

## 0.2.3 (2026-07-25)

### Added
- Dots spinner animation (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) replacing the old `◐◓◑◒`
- Smart status indicator during agent execution:
  - Extracts `# Heading` from streaming LLM response as live status
  - Shows "Thinking..." when LLM starts generating
  - Shows "Working..." for non-Bash tool execution
  - Shows "Running..." for Bash tool execution
- "esc to cancel" hint shown in the help bar (replaces "? for shortcuts") while agent is busy

### Fixed
- Cascading re-renders caused by unmemoized `handleSubmit` in App.tsx
- TypeScript type errors with `/welcome` command — added to `CommandName` union
- Incorrect stale closures in `processInput` dependency array

### Changed
- Header label from "sara-agent" to "Sara"
- User-facing text throughout the UI uses "Sara" instead of "sara-agent"
- Changelog format now uses structured sections (`### Added`, `### Fixed`, etc.)
- Update command shows only the current version's release notes instead of the entire changelog

## 0.2.2 (2026-07-25)

### Fixed
- Header display: "Sara v0.2.2" instead of "sara-agent v0.2.1"

## 0.2.1 (2026-07-25)

### Fixed
- Infinite re-render loop on startup (first-run detection)

## 0.2.0 (2026-07-25)

### Added
- Version display in TUI status bar (gray)
- Automatic update notification when new version is available
- `/update` command — self-update via npm
- First-run welcome message and auto-login prompt

### Changed
- Binary renamed from `sara-agent` to `sara`

## 0.1.0 (2026-07-25)

### Added
- Initial release of sara-agent
- Multi-LLM support (DeepSeek, OpenAI, GLM, and compatible APIs)
- Complete tool system (file operations, search, command execution)
- MCP (Model Context Protocol) integration
- Agent loop with streaming responses and permission approval
- React/Ink-based terminal UI with theme support
- Slash commands: /clear, /compact, /config, /help, /init, /login, /mcp, /model, /status, /update
