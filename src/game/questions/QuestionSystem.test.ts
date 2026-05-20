import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../shared/random";
import { defaultGameConfig } from "../simulation/GameConfig";
import { QuestionSystem, validateQuestionSet } from "./QuestionSystem";
import type { QuestionSet } from "./QuestionTypes";

const questionSet: QuestionSet = {
  vocabularyPool: ["歡騰", "娓娓道來", "無言以對", "激憤"],
  questions: [
    { id: "q001", sentence: "大家一起____。", answer: "歡騰" },
    { id: "q002", sentence: "他把事情____。", answer: "娓娓道來" }
  ]
};

describe("QuestionSystem", () => {
  it("validates required question bank rules", () => {
    expect(validateQuestionSet(questionSet).ok).toBe(true);
    expect(validateQuestionSet({ ...questionSet, vocabularyPool: ["一", "二"] }).ok).toBe(false);
    expect(
      validateQuestionSet({
        ...questionSet,
        questions: [{ id: "bad", sentence: "沒有空格", answer: "歡騰" }]
      }).ok
    ).toBe(false);
  });

  it("creates three unique choices containing the answer", () => {
    const system = new QuestionSystem(questionSet, createSeededRandom(1));
    const question = system.presentQuestion(0, defaultGameConfig);

    expect(question.choices).toHaveLength(3);
    expect(new Set(question.choices).size).toBe(3);
    expect(question.choices).toContain(question.answer);
  });

  it("triggers every 150m, times out after 10 seconds, and reuses questions", () => {
    const system = new QuestionSystem(questionSet, createSeededRandom(3));

    expect(system.shouldTriggerQuestion(149.9, 150)).toBe(false);
    expect(system.shouldTriggerQuestion(150, 150)).toBe(true);

    const first = system.presentQuestion(1000, defaultGameConfig);
    expect(system.isTimedOut(first, 10999)).toBe(false);
    expect(system.isTimedOut(first, 11000)).toBe(true);
    expect(system.getTimeoutResult(first).status).toBe("timeout");

    const seenIds = new Set<string>();
    for (let index = 0; index < 5; index += 1) {
      seenIds.add(system.presentQuestion(index * 100, defaultGameConfig).id);
    }
    expect(seenIds.size).toBeGreaterThanOrEqual(2);
  });
});
