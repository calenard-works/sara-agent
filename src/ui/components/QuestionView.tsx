import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";

import type { NewQuestionEvent } from "../../permissions/questionRequest";
import { getCurrentTheme } from "../theme";

export interface QuestionViewProps {
  questionEvent: NewQuestionEvent;
  onAnswer: (id: string, answers: Record<string, string>) => void;
  onCancel: (id: string) => void;
}

/**
 * QuestionView renders a structured question with options for the user.
 *
 * Behaviour:
 * - Navigate options with Up/Down arrow keys
 * - Single-select: Enter confirms the selection
 * - Multi-select: Space toggles, Enter confirms all toggled selections
 * - Escape cancels / dismisses the question
 */
export function QuestionView({
  questionEvent,
  onAnswer,
  onCancel,
}: QuestionViewProps) {
  const { id, questions, background } = questionEvent;

  // Track the selected option index per question
  // For single-question mode (common case), this is a flat index
  const totalOptions = questions.reduce(
    (sum, q) => sum + q.options.length,
    0,
  );

  // Flat navigation: we map a flat index to (questionIdx, optionIdx)
  const flatOptionIndex = (flatIdx: number) => {
    let remaining = flatIdx;
    for (let qi = 0; qi < questions.length; qi++) {
      const opts = questions[qi].options;
      if (remaining < opts.length) return { questionIdx: qi, optionIdx: remaining };
      remaining -= opts.length;
    }
    return { questionIdx: 0, optionIdx: 0 };
  };

  const indexOf = (qi: number, oi: number) => {
    let base = 0;
    for (let i = 0; i < qi; i++) base += questions[i].options.length;
    return base + oi;
  };

  const [selectedFlat, setSelectedFlat] = useState(0);

  // For multi-select, track toggled options per question
  const [toggled, setToggled] = useState<Record<string, Set<number>>>(() => {
    const map: Record<string, Set<number>> = {};
    for (const q of questions) {
      if (q.multi_select) {
        map[q.question] = new Set<number>();
      }
    }
    return map;
  });

  const theme = getCurrentTheme();

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedFlat((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
    } else if (key.downArrow) {
      setSelectedFlat((prev) => (prev < totalOptions - 1 ? prev + 1 : 0));
    } else if (key.escape) {
      onCancel(id);
    } else if (key.return) {
      // Build answers
      const answers: Record<string, string> = {};

      if (questions.length === 1 && !questions[0].multi_select) {
        // Simple case: one question, single select
        const { questionIdx, optionIdx } = flatOptionIndex(selectedFlat);
        answers[questions[questionIdx].question] =
          questions[questionIdx].options[optionIdx].label;
      } else {
        // Multi-question or multi-select
        for (const q of questions) {
          if (q.multi_select) {
            const toggledSet = toggled[q.question];
            if (toggledSet && toggledSet.size > 0) {
              answers[q.question] = Array.from(toggledSet)
                .map((oi) => q.options[oi].label)
                .join(", ");
            } else {
              // Default to first option
              answers[q.question] = q.options[0].label;
            }
          } else {
            // For each non-multi-select question, pick the option at its current flat index range
            const { questionIdx, optionIdx } = flatOptionIndex(selectedFlat);
            if (!answers[questions[questionIdx].question]) {
              answers[questions[questionIdx].question] =
                questions[questionIdx].options[optionIdx].label;
            }
          }
        }
      }

      onAnswer(id, answers);
    } else if (input === " ") {
      // Space toggles multi-select options
      const { questionIdx, optionIdx } = flatOptionIndex(selectedFlat);
      const q = questions[questionIdx];
      if (q.multi_select) {
        setToggled((prev) => {
          const set = new Set(prev[q.question] || []);
          if (set.has(optionIdx)) {
            set.delete(optionIdx);
          } else {
            set.add(optionIdx);
          }
          return { ...prev, [q.question]: set };
        });
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accent}
      paddingX={1}
    >
      {questions.length > 1 && (
        <Text dimColor>
          {questions.length} question{questions.length > 1 ? "s" : ""}
          {background ? " (background)" : ""}
        </Text>
      )}

      {questions.map((q, qi) => (
        <Box key={qi} flexDirection="column" marginTop={qi > 0 ? 1 : 0}>
          {q.header && (
            <Text bold color={theme.accent}>
              {q.header}
            </Text>
          )}
          <Text bold>{q.question}</Text>
          {q.multi_select && (
            <Text dimColor>
              (multi-select: space to toggle, enter to confirm)
            </Text>
          )}

          {q.options.map((opt, oi) => {
            const flatIdx = indexOf(qi, oi);
            const isSelected = flatIdx === selectedFlat;
            const isToggled = q.multi_select && (toggled[q.question]?.has(oi) ?? false);

            let optionColor: string | undefined;
            let prefix: string;

            if (q.multi_select) {
              prefix = isToggled ? "[✓] " : "[ ] ";
              optionColor = isToggled ? theme.success : undefined;
            } else {
              prefix = "";
            }

            return (
              <Box key={oi} flexDirection="column" marginLeft={2}>
                <Box flexDirection="row">
                  <Text
                    color={isSelected ? theme.accent : undefined}
                    bold={isSelected}
                  >
                    {isSelected ? "> " : "  "}
                    {prefix}
                    {opt.label}
                  </Text>
                </Box>
                {opt.description && (
                  <Box marginLeft={isSelected ? 4 : 2}>
                    <Text dimColor>{opt.description}</Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

export default QuestionView;
