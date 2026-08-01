import { Box, Text } from "ink";

import { getCurrentTheme } from "../../theme";

interface TaskInfo {
  taskId: string;
  description?: string;
  status: string;
  command?: string;
  agentId?: string;
  startedAt?: number;
  endedAt?: number | null;
}

export interface TaskResultViewProps {
  result: Record<string, unknown>;
}

function statusColor(status: string): string | undefined {
  const theme = getCurrentTheme();
  if (status === "running") return theme.warning;
  if (status === "completed") return theme.success;
  if (status === "failed") return theme.error;
  if (status === "stopped" || status === "lost") return theme.textDim;
  return undefined;
}

function statusIcon(status: string): string {
  if (status === "running") return "●";
  if (status === "completed") return "✓";
  if (status === "failed") return "✗";
  return "•";
}

/**
 * Format relative time from a timestamp to a human-readable string.
 * Examples: "5min", "1h 16min", "2d 3h", "1w 2d"
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const elapsed = now - timestamp;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(elapsed / 3600000);
  const days = Math.floor(elapsed / 86400000);
  const weeks = Math.floor(elapsed / 604800000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h ${minutes % 60}min`;
  if (days < 7) return `${days}d ${hours % 24}h`;
  return `${weeks}w ${days % 7}d`;
}

function truncate(text: string, maxLines: number): { text: string; truncated: boolean } {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return { text, truncated: false };
  return { text: lines.slice(0, maxLines).join("\n"), truncated: true };
}

/**
 * Background task tools result view
 *
 * Renders TaskList / TaskOutput / TaskStop results as readable status lines
 * instead of raw JSON.
 */
export function TaskResultView({ result }: TaskResultViewProps) {
  const theme = getCurrentTheme();

  // TaskList: { activeCount, tasks: [...] }
  if (Array.isArray(result.tasks)) {
    const tasks = result.tasks as TaskInfo[];
    const activeCount = typeof result.activeCount === "number" ? result.activeCount : 0;

    if (tasks.length === 0) {
      return <Text color={theme.textDim}>No background tasks.</Text>;
    }

    return (
      <Box flexDirection="column">
        <Text color={theme.textDim}>
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
          {activeCount > 0 ? ` · ${activeCount} active` : ""}
        </Text>
        {tasks.map((task) => (
          <Box key={task.taskId} flexDirection="column">
            <Box flexDirection="row" alignItems="center">
              <Text color={statusColor(task.status)}>{statusIcon(task.status)} </Text>
              <Text bold>{task.description || task.taskId}</Text>
              <Text color={theme.textMuted}> {task.taskId}</Text>
              {typeof task.startedAt === "number" && (
                <Text color={theme.textMuted}>
                  {" "}
                  {task.status === "running"
                    ? `started ${formatRelativeTime(task.startedAt)}`
                    : task.endedAt
                      ? `ended ${formatRelativeTime(task.endedAt)}`
                      : `started ${formatRelativeTime(task.startedAt)}`}
                </Text>
              )}
            </Box>
            {task.command && (
              <Box marginLeft={2}>
                <Text color={theme.textDim}>$ {task.command}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  }

  // TaskStop: { taskId, status, reason }
  if (typeof result.reason === "string") {
    const status = String(result.status ?? "stopped");
    return (
      <Box flexDirection="row" alignItems="center">
        <Text color={statusColor(status)}>{statusIcon(status)} </Text>
        <Text bold color={statusColor(status)}>
          {String(result.taskId)}
        </Text>
        <Text color={theme.textDim}> stopped</Text>
        <Text color={theme.textMuted}> — {result.reason}</Text>
      </Box>
    );
  }

  // TaskOutput: { taskId, description, status, outputPreview, ... }
  const taskId = String(result.taskId ?? "");
  const status = String(result.status ?? "");
  const description = typeof result.description === "string" ? result.description : "";

  const outputPreview =
    typeof result.outputPreview === "string" ? result.outputPreview : undefined;
  const output = typeof result.output === "string" ? result.output : undefined;
  const displayOutput = outputPreview ?? output;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" alignItems="center">
        <Text color={statusColor(status)}>{statusIcon(status)} </Text>
        <Text bold>{description || taskId}</Text>
        <Text color={theme.textMuted}> {taskId}</Text>
        {typeof result.exitCode === "number" && (
          <Text color={theme.textDim}> exit {result.exitCode}</Text>
        )}
      </Box>
      {typeof result.stopReason === "string" && (
        <Text color={theme.textDim}>Reason: {result.stopReason}</Text>
      )}
      {typeof result.command === "string" && (
        <Text color={theme.textDim}>$ {result.command}</Text>
      )}
      {displayOutput && (
        <Box marginLeft={2} flexDirection="column">
          {(() => {
            const { text, truncated } = truncate(displayOutput, 15);
            return (
              <>
                {text.split("\n").map((line, idx) => (
                  <Text key={idx}>{line}</Text>
                ))}
                {truncated && (
                  <Text color={theme.textDim}>… output truncated</Text>
                )}
              </>
            );
          })()}
        </Box>
      )}
    </Box>
  );
}

export default TaskResultView;
