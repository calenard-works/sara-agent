import type { CommandHandler } from "./command.types";
import type { ApprovalMode } from "../../config/types";

const MODE_DETAILS: Record<ApprovalMode, { description: string; risk: string }> = {
  default: {
    description: "Ask for every file write and command execution",
    risk: "Low risk — full control",
  },
  autoEdit: {
    description: "Auto-approve file writes, ask for commands",
    risk: "Medium risk — no approval needed for edits",
  },
  yolo: {
    description: "Auto-approve everything — full trust",
    risk: "High risk — no guardrails",
  },
};

export type PermissionResult = void;

export const permissionCommand: CommandHandler<PermissionResult> = {
  name: "/permission",
  description: "Change permission/approval mode",
  execute: async (_messages, _llmClient, actions, _onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/permission_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/permission" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      // Direct mode: /permission <mode>
      if (args && args.trim().length > 0) {
        const mode = args.trim().toLowerCase() as ApprovalMode;
        if (!["default", "autoEdit", "yolo"].includes(mode)) {
          throw new Error(
            `Invalid permission mode: "${mode}". Valid: default, autoEdit, yolo`
          );
        }

        // Cycle through until we reach the requested mode
        let cycles = 0;
        const maxCycles = 3;
        let currentMode = actions.getCurrentApprovalMode?.() ?? "default";
        while (currentMode !== mode && cycles < maxCycles) {
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
          result: `Permission mode set to ${mode}`,
        };
        actions.completeCommandCall(completedCall);
        return;
      }

      // Interactive mode: show picker
      const modes: { id: string; name: string }[] = [
        { id: "default", name: "Default (ask for everything)" },
        { id: "autoEdit", name: "Auto-Edit (auto-approve edits)" },
        { id: "yolo", name: "YOLO (auto-approve all)" },
      ];

      actions.setInteractiveMode({
        type: "permission-picker",
        modes,
      });

      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
      };
      actions.completeCommandCall(completedCall);
    } catch (error) {
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