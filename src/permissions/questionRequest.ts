/**
 * ========================================================================
 * QUESTION REQUEST SYSTEM
 * ========================================================================
 *
 * Handles the async flow for asking the user questions during tool execution.
 * Mirrors the permission request system pattern for consistency.
 *
 * FLOW:
 * 1. AskUserQuestionTool.execute() calls requestQuestion()
 * 2. requestQuestion() stores a promise in the module-level map
 * 3. UI subscribes to new questions via subscribe()
 * 4. UI renders QuestionView for the user to answer
 * 5. resolveQuestion() resolves the promise with user's answers
 * 6. Tool returns the answers as its result
 */

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface Question {
  question: string;
  header?: string;
  options: QuestionOption[];
  multi_select?: boolean;
}

export type QuestionAnswers = Record<string, string>;

interface PendingQuestionEntry {
  questions: Question[];
  background: boolean;
  resolve: (answers: QuestionAnswers) => void;
  reject: (reason: string) => void;
  timeoutId: NodeJS.Timeout;
}

export type NewQuestionEvent = {
  id: string;
  questions: Question[];
  background: boolean;
};

type QuestionListener = (event: NewQuestionEvent) => void;

// Module-level state — stable across the process lifetime
const pendingMap = new Map<string, PendingQuestionEntry>();
const listeners = new Set<QuestionListener>();

let counter = 0;

/**
 * Request user input for one or more questions.
 *
 * Creates a Promise that resolves when the user provides answers via the UI.
 * The UI subscribes to new questions and presents them to the user.
 *
 * @param questions The questions to ask the user
 * @param background If true, runs as a background task
 * @param timeoutMs Max time to wait for answers (default: 5 minutes)
 * @returns Promise resolving with the user's answers
 */
export function requestQuestion(
  questions: Question[],
  background: boolean = false,
  timeoutMs: number = 5 * 60 * 1000,
): Promise<QuestionAnswers> {
  return new Promise<QuestionAnswers>((resolve, reject) => {
    // Guard against empty input
    if (questions.length === 0) {
      reject(new Error("No questions provided"));
      return;
    }

    const id = `q_${Date.now()}_${counter++}`;

    const timeoutId = setTimeout(() => {
      if (pendingMap.has(id)) {
        pendingMap.delete(id);
        reject(new Error("Question timed out after 5 minutes"));
      }
    }, timeoutMs);

    pendingMap.set(id, {
      questions,
      background,
      resolve,
      reject,
      timeoutId,
    });

    // Notify UI subscribers
    const event: NewQuestionEvent = { id, questions, background };
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // Silently ignore listener errors
      }
    }
  });
}

/**
 * Resolve a pending question with user answers.
 *
 * Called by the UI when the user has answered the question.
 *
 * @param id The question request ID
 * @param answers The user's answers (keyed by question text)
 * @returns true if the question was found and resolved
 */
export function resolveQuestion(
  id: string,
  answers: QuestionAnswers,
): boolean {
  const entry = pendingMap.get(id);
  if (!entry) return false;
  clearTimeout(entry.timeoutId);
  entry.resolve(answers);
  pendingMap.delete(id);
  return true;
}

/**
 * Reject/cancel a pending question.
 *
 * Called by the UI when the user dismisses the question.
 *
 * @param id The question request ID
 * @param reason Reason for rejection
 * @returns true if the question was found and rejected
 */
export function rejectQuestion(id: string, reason: string): boolean {
  const entry = pendingMap.get(id);
  if (!entry) return false;
  clearTimeout(entry.timeoutId);
  entry.reject(new Error(reason));
  pendingMap.delete(id);
  return true;
}

/**
 * Subscribe to new question events.
 *
 * The UI calls this to receive notifications when a tool needs to ask
 * the user a question.
 *
 * @param listener Function called when a new question request arrives
 * @returns Unsubscribe function
 */
export function subscribe(listener: QuestionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Check if there are any active pending questions.
 */
export function getPendingCount(): number {
  return pendingMap.size;
}

/**
 * Get the current number of active listeners (for testing).
 */
export function getListenerCount(): number {
  return listeners.size;
}

/**
 * Clean up all listeners and pending questions.
 * Useful for testing.
 */
export function reset(): void {
  for (const [id, entry] of pendingMap) {
    clearTimeout(entry.timeoutId);
    entry.reject(new Error("Question system reset"));
  }
  pendingMap.clear();
  listeners.clear();
  counter = 0;
}
