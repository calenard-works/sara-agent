import { Box, Text } from "ink";

import { getCurrentTheme } from "../../theme";

export interface ReadMediaFileResultViewProps {
  result: {
    path: string;
    size: number;
    mimeType: string;
    description: string;
    dimensions?: { width: number; height: number };
  };
}

export function ReadMediaFileResultView({ result }: ReadMediaFileResultViewProps) {
  const { path, mimeType, description, dimensions } = result;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={getCurrentTheme().primary}>
          {path}
        </Text>
      </Box>
      <Box flexDirection="column">
        <Text>
          <Text dimColor>Type: </Text>
          <Text>{mimeType}</Text>
        </Text>
        {dimensions && (
          <Text>
            <Text dimColor>Dimensions: </Text>
            <Text>
              {dimensions.width}×{dimensions.height}px
            </Text>
          </Text>
        )}
        <Text>
          <Text dimColor>Description: </Text>
          <Text>{description}</Text>
        </Text>
      </Box>
    </Box>
  );
}

export default ReadMediaFileResultView;
