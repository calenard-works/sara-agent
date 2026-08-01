import { useEffect, useMemo, useState, useCallback } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Box, Text } from "ink";

import type { PermissionOption } from "../../permissions/types";
import type { AppState, AppActions } from "../hooks/useAppState";
import type { LLMMessage, Session } from "../../sessions/types";
import { isTransientToolState } from "../../tools/runner.types";
import { Logo } from "./Logo";
import { ConfigManager } from "../../config";
import MessageFeed from "./MessageFeed";
import { PromptInput } from "./PromptInput";
import ErrorView from "./ErrorView";
import { CommandName } from "../commands";
import { getCurrentTheme } from "../theme";
import { ProviderSelector } from "./ProviderSelector";
import { KeyInput } from "./KeyInput";
import { SessionList } from "./SessionList";
import { QuestionView } from "./QuestionView";
import { TodoWidget } from "./TodoWidget";
import {
  resolveQuestion,
  rejectQuestion,
} from "../../permissions/questionRequest";
import { fetchAllProviderModels } from "../../models/registry";

export interface LayoutProps {
  cwd: string;
  state: AppState;
  actions: AppActions;
  onSubmit: (value: string) => void;
  onExit: () => void;
  onApprove: (requestId: string, option: PermissionOption) => void;
  onReject: (requestId: string) => void;
  onCycleApprovalMode: () => void; // Handler for cycling approval mode
  isAgentExecuting?: boolean; // Whether agent is currently executing
  onExecuteCommand: (command: CommandName, args?: string) => Promise<void>;
  onQuestionAnswer: (id: string, answers: Record<string, string>) => void;
  onQuestionCancel: (id: string) => void;
}

