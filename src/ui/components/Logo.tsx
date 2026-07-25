import { Box, Text } from "ink";

import { getCurrentTheme } from "../theme";

export function Logo() {
  return (
    <Box flexDirection="column">
      <Text color={getCurrentTheme().brand} bold>
        sara v0.0.1 alpha
      </Text>
    </Box>
  );
}
