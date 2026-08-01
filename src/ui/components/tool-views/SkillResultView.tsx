import { Box, Text } from "ink";

import { InkMarkdown } from "../../components/InkMarkdown";
import { getCurrentTheme } from "../../theme";

export interface SkillResultViewProps {
  result: { output: string } | Record<string, unknown>;
}

function truncate(text: string, maxLines: number): { text: string; truncated: boolean } {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return { text, truncated: false };
  return { text: lines.slice(0, maxLines).join("\n"), truncated: true };
}

/**
 * Skill tool result view
 *
 * Skill returns the loaded instructions as markdown text; render it inline
 * instead of showing the raw JSON wrapper.
 */
export function SkillResultView({ result }: SkillResultViewProps) {
  const theme = getCurrentTheme();
  const output =
    typeof (result as Record<string, unknown>).output === "string"
      ? ((result as Record<string, unknown>).output as string)
      : "";

  if (!output) {
    return null;
  }

  const { text, truncated } = truncate(output, 20);

  return (
    <Box flexDirection="column">
      <InkMarkdown>{text}</InkMarkdown>
      {truncated && (
        <Text color={theme.textMuted}>… skill instructions truncated</Text>
      )}
    </Box>
  );
}

export default SkillResultView;
