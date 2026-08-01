import { useState } from "react";
import { Box, Text, useInput } from "ink";

import type {
  NewQuestionEvent,
  Question,
} from "../../permissions/questionRequest";
import { getCurrentTheme } from "../theme";

export interface QuestionViewProps {
  questionEvent: NewQuestionEvent;
  onAnswer: (id: string, answers: Record<string, string>) => void;
  onCancel: (id: string) => void;
}

const NUMBER_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const MAX_BODY_LINES = 12;
const MAX_VISIBLE_OPTIONS = 6;
const DEFAULT_OTHER_LABEL = "Other";
const NOT_ANSWERED_LABEL = "Not answered";
const REVIEW_TITLE = "Review your answer before submit";
const SUBMIT_PROMPT = "Ready to submit your answers?";
const UNANSWERED_WARNING = "Some questions are still unanswered.";
const SUBMIT_ACTIONS = ["Submit", "Cancel"] as const;

interface DisplayOption {
  label: string;
  description?: string;
  kind: "preset" | "other";
}

interface ViewState {
  currentTab: number;
  submitActionIdx: number;
  editingOther: boolean;
  cursors: number[];
  singleSelections: (number | undefined)[];
  multiSelections: Set<number>[];
  otherDrafts: string[];
  committedOtherValues: (string | undefined)[];
  otherInputValue: string;
  reviewMessage?: string;
}

// ── Pure helpers ──────────────────────────────────────────────────────

function otherOptionIndex(q: Question): number {
  return q.options.length;
}

function isOtherOption(q: Question, optionIdx: number): boolean {
  return optionIdx === q.options.length;
}

function displayOptions(q: Question): DisplayOption[] {
  return [
    ...q.options.map((opt) => ({
      label: opt.label,
      description: opt.description,
      kind: "preset" as const,
    })),
    {
      label:
        q.other_label && q.other_label.length > 0 ? q.other_label : DEFAULT_OTHER_LABEL,
      description:
        q.other_description && q.other_description.length > 0
          ? q.other_description
          : undefined,
      kind: "other" as const,
    },
  ];
}

function computeAnswer(
  questions: Question[],
  state: ViewState,
  qIdx: number,
): string | undefined {
  const q = questions[qIdx];
  if (!q) return undefined;

  if (q.multi_select) {
    const labels: string[] = [];
    const set = state.multiSelections[qIdx] ?? new Set<number>();
    const otherIdx = otherOptionIndex(q);
    for (let i = 0; i < q.options.length; i++) {
      if (!set.has(i)) continue;
      const label = q.options[i]?.label;
      if (label !== undefined && label.length > 0) labels.push(label);
    }
    const otherText = state.committedOtherValues[qIdx];
    if (set.has(otherIdx) && otherText !== undefined && otherText.length > 0) {
      labels.push(otherText);
    }
    return labels.length > 0 ? labels.join(", ") : undefined;
  }

  const selection = state.singleSelections[qIdx];
  if (selection === undefined) return undefined;
  if (isOtherOption(q, selection)) {
    const otherText = state.committedOtherValues[qIdx];
    return otherText !== undefined && otherText.length > 0 ? otherText : undefined;
  }
  const label = q.options[selection]?.label;
  return label !== undefined && label.length > 0 ? label : undefined;
}

function isAnswered(questions: Question[], state: ViewState, qIdx: number): boolean {
  const answer = computeAnswer(questions, state, qIdx);
  return answer !== undefined && answer.length > 0;
}

function goToTab(state: ViewState, questions: Question[], target: number): ViewState {
  const total = questions.length + 1;
  const wrapped = ((target % total) + total) % total;
  if (wrapped === state.currentTab) return state;
  const submitTab = questions.length;
  return {
    ...state,
    currentTab: wrapped,
    editingOther: false,
    reviewMessage: undefined,
    submitActionIdx: wrapped === submitTab ? 0 : state.submitActionIdx,
  };
}

function moveCursor(
  state: ViewState,
  questions: Question[],
  delta: number,
): ViewState {
  const qIdx = state.currentTab;
  const total = displayOptions(questions[qIdx]).length;
  if (total <= 0) return state;
  const cursors = [...state.cursors];
  cursors[qIdx] = (state.cursors[qIdx] + delta + total) % total;
  return { ...state, cursors, reviewMessage: undefined };
}

