import { Box, Text } from "ink";

import { getCurrentTheme } from "../../theme";

interface GoalData {
  goalId?: string;
  objective?: string;
  completionCriterion?: string;
  status?: string;
  turnsUsed?: number;
  tokensUsed?: number;
}

export interface GoalResultViewProps {
  result:
    | { goal: GoalData | null }
    | { message: string; budget?: string; status?: string }
    | Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string | undefined> = {
  active: undefined,
  complete: undefined,
  blocked: undefined,
  paused: undefined,
};

function statusColor(status: string | undefined): string | undefined {
  const theme = getCurrentTheme();
  if (status === "complete") return theme.success;
  if (status === "blocked") return theme.error;
  if (status === "paused") return theme.warning;
  return STATUS_COLORS[status ?? ""];
}

function statusLabel(status: string | undefined): string {
  if (!status) return "unknown";
  const map: Record<string, string> = {
    active: "active",
    complete: "completed",
    blocked: "blocked",
    paused: "paused",
  };
  return map[status] ?? status;
}

/**
 * Goal tools result view
 *
 * Renders CreateGoal / GetGoal / UpdateGoal / SetGoalBudget results as a
 * readable summary instead of raw JSON.
 */
export function GoalResultView({ result }: GoalResultViewProps) {
  const theme = getCurrentTheme();
  const r = result as Record<string, unknown>;

  // GetGoal with no goal set
  if (r.goal === null) {
    return <Text color={theme.textDim}>No active goal.</Text>;
  }

  // CreateGoal / GetGoal with a goal object
  if (r.goal && typeof r.goal === "object") {
    const goal = r.goal as GoalData;
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" alignItems="center">
          <Text bold color={statusColor(goal.status)}>
            ● {statusLabel(goal.status)}
          </Text>
          {goal.goalId && (
            <Text color={theme.textMuted}> {goal.goalId}</Text>
          )}
        </Box>
        {goal.objective && (
          <Text>
            <Text bold>Objective: </Text>
            <Text>{goal.objective}</Text>
          </Text>
        )}
        {goal.completionCriterion && (
          <Text color={theme.textDim}>
            Completion: {goal.completionCriterion}
          </Text>
        )}
        {(goal.turnsUsed !== undefined || goal.tokensUsed !== undefined) && (
          <Text color={theme.textDim}>
            Progress: {goal.turnsUsed ?? 0} turns · {goal.tokensUsed ?? 0} tokens
          </Text>
        )}
      </Box>
    );
  }

  // UpdateGoal / SetGoalBudget with a plain message
  if (typeof r.message === "string") {
    return (
      <Box flexDirection="column">
        {typeof r.status === "string" && (
          <Text bold color={statusColor(r.status)}>
            ● {statusLabel(r.status)}
          </Text>
        )}
        <Text>{r.message}</Text>
        {typeof r.budget === "string" && (
          <Text color={theme.textDim}>Budget: {r.budget}</Text>
        )}
      </Box>
    );
  }

  return null;
}

export default GoalResultView;
