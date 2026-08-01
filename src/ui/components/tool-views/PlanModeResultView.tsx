import { Box, Text } from "ink";

import { InkMarkdown } from "../../components/InkMarkdown";

export interface PlanModeResultViewProps {
  result: { message: string } | Record<string, unknown>;
}

/**
 * Plan mode tools result view
 *
 * EnterPlanMode / ExitPlanMode return a readable markdown message; render it
 * as markdown instead of showing the raw JSON wrapper.
 */
export function PlanModeResultView({ result }: PlanModeResultViewProps) {
  const message =
    typeof (result as Record<string, unknown>).message === "string"
      ? ((result as Record<string, unknown>).message as string)
      : "";

  if (!message) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <InkMarkdown>{message}</InkMarkdown>
    </Box>
  );
}

export default PlanModeResultView;
