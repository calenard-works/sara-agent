/**
 * Simple in-memory goal system for Sara.
 *
 * Manages a single active goal with status tracking and budget.
 */

export type GoalStatus = "active" | "paused" | "blocked" | "complete";

export interface GoalBudget {
  turns?: number;
  tokens?: number;
  wallClockMs?: number;
}

export interface GoalSnapshot {
  goalId: string;
  objective: string;
  completionCriterion?: string;
  status: GoalStatus;
  createdAt: number;
  turnsUsed: number;
  tokensUsed: number;
  budget?: GoalBudget;
  terminalReason?: string;
}

let currentGoal: GoalSnapshot | null = null;

/**
 * Create a new goal.
 * Returns the goal if created, or null if a goal already exists and replace is false.
 */
export function createGoal(
  objective: string,
  completionCriterion?: string,
  replace?: boolean,
): { goal: GoalSnapshot } | { error: string } {
  if (currentGoal && !replace) {
    return { error: "A goal is already active. Use replace=true to replace it." };
  }

  const goal: GoalSnapshot = {
    goalId: generateId(),
    objective,
    completionCriterion,
    status: "active",
    createdAt: Date.now(),
    turnsUsed: 0,
    tokensUsed: 0,
  };

  currentGoal = goal;
  return { goal };
}

/**
 * Get the current goal.
 */
export function getGoal(): GoalSnapshot | null {
  return currentGoal;
}

/**
 * Update the status of the current goal.
 */
export function updateGoalStatus(
  status: GoalStatus,
): { goal: GoalSnapshot } | { error: string } {
  if (!currentGoal) {
    return { error: "No active goal to update." };
  }

  currentGoal.status = status;

  if (status === "blocked") {
    currentGoal.terminalReason = "blocked";
  } else if (status === "complete") {
    currentGoal.terminalReason = undefined;
  }

  return { goal: { ...currentGoal } };
}

/**
 * Set a budget on the current goal.
 */
export function setGoalBudget(
  value: number,
  unit: "turns" | "tokens" | "milliseconds" | "seconds" | "minutes" | "hours",
): { goal: GoalSnapshot } | { error: string } {
  if (!currentGoal) {
    return { error: "No active goal to set budget on." };
  }

  if (!currentGoal.budget) {
    currentGoal.budget = {};
  }

  switch (unit) {
    case "turns":
      currentGoal.budget.turns = Math.round(value);
      break;
    case "tokens":
      currentGoal.budget.tokens = Math.round(value);
      break;
    case "milliseconds":
      currentGoal.budget.wallClockMs = Math.round(value);
      break;
    case "seconds":
      currentGoal.budget.wallClockMs = Math.round(value * 1000);
      break;
    case "minutes":
      currentGoal.budget.wallClockMs = Math.round(value * 60 * 1000);
      break;
    case "hours":
      currentGoal.budget.wallClockMs = Math.round(value * 60 * 60 * 1000);
      break;
  }

  return { goal: { ...currentGoal } };
}

/**
 * Clear the current goal.
 */
export function clearGoal(): void {
  currentGoal = null;
}

function generateId(): string {
  const chars = "abcdef0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
