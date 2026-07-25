import { useEffect, useMemo, useState, useCallback } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Box, Text } from "ink";

import type { PermissionOption } from "../../permissions/types";
import type { AppState, AppActions } from "../hooks/useAppState";
import { Logo } from "./Logo";
import { ConfigManager } from "../../config";
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
  const [loadingIconIndex, setLoadingIconIndex] = useState(0);
  const loadingIcons = useMemo(() => ["◐", "◓", "◑", "◒"], []);

  useEffect(() => {
    if (!state.isLLMGenerating) return;
    const interval = setInterval(() => {
      setLoadingIconIndex((prev) => (prev + 1) % loadingIcons.length);
    }, 250);
    return () => clearInterval(interval);
  }, [state.isLLMGenerating, loadingIcons.length]);

  const hasPermissionRequest = state.toolCalls.some(
    (c) => c.status === "permission_required",
  );

  const isInInteractiveMode = state.interactiveMode !== null;

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

        {!hasPermissionRequest && state.isLLMGenerating && (
          <Box marginTop={1}>
            <Text color={getCurrentTheme().brand}>
              {loadingIcons[loadingIconIndex]} (Working... esc to cancel)
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