function activateOption(
  state: ViewState,
  questions: Question[],
  qIdx: number,
  optionIdx: number,
): ViewState {
  const q = questions[qIdx];
  if (!q) return state;

  const cursors = [...state.cursors];
  cursors[qIdx] = optionIdx;
  let next: ViewState = {
    ...state,
    cursors,
    editingOther: false,
    reviewMessage: undefined,
  };

  if (isOtherOption(q, optionIdx)) {
    return {
      ...next,
      editingOther: true,
      otherInputValue: state.otherDrafts[qIdx] ?? state.committedOtherValues[qIdx] ?? "",
    };
  }

  if (q.multi_select) {
    const multiSelections = [...state.multiSelections];
    const set = new Set(state.multiSelections[qIdx] ?? []);
    if (set.has(optionIdx)) set.delete(optionIdx);
    else set.add(optionIdx);
    multiSelections[qIdx] = set;
    return { ...next, multiSelections };
  }

  const singleSelections = [...state.singleSelections];
  singleSelections[qIdx] = optionIdx;
  const committedOtherValues = [...state.committedOtherValues];
  committedOtherValues[qIdx] = undefined;
  next = { ...next, singleSelections, committedOtherValues };
  return advanceAfterSingleSelect(next, questions, qIdx);
}

function advanceAfterSingleSelect(
  state: ViewState,
  questions: Question[],
  fromIdx: number,
): ViewState {
  let next: number | null = null;
  for (let i = fromIdx + 1; i < questions.length; i++) {
    if (!isAnswered(questions, state, i)) {
      next = i;
      break;
    }
  }
  if (next === null) next = questions.length;
  return {
    ...state,
    currentTab: next,
    editingOther: false,
    reviewMessage: undefined,
    submitActionIdx: next === questions.length ? 0 : state.submitActionIdx,
  };
}

function syncOtherDraft(state: ViewState, questions: Question[]): ViewState {
  const qIdx = state.currentTab;
  const otherDrafts = [...state.otherDrafts];
  otherDrafts[qIdx] = state.otherInputValue;
  return { ...state, otherDrafts };
}

function editOtherText(
  state: ViewState,
  input: string,
  key: { backspace?: boolean },
): ViewState {
  const qIdx = state.currentTab;
  const value = key.backspace
    ? state.otherInputValue.slice(0, -1)
    : state.otherInputValue + input;
  const otherDrafts = [...state.otherDrafts];
  otherDrafts[qIdx] = value;
  return { ...state, otherInputValue: value, otherDrafts, reviewMessage: undefined };
}

function commitOther(state: ViewState, questions: Question[]): ViewState {
  const qIdx = state.currentTab;
  const value = state.otherInputValue.trim();
  if (value.length === 0) return state;
  const q = questions[qIdx];
  if (!q) return state;

  const otherDrafts = [...state.otherDrafts];
  const committedOtherValues = [...state.committedOtherValues];
  otherDrafts[qIdx] = value;
  committedOtherValues[qIdx] = value;

  let next: ViewState = {
    ...state,
    otherDrafts,
    committedOtherValues,
    editingOther: false,
    reviewMessage: undefined,
    otherInputValue: value,
  };

  if (q.multi_select) {
    const multiSelections = [...state.multiSelections];
    const set = new Set(state.multiSelections[qIdx] ?? []);
    set.add(otherOptionIndex(q));
    multiSelections[qIdx] = set;
    return { ...next, multiSelections };
  }

  const singleSelections = [...state.singleSelections];
  singleSelections[qIdx] = otherOptionIndex(q);
  next = { ...next, singleSelections };
  return advanceAfterSingleSelect(next, questions, qIdx);
}

function buildAnswers(
  questions: Question[],
  state: ViewState,
): Record<string, string> {
  const answers: Record<string, string> = {};
  questions.forEach((q, qi) => {
    const answer = computeAnswer(questions, state, qi);
    if (answer !== undefined && answer.length > 0) {
      answers[q.question] = answer;
    }
  });
  return answers;
}

// ── Component ─────────────────────────────────────────────────────────

