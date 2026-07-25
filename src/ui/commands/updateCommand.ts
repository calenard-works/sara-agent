import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { CommandHandler } from "./command.types";

export interface UpdateResult {
  updated: boolean;
  version: string;
  releaseNotes?: string;
}

/**
 * Try to find the globally installed Sara and read its CHANGELOG.md.
 * Searches common global node_modules locations.
 */
function findGlobalChangelog(): string | undefined {
  const candidates = [
    // npm global prefix
    join(execSync("npm prefix -g", { encoding: "utf-8" }).trim(), "lib", "node_modules", "sara-agent", "CHANGELOG.md"),
    // Common fallback locations
    join(homedir(), ".nvm", "versions", "node", "*", "lib", "node_modules", "sara-agent", "CHANGELOG.md"),
    "/usr/local/lib/node_modules/sara-agent/CHANGELOG.md",
    "/usr/lib/node_modules/sara-agent/CHANGELOG.md",
  ];

  for (const candidate of candidates) {
    // Handle glob pattern in path (nvm case)
    if (candidate.includes("*")) {
      const prefix = execSync("npm prefix -g", { encoding: "utf-8" }).trim();
      const nvmPath = join(prefix, "lib", "node_modules", "sara-agent", "CHANGELOG.md");
      if (existsSync(nvmPath)) {
        return readFileSync(nvmPath, "utf-8");
      }
    }
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf-8");
    }
  }
  return undefined;
}

export const updateCommand: CommandHandler<UpdateResult | undefined> = {
  name: "/update",
  description: "Update Sara to the latest version",
  execute: async (messages, llmClient, actions, onExecutePrompt, args) => {
    const startedAt = new Date().toISOString();
    const callId = `/update_${Date.now()}`;
    const commandCall = {
      kind: "cmd" as const,
      commandName: "/update" as const,
      callId,
      status: "executing" as const,
      startedAt,
    };
    actions.addCommandCall(commandCall);

    try {
      // Get the latest version from npm before updating
      let latestVersion = "unknown";
      try {
        const res = await fetch("https://registry.npmjs.org/sara-agent/latest");
        const data: { version?: string } = await res.json();
        if (data.version) latestVersion = data.version;
      } catch {
        // ignore
      }

      // Run npm update
      execSync("npm i -g --ignore-scripts sara-agent", {
        stdio: "pipe",
        timeout: 120_000,
      });

      // Read changelog from the newly installed package
      let releaseNotes: string | undefined;
      try {
        releaseNotes = findGlobalChangelog();
      } catch {
        // ignore
      }

      const result: UpdateResult = {
        updated: true,
        version: latestVersion,
        releaseNotes,
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
