import { Box, Text } from "ink";

import { getCurrentTheme } from "../theme";
import { VERSION } from "../../version";
import { useTerminalWidth } from "../hooks/useTerminalWidth";

export function Logo() {
  const termWidth = useTerminalWidth();

  return (
    <Box flexDirection="column" alignItems="center" width="100%">
      <Text color={getCurrentTheme().brand} bold>
        {" ".repeat(Math.max(0, Math.floor((termWidth - 14) / 2)))}
        Sara v{VERSION}
      </Text>
    </Box>
  );
}
