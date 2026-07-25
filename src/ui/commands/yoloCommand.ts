/**
 * YOLO Command
 *
 * Switches the approval mode to YOLO (auto-approve everything).
 */

import type { CommandHandler } from "./command.types";

export type YoloResult = void;

export const yoloCommand: CommandHandler<YoloResult> = {
  name: "/yolo",
  description: "Switch to YOLO mode — auto-approve everything",
  execute: async (_messages, _llmClient, actions) => {
    const startedAt = new Date().toISOString();
    const callId = `/yolo_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/yolo" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      // Cycle until we reach yolo mode
      let cycles = 0;
      const maxCycles = 3;
      let currentMode = actions.getCurrentApprovalMode?.() ?? "default";
      while (currentMode !== "yolo" && cycles < maxCycles) {
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
        result: "Switched to YOLO mode",
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
