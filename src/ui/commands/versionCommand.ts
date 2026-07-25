/**
 * Version Command
 *
 * Shows the current Sara version and description.
 */

import type { CommandHandler } from "./command.types";
import { VERSION } from "../../version";

export const versionCommand: CommandHandler<VersionResult> = {
  name: "/version",
  description: "Show version information",
  execute: async () => {
    return {
      version: VERSION,
      description: "Sara - AI Coding Agent",
    };
  },
};
