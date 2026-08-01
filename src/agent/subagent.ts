/**
 * Subagent management for Agent and AgentSwarm tools.
 *
 * Uses Node.js child_process to spawn Sara in non-interactive mode.
 */

import { spawn, spawnSync, execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { registerTask, completeTask, failTask } from "./background";

export interface SubagentResult {
  agentId: string;
  actualSubagentType: string;
  status: "completed" | "failed" | "aborted";
  summary?: string;
  error?: string;
}

let agentCounter = 0;

function generateAgentId(): string {
  agentCounter++;
  const ts = Date.now().toString(36);
  return `agent-${agentCounter}-${ts}`;
}

let cachedDistPath: string | null = null;

/**
 * Locate the CLI entry point (dist/index.mjs) that subagents are spawned with.
 *
 * Resolution order:
 * 1. The running module itself — when Sara is executed from the bundled
 *    dist/index.mjs (npm global install, `node dist/index.mjs`, ...).
 * 2. Dev tree — source layout src/agent/ with dist/ at the project root.
 * 3. Global npm install location (npm prefix -g).
 *
 * Never falls back to process.cwd(): the work directory of the current
 * session may be any project, and it does not contain Sara's bundle.
 */
function findDistPath(): string {
  if (cachedDistPath) return cachedDistPath;

  const candidates: string[] = [];

  try {
    const modulePath = fileURLToPath(import.meta.url);
    // Case 1: we are the bundled entry itself
    if (path.basename(modulePath) === "index.mjs") {
      candidates.push(modulePath);
    }
    // Case 2: dev tree (src/agent/ → dist/index.mjs at project root)
    candidates.push(
      path.join(path.dirname(modulePath), "..", "..", "dist", "index.mjs"),
    );
  } catch {
    // import.meta.url unavailable — rely on the global install fallback below
  }

  // Case 3: global npm install
  try {
    const prefix = execSync("npm prefix -g", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    candidates.push(
      path.join(prefix, "lib", "node_modules", "sara-agent", "dist", "index.mjs"),
    );
  } catch {
    // npm unavailable — ignore
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      cachedDistPath = candidate;
      return candidate;
    }
  }

  throw new Error(
    "Cannot locate Sara's dist/index.mjs to spawn a subagent. " +
      "Install Sara globally (npm i -g sara-agent) or build the project first.",
  );
}

/**
 * Run a subagent in the foreground (blocking).
 * Returns the result with summary.
 */
export async function runSubagent(
  prompt: string,
  cwd: string,
  subagentType?: string,
  description?: string,
): Promise<SubagentResult> {
  const agentId = generateAgentId();
  const distPath = findDistPath();
  const actualType = subagentType || "coder";

  try {
    // Build the prompt with description as context
    const fullPrompt = description
      ? `${description}\n\n${prompt}`
      : prompt;

    // Run Sara in non-interactive mode. Arguments are passed as an array so
    // the shell never interprets the prompt (backticks, quotes, $, ...).
    const result = spawnSync(
      "node",
      [distPath, "--approval-mode", "yolo", "--work-dir", cwd, fullPrompt],
      {
        encoding: "utf-8",
        timeout: 600_000, // 10 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB
        cwd,
      },
    );

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        `Subagent exited with code ${result.status}: ${(result.stderr || result.stdout || "").toString().trim()}`,
      );
    }

    return {
      agentId,
      actualSubagentType: actualType,
      status: "completed",
      summary: result.stdout?.trim() ?? "",
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Check if it's a timeout
      if (error.message.includes("timed out") || error.message.includes("ETIMEDOUT")) {
        return {
          agentId,
          actualSubagentType: actualType,
          status: "aborted",
          error: "Subagent timed out after 10 minutes",
        };
      }
      return {
        agentId,
        actualSubagentType: actualType,
        status: "failed",
        error: error.message,
        summary: (error as any).stdout?.toString().trim(),
      };
    }
    return {
      agentId,
      actualSubagentType: actualType,
      status: "failed",
      error: "Unknown error running subagent",
    };
  }
}

/**
 * Run a subagent in the background.
 * Returns immediately with the task ID.
 */
export function runSubagentInBackground(
  prompt: string,
  cwd: string,
  subagentType?: string,
  description?: string,
): { taskId: string; agentId: string } {
  const agentId = generateAgentId();
  const distPath = findDistPath();
  const actualType = subagentType || "coder";

  const fullPrompt = description
    ? `${description}\n\n${prompt}`
    : prompt;

  // Register as a background task
  const taskId = registerTask(description || `Subagent: ${prompt.slice(0, 50)}...`, {
    agentId,
    subagentType: actualType,
  });

  // Spawn the subagent process
  const child = spawn("node", [distPath, "--approval-mode", "yolo", "--work-dir", cwd, fullPrompt], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 600_000,
  });

  let output = "";

  child.stdout?.on("data", (data: Buffer) => {
    output += data.toString();
  });

  child.stderr?.on("data", (data: Buffer) => {
    output += data.toString();
  });

  child.on("close", (code: number | null) => {
    if (code === 0) {
      completeTask(taskId, output.trim());
    } else {
      failTask(taskId, `Subagent exited with code ${code}: ${output.trim()}`);
    }
  });

  child.on("error", (err: Error) => {
    failTask(taskId, `Subagent failed: ${err.message}`);
  });

  return { taskId, agentId };
}
