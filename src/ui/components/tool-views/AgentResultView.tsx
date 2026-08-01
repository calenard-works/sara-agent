import { Box, Text } from "ink";

import { getCurrentTheme } from "../../theme";

interface SwarmResult {
  agentId: string;
  item?: string;
  outcome: "completed" | "failed" | "aborted" | string;
  summary?: string;
}

export interface AgentResultViewProps {
  result: Record<string, unknown>;
}

function outcomeColor(outcome: string): string | undefined {
  const theme = getCurrentTheme();
  if (outcome === "completed") return theme.success;
  if (outcome === "failed") return theme.error;
  if (outcome === "aborted") return theme.warning;
  return theme.textDim;
}

function outcomeIcon(outcome: string): string {
  if (outcome === "completed") return "✓";
  if (outcome === "failed") return "✗";
  if (outcome === "aborted") return "⚠";
  return "•";
}

function truncate(text: string, maxLines: number): { text: string; truncated: boolean } {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return { text, truncated: false };
  return { text: lines.slice(0, maxLines).join("\n"), truncated: true };
}

/**
 * Extract the real summary text from Agent's summary string, which prefixes
 * metadata lines (agent_id, status, ...) followed by a blank line.
 */
function extractSummary(summary: string): string {
  const lines = summary.split("\n");
  const blankIdx = lines.indexOf("");
  if (blankIdx === -1) return summary.trim();
  const rest = lines.slice(blankIdx + 1).join("\n").trim();
  return rest || summary.trim();
}

/**
 * Subagent tools result view
 *
 * Renders Agent / AgentSwarm results as readable status lines instead of
 * raw JSON.
 */
export function AgentResultView({ result }: AgentResultViewProps) {
  const theme = getCurrentTheme();

  // AgentSwarm: { summary, results: [...] }
  if (Array.isArray(result.results)) {
    const results = result.results as SwarmResult[];
    const counts =
      typeof result.summary === "string" ? result.summary : "";

    return (
      <Box flexDirection="column">
        {counts && <Text color={theme.textDim}>{counts}</Text>}
        {results.map((res, idx) => (
          <Box key={idx} flexDirection="column">
            <Box flexDirection="row" alignItems="center">
              <Text color={outcomeColor(res.outcome)}>{outcomeIcon(res.outcome)} </Text>
              {res.item ? (
                <Text bold>{res.item}</Text>
              ) : (
                <Text color={theme.textMuted}>{res.agentId}</Text>
              )}
              <Text color={theme.textMuted}>
                {" "}
                {res.item ? res.agentId : res.outcome}
              </Text>
            </Box>
            {res.summary && (
              <Box marginLeft={2} flexDirection="column">
                {(() => {
                  const { text, truncated } = truncate(res.summary!, 5);
                  return (
                    <>
                      {text.split("\n").map((line, lineIdx) => (
                        <Text key={lineIdx} color={theme.textDim}>
                          {line}
                        </Text>
                      ))}
                      {truncated && (
                        <Text color={theme.textMuted}>… summary truncated</Text>
                      )}
                    </>
                  );
                })()}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  }

  // Agent: { agentId, actualSubagentType, status, summary?, taskId? }
  const agentId = typeof result.agentId === "string" ? result.agentId : "";
  const agentType =
    typeof result.actualSubagentType === "string"
      ? result.actualSubagentType
      : undefined;
  const status = typeof result.status === "string" ? result.status : "";
  const taskId = typeof result.taskId === "string" ? result.taskId : undefined;
  const summary = typeof result.summary === "string" ? result.summary : undefined;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" alignItems="center">
        <Text color={outcomeColor(status)}>{outcomeIcon(status)} </Text>
        <Text bold>{agentId}</Text>
        {agentType && <Text color={theme.textMuted}> ({agentType})</Text>}
        {taskId && <Text color={theme.textMuted}> task: {taskId}</Text>}
      </Box>
      {summary && (
        <Box marginLeft={2} flexDirection="column">
          {(() => {
            const { text, truncated } = truncate(extractSummary(summary), 15);
            return (
              <>
                {text.split("\n").map((line, lineIdx) => (
                  <Text key={lineIdx} color={theme.textDim}>
                    {line}
                  </Text>
                ))}
                {truncated && (
                  <Text color={theme.textMuted}>… summary truncated</Text>
                )}
              </>
            );
          })()}
        </Box>
      )}
    </Box>
  );
}

export default AgentResultView;
