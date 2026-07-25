import { Box, Text } from "ink";
import { getCurrentTheme } from "../theme";
import { type CommandHandler } from "../commands";

export interface CommandPaletteProps {
  selectedIndex: number;
  commands: CommandHandler<any>[];
  scrollOffset?: number;
  visibleCount?: number;
}

export function CommandPalette({
  selectedIndex,
  commands,
  scrollOffset = 0,
  visibleCount = 8,
}: CommandPaletteProps) {
  const total = commands.length;
  const visible = commands.slice(scrollOffset, scrollOffset + visibleCount);
  const isScrolled = scrollOffset > 0 || scrollOffset + visibleCount < total;

  return (
    <Box
      flexDirection="column"
      borderColor={getCurrentTheme().secondary}
      paddingX={1}
    >
      <Box flexDirection="column">
        {visible.map((command, viewIndex) => {
          const realIndex = scrollOffset + viewIndex;
          const isSelected = realIndex === selectedIndex;
          const color = isSelected ? getCurrentTheme().accent : undefined;

          return (
            <Box key={command.name} flexDirection="row">
              <Box width={14} marginRight={2}>
                <Text color={color}>{command.name}</Text>
              </Box>
              <Box flexGrow={1}>
                <Text color={getCurrentTheme().secondary}>
                  {command.description}
                </Text>
              </Box>
            </Box>
          );
        })}

        {isScrolled && (
          <Box marginTop={1}>
            <Text dimColor>
              {scrollOffset > 0 ? "↑ " : ""}
              {scrollOffset + visibleCount < total
                ? `↓ ${total} commands total`
                : ""}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