/**
 * QuestionView renders a tabbed question dialog for the user.
 *
 * Behaviour (mirrors the Kimi Code question dialog):
 * - One tab per question plus a final Submit tab; switch with ←/→/Tab
 * - Navigate options with ↑/↓, choose with Enter or a number key
 * - Space toggles options in multi-select questions
 * - The last option is "Other": selecting it opens a text input; Enter saves
 * - Single-select questions auto-advance to the next unanswered question
 * - The Submit tab reviews all answers before confirmation
 * - Escape / Ctrl+C / Ctrl+D cancels the dialog
 */
export function QuestionView({
  questionEvent,
  onAnswer,
  onCancel,
}: QuestionViewProps) {
  const { id, questions } = questionEvent;
  const theme = getCurrentTheme();

  const [state, setState] = useState<ViewState>(() => ({
    currentTab: 0,
    submitActionIdx: 0,
    editingOther: false,
    cursors: questions.map(() => 0),
    singleSelections: questions.map(() => undefined),
    multiSelections: questions.map(() => new Set<number>()),
    otherDrafts: questions.map(() => ""),
    committedOtherValues: questions.map(() => undefined),
    otherInputValue: "",
  }));

  const answers = questions.map((_, qi) => computeAnswer(questions, state, qi));
  const submitTab = questions.length;
  const isSubmitTab = state.currentTab >= submitTab;

  useInput((input, key) => {
    // Cancel paths
    if (key.escape || (key.ctrl && (input === "c" || input === "d"))) {
      onCancel(id);
      return;
    }

    // Other-option text editing
    if (state.editingOther && !isSubmitTab) {
      if (key.tab) {
        setState((prev) => goToTab(prev, questions, prev.currentTab + 1));
        return;
      }
      if (key.upArrow) {
        setState((prev) =>
          moveCursor(syncOtherDraft(prev, questions), questions, -1),
        );
        return;
      }
      if (key.downArrow) {
        setState((prev) =>
          moveCursor(syncOtherDraft(prev, questions), questions, 1),
        );
        return;
      }
      if (key.return) {
        setState((prev) => commitOther(prev, questions));
        return;
      }
      if (key.backspace) {
        setState((prev) => editOtherText(prev, "", { backspace: true }));
        return;
      }
      if (input) {
        setState((prev) => editOtherText(prev, input, {}));
      }
      return;
    }

    // Submit tab
    if (isSubmitTab) {
      if (key.upArrow) {
        setState((prev) => ({
          ...prev,
          submitActionIdx:
            (prev.submitActionIdx - 1 + SUBMIT_ACTIONS.length) % SUBMIT_ACTIONS.length,
          reviewMessage: undefined,
        }));
        return;
      }
      if (key.downArrow) {
        setState((prev) => ({
          ...prev,
          submitActionIdx: (prev.submitActionIdx + 1) % SUBMIT_ACTIONS.length,
          reviewMessage: undefined,
        }));
        return;
      }
      if (key.leftArrow) {
        setState((prev) => goToTab(prev, questions, prev.currentTab - 1));
        return;
      }
      if (key.rightArrow || key.tab) {
        setState((prev) => goToTab(prev, questions, prev.currentTab + 1));
        return;
      }
      if (key.return) {
        if (state.submitActionIdx === 1) {
          onCancel(id);
        } else {
          onAnswer(id, buildAnswers(questions, state));
        }
        return;
      }
      if (input === "1") {
        onAnswer(id, buildAnswers(questions, state));
        return;
      }
      if (input === "2") {
        onCancel(id);
      }
      return;
    }

    // Question tab
    const qIdx = state.currentTab;
    const q = questions[qIdx];
    if (!q) return;
    const opts = displayOptions(q);
    if (opts.length === 0) return;

    if (key.upArrow) {
      setState((prev) => moveCursor(prev, questions, -1));
      return;
    }
    if (key.downArrow) {
      setState((prev) => moveCursor(prev, questions, 1));
      return;
    }
    if (key.leftArrow) {
      setState((prev) => goToTab(prev, questions, prev.currentTab - 1));
      return;
    }
    if (key.rightArrow || key.tab) {
      setState((prev) => goToTab(prev, questions, prev.currentTab + 1));
      return;
    }
    if (key.return) {
      setState((prev) =>
        activateOption(
          prev,
          questions,
          prev.currentTab,
          prev.cursors[prev.currentTab] ?? 0,
        ),
      );
      return;
    }

    const numIdx = NUMBER_KEYS.indexOf(input);
    if (numIdx >= 0 && numIdx < opts.length) {
      setState((prev) => {
        const cursors = [...prev.cursors];
        cursors[prev.currentTab] = numIdx;
        return activateOption({ ...prev, cursors }, questions, prev.currentTab, numIdx);
      });
      return;
    }

    if (input === " " && q.multi_select) {
      setState((prev) =>
        activateOption(
          prev,
          questions,
          prev.currentTab,
          prev.cursors[prev.currentTab] ?? 0,
        ),
      );
    }
  });

  // ── Tabs ──
  const tabs = questions.flatMap((q, qi) => {
    const label = q.header && q.header.length > 0 ? q.header : `Q${qi + 1}`;
    const active = state.currentTab === qi;
    const answered = isAnswered(questions, state, qi);
    return [
      <Text
        key={`tab-${qi}`}
        backgroundColor={active ? theme.primary : undefined}
        color={active ? theme.textStrong : answered ? theme.success : theme.textDim}
        bold={active}
      >
        {active ? ` ${label} ` : answered ? `(✓) ${label}` : `(○) ${label}`}
      </Text>,
      <Text key={`sep-${qi}`}>{"  "}</Text>,
    ];
  });
  tabs.push(
    <Text
      key="tab-submit"
      backgroundColor={isSubmitTab ? theme.primary : undefined}
      color={isSubmitTab ? theme.textStrong : theme.textDim}
      bold={isSubmitTab}
    >
      {" Submit "}
    </Text>,
  );

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accent}
      paddingX={1}
    >
      <Box flexDirection="row">{tabs}</Box>

      {isSubmitTab ? (
        <SubmitTabContent
          questions={questions}
          answers={answers}
          state={state}
          theme={theme}
        />
      ) : (
        <QuestionTabContent questions={questions} state={state} theme={theme} />
      )}
    </Box>
  );
}

