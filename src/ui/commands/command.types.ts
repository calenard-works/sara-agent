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
  | "/btw"
  | "/clear"
  | "/compact"
  | "/config"
  | "/export"
  | "/help"
  | "/init"
  | "/mcp"
  | "/login"
  | "/model"
  | "/reload-tui"
  | "/sessions"
  | "/shell"
  | "/status"
  | "/update"
  | "/usage"
  | "/version"
  | "/welcome";

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

export type UsageResult = {
  version: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  contextLimit: number;
};

export type ExportResult = {
  path: string;
  messageCount: number;
};

export type UpdateResult = {
  updated: boolean;
  version: string;
  releaseNotes?: string;
};

export type ShellResult = { command: string; output: string };

export type MCPResult = MCPServerState[];

/**
 * Generic type for command results based on command name
 */
export type CommandConcreteResult<T extends CommandName> = T extends "/btw"
  ? string
  : T extends "/clear"
    ? ClearResult
    : T extends "/compact"
      ? CompactResult
      : T extends "/config"
        ? ConfigResult
        : T extends "/export"
          ? ExportResult
          : T extends "/help"
            ? HelpResult
            : T extends "/init"
              ? InitResult
              : T extends "/mcp"
                ? MCPResult
                : T extends "/login"
                  ? unknown
                  : T extends "/model"
                    ? unknown
                    : T extends "/reload-tui"
                      ? void
                      : T extends "/sessions"
                        ? undefined
                        : T extends "/shell"
                          ? ShellResult
                          : T extends "/status"
                            ? StatusResult
                            : T extends "/update"
                              ? UpdateResult
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
