/**
 * Subagent management for Agent and AgentSwarm tools.
 *
 * Uses Node.js child_process to spawn Sara in non-interactive mode.
 */

import { spawn, execSync } from "node:child_process";
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

/**
 * Find the dist/index.mjs path relative to this source file.
 */
function findDistPath(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    // We're in src/agent/, dist is at dist/index.mjs relative to project root
    const root = path.resolve(here, "../..");
    const distPath = path.join(root, "dist", "index.mjs");
    if (fs.existsSync(distPath)) {
      return distPath;
    }
  } catch {
    // Fallback: use the module's __dirname equivalent
  }
  return path.resolve(process.cwd(), "dist", "index.mjs");
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

    // Run Sara in non-interactive mode via execSync
    const stdout = execSync(
      `node "${distPath}" --approval-mode yolo --work-dir "${cwd}" "${escapePrompt(fullPrompt)}"`,
      {
        encoding: "utf-8",
        timeout: 600_000, // 10 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB
        cwd,
      },
    );

    return {
      agentId,
      actualSubagentType: actualType,
      status: "completed",
      summary: stdout.trim(),
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

function escapePrompt(prompt: string): string {
  // Escape for shell: wrap in single quotes, escape single quotes inside
  return `'${prompt.replace(/'/g, "'\\''")}'`;
}
