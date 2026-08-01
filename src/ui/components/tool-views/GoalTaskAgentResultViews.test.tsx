import { render } from "ink-testing-library";
import React from "react";
import { expect, test } from "vitest";

import { AgentResultView } from "./AgentResultView";
import { GoalResultView } from "./GoalResultView";
import { TaskResultView } from "./TaskResultView";

test("GoalResultView renders created goal", () => {
  const { lastFrame } = render(
    React.createElement(GoalResultView, {
      result: {
        goal: {
          goalId: "abc123",
          objective: "Fix the build",
          status: "active",
        },
      },
    }),
  );
  const frame = lastFrame();
  expect(frame).toContain("Fix the build");
  expect(frame).toContain("abc123");
  expect(frame).not.toContain('"goalId"');
});

test("GoalResultView renders no-goal state", () => {
  const { lastFrame } = render(
    React.createElement(GoalResultView, { result: { goal: null } }),
  );
  expect(lastFrame()).toContain("No active goal.");
});

test("GoalResultView renders budget message", () => {
  const { lastFrame } = render(
    React.createElement(GoalResultView, {
      result: { message: "Goal budget set: 20 turns.", budget: "20 turns" },
    }),
  );
  expect(lastFrame()).toContain("Goal budget set: 20 turns.");
});

test("TaskResultView renders task list", () => {
  const { lastFrame } = render(
    React.createElement(TaskResultView, {
      result: {
        activeCount: 1,
        tasks: [
          { taskId: "t1", description: "Run tests", status: "running" },
          { taskId: "t2", description: "Build dist", status: "completed" },
        ],
      },
    }),
  );
  const frame = lastFrame();
  expect(frame).toContain("Run tests");
  expect(frame).toContain("Build dist");
  expect(frame).toContain("1 active");
  expect(frame).not.toContain('"tasks"');
});

test("TaskResultView renders task stop", () => {
  const { lastFrame } = render(
    React.createElement(TaskResultView, {
      result: { taskId: "t1", status: "stopped", reason: "Stopped by user" },
    }),
  );
  const frame = lastFrame();
  expect(frame).toContain("t1");
  expect(frame).toContain("stopped");
  expect(frame).toContain("Stopped by user");
});

test("TaskResultView renders task output preview", () => {
  const { lastFrame } = render(
    React.createElement(TaskResultView, {
      result: {
        taskId: "t1",
        description: "Run tests",
        status: "completed",
        exitCode: 0,
        outputPreview: "All tests passed",
      },
    }),
  );
  const frame = lastFrame();
  expect(frame).toContain("Run tests");
  expect(frame).toContain("All tests passed");
  expect(frame).not.toContain('"outputPreview"');
});

test("AgentResultView renders completed agent", () => {
  const { lastFrame } = render(
    React.createElement(AgentResultView, {
      result: {
        agentId: "a1",
        actualSubagentType: "coder",
        status: "completed",
        summary: "agent_id: a1\nstatus: completed\n\nRefactored the module.",
      },
    }),
  );
  const frame = lastFrame();
  expect(frame).toContain("a1");
  expect(frame).toContain("coder");
  expect(frame).toContain("Refactored the module.");
  expect(frame).not.toContain('"actualSubagentType"');
});

test("AgentResultView renders swarm results", () => {
  const { lastFrame } = render(
    React.createElement(AgentResultView, {
      result: {
        summary: "completed: 1, failed: 1, aborted: 0",
        results: [
          { agentId: "a1", item: "src/a.ts", outcome: "completed" },
          { agentId: "a2", item: "src/b.ts", outcome: "failed", summary: "Timeout" },
        ],
      },
    }),
  );
  const frame = lastFrame();
  expect(frame).toContain("completed: 1, failed: 1, aborted: 0");
  expect(frame).toContain("src/a.ts");
  expect(frame).toContain("Timeout");
  expect(frame).not.toContain('"outcome"');
});
