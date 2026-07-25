import { execSync } from "child_process";
import { useEffect, useCallback, useRef } from "react";
import { useEffectEvent } from "use-effect-event";
import { useApp, useInput } from "ink";
import chalk from "chalk";

import { executeAgent } from "../agent/executor";
import type { ExecutionCallbacks } from "../agent/types";
import type { LLMMessage } from "../sessions/types";
import type { ApprovalMode } from "../config";
import type { PermissionUiHint, PermissionOption } from "../permissions/types";
import { isTransientToolState } from "../tools/runner.types";
import type { TodoItem } from "../tools/types";
import {
  requestUserApproval,
  resolveApproval,
} from "../permissions/permissionRequest";
import {
  subscribe as subscribeQuestions,
  resolveQuestion,
  rejectQuestion,
} from "../permissions/questionRequest";
import { Layout } from "./components/Layout";
import { useAppState } from "./hooks/useAppState";
import { createClient } from "../llm/client";
import { executeCommand } from "./commands/executor";
import { CommandName, CommandCall } from "./commands";
import { mcpService } from "../mcp";
import { ConfigManager } from "../config";
import { getAllProviders } from "../models/registry";
import {
  saveSession,
  loadSession,
  updateSessionMeta,
} from "../sessions/persistence";

export interface AppProps {
  cwd: string;
  approvalMode?: ApprovalMode;
  resumeSessionId?: string;
}

/**
 * Main App component for the sara CLI TUI.
 *
 * State Management:
 * - Uses useAppState Hook to centralize all application state
 *
 * Key Features:
 * - Streaming LLM responses with progressive UI updates
 * - Abort support via AbortController
 * - Double Ctrl+C exit with help message hint
 * - Session management
 */
