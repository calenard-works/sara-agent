# sara-agent

An AI coding assistant agent that helps you understand and modify codebases through natural language conversations.

## Features

- **Multi-LLM Support** - Compatible with OpenAI APIs, including GLM, DeepSeek, and other mainstream models
- **Complete Tool System** - Unified interface with tools for file operations, search, and command execution
- **MCP Integration** - Connect to external MCP servers for extended functionality
- **Agent Loop** - Complete LLM workflow with streaming responses and human-in-the-loop permission approval
- **Modern UI** - React/Ink-based terminal interface with theme support

## Quick Start

### Install

```bash
npm install -g sara-agent
```

### Set Up API Key

**DeepSeek**:

```bash
export DEEPSEEK_API_KEY="your-deepseek-api-key"
```

**Or use GLM (智谱AI)**:

```bash
export GLM_API_KEY="your-glm-api-key"
```

**Or use OpenAI compatible API**:

```bash
export OPENAI_API_KEY="your-openai-api-key"
# or
export SARA_API_KEY="your-api-key"
export SARA_BASE_URL="https://your-api-provider.com/v1"
export SARA_MODEL="your-model-name"
```

### Run

```bash
# Interactive mode (launch UI)
sara-agent

# Non-interactive mode (direct execution)
sara-agent "help me fix the bug in auth.ts"
```

## Development

### Prerequisites

- **Bun**
- **pnpm**

### Commands

```bash
pnpm install       # Install dependencies
pnpm run dev       # Development mode with file watching
pnpm run build     # Build
pnpm run test      # Run tests
```

## Project Structure

```
src/
├── tools/          # Tool system and individual tools
├── ui/             # Ink-based CLI interface components
├── llm/            # LLM client and streaming integration
├── permissions/    # Two-layer permission system
├── config/         # Configuration management
├── cli/            # CLI framework and commands
├── agent/          # Core agent logic
├── sessions/       # Session management
└── utils/          # Shared utilities
```

## Tech Stack

- **TypeScript** - Static type checking
- **pnpm** - Package management
- **Ink** - React terminal UI
- **OpenAI SDK** - LLM integration (supports DeepSeek/OpenAI/compatible APIs)
- **Vitest** - Testing framework
- **Zod** - Runtime type validation
- **Commander** - CLI framework
