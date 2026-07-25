/**
 * Sessions Command
 *
 * Lists all saved sessions and allows switching, renaming, and deleting.
 * Triggered via /sessions command in the TUI.
 */

import type { CommandHandler } from "./command.types";
import type { Session } from "../../sessions/types";
import { listSessions } from "../../sessions/persistence";

export const sessionsCommand: CommandHandler<undefined> = {
  name: "/sessions",
  description: "List and manage saved sessions",
  execute: async (messages, llmClient, actions) => {
    const sessions = await listSessions();

    // Set interactive mode to show session list
    actions.setInteractiveMode({
      type: "sessions-list",
      sessions,
    });

    return undefined;
  },
};
