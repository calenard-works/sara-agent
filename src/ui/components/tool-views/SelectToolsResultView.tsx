import { Box, Text } from "ink";

import { getCurrentTheme } from "../../theme";

export interface SelectToolsResultViewProps {
  result: {
    message: string;
    loaded: string[];
    alreadyAvailable: string[];
    unknown: string[];
  };
}

/**
 * select_tools result view
 *
 * Renders which tools were loaded, already available, or unknown instead of
 * the raw JSON wrapper.
 */
export function SelectToolsResultView({ result }: SelectToolsResultViewProps) {
  const theme = getCurrentTheme();

  return (
    <Box flexDirection="column">
      {result.message && <Text>{result.message}</Text>}
      {result.loaded.length > 0 && (
        <Text color={theme.success}>
          Loaded: {result.loaded.join(", ")}
        </Text>
      )}
      {result.alreadyAvailable.length > 0 && (
        <Text color={theme.textDim}>
          Already available: {result.alreadyAvailable.join(", ")}
        </Text>
      )}
      {result.unknown.length > 0 && (
        <Text color={theme.error}>
          Unknown tools: {result.unknown.join(", ")}
        </Text>
      )}
    </Box>
  );
}

export default SelectToolsResultView;
