#!/usr/bin/env -S node --no-warnings=ExperimentalWarning

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import chalk from "chalk";
import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { App } from "./ui/App";
import { runNonInteractive } from "./nonInteractive/runner";
import { createConfigCommand } from "./cli/config";
import { mcpService } from "./mcp";

type GlobalOptions = {
  approvalMode?: "autoEdit" | "yolo" | "default";
  workDir?: string;
};

function findPackageJsonPath(startDir: string): string | null {
  let current: string | null = startDir;
  while (current) {
    const candidate = path.join(current, "package.json");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function readPackageVersion(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = findPackageJsonPath(here);
    if (!pkgPath) return "0.0.0";
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    if (pkg && typeof pkg.version === "string") return pkg.version as string;
  } catch {
    // Ignore errors when reading package.json, fallback to default version
  }
  return "0.0.0";
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = new Command();
  const version = readPackageVersion();

  program
    .name("sara")
    .description("sara CLI - A command-line coding agent")
    .version(version, "-V, --version", "output the version number")
    .helpOption("-h, --help", "display help for command")
    .option(
      "-a, --approval-mode <mode>",
      "approval mode: default, autoEdit (auto-approve edits), or yolo (auto-approve all)",
      (value: string) => {
        if (!["default", "autoEdit", "yolo"].includes(value)) {
          throw new Error(`Invalid approval mode: ${value}`);
        }
        return value as "default" | "autoEdit" | "yolo";
      },
    )
    .option("-w, --work-dir <path>", "working directory for the agent");

  // Add config subcommand
  program.addCommand(createConfigCommand());

  // Add update subcommand: sara update
  const updateCmd = new Command("update")
    .description("Update Sara to the latest version")
    .action(async () => {
      console.log(
        chalk.gray(
          'Updating Sara with "npm i -g --ignore-scripts sara-agent"...',
        ),
      );
      try {
        execSync("npm i -g --ignore-scripts sara-agent", {
          stdio: "inherit",
          timeout: 120_000,
        });
        // Get the new version
        const res = await fetch(
          "https://registry.npmjs.org/sara-agent/latest",
        );
        const data: { version?: string } = await res.json();
        const ver = data.version || "?";
        console.log(chalk.green(`Updated Sara v${ver}`));
      } catch (error) {
        console.error(chalk.red("Update failed:"), error);
        process.exit(1);
      }
    });
  program.addCommand(updateCmd);

  program
    .argument("[prompt]", "task prompt (triggers non-interactive mode)")
    .action(async (prompt: string | undefined) => {
      const opts = program.opts<GlobalOptions>();
      const approvalMode = opts.approvalMode;
      const workDir = opts.workDir || process.cwd();

      // Non-interactive mode: Execute task directly when prompt is provided
      if (prompt) {
        const exitCode = await runNonInteractive(prompt, workDir, approvalMode);
        process.exit(exitCode);
      }

      // Interactive mode: Launch UI when no prompt is provided
      const element = React.createElement(App, {
        cwd: workDir,
        approvalMode,
      });
      const instance = render(element, {
        exitOnCtrlC: false,
      });

      // Graceful shutdown on SIGINT (external kill signal)
      const onSigint = async () => {
        await mcpService.shutdown().catch(() => {});
        instance.clear();
        process.exit(0);
      };
      process.on("SIGINT", onSigint);

      await instance.waitUntilExit();
      process.off("SIGINT", onSigint);
    });

  program.showHelpAfterError("(add -h for help)");
  program.showSuggestionAfterError();

  try {
    await program.parseAsync(argv);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}
