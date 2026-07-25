import { useEffect, useMemo, useState } from "react";
import { Box, Text } from "ink";

import { getCurrentTheme } from "../theme";
import { CommandCall } from "../commands";
import { InkMarkdown } from "./InkMarkdown";
import { useTerminalWidth } from "../hooks/useTerminalWidth";
import { MCPDetailView } from "./MCPDetailView";
import {
  CompactResult,
  ConfigResult,
  ExportResult,
  HelpResult,
  MCPResult,
  ShellResult,
  StatusResult,
  UpdateResult,
  UsageResult,
  VersionResult,
} from "../commands/command.types";

export interface CommandMessageProps {
  commandMessage: CommandCall;
}

export function CommandMessage({ commandMessage }: CommandMessageProps) {
  const { commandName, status, result, error } = commandMessage;
  const terminalWidth = useTerminalWidth();

  /**
   * Loading animation for executing status
   * Toggles between the icon and a blank space to create a blinking effect
   */
  const [loadingIconIndex, setLoadingIconIndex] = useState(0);
  const loadingIcons = useMemo(() => ["●", " "], []);

  useEffect(() => {
    if (status !== "executing") {
      return;
    }

    const interval = setInterval(() => {
      setLoadingIconIndex((prev) => (prev + 1) % loadingIcons.length);
    }, 500);

    return () => clearInterval(interval);
  }, [status, loadingIcons.length]);

  // Special handling for /init command: don't render CommandMessage
  // /init command's purpose is to send a prompt to LLM for project analysis
  // The actual execution and results will be shown through normal LLM message flow
  // This avoids duplicate UI elements and provides cleaner user experience
  if (commandName === "/init") {
    return null;
  }

  // Special handling for /clear command: show "(No content)"
  if (commandName === "/clear") {
    return (
      <Box flexDirection="row" marginTop={1}>
        <Box marginRight={1}>
          <Text>{">"}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          <Text bold>{commandName}</Text>
          <Box>
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Text color={getCurrentTheme().secondary}>(no content)</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /compact command: compact display
  if (commandName === "/compact") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    const compactResult = result as CompactResult;

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>compacting conversion...</Text>;
        break;
      case "success":
        iconColor = getCurrentTheme().success;
        // Use markdown component for success result
        displayContent = compactResult && (
          <InkMarkdown>{compactResult}</InkMarkdown>
        );
        break;
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Failed"}</Text>
        );
        break;
    }

    // Add auto-triggered indicator
    const commandDisplay = commandMessage.autoTriggered ? (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Text bold>{commandName}</Text>
        <Text color={getCurrentTheme().secondary}>(auto)</Text>
      </Box>
    ) : (
      <Text bold>{commandName}</Text>
    );

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          {commandDisplay}
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /mcp command: show MCP server details
  if (commandName === "/mcp") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    const mcpResult = result as MCPResult;

    switch (status) {
      case "success":
        iconColor = getCurrentTheme().success;
        // Use MCPDetailView for success result
        displayContent = <MCPDetailView serverStates={mcpResult} />;
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>{commandName}</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /help command: show available commands
  if (commandName === "/help") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "success": {
        iconColor = getCurrentTheme().success;
        const helpResult = result as HelpResult | undefined;
        if (helpResult?.commands) {
          const rows = helpResult.commands.map((cmd, i) => (
            <Box key={i} flexDirection="row" gap={2}>
              <Text bold color={getCurrentTheme().brand}>
                {cmd.name}
              </Text>
              <Text dimColor>{cmd.description}</Text>
            </Box>
          ));
          displayContent = <Box flexDirection="column">{rows}</Box>;
        } else {
          displayContent = (
            <Text color={getCurrentTheme().secondary}>(no content)</Text>
          );
        }
        break;
      }
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>Available commands</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /config command: show configuration
  if (commandName === "/config") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>reading config...</Text>;
        break;
      case "success": {
        iconColor = getCurrentTheme().success;
        const configResult = result as ConfigResult | undefined;
        if (configResult) {
          const rows: React.ReactNode[] = [];
          rows.push(
            <Box key="provider" flexDirection="row" gap={1}>
              <Text bold>Provider:</Text>
              <Text>{configResult.provider}</Text>
            </Box>,
          );
          rows.push(
            <Box key="model" flexDirection="row" gap={1}>
              <Text bold>Model:</Text>
              <Text>{configResult.llm.model || "(not set)"}</Text>
            </Box>,
          );
          rows.push(
            <Box key="baseURL" flexDirection="row" gap={1}>
              <Text bold>Base URL:</Text>
              <Text>{configResult.llm.baseURL || "(not set)"}</Text>
            </Box>,
          );
          rows.push(
            <Box key="planModel" flexDirection="row" gap={1}>
              <Text bold>Plan Model:</Text>
              <Text>{configResult.llm.planModel || "(not set)"}</Text>
            </Box>,
          );
          // API keys status
          const providers = Object.entries(configResult.apiKeys);
          if (providers.length > 0) {
            rows.push(
              <Box key="keys-hdr" marginTop={1}>
                <Text bold>API Keys:</Text>
              </Box>,
            );
            for (const [p, has] of providers) {
              const keyColor = has
                ? getCurrentTheme().success
                : getCurrentTheme().secondary;
              const label = has ? "✓" : "·";
              rows.push(
                <Box
                  key={`key-${p}`}
                  flexDirection="row"
                  gap={1}
                  marginLeft={2}
                >
                  <Text color={keyColor}>{label}</Text>
                  <Text dimColor>{p}</Text>
                </Box>,
              );
            }
          }
          displayContent = <Box flexDirection="column">{rows}</Box>;
        } else {
          displayContent = (
            <Text color={getCurrentTheme().secondary}>(no config)</Text>
          );
        }
        break;
      }
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Failed"}</Text>
        );
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>Configuration</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /update command: show update result
  if (commandName === "/update") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>updating Sara...</Text>;
        break;
      case "success": {
        iconColor = getCurrentTheme().success;
        const updateResult = result as UpdateResult | undefined;
        if (updateResult) {
          const rows: React.ReactNode[] = [
            <Box key="updated" flexDirection="row" gap={1}>
              <Text bold color={getCurrentTheme().success}>✓ Updated to</Text>
              <Text bold>v{updateResult.version}</Text>
            </Box>,
          ];
          if (updateResult.releaseNotes) {
            rows.push(
              <Box key="notes" marginTop={1} flexDirection="column">
                <Text bold>Release notes:</Text>
                <InkMarkdown>{updateResult.releaseNotes}</InkMarkdown>
              </Box>,
            );
          }
          displayContent = <Box flexDirection="column">{rows}</Box>;
        } else {
          displayContent = (
            <Text color={getCurrentTheme().secondary}>(no result)</Text>
          );
        }
        break;
      }
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Update failed"}</Text>
        );
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>Update</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /shell command: show shell command output
  if (commandName === "/shell") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>running...</Text>;
        break;
      case "success": {
        iconColor = getCurrentTheme().shellMode;
        const shellResult = result as ShellResult | undefined;
        if (shellResult?.output) {
          displayContent = (
            <Box flexDirection="column">
              <Text color={getCurrentTheme().shellMode} dimColor>
                $ {shellResult.command}
              </Text>
              <Text>{shellResult.output}</Text>
            </Box>
          );
        } else {
          displayContent = (
            <Text color={getCurrentTheme().secondary}>(no output)</Text>
          );
        }
        break;
      }
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Command failed"}</Text>
        );
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "$"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold color={getCurrentTheme().shellMode}>Shell</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /status command: show session summary
  if (commandName === "/status") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>gathering status...</Text>;
        break;
      case "success": {
        iconColor = getCurrentTheme().success;
        const statusResult = result as StatusResult | undefined;
        if (statusResult) {
          const rows: React.ReactNode[] = [
            <Box key="version" flexDirection="row" gap={1}>
              <Text bold>Version:</Text>
              <Text>{statusResult.version}</Text>
            </Box>,
            <Box key="msgs" flexDirection="row" gap={1}>
              <Text bold>Messages:</Text>
              <Text>{statusResult.messages}</Text>
              <Text dimColor>
                ({statusResult.toolMessages} tool,{" "}
                {statusResult.commandMessages} cmd)
              </Text>
            </Box>,
          ];
          displayContent = <Box flexDirection="column">{rows}</Box>;
        } else {
          displayContent = (
            <Text color={getCurrentTheme().secondary}>(no data)</Text>
          );
        }
        break;
      }
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Failed"}</Text>
        );
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>Session Status</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /version command
  if (commandName === "/version") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>checking version...</Text>;
        break;
      case "success": {
        iconColor = getCurrentTheme().success;
        const versionResult = result as VersionResult | undefined;
        if (versionResult) {
          displayContent = (
            <Box flexDirection="column">
              <Text bold>{versionResult.description}</Text>
              <Text dimColor>v{versionResult.version}</Text>
            </Box>
          );
        } else {
          displayContent = (
            <Text color={getCurrentTheme().secondary}>(no result)</Text>
          );
        }
        break;
      }
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Failed"}</Text>
        );
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>Version</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /usage command
  if (commandName === "/usage") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>gathering usage...</Text>;
        break;
      case "success": {
        iconColor = getCurrentTheme().success;
        const usageResult = result as UsageResult | undefined;
        if (usageResult && usageResult.models.length > 0) {
          // Build model rows
          const modelRows = usageResult.models.map((m, i) => (
            <Box key={i} flexDirection="row" marginLeft={2}>
              <Box width={terminalWidth - 14}>
                <Text>
                  <Text dimColor>{m.id}</Text>
                  {"  "}
                  <Text dimColor>input </Text>
                  <Text>{m.inputFormatted}</Text>
                  {"  "}
                  <Text dimColor>output </Text>
                  <Text>{m.outputFormatted}</Text>
                  {"  "}
                  <Text dimColor>total </Text>
                  <Text>{m.totalFormatted}</Text>
                </Text>
              </Box>
            </Box>
          ));

          // Total row
          const totalRow = (
            <Box key="total" flexDirection="row" marginLeft={2} marginTop={0}>
              <Box width={terminalWidth - 14}>
                <Text bold>
                  total{"  "}
                  <Text dimColor>input </Text>
                  <Text>{usageResult.totalInputFormatted}</Text>
                  {"  "}
                  <Text dimColor>output </Text>
                  <Text>{usageResult.totalOutputFormatted}</Text>
                  {"  "}
                  <Text dimColor>total </Text>
                  <Text>{usageResult.totalFormatted}</Text>
                </Text>
              </Box>
            </Box>
          );

          // Context window progress bar
          const barWidth = 20;
          const filledCount = Math.round(
            (usageResult.contextPercent / 100) * barWidth,
          );
          const emptyCount = barWidth - filledCount;
          const bar =
            "█".repeat(filledCount) + "░".repeat(Math.max(0, emptyCount));

          const contextRow = (
            <Box key="context" flexDirection="row" marginLeft={2} marginTop={1}>
              <Box width={terminalWidth - 14}>
                <Text>
                  <Text dimColor>Context window</Text>
                </Text>
              </Box>
            </Box>
          );

          const contextBarRow = (
            <Box key="context-bar" flexDirection="row" marginLeft={2}>
              <Box width={terminalWidth - 14}>
                <Text>
                  {"  "}
                  <Text color={getCurrentTheme().accent}>{bar}</Text>
                  {"    "}
                  <Text bold color={getCurrentTheme().warning}>
                    {usageResult.contextPercent}%
                  </Text>
                  {"  "}
                  <Text dimColor>
                    ({usageResult.contextUsed.toLocaleString()} /{" "}
                    {usageResult.contextLimit.toLocaleString()})
                  </Text>
                </Text>
              </Box>
            </Box>
          );

          displayContent = (
            <Box flexDirection="column" width={terminalWidth - 8}>
              <Box flexDirection="column">
                <Box marginLeft={2}>
                  <Text dimColor>Session usage</Text>
                </Box>
                {modelRows}
                <Box marginTop={0}>{totalRow}</Box>
                <Box marginTop={0}>{contextRow}</Box>
                <Box marginTop={0}>{contextBarRow}</Box>
              </Box>
            </Box>
          );
        } else {
          displayContent = (
            <Text color={getCurrentTheme().secondary}>(no data)</Text>
          );
        }
        break;
      }
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Failed"}</Text>
        );
        break;
    }

    return (
      <Box
        marginTop={1}
        width={terminalWidth - 4}
        flexDirection="column"
        borderStyle="round"
        borderColor={getCurrentTheme().secondary}
        paddingX={1}
        paddingY={1}
      >
        <Box marginLeft={1}>
          <Text bold>Usage</Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {displayContent}
        </Box>
      </Box>
    );
  }

  // Special handling for /export command
  if (commandName === "/export") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>exporting session...</Text>;
        break;
      case "success": {
        iconColor = getCurrentTheme().success;
        const exportResult = result as ExportResult | undefined;
        if (exportResult) {
          displayContent = (
            <Box flexDirection="column">
              <Text bold>✓ Exported {exportResult.messageCount} messages</Text>
              <Text dimColor>{exportResult.path}</Text>
            </Box>
          );
        } else {
          displayContent = (
            <Text color={getCurrentTheme().secondary}>(no result)</Text>
          );
        }
        break;
      }
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Export failed"}</Text>
        );
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>Export</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /btw command
  if (commandName === "/btw") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>running side question...</Text>;
        break;
      case "success":
        iconColor = getCurrentTheme().success;
        displayContent = <Text>Side question submitted.</Text>;
        break;
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Failed"}</Text>
        );
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>Btw</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Special handling for /reload-tui command
  if (commandName === "/reload-tui") {
    let iconColor: string | undefined = undefined;
    let displayContent: React.ReactNode = "";

    switch (status) {
      case "executing":
        iconColor = getCurrentTheme().secondary;
        displayContent = <Text>reloading config...</Text>;
        break;
      case "success":
        iconColor = getCurrentTheme().success;
        displayContent = <Text>✓ Config reloaded</Text>;
        break;
      case "error":
        iconColor = getCurrentTheme().error;
        displayContent = (
          <Text color={getCurrentTheme().error}>{error || "Failed"}</Text>
        );
        break;
    }

    return (
      <Box marginTop={1} width={terminalWidth - 4}>
        <Box marginRight={1}>
          <Text color={iconColor}>
            {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text bold>Reload</Text>
          <Box flexDirection="row">
            <Box>
              <Text>⎿{"  "}</Text>
            </Box>
            <Box flexDirection="column">{displayContent}</Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Welcome message on first run
  if (commandName === "/welcome") {
    return (
      <Box marginTop={1} width={terminalWidth - 4} flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Text bold color={getCurrentTheme().brand}>
            Welcome to Sara!
          </Text>
        </Box>
        <Box flexDirection="row" gap={1} marginTop={1}>
          <Text>Get started by setting up your API key below.</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text dimColor>
            You can also set it later with:{" "}
          </Text>
          <Text bold color={getCurrentTheme().secondary}>
            /login &lt;provider&gt; &lt;api-key&gt;
          </Text>
        </Box>
      </Box>
    );
  }

  // Generic fallback for commands without special rendering
  let iconColor: string | undefined = undefined;
  let displayContent: React.ReactNode = null;

  switch (status) {
    case "executing":
      iconColor = getCurrentTheme().secondary;
      displayContent = error ? (
        <Text color={getCurrentTheme().error}>{error}</Text>
      ) : null;
      break;
    case "success":
      iconColor = getCurrentTheme().success;
      if (result) {
        displayContent = <Text>{String(result)}</Text>;
      }
      break;
    case "error":
      iconColor = getCurrentTheme().error;
      displayContent = <Text color={getCurrentTheme().error}>{error || "Failed"}</Text>;
      break;
  }

  return (
    <Box marginTop={1} width={terminalWidth - 4}>
      <Box marginRight={1}>
        <Text color={iconColor}>
          {status === "executing" ? loadingIcons[loadingIconIndex] : "●"}
        </Text>
      </Box>
      <Box flexDirection="column">
        <Text bold color={getCurrentTheme().accent}>{commandName}</Text>
        <Box flexDirection="row">
          <Box>
            <Text>⎿{"  "}</Text>
          </Box>
          <Box flexDirection="column">{displayContent}</Box>
        </Box>
      </Box>
    </Box>
  );
}
