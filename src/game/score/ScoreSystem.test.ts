import { describe, expect, it } from "vitest";
import {
  applyAnswerToScore,
  createInitialScoreState,
  finalizeScore,
  syncScoreDistance
} from "./ScoreSystem";

describe("ScoreSystem", () => {
  it("tracks total answers, correct answers, and safe zero accuracy", () => {
    let score = createInitialScoreState(0);
    expect(score.accuracy).toBe(0);

    score = applyAnswerToScore(score, {
      status: "wrong",
      questionId: "q1",
      answer: "歡騰",
      selectedChoice: "激憤"
    });
    score = applyAnswerToScore(score, {
      status: "correct",
      questionId: "q2",
      answer: "歡騰",
      selectedChoice: "歡騰"
    });

    expect(score.totalQuestions).toBe(2);
    expect(score.correctAnswers).toBe(1);
    expect(score.accuracy).toBe(0.5);
  });

  it("only requests high-distance saves for new records", () => {
    const noRecord = finalizeScore(syncScoreDistance(createInitialScoreState(200), 150));
    expect(noRecord.saveRequest).toBeNull();

    const record = finalizeScore(syncScoreDistance(createInitialScoreState(200), 250));
    expect(record.saveRequest?.highDistance).toBe(250);
    expect(record.score.highDistance).toBe(250);
  });
});
