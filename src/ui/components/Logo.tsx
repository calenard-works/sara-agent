import { Box, Text } from "ink";

import { getCurrentTheme } from "../theme";
import { VERSION } from "../../version";

export function Logo() {
  return (
    <Box flexDirection="column">
      <Text color={getCurrentTheme().brand} bold>
        Sara v{VERSION}
      </Text>
    </Box>
  );
}
