# Configuration

Sara uses a simplified configuration system with global-only settings and project-specific permissions.

## Quick Start

**DeepSeek (Recommended)**

```bash
export DEEPSEEK_API_KEY="your-key"
sara config set llm.model deepseek-chat
sara config set theme dark
```

**OpenAI**

```bash
export OPENAI_API_KEY="your-key"
sara config set llm.model gpt-4
```

**Custom API**

```bash
export SARA_API_KEY="your-key"
export SARA_BASE_URL="https://your-api.com/v1"
export SARA_MODEL="your-model"
```

## Configuration Architecture

The configuration system has been simplified with clear separation of concerns:

### Global Configuration (`~/.sara/config.json`)

- **Purpose**: User preferences and LLM settings
- **Scope**: Global across all projects (no project-level config)
- **Content**: Non-sensitive settings only
- **Commands**: All config commands operate globally

### Project Permissions (`.sara/permissions.json`)

- **Purpose**: Project-specific access permissions
- **Scope**: Individual projects only
- **Content**: File system and command access grants
- **Separation**: Stored independently from global config

## Configuration Priority

Since configuration is global-only, settings are resolved in this order (highest to lowest):

1. **Environment variables** - `SARA_*`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`
2. **Global config file** - `~/.sara/config.json`
3. **Default values** - Built-in fallbacks

## Global Configuration Settings

### LLM Configuration

- `llm.baseURL` - API endpoint
- `llm.model` - Primary model
- `llm.planModel` - Architecture model (inherits from model if not set)

### UI Settings

- `theme` - UI theme mode:
  - `light` - Light theme (default)
  - `dark` - Dark theme

## Environment Variables

### Auto-Configuration (Recommended)

- `DEEPSEEK_API_KEY` → Auto-configures DeepSeek settings
- `OPENAI_API_KEY` → Auto-configures OpenAI settings

### Manual Configuration

- `SARA_API_KEY` - Your API key
- `SARA_BASE_URL` - Custom API endpoint
- `SARA_MODEL` - Custom model name
- `SARA_PLAN_MODEL` - Custom planning model

## CLI Commands

```bash
# View configuration (always global)
sara config list
sara config list --show-sources    # Show where values come from

# Get/set values (always global)
sara config get llm.model
sara config set llm.model gpt-4
sara config set theme dark

# Delete settings (always global)
sara config delete llm.model
```

## Configuration Files

### Global Config (`~/.sara/config.json`)

```json
{
  "llm": {
    "baseURL": "https://api.deepseek.com/v1",
    "model": "deepseek-chat",
    "planModel": "deepseek-chat"
  },
  "theme": "dark"
}
```

### Project Permissions (`.sara/permissions.json`)

```json
{
  "grants": [
    {
      "type": "fs",
      "pattern": "/project/src/**",
      "grantedAt": "2024-01-01T12:00:00.000Z"
    },
    {
      "type": "bash",
      "pattern": "npm:*",
      "grantedAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## MCP Configuration

Sara supports **Model Context Protocol (MCP)** servers. Create `.sara/mcp.json` in your project:

### Supported Transports

- **stdio**: Local command-line servers
- **http**: HTTP-based servers

### Environment Variables

Use `${ENV_VAR}` syntax in `args` and `headers` for secure configuration. Sara automatically resolves these references from your environment:

```json
{
  "servers": {
    "context7": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "chrome-devtools": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated=true"]
    }
  }
}
```

**How it works:**

- `${ENV_VAR}` patterns in `args` and `headers` are automatically replaced with actual environment variable values
- For stdio transport: environment variables are resolved in command arguments
- For HTTP transport: environment variables are resolved in request headers
- If environment variable is not found, the original `${ENV_VAR}` text is kept

## Security

- **API keys are never stored in config files**
- Use environment variables for API keys
- Global config only contains non-sensitive settings
- Permissions are project-specific and stored separately
