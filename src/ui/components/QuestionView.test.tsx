import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import { QuestionView } from "./QuestionView";
import type { NewQuestionEvent } from "../../permissions/questionRequest";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function makeEvent(
  questions: NewQuestionEvent["questions"],
  background = false,
): NewQuestionEvent {
  return { id: "test-q", questions, background };
}

describe("QuestionView", () => {
  it("renders the question with tabs and options", () => {
    const event = makeEvent([
      {
        question: "Pick a language?",
        header: "Language",
        options: [
          { label: "TypeScript", description: "statically typed" },
          { label: "Python" },
        ],
      },
    ]);
    const { lastFrame } = render(
      <QuestionView questionEvent={event} onAnswer={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(lastFrame()).toContain("Language");
    expect(lastFrame()).toContain("TypeScript");
    expect(lastFrame()).toContain("Python");
    expect(lastFrame()).toContain("Submit");
    expect(lastFrame()).toContain("statically typed");
  });

  it("selects an option, reviews it on the Submit tab, and answers on Enter", async () => {
    const event = makeEvent([
      { question: "Pick a language?", options: [{ label: "TypeScript" }, { label: "Python" }] },
    ]);
    const onAnswer = vi.fn();
    const { stdin, lastFrame } = render(
      <QuestionView questionEvent={event} onAnswer={onAnswer} onCancel={vi.fn()} />,
    );
    await sleep(20);

    // Enter chooses the first option (cursor starts at 0) and auto-advances
    stdin.write("\r");
    await sleep(50);

    expect(lastFrame()).toContain("Review your answer before submit");
    expect(lastFrame()).toContain("TypeScript");

    // Enter confirms on the Submit tab
    stdin.write("\r");
    await sleep(50);

    expect(onAnswer).toHaveBeenCalledWith("test-q", {
      "Pick a language?": "TypeScript",
    });
  });

  it("switches between tabs and collects answers for all questions", async () => {
    const event = makeEvent([
      { question: "Q1?", options: [{ label: "A1" }, { label: "A2" }] },
      { question: "Q2?", options: [{ label: "B1" }, { label: "B2" }] },
    ]);
    const onAnswer = vi.fn();
    const { stdin, lastFrame } = render(
      <QuestionView questionEvent={event} onAnswer={onAnswer} onCancel={vi.fn()} />,
    );
    await sleep(20);

    // Q1: move down to A2 and choose it — auto-advances to Q2
    stdin.write("\u001b[B");
    stdin.write("\r");
    await sleep(50);
    expect(lastFrame()).toContain("Q2?");

    // Q2: Enter chooses B1 (cursor 0) — auto-advances to Submit
    stdin.write("\r");
    await sleep(50);
    expect(lastFrame()).toContain("Review your answer before submit");

    // Confirm
    stdin.write("\r");
    await sleep(50);
    expect(onAnswer).toHaveBeenCalledWith("test-q", { "Q1?": "A2", "Q2?": "B1" });
  });

  it("supports typing a custom answer via the Other option", async () => {
    const event = makeEvent([
      { question: "Color?", options: [{ label: "Red" }, { label: "Blue" }] },
    ]);
    const onAnswer = vi.fn();
    const { stdin, lastFrame } = render(
      <QuestionView questionEvent={event} onAnswer={onAnswer} onCancel={vi.fn()} />,
    );
    await sleep(20);

    // Move down twice to reach Other, then Enter to start typing
    stdin.write("\u001b[B");
    stdin.write("\u001b[B");
    stdin.write("\r");
    await sleep(50);

    // Type the custom answer and save it
    stdin.write("Green");
    stdin.write("\r");
    await sleep(50);

    // Single-select auto-advances to Submit; the review shows the custom value
    expect(lastFrame()).toContain("Review your answer before submit");
    expect(lastFrame()).toContain("Green");

    stdin.write("\r");
    await sleep(50);
    expect(onAnswer).toHaveBeenCalledWith("test-q", { "Color?": "Green" });
  });

  it("toggles multiple options with space and answers joined", async () => {
    const event = makeEvent([
      {
        question: "Pick?",
        multi_select: true,
        options: [{ label: "X" }, { label: "Y" }],
      },
    ]);
    const onAnswer = vi.fn();
    const { stdin, lastFrame } = render(
      <QuestionView questionEvent={event} onAnswer={onAnswer} onCancel={vi.fn()} />,
    );
    await sleep(20);

    // Toggle X (cursor 0), move to Y, toggle Y
    stdin.write(" ");
    await sleep(30);
    stdin.write("\u001b[B");
    stdin.write(" ");
    await sleep(30);

    // Go to the Submit tab and confirm
    stdin.write("\u001b[C");
    await sleep(30);
    expect(lastFrame()).toContain("Review your answer before submit");

    stdin.write("\r");
    await sleep(50);
    expect(onAnswer).toHaveBeenCalledWith("test-q", { "Pick?": "X, Y" });
  });

  it("cancels the dialog on escape", async () => {
    const event = makeEvent([
      { question: "Q?", options: [{ label: "A" }, { label: "B" }] },
    ]);
    const onCancel = vi.fn();
    const { stdin } = render(
      <QuestionView questionEvent={event} onAnswer={vi.fn()} onCancel={onCancel} />,
    );
    await sleep(20);

    stdin.write("\u001b");
    await sleep(50);
    expect(onCancel).toHaveBeenCalledWith("test-q");
  });
});
