import { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";

import { getCurrentTheme } from "../theme";

const MAX_VISIBLE = 6;

interface Provider {
  id: string;
  name: string;
  baseURL?: string;
  configured?: boolean;
}

interface ProviderSelectorProps {
  title: string;
  providers: Provider[];
  onSelect: (provider: Provider) => void;
  onCancel: () => void;
}

export function ProviderSelector({
  title,
  providers,
  onSelect,
  onCancel,
}: ProviderSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const [cursorPos, setCursorPos] = useState(0);

  const filtered = useMemo(() => {
    if (!filter) return providers;
    const q = filter.toLowerCase();
    return providers.filter(
      (p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  }, [providers, filter]);

  // Clamp selected index
  const clampedIndex = Math.min(
    selectedIndex,
    Math.max(0, filtered.length - 1),
  );

  // Calculate visible window
  const startIndex = Math.max(0, clampedIndex - Math.floor(MAX_VISIBLE / 2));
  const endIndex = Math.min(filtered.length, startIndex + MAX_VISIBLE);
  const visibleItems = filtered.slice(startIndex, endIndex);

  useInput((input, key) => {
    // If there's a filter, handle filter input
    if (filter.length > 0 || input.length > 0) {
      if (key.escape && filter.length > 0) {
        setFilter("");
        setCursorPos(0);
        setSelectedIndex(0);
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          const newFilter =
            filter.slice(0, cursorPos - 1) + filter.slice(cursorPos);
          setFilter(newFilter);
          setCursorPos(cursorPos - 1);
          setSelectedIndex(0);
        }
        return;
      }

      if (key.leftArrow) {
        setCursorPos(Math.max(0, cursorPos - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPos(Math.min(filter.length, cursorPos + 1));
        return;
      }
    }

    // Arrow navigation
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      return;
    }

    // Enter to select
    if (key.return) {
      if (filtered.length > 0 && clampedIndex >= 0) {
        onSelect(filtered[clampedIndex]);
      }
      return;
    }

    // Escape to cancel or clear filter
    if (key.escape) {
      onCancel();
      return;
    }

    // Regular character input for filter
    if (input && !key.ctrl && !key.meta) {
      const newFilter =
        filter.slice(0, cursorPos) + input + filter.slice(cursorPos);
      setFilter(newFilter);
      setCursorPos(cursorPos + input.length);
      setSelectedIndex(0);
    }
  });

  const theme = getCurrentTheme();

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Header border */}
      <Box>
        <Text color={theme.primary}>
          {"─".repeat(Math.max(20, process.stdout.columns - 4))}
        </Text>
      </Box>

      {/* Title */}
      <Box>
        <Text bold color={theme.primary}>
          {" " + title}
        </Text>
      </Box>

      {/* Hint */}
      <Box>
        <Text color={theme.textDim}>
          {" ↑↓ navigate · Enter select · Esc cancel"}
        </Text>
      </Box>

      <Box marginTop={1} />

      {/* Visible items */}
      <Box flexDirection="column">
        {startIndex > 0 && (
          <Text color={theme.textMuted}>
            ↑ {startIndex} more above
          </Text>
        )}
        {visibleItems.map((provider, vi) => {
          const realIndex = startIndex + vi;
          const isSelected = realIndex === clampedIndex;
          const pointer = isSelected ? "→ " : "  ";
          const pointerColor = isSelected ? theme.primary : theme.textDim;
          const labelColor = isSelected ? theme.primary : theme.text;
          const labelStyle = isSelected ? "bold" : undefined;

          return (
            <Box key={provider.id} flexDirection="column">
              <Text color={pointerColor}>
                {pointer}
                <Text bold={labelStyle} color={labelColor}>
                  {provider.name}
                  {provider.configured ? (
                    <Text color={theme.success}> ✓</Text>
                  ) : null}
                </Text>
              </Text>
              {provider.baseURL && (
                <Text color={theme.textMuted} dimColor>
                  {"      " + provider.baseURL}
                </Text>
              )}
            </Box>
          );
        })}
        {endIndex < filtered.length && (
          <Text color={theme.textMuted}>
            ↓ {filtered.length - endIndex} more below
          </Text>
        )}
        {filtered.length === 0 && (
          <Text color={theme.textMuted}>
            No matches
          </Text>
        )}
      </Box>

      <Box marginTop={1} />

      {/* Footer border */}
      <Box>
        <Text color={theme.primary}>
          {"─".repeat(Math.max(20, process.stdout.columns - 4))}
        </Text>
      </Box>
    </Box>
  );
}