// ── Sub-renderers ─────────────────────────────────────────────────────

function QuestionTabContent({
  questions,
  state,
  theme,
}: {
  questions: Question[];
  state: ViewState;
  theme: ReturnType<typeof getCurrentTheme>;
}) {
  const qIdx = state.currentTab;
  const q = questions[qIdx];
  if (!q) return null;

  const opts = displayOptions(q);
  const cursor = state.cursors[qIdx] ?? 0;
  const maxStart = Math.max(0, opts.length - MAX_VISIBLE_OPTIONS);
  const visibleStart = Math.max(
    0,
    Math.min(cursor - Math.floor(MAX_VISIBLE_OPTIONS / 2), maxStart),
  );
  const visibleEnd = Math.min(opts.length, visibleStart + MAX_VISIBLE_OPTIONS);

  const multiSet = state.multiSelections[qIdx] ?? new Set<number>();
  const singleSelection = state.singleSelections[qIdx];
  const answered = isAnswered(questions, state, qIdx);

  const bodyLines =
    q.body && q.body.trim().length > 0 ? q.body.trim().split("\n") : [];

  const hintParts = state.editingOther
    ? ["type answer", "↵ save", "←/→/tab switch", "esc cancel"]
    : [
        "↑↓ select",
        `${opts.length <= 1 ? "1" : `1-${Math.min(opts.length, NUMBER_KEYS.length)}`} / ↵ ${q.multi_select ? "toggle" : "choose"}`,
        "←/→/tab switch",
        "esc cancel",
      ];

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box flexDirection="row">
        <Text color={theme.primary}>{" ? "}</Text>
        <Text bold>{q.question}</Text>
      </Box>

      {state.editingOther && (
        <Text dimColor>{"   Type your answer, then press Enter to save."}</Text>
      )}

      {bodyLines.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {bodyLines.slice(0, MAX_BODY_LINES).map((line, i) => (
            <Text key={i} dimColor>
              {"   "}
              {line}
            </Text>
          ))}
          {bodyLines.length > MAX_BODY_LINES && (
            <Text dimColor>
              {"   ... "}
              {String(bodyLines.length - MAX_BODY_LINES)} more lines
            </Text>
          )}
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        {opts.slice(visibleStart, visibleEnd).map((option, visibleIdx) => {
          const i = visibleStart + visibleIdx;
          const num = i + 1;
          const isCursor = i === cursor;
          const isOther = option.kind === "other";
          const isSelected = q.multi_select ? multiSet.has(i) : singleSelection === i;

          let label = option.label;
          if (isOther) {
            const committed = state.committedOtherValues[qIdx];
            if (committed !== undefined && committed.length > 0) {
              label = `${option.label}: ${committed}`;
            }
          }

          if (state.editingOther && isCursor && isOther) {
            const prefix = q.multi_select
              ? isSelected
                ? "  [✓] "
                : "  [ ] "
              : `  → [${num}] `;
            return (
              <Box key={i} flexDirection="row">
                <Text
                  color={isSelected && answered ? theme.success : theme.primary}
                  bold={isSelected && answered}
                >
                  {prefix}
                  {option.label}: {state.otherInputValue}█
                </Text>
              </Box>
            );
          }

          let prefix: string;
          let color: string;
          let bold = false;
          if (q.multi_select) {
            prefix = isSelected ? "  [✓] " : "  [ ] ";
            if (isSelected && isCursor) {
              color = theme.success;
              bold = true;
            } else if (isSelected) {
              color = theme.success;
            } else if (isCursor) {
              color = theme.primary;
            } else {
              color = theme.textDim;
            }
          } else if (isSelected && answered) {
            prefix = isCursor ? `  → [${num}] ` : `    [${num}] `;
            color = theme.success;
            bold = isCursor;
          } else if (isCursor) {
            prefix = `  → [${num}] `;
            color = theme.primary;
          } else {
            prefix = `    [${num}] `;
            color = theme.textDim;
          }

          return (
            <Box key={i} flexDirection="column">
              <Box flexDirection="row">
                <Text>{prefix}</Text>
                <Text color={color} bold={bold}>
                  {label}
                </Text>
              </Box>
              {option.description !== undefined &&
                option.description.length > 0 &&
                !(state.editingOther && isCursor && isOther) && (
                  <Box marginLeft={8}>
                    <Text dimColor>{option.description}</Text>
                  </Box>
                )}
            </Box>
          );
        })}
      </Box>

      {(visibleStart > 0 || visibleEnd < opts.length) && (
        <Text dimColor>
          {"   showing "}
          {String(visibleStart + 1)}-{String(visibleEnd)} of {String(opts.length)}
        </Text>
      )}

      <Box marginTop={1}>
        <Text dimColor>{"  "}</Text>
        <Text dimColor>{hintParts.join("  ")}</Text>
      </Box>
    </Box>
  );
}

