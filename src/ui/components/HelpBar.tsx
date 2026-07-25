import { execSync } from "child_process";
import { useMemo } from "react";
import { Box, Text } from "ink";

import type { ApprovalMode } from "../../config";
import type { MCPServerState } from "../../mcp/client";
import { getCurrentTheme } from "../theme";

// Token usage color thresholds (percentage of 128K context window)
const TOKEN_COLOR_THRESHOLDS = {
  WARNING: 102000, // 80% of 128K
  ERROR: 115000, // 90% of 128K
} as const;

const DEFAULT_CONTEXT_LIMIT = 128_000;

export interface HelpBarProps {
  message?: string;
  approvalMode?: ApprovalMode;
  helpMode?: boolean;
  mcp?: MCPServerState[];
  tokenUsage?: {
    total_tokens: number;
  };
  modelName?: string;
  cwd?: string;
}

const getStatusMessage = (approvalMode?: ApprovalMode) => {
  if (approvalMode === "autoEdit") return "autoEdit";
  if (approvalMode === "yolo") return "yolo";
  return "default";
};

const getStatusColor = (approvalMode?: ApprovalMode) => {
  if (approvalMode === "yolo") return getCurrentTheme().error;
  if (approvalMode === "autoEdit") return getCurrentTheme().warning;
  return undefined;
};

export function HelpBar({
  message,
  approvalMode,
  helpMode = false,
  mcp = [],
  tokenUsage,
  modelName,
  cwd,
}: HelpBarProps) {
  // Git branch detection
  const gitBranch = useMemo(() => {
    try {
      const branch = execSync(
        "git rev-parse --abbrev-ref HEAD 2>/dev/null || true",
        { encoding: "utf-8", timeout: 2000 },
      ).trim();
      return branch || undefined;
    } catch {
      return undefined;
    }
  }, []);

  // Format token display
  const formatTokenDisplay = (tokens: number): string => {
    if (tokens < 1000) return `${tokens}`;
    return `${Math.round(tokens / 1000)}K`;
  };

  const getTokenColor = (tokens: number): string | undefined => {
    if (tokens < TOKEN_COLOR_THRESHOLDS.WARNING) return undefined;
    if (tokens < TOKEN_COLOR_THRESHOLDS.ERROR)
      return getCurrentTheme().warning;
    return getCurrentTheme().error;
  };

  const tokenTotal = tokenUsage?.total_tokens || 0;
  const contextLimit = DEFAULT_CONTEXT_LIMIT;
  const contextPercent = Math.round((tokenTotal / contextLimit) * 100);
  const tokenColor = getTokenColor(tokenTotal);
  const tokenDisplay = tokenTotal
    ? `${formatTokenDisplay(tokenTotal)}/${formatTokenDisplay(contextLimit)}`
    : null;

  // Basename of cwd
  const dirName = cwd
    ? cwd.split("/").filter(Boolean).pop() || cwd
    : undefined;

  // Detailed help items in two columns
  const detailedHelpItems = [
    ["@ for file paths", "/ for commands"],
    ["shift + tab to cycle approve mode", "ctrl + c twice to exit"],
    ["option + enter for line break", "double tap esc to clear input"],
    ["ctrl + e to open external editor", ""],
  ];

  const modeLabel = getStatusMessage(approvalMode);
  const modeColor = getStatusColor(approvalMode);

  return (
    <Box width="100%" flexDirection="column" paddingX={1}>
      {helpMode ? (
        <Box width="100%" flexDirection="column">
          {detailedHelpItems.map((row, rowIndex) => (
            <Box
              key={rowIndex}
              width="100%"
              flexDirection="row"
              justifyContent="space-between"
            >
              <Box width="50%">
                <Text color={getCurrentTheme().secondary}>{row[0]}</Text>
              </Box>
              <Box width="50%" justifyContent="flex-end">
                <Text color={getCurrentTheme().secondary}>{row[1]}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      ) : message ? (
        /* Temporary message shown (e.g. escTips) */
        <Box width="100%" flexDirection="row" justifyContent="center">
          <Text dimColor>{message}</Text>
        </Box>
      ) : (
        <>
          {/* === First line: left items (mode model dir branch) + right hint === */}
          <Box width="100%" flexDirection="row" justifyContent="space-between">
            {/* Left cluster */}
            <Box flexDirection="row" alignItems="center" gap={1}>
              {modeLabel !== "default" && (
                <Text color={modeColor} bold>
                  {modeLabel}
                </Text>
              )}
              {modelName && (
                <>
                  <Text dimColor>•</Text>
                  <Text dimColor>{modelName}</Text>
                </>
              )}
              {dirName && (
                <>
                  <Text dimColor>•</Text>
                  <Text dimColor>{dirName}</Text>
                </>
              )}
              {gitBranch && (
                <>
                  <Text dimColor>•</Text>
                  <Text dimColor>{gitBranch}</Text>
                </>
              )}
            </Box>

            {/* Right hint */}
            <Text dimColor>shift+enter: newline</Text>
          </Box>

          {/* === Second line: MCP / context usage === */}
          <Box width="100%" flexDirection="row" justifyContent="space-between">
            <Box flexDirection="row" alignItems="center" gap={1}>
              {/* MCP indicators */}
              {mcp.length > 0 &&
                (() => {
                  const connected = mcp.filter(
                    (s) => s.status === "connected",
                  ).length;
                  const connecting = mcp.filter(
                    (s) => s.status === "connecting",
                  ).length;
                  const errorState = mcp.filter(
                    (s) => s.status === "error",
                  ).length;
                  return (
                    <>
                      {connected > 0 && (
                        <Text dimColor color={getCurrentTheme().success}>
                          • MCP {connected}
                        </Text>
                      )}
                      {connecting > 0 && (
                        <Text dimColor color={getCurrentTheme().warning}>
                          • MCP {connecting}
                        </Text>
                      )}
                      {errorState > 0 && (
                        <Text dimColor color={getCurrentTheme().error}>
                          • MCP {errorState}
                        </Text>
                      )}
                    </>
                  );
                })()}
            </Box>

            {/* Right: context usage */}
            <Box flexDirection="row" alignItems="center" gap={1}>
              <Text dimColor>
                context:{" "}
                <Text color={tokenColor}>
                  {contextPercent}% ({tokenDisplay})
                </Text>
              </Text>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