export function App({ cwd, approvalMode, resumeSessionId }: AppProps) {
  const { exit } = useApp();

  // Centralized state management via custom Hook
  const { state, actions, refs, getCurrentApprovalMode, buildSession } =
    useAppState(approvalMode);

  // Use useEffectEvent to prevent infinite re-renders
  const updateMCPServer = useEffectEvent(actions.updateMCPServer);
  const setError = useEffectEvent(actions.setError);
  const loadSessionAction = useEffectEvent(actions.loadSession);

  // Load resumed session on mount
  useEffect(() => {
    if (!resumeSessionId) return;
    loadSession(resumeSessionId)
      .then((session) => {
        if (session) {
          loadSessionAction(session.sessionId, session.messages, session.title);
        }
      })
      .catch(() => {});
  }, [resumeSessionId, loadSessionAction]);

  // Save session after each LLM turn completes
  const saveSessionAfterTurn = useCallback(async () => {
    try {
      const session = buildSession();
      // Generate title from first user message if not set
      let title = state.messages.find(
        (m) => m.kind === "api" && m.message.role === "user",
      );
      if (title && typeof title.message.content === "string") {
        const firstMsg = title.message.content;
        const generatedTitle =
          firstMsg.length > 50 ? firstMsg.slice(0, 47) + "..." : firstMsg;
        await updateSessionMeta(session.sessionId, {
          title: generatedTitle,
          lastActivity: Date.now(),
        });
      } else {
        await updateSessionMeta(session.sessionId, {
          lastActivity: Date.now(),
        });
      }
    } catch {}
  }, [buildSession, state.messages]);

  // Initialize MCP connections on app start
  useEffect(() => {
    mcpService.initializeWithProgress(cwd, updateMCPServer).catch((error) => {
      setError(error instanceof Error ? error.message : String(error));
    });
  }, [cwd, updateMCPServer, setError]);

  // Subscribe to AskUserQuestion events
  const setPendingQuestion = useEffectEvent(actions.setPendingQuestion);
  useEffect(() => {
    const unsub = subscribeQuestions((event) => {
      setPendingQuestion(event);
    });
    return unsub;
  }, [setPendingQuestion]);

  // First-run detection: check if any API keys are configured
  const firstRunDone = useRef(false);
  const addCommandCall = useEffectEvent(actions.addCommandCall);
  const setInteractiveMode = useEffectEvent(actions.setInteractiveMode);
  useEffect(() => {
    if (firstRunDone.current) return;
    firstRunDone.current = true;

    // Check all known providers for API keys
    const providers = ["deepseek", "openai", "glm", "opencode"];
    const hasAnyKey = providers.some((p) => ConfigManager.getApiKey(p));

    if (!hasAnyKey) {
      // Add welcome message
      const startedAt = new Date().toISOString();
      addCommandCall({
        kind: "cmd" as const,
        commandName: "/welcome",
        callId: `/welcome_${Date.now()}`,
        status: "success" as const,
        startedAt,
        endedAt: startedAt,
        result: undefined,
      });

      // Start login interactive mode
      getAllProviders()
        .then((allProviders) => {
          setInteractiveMode({
            type: "login-provider",
            providers: allProviders.map((p) => ({
              id: p.id,
              name: p.name,
              baseURL: p.baseURL,
            })),
          });
        })
        .catch(() => {
          // Fallback: try to set interactive mode anyway
          setInteractiveMode({
            type: "login-provider",
            providers: [
              { id: "deepseek", name: "DeepSeek", baseURL: "https://api.deepseek.com/v1" },
              { id: "openai", name: "OpenAI", baseURL: "https://api.openai.com/v1" },
              { id: "glm", name: "GLM (智谱AI)" },
            ],
          });
        });
    }
  }, [addCommandCall, setInteractiveMode]);

  // ========================================================================
  // AGENT EXECUTION STATE DETECTION
  // ========================================================================
  //
  // Determines if the agent is currently executing any work that should
  // prevent user input or require special UI handling.
  //
  // CONSIDERED STATES:
  // 1. LLM Generation: state.isLLMGenerating (LLM streaming responses)
  // 2. Tool Execution: Any tool call in transient state (pending, executing, permission_required)
  // 3. Command Execution: Any command call in "executing" state
  //
  // IMPORTANT: This logic must be kept in sync with all execution states
  // across the application (LLM, tools, and commands).
  //
  // Calculate if agent is currently executing
  const isAgentExecuting =
    state.isLLMGenerating ||
    state.toolCalls.some((toolCall) => isTransientToolState(toolCall.status)) ||
    state.messages.some(
      (msg) => msg.kind === "cmd" && msg.status === "executing",
    );

  // Handle ESC key to abort execution (LLM generation or tool execution)
  // This is at App level to avoid conflicts with PromptInput's disabled state
  // Note: Don't handle ESC when permission prompts are shown to avoid conflicts
  useInput((_, key) => {
    if (key.escape) {
      // Check if there are any active permission prompts
      const hasPermissionPrompt = state.toolCalls.some(
        (call) => call.status === "permission_required",
      );

      // Only handle abort if there's no permission prompt active
      // PermissionPrompt handles ESC internally for permission rejection
      if (!hasPermissionPrompt) {
        if (isAgentExecuting) {
          actions.abort();
        }
      }
    }
  });

  const handleSubmit = useCallback(async (value: string): Promise<void> => {
    // Shell mode: execute command directly (value starts with "!")
    if (value.startsWith("!")) {
      const cmd = value.slice(1).trim();
      if (!cmd) return;

      const startedAt = new Date().toISOString();
      const callId = `/shell_${Date.now()}`;
      const commandCall: CommandCall<"/shell"> = {
        kind: "cmd",
        commandName: "/shell",
        callId,
        status: "executing" as const,
        startedAt,
      };
      actions.addCommandCall(commandCall);

      try {
        const output = execSync(cmd, {
          cwd,
          encoding: "utf-8",
          timeout: 60_000,
          maxBuffer: 10 * 1024 * 1024,
        });
        const completedCall = {
          ...commandCall,
          status: "success" as const,
          endedAt: new Date().toISOString(),
          result: { command: cmd, output: output || "" },
        };
        actions.completeCommandCall(completedCall);
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const completedCall = {
          ...commandCall,
          status: "error" as const,
          endedAt: new Date().toISOString(),
          error: errMsg,
          result: { command: cmd, output: errMsg },
        };
        actions.completeCommandCall(completedCall);
      }
      // Save session after shell command
      await saveSessionAfterTurn();
      return;
    }

    // Create abort controller for this request
    const ac = actions.createAbortController();
    actions.startRequest(value);

    // Build session from current UI state (includes token usage)
    const session = buildSession();

    // Prepare callbacks for agent executor
    const callbacks: ExecutionCallbacks = {
      onGeneratingChange: (isGenerating: boolean) => {
        actions.setLLMGenerating(isGenerating);
      },

      onLLMMessageUpdate: (message: LLMMessage) => {
        actions.updateLLMMessage(message);
      },

      onToolStart: (toolCall) => {
        actions.addToolCall(toolCall);
      },

      onToolUpdate: (toolCall) => {
        actions.updateToolCall(toolCall);
      },

      onToolComplete: async (result) => {
        actions.completeToolCall(result);
        // If todo tool completed, extract todos and update widget state
        if (
          result.status === "success" &&
          (result.toolName === "todo_write" || result.toolName === "todo_read")
        ) {
          const todosResult = result.result as { todos?: TodoItem[] } | undefined;
          if (todosResult?.todos) {
            actions.updateTodos(todosResult.todos);
          }
        }
      },

      onPermissionRequired: async (
        hint: PermissionUiHint,
        requestId: string,
      ) => {
        const decision = await requestUserApproval(
          requestId,
          refs.pendingApprovals.current,
        );

        return decision;
      },

      onError: async (error: Error) => {
        actions.setError(error.message);
      },

      onTokenUsageUpdate: (tokenUsage) => {
        actions.updateTokenUsage(tokenUsage);
      },

      onAddCommandCall: (commandCall) => {
        actions.addCommandCall(commandCall);
      },

      onCompleteCommandCall: (commandCall) => {
        actions.completeCommandCall(commandCall);
      },
    };

    // Execute agent
    await executeAgent(
      value,
      {
        cwd,
        signal: ac.signal,
        getApprovalMode: getCurrentApprovalMode,
        session: session,
        isPlanMode: state.isPlanMode,
      },
      callbacks,
    );

    // Save session after turn
    await saveSessionAfterTurn();
  }, [
    actions,
    buildSession,
    getCurrentApprovalMode,
    cwd,
    refs.pendingApprovals,
    saveSessionAfterTurn,
  ]);

  // Execute prompt when set by commands (like /init)
  useEffect(() => {
    if (state.promptToExecute) {
      // Store the prompt and clear it from state to avoid re-execution
      const promptToExecute = state.promptToExecute;
      actions.executePrompt(""); // Clear promptToExecute

      // Execute the prompt through the normal handleSubmit flow
      handleSubmit(promptToExecute.trim());
    }
  }, [state.promptToExecute, actions.executePrompt, handleSubmit]);

  /**
   * Handle user approval of a permission request.
   *
   * Called when user selects an option in the permission prompt.
   * Resolves the pending approval promise, allowing tool execution to continue.
   */
  // ========================================================================
  // USER APPROVAL HANDLER - COMPLETING THE ASYNC LOOP
  // ========================================================================
  //
  // This function is called when the user chooses an approval option.
  // It completes the async promise that was created in onPermissionRequired().
  //
  // FLOW COMPLETION:
  // 1. User approves the permission
  // 2. This function gets called with the user's choice
  // 3. resolveApproval() finds the stored resolve function
  // 4. Calls the resolve function with user's decision
  // 5. The promise in onPermissionRequired() resolves
  // 6. Executor gets the decision and continues/stops execution
  // 7. UI updates with tool execution progress
  const handleApprove = (requestId: string, option: PermissionOption): void => {
    resolveApproval(
      requestId,
      { approved: true, option },
      refs.pendingApprovals.current,
    );
  };

  // ========================================================================
  // USER REJECTION HANDLER - COMPLETING THE ASYNC LOOP
  // ========================================================================
  //
  // This function is called when the user rejects a permission request.
  // It completes the async promise with a rejection decision.
  //
  // FLOW COMPLETION:
  // 1. User presses [r] (reject)
  // 2. This function gets called with the requestId
  // 3. resolveApproval() finds the stored resolve function
  // 4. Calls the resolve function with rejection decision
  // 5. The promise in onPermissionRequired() resolves with rejection
  // 6. Executor receives rejection and stops tool execution
  // 7. UI updates showing the tool was rejected
  const handleReject = (requestId: string): void => {
    resolveApproval(
      requestId,
      { approved: false, reason: "user_rejected" },
      refs.pendingApprovals.current,
    );
  };

  /**
   * Execute slash commands using the command executor.
   * This handler is passed to PromptInput to centralize command execution at the App level.
   */
  const handleExecuteCommand = useCallback(
    async (command: CommandName, args?: string): Promise<void> => {
      // Execute command using the executor
      await executeCommand(
        command,
        state.messages,
        createClient({
          cwd,
        }),
        actions,
        handleSubmit,
        args,
      );

      // For backward compatibility, only add commands that don't manage their own state
      // Currently all commands manage their own state, so no special handling needed
    },
    [state.messages, actions, handleSubmit, cwd],
  );

  /**
   * Handle user answering a question from AskUserQuestion tool.
   */
  const handleQuestionAnswer = useCallback(
    (id: string, answers: Record<string, string>) => {
      resolveQuestion(id, answers);
      actions.clearPendingQuestion();
    },
    [actions],
  );

  /**
   * Handle user cancelling/dismissing a question.
   */
  const handleQuestionCancel = useCallback(
    (id: string) => {
      rejectQuestion(id, "User cancelled");
      actions.clearPendingQuestion();
    },
    [actions],
  );

  const handleExit = async (): Promise<void> => {
    // Save session before exit
    try {
      const session = buildSession();
      await saveSession(session);
    } catch {}

    // Print resume message
    console.log(
      chalk.gray(
        `To resume this session, run sara -s ${state.sessionId} or continue with sara -c`,
      ),
    );

    // Gracefully shutdown MCP connections before exit
    await mcpService.shutdown();
    exit();
  };

  return (
    <Layout
      cwd={cwd}
      state={state}
      actions={actions}
      onSubmit={handleSubmit}
      onExit={handleExit}
      onApprove={handleApprove}
      onReject={handleReject}
      onCycleApprovalMode={actions.cycleApprovalMode}
      isAgentExecuting={isAgentExecuting}
      onExecuteCommand={handleExecuteCommand}
      onQuestionAnswer={handleQuestionAnswer}
      onQuestionCancel={handleQuestionCancel}
    />
  );
}
