# Changelog

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
