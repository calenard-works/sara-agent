import { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import chalk from "chalk";

import { getCurrentTheme } from "../theme";

const MAX_VISIBLE = 6;

interface Provider {
  id: string;
  name: string;
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

  // Render filter input with cursor
  const renderFilter = () => {
    if (filter.length === 0 && cursorPos === 0) {
      return chalk.inverse(" ") + chalk.grey("type to filter...");
    }
    let result = "";
    for (let i = 0; i < filter.length; i++) {
      if (i === cursorPos) {
        result += chalk.inverse(filter[i]);
      } else {
        result += filter[i];
      }
    }
    if (cursorPos >= filter.length) {
      result += chalk.inverse(" ");
    }
    return result;
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={getCurrentTheme().brand} bold>
        {title}
      </Text>

      {/* Filter input */}
      <Box
        marginTop={1}
        borderStyle="round"
        borderColor={getCurrentTheme().secondary}
        paddingX={1}
      >
        <Text>{renderFilter()}</Text>
      </Box>

      {/* Visible items */}
      <Box flexDirection="column" marginTop={1}>
        {startIndex > 0 && (
          <Text color={getCurrentTheme().secondary} dimColor>
            ↑ {startIndex} more above
          </Text>
        )}
        {visibleItems.map((provider, vi) => {
          const realIndex = startIndex + vi;
          const isSelected = realIndex === clampedIndex;
          const prefix = isSelected ? " → " : "   ";
          const color = isSelected ? getCurrentTheme().accent : undefined;

          return (
            <Text key={provider.id} color={color}>
              {prefix}
              {provider.name}
              {isSelected ? "  ←" : ""}
            </Text>
          );
        })}
        {endIndex < filtered.length && (
          <Text color={getCurrentTheme().secondary} dimColor>
            ↓ {filtered.length - endIndex} more below
          </Text>
        )}
        {filtered.length === 0 && (
          <Text color={getCurrentTheme().secondary} dimColor>
            No matches
          </Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text color={getCurrentTheme().secondary} dimColor>
          ↑↓ navigate Enter select Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
