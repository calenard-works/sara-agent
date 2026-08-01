/**
 * FileSelector component - Autocomplete dropdown for @mention file/directory selection
 *
 * This component displays a list of file and directory suggestions and handles
 * keyboard navigation (up/down arrows to move with viewport scrolling, enter to
 * select, escape to close). Folder navigation (←/→) is handled by PromptInput.
 *
 * Features:
 * - Folders (with trailing "/") highlighted in the brand color, files dimmed
 * - Viewport scrolling keeps the selected entry visible when the list overflows
 * - Navigation help line at the bottom
 */

import { Box, Text } from "ink";

import { FileEntry } from "../../mentions/types";
import { getCurrentTheme } from "../theme";

export interface FileSelectorProps {
  /**
   * Array of fuzzy-matched file suggestions
   */
  suggestions: FileEntry[];

  /**
   * Currently selected index (for keyboard navigation)
   */
  selectedIndex: number;

  /**
   * Maximum number of items to display
   * @default 10
   */
  maxDisplay?: number;
}

/**
 * FileSelector component
 *
 * @example
 * ```tsx
 * <FileSelector
 *   suggestions={completionResults}
 *   selectedIndex={0}
 * />
 * ```
 */
export function FileSelector({
  suggestions,
  selectedIndex,
  maxDisplay = 10,
}: FileSelectorProps) {
  const total = suggestions.length;

  if (total === 0) {
    return null;
  }

  const theme = getCurrentTheme();

  // Viewport scrolling: keep the selected entry visible while the list overflows
  const maxOffset = Math.max(0, total - maxDisplay);
  const scrollOffset = Math.min(
    Math.max(0, selectedIndex - maxDisplay + 1),
    maxOffset,
  );
  const displayItems = suggestions.slice(scrollOffset, scrollOffset + maxDisplay);
  const isScrolled = scrollOffset > 0 || scrollOffset + maxDisplay < total;

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* File list */}
      {displayItems.map((entry, viewIndex) => {
        const isSelected = scrollOffset + viewIndex === selectedIndex;
        const { path, type } = entry;

        // Folders (trailing "/") get the brand color, files stay dimmed
        const color = isSelected
          ? theme.accent
          : type === "directory"
            ? theme.primary
            : theme.secondary;

        return (
          <Box key={path}>
            <Text color={color} bold={isSelected}>
              {isSelected ? "› " : "  "}
              {path}
            </Text>
          </Box>
        );
      })}

      {/* Scroll indicator when the list overflows */}
      {isScrolled && (
        <Box marginTop={1}>
          <Text color={theme.textMuted}>
            {scrollOffset > 0 ? "↑ " : ""}
            {scrollOffset + maxDisplay < total ? `↓ ${total} total` : ""}
          </Text>
        </Box>
      )}

      {/* Navigation help */}
      <Box marginTop={1}>
        <Text color={theme.textMuted}>
          ↑/↓ select · ←/→ folder · ↵ accept · esc close
        </Text>
      </Box>
    </Box>
  );
}
