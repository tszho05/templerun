import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../shared/random";
import { defaultGameConfig } from "./GameConfig";
import { SimulationCore } from "./SimulationCore";
import type { PresentedQuestion, QuestionSet } from "../questions/QuestionTypes";

const questionSet: QuestionSet = {
  vocabularyPool: ["歡騰", "娓娓道來", "無言以對", "激憤"],
  questions: [
    { id: "q001", sentence: "大家一起____。", answer: "歡騰" },
    { id: "q002", sentence: "他把事情____。", answer: "娓娓道來" },
    { id: "q003", sentence: "他____。", answer: "無言以對" }
  ]
};

const simulationTestConfig = {
  ...defaultGameConfig,
  obstacleSpawnBaseInterval: 9999,
  obstacleSpawnMinInterval: 9999,
  obstaclePressurePenalty: 0,
  chasePressureMax: 100000
};

describe("SimulationCore", () => {
  it("updates distance while running and freezes during questions", () => {
    const simulation = new SimulationCore(questionSet, {
      config: simulationTestConfig,
      random: createSeededRandom(2)
    });
    simulation.start();
    simulation.tick(1000);

    const runningDistance = simulation.getSnapshot().distanceMeters;
    expect(runningDistance).toBeGreaterThan(0);

    while (simulation.getSnapshot().mode !== "question") {
      simulation.tick(100);
    }

    const questionDistance = simulation.getSnapshot().distanceMeters;
    simulation.tick(1000);
    expect(simulation.getSnapshot().distanceMeters).toBe(questionDistance);
  });

  it("enters question mode at 150m and resumes after feedback", () => {
    const simulation = new SimulationCore(questionSet, {
      config: simulationTestConfig,
      random: createSeededRandom(5)
    });
    simulation.start();

    while (simulation.getSnapshot().mode !== "question") {
      simulation.tick(100);
    }

    const question = simulation.getSnapshot().currentQuestion;
    expect(question).not.toBeNull();

    simulation.dispatch({ type: "answer", choice: question?.answer ?? "" });
    expect(simulation.getSnapshot().mode).toBe("feedback");

    advance(simulation, 1200);
    expect(simulation.getSnapshot().mode).toBe("running");
  });

  it("shows feedback and then game over after a second unresolved wrong answer", () => {
    const simulation = new SimulationCore(questionSet, {
      config: simulationTestConfig,
      random: createSeededRandom(4)
    });
    simulation.start();

    answerNextQuestionWrong(simulation);
    advance(simulation, 1200);
    expect(simulation.getSnapshot().mode).toBe("running");
    expect(simulation.getSnapshot().chase.isInWrongAnswerDanger).toBe(true);

    answerNextQuestionWrong(simulation);
    expect(simulation.getSnapshot().mode).toBe("feedback");
    advance(simulation, 1200);
    expect(simulation.getSnapshot().mode).toBe("gameOver");
  });

  it("keeps speed and run animation normal after a wrong answer", () => {
    const simulation = new SimulationCore(questionSet, {
      config: simulationTestConfig,
      random: createSeededRandom(8)
    });
    simulation.start();

    const question = presentNextQuestion(simulation);
    const speedBeforeAnswer = simulation.getSnapshot().speed;
    const wrongChoice = question.choices.find((choice) => choice !== question.answer) ?? "";

    simulation.dispatch({ type: "answer", choice: wrongChoice });

    const snapshot = simulation.getSnapshot();
    expect(snapshot.mode).toBe("feedback");
    expect(snapshot.speed).toBe(speedBeforeAnswer);
    expect(snapshot.runner.isSlowed).toBe(false);
    expect(snapshot.chase.speedModifier).toBe(1);
    expect(snapshot.chase.isInWrongAnswerDanger).toBe(true);
  });

  it("keeps speed and run animation normal after a timeout", () => {
    const simulation = new SimulationCore(questionSet, {
      config: simulationTestConfig,
      random: createSeededRandom(9)
    });
    simulation.start();

    presentNextQuestion(simulation);
    const speedBeforeTimeout = simulation.getSnapshot().speed;

    advance(simulation, simulationTestConfig.answerTimeLimitSeconds * 1000);

    const snapshot = simulation.getSnapshot();
    expect(snapshot.mode).toBe("feedback");
    expect(snapshot.feedback?.status).toBe("timeout");
    expect(snapshot.speed).toBe(speedBeforeTimeout);
    expect(snapshot.runner.isSlowed).toBe(false);
    expect(snapshot.chase.speedModifier).toBe(1);
    expect(snapshot.chase.isInWrongAnswerDanger).toBe(true);
  });

  it("keeps speed and run animation normal after an obstacle hit", () => {
    const obstacleConfig = {
      ...simulationTestConfig,
      obstaclePressurePenalty: 25
    };
    const simulation = new SimulationCore(questionSet, {
      config: obstacleConfig,
      random: createSequenceRandom([0.99, 0.99, 0.1, 0])
    });
    simulation.start();

    let speedBeforeHit = simulation.getSnapshot().speed;
    let obstacleHit = false;

    for (let tickCount = 0; tickCount < 400 && !obstacleHit; tickCount += 1) {
      speedBeforeHit = simulation.getSnapshot().speed;
      simulation.tick(100);
      obstacleHit = simulation.consumeEvents().some((event) => event.type === "obstacleHit");
    }

    const snapshot = simulation.getSnapshot();
    expect(obstacleHit).toBe(true);
    expect(snapshot.chase.pressure).toBe(obstacleConfig.obstaclePressurePenalty);
    expect(snapshot.speed).toBeGreaterThanOrEqual(speedBeforeHit);
    expect(snapshot.runner.isSlowed).toBe(false);
    expect(snapshot.chase.speedModifier).toBe(1);
  });

  it("restarts while preserving the high distance", () => {
    const simulation = new SimulationCore(questionSet, {
      config: simulationTestConfig,
      highDistance: 300,
      random: createSeededRandom(7)
    });
    simulation.start();
    simulation.restart();

    expect(simulation.getSnapshot().mode).toBe("running");
    expect(simulation.getSnapshot().score.highDistance).toBe(300);
    expect(simulation.getSnapshot().distanceMeters).toBe(0);
  });
});

function answerNextQuestionWrong(simulation: SimulationCore): void {
  const question = presentNextQuestion(simulation);
  const wrongChoice = question?.choices.find((choice) => choice !== question.answer) ?? "";
  simulation.dispatch({ type: "answer", choice: wrongChoice });
}

function presentNextQuestion(simulation: SimulationCore): PresentedQuestion {
  while (simulation.getSnapshot().mode !== "question") {
    simulation.tick(100);
  }

  const question = simulation.getSnapshot().currentQuestion;
  if (!question) {
    throw new Error("Expected a presented question.");
  }
  return question;
}

function advance(simulation: SimulationCore, durationMs: number): void {
  for (let elapsed = 0; elapsed < durationMs; elapsed += 100) {
    simulation.tick(100);
  }
}

function createSequenceRandom(values: readonly number[], fallback = 0.99) {
  let index = 0;

  return () => values[index++] ?? fallback;
}
