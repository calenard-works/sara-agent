import { Box, Text } from "ink";

import { getCurrentTheme } from "../../theme";

export interface WriteResultViewProps {
  result: {
    path: string;
    bytesWritten: number;
    mode: "overwrite" | "append";
  };
}

export function WriteResultView({ result }: WriteResultViewProps) {
  const { path, bytesWritten, mode } = result;

  const modeText = mode === "append" ? "Appended" : "Wrote";
  const sizeText =
    bytesWritten < 1024
      ? `${bytesWritten} B`
      : bytesWritten < 1024 * 1024
        ? `${(bytesWritten / 1024).toFixed(1)} KB`
        : `${(bytesWritten / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <Box flexDirection="column">
      <Text>
        <Text bold color={getCurrentTheme().success}>
          {modeText}
        </Text>
        {" "}
        <Text bold>{path}</Text>
        {" — "}
        <Text dimColor>{sizeText}</Text>
      </Text>
    </Box>
  );
}

export default WriteResultView;
