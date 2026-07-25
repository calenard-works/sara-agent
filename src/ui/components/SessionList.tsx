import { useState, useMemo, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import chalk from "chalk";

import { getCurrentTheme } from "../theme";
import type { Session } from "../../sessions/types";
import {
  loadSession,
  deleteSession,
  updateSessionMeta,
} from "../../sessions/persistence";

interface SessionListProps {
  sessions: Session[];
  onSelect: (session: Session) => void;
  onCancel: () => void;
}

/**
 * Format relative time from a timestamp to a human-readable string.
 * Examples: "5min", "1h 16min", "2d 3h", "1w 2d"
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const elapsed = now - timestamp;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(elapsed / 3600000);
  const days = Math.floor(elapsed / 86400000);
  const weeks = Math.floor(elapsed / 604800000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h ${minutes % 60}min`;
  if (days < 7) return `${days}d ${hours % 24}h`;
  return `${weeks}w ${days % 7}d`;
}

/**
 * Generate a default title from the first user message.
 */
function getDefaultTitle(session: Session): string {
  const firstUserMsg = session.messages.find(
    (m) => m.kind === "api" && m.message.role === "user",
  );
  if (firstUserMsg && typeof firstUserMsg.message.content === "string") {
    const content = firstUserMsg.message.content;
    return content.length > 50 ? content.slice(0, 47) + "..." : content;
  }
  return "Untitled session";
}

export function SessionList({
  sessions,
  onSelect,
  onCancel,
}: SessionListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(
    null,
  );
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Refresh sessions list
  const refreshSessions = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  // Get current sessions (may need refresh)
  const currentSessions = useMemo(() => {
    // Trigger re-fetch on refresh
    void refreshCounter;
    return sessions;
  }, [sessions, refreshCounter]);

  // Clamp selected index
  const clampedIndex = Math.min(
    selectedIndex,
    Math.max(0, currentSessions.length - 1),
  );

  const handleSelect = useCallback(async () => {
    if (clampedIndex < 0 || clampedIndex >= currentSessions.length) return;
    const session = currentSessions[clampedIndex];
    const loaded = await loadSession(session.sessionId);
    if (loaded) {
      onSelect(loaded);
    }
  }, [clampedIndex, currentSessions, onSelect]);

  const handleRename = useCallback((index: number) => {
    setRenameIndex(index);
    setRenameValue("");
  }, []);

  const submitRename = useCallback(async () => {
    if (renameIndex === null) return;
    const session = currentSessions[renameIndex];
    if (!session) return;
    const newTitle = renameValue.trim() || undefined;
    await updateSessionMeta(session.sessionId, { title: newTitle });
    setRenameIndex(null);
    setRenameValue("");
    refreshSessions();
  }, [renameIndex, renameValue, currentSessions, refreshSessions]);

  const handleDelete = useCallback((index: number) => {
    if (deleteConfirmIndex === index) {
      // Confirm delete
      const session = currentSessions[index];
      if (session) {
        void deleteSession(session.sessionId);
        setDeleteConfirmIndex(null);
        refreshSessions();
        if (clampedIndex >= currentSessions.length - 1) {
          setSelectedIndex(Math.max(0, currentSessions.length - 2));
        }
      }
    } else {
      // First D press - show confirmation
      setDeleteConfirmIndex(index);
      // Auto-reset confirmation after 2 seconds
      setTimeout(() => setDeleteConfirmIndex(null), 2000);
    }
  }, [deleteConfirmIndex, currentSessions, clampedIndex, refreshSessions]);

  useInput((input, key) => {
    // If in rename mode, handle text input
    if (renameIndex !== null) {
      if (key.return) {
        void submitRename();
        return;
      }
      if (key.escape) {
        setRenameIndex(null);
        setRenameValue("");
        return;
      }
      if (key.backspace) {
        setRenameValue((v) => v.slice(0, -1));
        return;
      }
      // Regular text input
      if (input && !key.ctrl && !key.meta && !key.shift) {
        setRenameValue((v) => v + input);
        return;
      }
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) =>
        Math.max(0, prev - 1),
      );
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) =>
        Math.min(currentSessions.length - 1, prev + 1),
      );
      return;
    }

    if (key.return) {
      void handleSelect();
      return;
    }

    // R key for rename
    if (input === "r" || input === "R") {
      if (clampedIndex >= 0 && clampedIndex < currentSessions.length) {
        handleRename(clampedIndex);
      }
      return;
    }

    // D key for delete (double tap)
    if (input === "d" || input === "D") {
      if (clampedIndex >= 0 && clampedIndex < currentSessions.length) {
        handleDelete(clampedIndex);
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={getCurrentTheme().brand} bold>
        Sessions
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {currentSessions.length === 0 ? (
          <Text color={getCurrentTheme().secondary} dimColor>
            No saved sessions
          </Text>
        ) : (
          currentSessions.map((session, index) => {
            const isSelected = index === clampedIndex;
            const prefix = isSelected ? " → " : "   ";
            const color = isSelected ? getCurrentTheme().accent : undefined;
            const title = session.title || getDefaultTitle(session);
            const timeStr = formatRelativeTime(session.lastActivity ?? 0);
            const msgCount = session.messages.length;

            return (
              <Box key={session.sessionId} flexDirection="column">
                {renameIndex === index ? (
                  <Box flexDirection="row" alignItems="center">
                    <Text color={color}>{prefix}Rename: </Text>
                    <Text color={color}>
                      {chalk.inverse(renameValue || " ")}
                    </Text>
                  </Box>
                ) : (
                  <Box flexDirection="row" alignItems="center">
                    <Text color={color}>
                      {prefix}
                      {isSelected ? "● " : ""}
                      {title}
                    </Text>
                  </Box>
                )}
                <Box flexDirection="row" gap={2}>
                  <Text dimColor>
                    {timeStr} ● {msgCount} messages
                  </Text>
                  {deleteConfirmIndex === index && (
                    <Text color={getCurrentTheme().error}>
                      (press D again to confirm delete)
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ navigate  Enter switch  R rename  D delete (double tap)  Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
