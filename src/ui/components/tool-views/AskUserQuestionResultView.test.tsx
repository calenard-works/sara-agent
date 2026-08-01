import { render } from "ink-testing-library";
import React from "react";
import { expect, test } from "vitest";

import { AskUserQuestionResultView } from "./AskUserQuestionResultView";

test("AskUserQuestionResultView renders Q/A pairs without raw JSON", () => {
  const result = {
    answers: {
      "What color do you prefer?": "Blue",
      "Confirm the deployment?": "Yes",
    },
  };

  const { lastFrame } = render(
    React.createElement(AskUserQuestionResultView, { result }),
  );

  const frame = lastFrame();
  expect(frame).toContain("Q: What color do you prefer?");
  expect(frame).toContain("A: Blue");
  expect(frame).toContain("Q: Confirm the deployment?");
  expect(frame).toContain("A: Yes");
  expect(frame).not.toContain('"answers"');
  expect(frame).not.toContain('"What color do you prefer?"');
});

test("AskUserQuestionResultView renders placeholder when no answers", () => {
  const { lastFrame } = render(
    React.createElement(AskUserQuestionResultView, { result: { answers: {} } }),
  );

  expect(lastFrame()).toContain("No answers collected");
});