function SubmitTabContent({
  questions,
  answers,
  state,
  theme,
}: {
  questions: Question[];
  answers: (string | undefined)[];
  state: ViewState;
  theme: ReturnType<typeof getCurrentTheme>;
}) {
  const hasUnanswered = questions.some((_, qi) => !isAnswered(questions, state, qi));
  const warning =
    state.reviewMessage ?? (hasUnanswered ? UNANSWERED_WARNING : undefined);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>{" " + REVIEW_TITLE}</Text>
      {warning !== undefined && (
        <Text color={theme.warning}>{"  " + warning}</Text>
      )}

      <Box flexDirection="column" marginTop={1}>
        {questions.map((q, qi) => {
          const answer = answers[qi];
          return (
            <Box key={qi} flexDirection="column">
              <Box flexDirection="row">
                <Text dimColor>{"  Q  "}</Text>
                <Text>{q.question}</Text>
              </Box>
              {answer !== undefined && answer.length > 0 ? (
                <Box flexDirection="row" marginLeft={2}>
                  <Text color={theme.primary}>{"→  "}</Text>
                  <Text>{answer}</Text>
                </Box>
              ) : (
                <Box marginLeft={2}>
                  <Text dimColor>{"→  " + NOT_ANSWERED_LABEL}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text>{" " + SUBMIT_PROMPT}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {SUBMIT_ACTIONS.map((label, i) => {
          const active = state.submitActionIdx === i;
          const num = i + 1;
          return (
            <Text
              key={label}
              color={active ? theme.primary : theme.textDim}
              bold={active}
            >
              {active ? `  → [${num}] ${label}` : `    [${num}] ${label}`}
            </Text>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {"  ↑↓ select  1/2 choose  ↵ confirm  ←/→/tab switch  esc cancel"}
        </Text>
      </Box>
    </Box>
  );
}

export default QuestionView;
