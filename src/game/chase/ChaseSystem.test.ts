import { describe, expect, it } from "vitest";
import { defaultGameConfig } from "../simulation/GameConfig";
import {
  applyAnswerToChase,
  applyObstacleHitToChase,
  createInitialChaseState
} from "./ChaseSystem";

describe("ChaseSystem", () => {
  it("enters danger on first wrong answer and resets on correct answer", () => {
    const wrong = applyAnswerToChase(
      createInitialChaseState(),
      { status: "wrong", questionId: "q1", answer: "歡騰", selectedChoice: "激憤" },
      defaultGameConfig
    );

    expect(wrong.isGameOver).toBe(false);
    expect(wrong.chase.isInWrongAnswerDanger).toBe(true);
    expect(wrong.chase.monsterDistanceLevel).toBe("near");
    expect(wrong.chase.speedModifier).toBe(1);

    const correct = applyAnswerToChase(
      wrong.chase,
      { status: "correct", questionId: "q2", answer: "歡騰", selectedChoice: "歡騰" },
      defaultGameConfig
    );

    expect(correct.chase.isInWrongAnswerDanger).toBe(false);
    expect(correct.chase.speedModifier).toBe(1);
  });

  it("ends the game on a second wrong answer before danger is reset", () => {
    const firstWrong = applyAnswerToChase(
      createInitialChaseState(),
      { status: "timeout", questionId: "q1", answer: "歡騰", selectedChoice: null },
      defaultGameConfig
    );
    const secondWrong = applyAnswerToChase(
      firstWrong.chase,
      { status: "wrong", questionId: "q2", answer: "歡騰", selectedChoice: "激憤" },
      defaultGameConfig
    );

    expect(firstWrong.chase.speedModifier).toBe(1);
    expect(secondWrong.isGameOver).toBe(true);
    expect(secondWrong.chase.monsterDistanceLevel).toBe("caught");
    expect(secondWrong.chase.speedModifier).toBe(1);
  });

  it("adds obstacle pressure and ends the game when pressure is full", () => {
    let chase = createInitialChaseState();

    for (let index = 0; index < 3; index += 1) {
      chase = applyObstacleHitToChase(chase, defaultGameConfig).chase;
      expect(chase.speedModifier).toBe(1);
    }

    const final = applyObstacleHitToChase(chase, defaultGameConfig);

    expect(final.isGameOver).toBe(true);
    expect(final.chase.pressure).toBe(defaultGameConfig.chasePressureMax);
    expect(final.chase.speedModifier).toBe(1);
  });
});
