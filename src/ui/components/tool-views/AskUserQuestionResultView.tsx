import { Box, Text } from "ink";

import { getCurrentTheme } from "../../theme";

export interface AskUserQuestionResultViewProps {
  result: {
    answers: Record<string, string>;
  };
}

/**
 * AskUserQuestion result view
 *
 * Renders the collected answers as plain Q:/A: pairs instead of raw JSON so
 * the user can read what was asked and answered at a glance.
 */
export function AskUserQuestionResultView({
  result,
}: AskUserQuestionResultViewProps) {
  const entries = Object.entries(result.answers);

  if (entries.length === 0) {
    return <Text dimColor>No answers collected</Text>;
  }

  return (
    <Box flexDirection="column">
      {entries.map(([question, answer], idx) => (
        <Box
          key={idx}
          flexDirection="column"
          marginBottom={idx < entries.length - 1 ? 1 : 0}
        >
          <Text>
            <Text bold color={getCurrentTheme().primary}>
              Q:{" "}
            </Text>
            <Text>{question}</Text>
          </Text>
          <Text>
            <Text bold color={getCurrentTheme().success}>
              A:{" "}
            </Text>
            <Text>{answer}</Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export default AskUserQuestionResultView;
