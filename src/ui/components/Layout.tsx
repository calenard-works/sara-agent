import { useEffect, useMemo, useState, useCallback } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Box, Text } from "ink";

import type { PermissionOption } from "../../permissions/types";
import type { AppState, AppActions } from "../hooks/useAppState";
import type { LLMMessage } from "../../sessions/types";
import { isTransientToolState } from "../../tools/runner.types";
import { Logo } from "./Logo";
import { ConfigManager } from "../../config";
import { VERSION } from "../../version";
import MessageFeed from "./MessageFeed";
import { PromptInput } from "./PromptInput";
import ErrorView from "./ErrorView";
import { CommandName } from "../commands";
import { getCurrentTheme } from "../theme";
import { ProviderSelector } from "./ProviderSelector";
import { KeyInput } from "./KeyInput";
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

  /** Extract the latest `# Heading` from the streaming LLM content */
  const thinkingHeading = useMemo(() => {
    if (!state.isLLMGenerating) return undefined;
    const msgs = state.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (
        m.kind === "api" &&
        m.status === "streaming" &&
        m.message.role === "assistant"
      ) {
        const content = m.message.content;
        if (typeof content !== "string") return undefined;
        const lines = content.split("\n");
        for (let j = lines.length - 1; j >= 0; j--) {
          const match = lines[j].match(/^#\s+(.+)/);
          if (match) return match[1].trim();
        }
        return undefined;
      }
    }
    return undefined;
  }, [state.isLLMGenerating, state.messages]);

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
      if (thinkingHeading) return thinkingHeading;
      return "Thinking...";
    }

    return undefined;
  }, [state.isLLMGenerating, state.toolCalls, thinkingHeading]);

  const shouldShowStatus =
    !hasPermissionRequest && (state.isLLMGenerating || statusLabel !== undefined);

  // Update notification state
  const [updateAvailable, setUpdateAvailable] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://registry.npmjs.org/sara-agent/latest", {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { version?: string }) => {
        if (data.version && data.version !== VERSION) {
          setUpdateAvailable(data.version);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const logo = useMemo(() => {
    let modelName = "unknown";
    try {
      modelName = ConfigManager.load().llm.model;
    } catch {}
    return (
      <Box flexDirection="column">
        <Logo />
        <Box flexDirection="row" gap={1} marginTop={1}>
          <Text color={getCurrentTheme().secondary}>Dir:</Text>
          <Text>{cwd}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={getCurrentTheme().secondary}>Model:</Text>
          <Text>{modelName}</Text>
        </Box>
      </Box>
    );
  }, [cwd]);

  // Interactive mode handlers
  const handleLoginProviderSelect = useCallback(
    async (provider: { id: string; name: string }) => {
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
      case "login-provider":
        return (
          <ProviderSelector
            title="Select provider to login:"
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
    }
  };

  return (
    <ErrorBoundary>
      <Box flexDirection="column">
        {updateAvailable && (
          <Box
            flexDirection="column"
            borderStyle="round"
            borderColor={getCurrentTheme().warning}
            paddingX={2}
            paddingY={1}
            marginBottom={1}
          >
            <Box flexDirection="row" justifyContent="center">
              <Text bold color={getCurrentTheme().warning}>
                Update Available! Sara v{updateAvailable}
              </Text>
            </Box>
            <Box flexDirection="row" justifyContent="center" marginTop={1}>
              <Text dimColor>
                Press Ctrl+C twice and run sara update or run /update command
                below.
              </Text>
            </Box>
          </Box>
        )}

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

        {shouldShowStatus && (
          <Box marginTop={1}>
            <Text color={getCurrentTheme().brand}>
              {dots[dotIndex]} {statusLabel}
            </Text>
          </Box>
        )}

        {/* Interactive mode UI */}
        {isInInteractiveMode && renderInteractiveMode()}

        {/* Normal prompt input - hidden during interactive mode */}
        {!hasPermissionRequest && !isInInteractiveMode && (
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
            />
          </Box>
        )}
      </Box>
    </ErrorBoundary>
  );
}
