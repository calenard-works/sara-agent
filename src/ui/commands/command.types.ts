import type { LlmClient } from "../../llm/client";
import type { UIFeedMessage } from "../types";
import type { AppActions } from "../hooks/useAppState";
import type { MCPServerState } from "../../mcp/client";

/**
 * All possible command call statuses
 */
export type CommandCallStatus = "executing" | "success" | "error";

/**
 * All available command names
 */
export type CommandName =
  | "/autoedit"
  | "/btw"
  | "/clear"
  | "/compact"
  | "/config"
  | "/copy"
  | "/export"
  | "/goal"
  | "/help"
  | "/init"
  | "/mcp"
  | "/model"
  | "/permission"
  | "/plan"
  | "/provider"
  | "/reload-tui"
  | "/sessions"
  | "/shell"
  | "/status"
  | "/tasks"
  | "/usage"
  | "/version"
  | "/welcome"
  | "/yolo";

/**
 * Command result types for each command
 */
export type ClearResult = void;

export type CompactResult = string | undefined;

export type InitResult = void;

export type HelpResult = {
  commands: { name: CommandName; description: string }[];
};

export type ConfigResult = {
  provider: string;
  llm: {
    baseURL: string | undefined;
    model: string | undefined;
    planModel: string | undefined;
  };
  apiKeys: Record<string, boolean>;
};

export type StatusResult = {
  version: string;
  messages: number;
  toolMessages: number;
  commandMessages: number;
};

export type VersionResult = {
  version: string;
  description: string;
};

export type ModelUsageEntry = {
  /** Full provider/model identifier, e.g. "opencode/deepseek-v4-flash-free" */
  id: string;
  /** Human-readable model name */
  displayName: string;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Total tokens */
  totalTokens: number;
  /** Formatted input token string with SI suffix */
  inputFormatted: string;
  /** Formatted output token string with SI suffix */
  outputFormatted: string;
  /** Formatted total token string with SI suffix */
  totalFormatted: string;
};

export type UsageResult = {
  models: ModelUsageEntry[];
  /** Aggregate totals */
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalInputFormatted: string;
  totalOutputFormatted: string;
  totalFormatted: string;
  /** Context window */
  contextLimit: number;
  contextPercent: number;
  contextUsed: number;
};

export type GoalResult = string | undefined;

export type TasksResult = string | undefined;

export type ExportResult = {
  path: string;
  messageCount: number;
};

export type CopyResult = string | undefined;

export type PlanResult = string | undefined;

export type PermissionResult = void;

export type YoloResult = void;

export type ShellResult = { command: string; output: string };

export type MCPResult = MCPServerState[];

/**
 * Generic type for command results based on command name
 */
export type CommandConcreteResult<T extends CommandName> = T extends "/autoedit"
  ? AutoEditResult
  : T extends "/btw"
  ? string
  : T extends "/clear"
    ? ClearResult
    : T extends "/compact"
      ? CompactResult
      : T extends "/config"
        ? ConfigResult
        : T extends "/copy"
          ? CopyResult
          : T extends "/export"
            ? ExportResult
            : T extends "/goal"
              ? GoalResult
              : T extends "/help"
              ? HelpResult
              : T extends "/init"
                ? InitResult
                : T extends "/mcp"
                  ? MCPResult
                  : T extends "/provider"
                    ? unknown
                    : T extends "/model"
                      ? unknown
                      : T extends "/permission"
                        ? PermissionResult
                      : T extends "/plan"
                        ? PlanResult
                      : T extends "/yolo"
                        ? YoloResult
                        : T extends "/reload-tui"
                          ? void
                          : T extends "/sessions"
                            ? undefined
                            : T extends "/shell"
                              ? ShellResult
                              : T extends "/status"
                                ? StatusResult
                                : T extends "/tasks"
                                  ? TasksResult
                                  : T extends "/usage"
                                    ? UsageResult
                                    : T extends "/version"
                                      ? VersionResult
                                      : T extends "/welcome"
                                        ? undefined
                                        : never;

/**
 * Command call interface - represents a command execution
 */
export interface CommandCall<CName extends CommandName = CommandName> {
  kind: "cmd";
  commandName: CName;
  callId: string;
  status: CommandCallStatus;
  startedAt: string;
  endedAt?: string;
  result?: CommandConcreteResult<CName>;
  error?: string;
  /**
   * Whether this command was auto-triggered by the system (e.g., auto-compaction)
   * instead of being manually executed by the user
   */
  autoTriggered?: boolean;
}

/**
 * Command handler interface
 */
export interface CommandHandler<Output> {
  name: CommandName;
  description: string;
  execute: (
    messages: UIFeedMessage[],
    llmClient: LlmClient,
    actions: AppActions,
    onExecutePrompt: (prompt: string) => Promise<void>,
    args?: string,
  ) => Promise<Output>;
}

export function isTerminalCommandState(status: CommandCallStatus): boolean {
  return status === "success" || status === "error";
}

export function isTransientCommandState(status: CommandCallStatus): boolean {
  return status === "executing";
}