export function Layout({
  cwd,
  state,
  actions,
  onSubmit,
  onExit,
  onApprove,
  onReject,
  onCycleApprovalMode,
  isAgentExecuting = false,
  onExecuteCommand,
  onQuestionAnswer,
  onQuestionCancel,
}: LayoutProps) {
  const [dotIndex, setDotIndex] = useState(0);
  const dots = useMemo(() => ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], []);

  useEffect(() => {
    if (!state.isLLMGenerating && !isAgentExecuting) return;
    const interval = setInterval(() => {
      setDotIndex((prev) => (prev + 1) % dots.length);
    }, 120);
    return () => clearInterval(interval);
  }, [state.isLLMGenerating, isAgentExecuting, dots.length]);

  const hasPermissionRequest = state.toolCalls.some(
    (c) => c.status === "permission_required",
  );

  const isInInteractiveMode = state.interactiveMode !== null;

  /** Build a human-readable status label for the dots spinner */
  const statusLabel = useMemo(() => {
    // Tool execution phase
    const runningTools = state.toolCalls.filter((tc) =>
      isTransientToolState(tc.status),
    );
    if (runningTools.length > 0) {
      const hasBash = runningTools.some((tc) => tc.toolName === "Bash");
      if (hasBash) return "Running...";
      return "Working...";
    }

    // LLM thinking phase
    if (state.isLLMGenerating) {
      return "Thinking...";
    }

    return undefined;
  }, [state.isLLMGenerating, state.toolCalls]);

  const shouldShowStatus =
    !hasPermissionRequest && (state.isLLMGenerating || statusLabel !== undefined);

  // Resolve human-readable model name
  const [modelDisplayName, setModelDisplayName] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    const modelId = ConfigManager.load().llm.model;
    const providerId = ConfigManager.getProvider();
    if (!modelId || !providerId) {
      setModelDisplayName("");
      return;
    }
    // Try to resolve from registry
    import("../../models/registry")
      .then(({ fetchAllProviderModels }) =>
        fetchAllProviderModels(providerId),
      )
      .then((models) => {
        if (cancelled) return;
        const found = models.find((m) => m.id === modelId);
        setModelDisplayName(found?.name || modelId);
      })
      .catch(() => {
        if (!cancelled) setModelDisplayName(modelId);
      });
    return () => {
      cancelled = true;
    };
  }, [state.modelRefreshKey]);

  // Check if user has any provider configured
  const hasProvider = useMemo(() => {
    try {
      return !!ConfigManager.getProvider();
    } catch {
      return false;
    }
  }, []);

  const logo = useMemo(() => {
    return (
      <Box flexDirection="column">
        <Logo />
        <Box marginTop={1}>
          <Text dimColor>Directory: {cwd}</Text>
        </Box>
        <Box>
          {hasProvider && modelDisplayName ? (
            <Text dimColor>Model: {modelDisplayName}</Text>
          ) : (
            <Text dimColor>
              not signed, run{" "}
              <Text bold color={getCurrentTheme().secondary}>
                /login
              </Text>
            </Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            Sara is a coding assistant that runs in your terminal. It helps you
            write, debug, and refactor code using AI agents with full tool
            access.
          </Text>
        </Box>
        {state.isPlanMode && (
          <Box marginTop={1}>
            <Text bold color={getCurrentTheme().warning}>
              ═══ Plan Mode ═══
            </Text>
            <Text dimColor> — only planning, no changes</Text>
          </Box>
        )}
      </Box>
    );
  }, [cwd, hasProvider, modelDisplayName, state.isPlanMode]);

  // Interactive mode handlers
  const handleLoginProviderSelect = useCallback(
    async (provider: { id: string; name: string; baseURL?: string }) => {
      actions.setInteractiveMode({
        type: "login-key",
        provider,
      });
    },
    [actions],
  );

  const handleLoginKeySubmit = useCallback(
    async (apiKey: string) => {
      const mode = state.interactiveMode;
      if (mode?.type !== "login-key") return;

      ConfigManager.setApiKey(mode.provider.id, apiKey);
      ConfigManager.setProvider(mode.provider.id);

      // Find provider baseURL from registry
      try {
        const { getProvider } = await import("../../models/registry");
        const provider = await getProvider(mode.provider.id);
        if (provider?.baseURL) {
          ConfigManager.set("llm.baseURL", provider.baseURL);
        }
      } catch {}

      actions.setInteractiveMode(null);
      actions.setError(undefined);
      actions.refreshModel();
    },
    [state.interactiveMode, actions],
  );

  const handleModelProviderSelect = useCallback(
    async (provider: { id: string; name: string }) => {
      // Check if API key exists
      const apiKey = ConfigManager.getApiKey(provider.id);
      if (!apiKey) {
        actions.setError(
          `No API key for "${provider.id}". Run: /login ${provider.id} <key>`,
        );
        actions.setInteractiveMode(null);
        return;
      }

      // Fetch ALL models for this provider
      const models = await fetchAllProviderModels(provider.id);
      if (models.length === 0) {
        actions.setError(`No models found for "${provider.id}"`);
        actions.setInteractiveMode(null);
        return;
      }

      actions.setInteractiveMode({
        type: "model-models",
        provider,
        models,
      });
    },
    [actions],
  );

  const handleModelSelect = useCallback(
    async (model: { id: string; name: string }) => {
      const mode = state.interactiveMode;
      if (mode?.type !== "model-models") return;

      ConfigManager.set("llm.model", model.id);
      ConfigManager.setProvider(mode.provider.id);

      try {
        const { getProvider } = await import("../../models/registry");
        const provider = await getProvider(mode.provider.id);
        if (provider?.baseURL) {
          ConfigManager.set("llm.baseURL", provider.baseURL);
        }
      } catch {}

      actions.setInteractiveMode(null);
      actions.setError(undefined);
      actions.refreshModel();
    },
    [state.interactiveMode, actions],
  );

  const handleInteractiveCancel = useCallback(() => {
    actions.setInteractiveMode(null);
  }, [actions]);

  // Render interactive mode UI
  const renderInteractiveMode = () => {
    const mode = state.interactiveMode;
    if (!mode) return null;

    switch (mode.type) {
      case "provider-provider":
        return (
          <ProviderSelector
            title="Providers"
            providers={mode.providers}
            onSelect={handleLoginProviderSelect}
            onCancel={handleInteractiveCancel}
          />
        );
      case "login-key":
        return (
          <KeyInput
            providerName={mode.provider.name}
            onSubmit={handleLoginKeySubmit}
            onCancel={handleInteractiveCancel}
          />
        );
      case "model-provider":
        return (
          <ProviderSelector
            title="Select provider:"
            providers={mode.providers}
            onSelect={handleModelProviderSelect}
            onCancel={handleInteractiveCancel}
          />
        );
      case "model-models":
        return (
          <ProviderSelector
            title={`Select model for ${mode.provider.name}:`}
            providers={mode.models}
            onSelect={handleModelSelect}
            onCancel={handleInteractiveCancel}
          />
        );
      case "sessions-list": {
        const handleSessionSelect = (session: Session) => {
          actions.loadSession(
            session.sessionId,
            session.messages,
            session.title,
          );
          actions.setInteractiveMode(null);
        };
        return (
          <SessionList
            sessions={mode.sessions}
            onSelect={handleSessionSelect}
            onCancel={handleInteractiveCancel}
          />
        );
      }
      case "permission-picker": {
        const handleModeSelect = async (m: { id: string; name: string }) => {
          const target = m.id;
          const current = state.currentApprovalMode;
          const order = ["default", "autoEdit", "yolo"];
          const fromIdx = order.indexOf(current);
          const toIdx = order.indexOf(target);
          if (fromIdx !== -1 && toIdx !== -1) {
            const cycles = (toIdx - fromIdx + 3) % 3;
            for (let i = 0; i < cycles; i++) {
              onCycleApprovalMode();
            }
          }
          actions.setInteractiveMode(null);
        };
        return (
          <ProviderSelector
            title="Select permission mode:"
            providers={mode.modes}
            onSelect={handleModeSelect}
            onCancel={handleInteractiveCancel}
          />
        );
      }
    }
  };

  return (
    <ErrorBoundary>
      <Box flexDirection="column">
        <MessageFeed
          messages={state.messages}
          toolCalls={state.toolCalls}
          cwd={cwd}
          onApprove={onApprove}
          onReject={onReject}
          staticHeader={logo}
          clearNum={state.clearNum}
        />

        {state.error && (
          <Box marginTop={1}>
            <ErrorView message={state.error} />
          </Box>
        )}

        {/* Todo widget - fixed above status bar */}
        {!state.isLLMGenerating && <TodoWidget todos={state.todos} />}

        {shouldShowStatus && (
          <Box marginTop={1}>
            <Text color={getCurrentTheme().brand}>
              {dots[dotIndex]} {statusLabel}
            </Text>
          </Box>
        )}

        {/* Interactive mode UI */}
        {isInInteractiveMode && renderInteractiveMode()}

        {/* Pending question from AskUserQuestion tool */}
        {state.pendingQuestion && !isInInteractiveMode && (
          <Box marginTop={1}>
            <QuestionView
              questionEvent={state.pendingQuestion}
              onAnswer={onQuestionAnswer}
              onCancel={onQuestionCancel}
            />
          </Box>
        )}

        {/* Normal prompt input - hidden during interactive mode, permission, or question */}
        {!hasPermissionRequest && !isInInteractiveMode && !state.pendingQuestion && (
          <Box marginTop={1} flexDirection="column">
            <PromptInput
              onSubmit={onSubmit}
              onExit={onExit}
              cwd={cwd}
              onCycleApprovalMode={onCycleApprovalMode}
              isAgentExecuting={isAgentExecuting}
              state={state}
              actions={actions}
              onExecuteCommand={onExecuteCommand}
              modelName={modelDisplayName}
            />
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
}
