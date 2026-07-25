import { Box, Text } from "ink";

import type { TodoItem } from "../../tools/types";
import { getCurrentTheme } from "../theme";

export interface TodoWidgetProps {
  todos: TodoItem[];
}

function getStatusIcon(status: TodoItem["status"]): string {
  switch (status) {
    case "completed":
      return "✓";
    case "in_progress":
      return "▶";
    case "pending":
      return "○";
    case "cancelled":
      return "✗";
    default:
      return "?";
  }
}

function getStatusColor(status: TodoItem["status"]): string {
  switch (status) {
    case "completed":
      return getCurrentTheme().success;
    case "in_progress":
      return getCurrentTheme().warning;
    case "pending":
      return getCurrentTheme().secondary;
    case "cancelled":
      return getCurrentTheme().error;
  }
}

export function TodoWidget({ todos }: TodoWidgetProps) {
  if (todos.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      marginTop={1}
      borderStyle="single"
      borderColor={getCurrentTheme().secondary}
      paddingX={1}
    >
      <Text bold color={getCurrentTheme().accent}>
        Todo
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {todos.map((t) => {
          const icon = getStatusIcon(t.status);
          const color = getStatusColor(t.status);
          const isStrikethrough =
            t.status === "completed" || t.status === "cancelled";

          return (
            <Box key={t.id}>
              <Text color={color} bold>
                {icon}
              </Text>
              <Text> </Text>
              <Text color={color} strikethrough={isStrikethrough}>
                {t.content}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
