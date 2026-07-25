import { Box, Text } from "ink";

import { getCurrentTheme } from "../theme";
import { VERSION } from "../../version";

export function Logo() {
  return (
    <Box justifyContent="center" width="100%">
      <Text color={getCurrentTheme().brand} bold>
        Sara v{VERSION}
      </Text>
    </Box>
  );
}
