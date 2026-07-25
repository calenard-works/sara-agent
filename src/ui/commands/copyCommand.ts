import type { CommandHandler } from "./command.types";
import type { UIFeedMessage } from "../types";

export type CopyResult = string | undefined;

export const copyCommand: CommandHandler<CopyResult> = {
  name: "/copy",
  description: "Copy last assistant message to clipboard",
  execute: async (messages: UIFeedMessage[], _llmClient, actions, _onExecutePrompt, _args) => {
    const startedAt = new Date().toISOString();
    const callId = `/copy_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/copy" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      // Find the last assistant message (LLM message with role assistant)
      let lastAssistantMessage: string | undefined;
      
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (
          msg.kind === "api" &&
          msg.message.role === "assistant" &&
          typeof msg.message.content === "string"
        ) {
          lastAssistantMessage = msg.message.content;
          break;
        }
      }

      if (!lastAssistantMessage) {
        const errorCall = {
          ...commandCall,
          status: "error" as const,
          endedAt: new Date().toISOString(),
          error: "No assistant message to copy",
        };
        actions.completeCommandCall(errorCall);
        return undefined;
      }

      // Write to clipboard using OS clipboard command
      const { execSync } = await import("node:child_process");
      const isMac = process.platform === "darwin";
      const isWindows = process.platform === "win32";
      
      try {
        if (isMac) {
          execSync("pbcopy", { input: lastAssistantMessage, encoding: "utf-8" });
        } else if (isWindows) {
          execSync("clip", { input: lastAssistantMessage, encoding: "utf-8" });
        } else {
          // Linux - try xclip, xsel, or wl-copy
          try {
            execSync("xclip -selection clipboard", { input: lastAssistantMessage, encoding: "utf-8" });
          } catch {
            try {
              execSync("xsel -b", { input: lastAssistantMessage, encoding: "utf-8" });
            } catch {
              try {
                execSync("wl-copy", { input: lastAssistantMessage, encoding: "utf-8" });
              } catch {
                throw new Error("No clipboard tool found. Install xclip, xsel, or wl-copy");
              }
            }
          }
        }
      } catch (clipError) {
        throw new Error(`Clipboard copy failed: ${clipError instanceof Error ? clipError.message : "unknown error"}`);
      }

      const completedCall = {
        ...commandCall,
        status: "success" as const,
        endedAt: new Date().toISOString(),
        result: "Copied last assistant message to clipboard",
      };
      actions.completeCommandCall(completedCall);
      return "Copied to clipboard";
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