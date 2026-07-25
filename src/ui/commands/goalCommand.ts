import type { CommandHandler } from "./command.types";
import { getGoal, createGoal, updateGoalStatus, clearGoal } from "../../agent/goal";

export type GoalResult = string | undefined;

export const goalCommand: CommandHandler<GoalResult> = {
  name: "/goal",
  description: "Manage goals — status, create, pause, resume, cancel, replace",
  execute: async (_messages, _llmClient, actions, _onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/goal_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/goal" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      const trimmed = (args || "").trim().toLowerCase();

      // /goal status — show current goal
      if (!trimmed || trimmed === "status") {
        const goal = getGoal();
        if (!goal) {
          const completedCall = {
            ...commandCall,
            status: "success" as const,
            endedAt: new Date().toISOString(),
            result: "No active goal.",
          };
          actions.completeCommandCall(completedCall);
          return "No active goal.";
        }
        const result = `Goal: ${goal.objective}\nStatus: ${goal.status}\nGoal ID: ${goal.goalId}`;
        const completedCall = {
          ...commandCall,
          status: "success" as const,
          endedAt: new Date().toISOString(),
          result,
        };
        actions.completeCommandCall(completedCall);
        return result;
      }

      // /goal cancel — remove current goal
      if (trimmed === "cancel" || trimmed === "clear") {
        const goal = getGoal();
        if (!goal) {
          const completedCall = {
            ...commandCall,
            status: "success" as const,
            endedAt: new Date().toISOString(),
            result: "No active goal to cancel.",
          };
          actions.completeCommandCall(completedCall);
          return "No active goal to cancel.";
        }
        clearGoal();
        const result = `Goal cancelled: ${goal.objective}`;
        const completedCall = {
          ...commandCall,
          status: "success" as const,
          endedAt: new Date().toISOString(),
          result,
        };
        actions.completeCommandCall(completedCall);
        return result;
      }

      // /goal pause — pause current goal
      if (trimmed === "pause") {
        const res = updateGoalStatus("paused" as any);
        if ("error" in res) {
          throw new Error(res.error);
        }
        const result = `Goal paused: ${res.goal.objective}`;
        const completedCall = {
          ...commandCall,
          status: "success" as const,
          endedAt: new Date().toISOString(),
          result,
        };
        actions.completeCommandCall(completedCall);
        return result;
      }

      // /goal resume — resume paused goal
      if (trimmed === "resume") {
        const res = updateGoalStatus("active");
        if ("error" in res) {
          throw new Error(res.error);
        }
        const result = `Goal resumed: ${res.goal.objective}`;
        const completedCall = {
          ...commandCall,
          status: "success" as const,
          endedAt: new Date().toISOString(),
          result,
        };
        actions.completeCommandCall(completedCall);
        return result;
      }

      // /goal replace <objective> — replace goal with new objective
      if (trimmed.startsWith("replace ")) {
        const objective = args!.trim().slice(8);
        const res = createGoal(objective, undefined, true);
        if ("error" in res) {
          throw new Error(res.error);
        }
        const result = `Goal replaced: ${objective}`;
        const completedCall = {
          ...commandCall,
          status: "success" as const,
          endedAt: new Date().toISOString(),
          result,
        };
        actions.completeCommandCall(completedCall);
        return result;
      }

      // Default: create a new goal with the provided text
      const objective = args!.trim();
      if (!objective) {
        throw new Error("Usage: /goal <objective> | status | pause | resume | cancel | replace <objective>");
      }

      const res = createGoal(objective);
      if ("error" in res) {
        // If a goal already exists, tell the user
        const existing = getGoal();
        const result = `A goal is already active: "${existing?.objective}". Use /goal replace <objective> to replace it.`;
        const completedCall = {
          ...commandCall,
          status: "success" as const,
          endedAt: new Date().toISOString(),
          result,
        };
        actions.completeCommandCall(completedCall);
        return result;
      }

      const result = `Goal created: ${objective}`;
      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
        result,
      };
      actions.completeCommandCall(completedCall);
      return result;
    } catch (error: unknown) {
      const errorCall = {
        ...commandCall,
        status: "error" as const,
        endedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "unknown error",
      };
      actions.completeCommandCall(errorCall);
      return undefined;
    }
  },
};
