/**
 * AutoEdit Command
 *
 * Switches the approval mode to Auto-Edit (auto-approve file writes,
 * ask for commands).
 */

import type { CommandHandler } from "./command.types";

export type AutoEditResult = void;

export const autoeditCommand: CommandHandler<AutoEditResult> = {
  name: "/autoedit",
  description: "Switch to Auto-Edit mode — auto-approve file edits",
  execute: async (_messages, _llmClient, actions) => {
    const startedAt = new Date().toISOString();
    const callId = `/autoedit_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/autoedit" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      // Cycle until we reach autoEdit mode
      let cycles = 0;
      const maxCycles = 3;
      let currentMode = actions.getCurrentApprovalMode?.() ?? "default";
      while (currentMode !== "autoEdit" && cycles < maxCycles) {
        actions.cycleApprovalMode();
        currentMode =
          currentMode === "default"
            ? "autoEdit"
            : currentMode === "autoEdit"
              ? "yolo"
              : "default";
        cycles++;
      }

      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
        result: "Switched to Auto-Edit mode",
      };
      actions.completeCommandCall(completedCall);
      return;
    } catch (error: unknown) {
      const errorCall = {
        ...commandCall,
        status: "error" as const,
        endedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "unknown error",
      };
      actions.completeCommandCall(errorCall);
    }
  },
};
