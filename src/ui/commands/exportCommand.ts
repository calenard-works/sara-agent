/**
 * Export Command
 *
 * Exports the current session as a Markdown file.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { CommandHandler } from "./command.types";

export const exportCommand: CommandHandler<ExportResult | undefined> = {
  name: "/export",
  description: "Export current session as a Markdown file",
  execute: async (messages, _llmClient, actions, _onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/export_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/export" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      const apiMessages = messages.filter((m) => m.kind === "api");
      if (apiMessages.length === 0) {
        throw new Error("No messages to export.");
      }

      const trimmedArgs = (args ?? "").trim();
      const defaultName = `sara-export-${Date.now()}.md`;
      const outputPath = trimmedArgs
        ? resolve(trimmedArgs)
        : resolve(process.cwd(), defaultName);

      // Build markdown
      let md = "# Sara Session Export\n\n";
      md += `**Exported:** ${new Date().toISOString()}\n\n`;
      md += `---\n\n`;

      for (const msg of apiMessages) {
        const role = msg.message.role;
        const content =
          typeof msg.message.content === "string"
            ? msg.message.content
            : JSON.stringify(msg.message.content);

        if (role === "user") {
          md += `## User\n\n${content}\n\n`;
        } else if (role === "assistant") {
          md += `## Assistant\n\n${content}\n\n`;
        } else if (role === "tool") {
          md += `## Tool (${msg.message.tool_call_id})\n\n${content}\n\n`;
        }
      }

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, md, "utf-8");

      const result: ExportResult = {
        path: outputPath,
        messageCount: apiMessages.length,
      };

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
