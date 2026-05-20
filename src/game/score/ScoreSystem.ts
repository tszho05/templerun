import type { AnswerResult } from "../questions/QuestionTypes";
import type { ScoreState } from "./ScoreState";

export function createInitialScoreState(highDistance: number): ScoreState {
  return {
    correctAnswers: 0,
    totalQuestions: 0,
    accuracy: 0,
    currentDistance: 0,
    highDistance: Math.max(0, highDistance)
  };
}

export function syncScoreDistance(score: ScoreState, distanceMeters: number): ScoreState {
  return {
    ...score,
    currentDistance: Math.max(0, distanceMeters)
  };
}

export function applyAnswerToScore(score: ScoreState, result: AnswerResult): ScoreState {
  const correctAnswers = score.correctAnswers + (result.status === "correct" ? 1 : 0);
  const totalQuestions = score.totalQuestions + 1;

  return {
    ...score,
    correctAnswers,
    totalQuestions,
    accuracy: correctAnswers / totalQuestions
  };
}

export type HighDistanceSaveRequest = {
  highDistance: number;
} | null;

export function finalizeScore(score: ScoreState): {
  score: ScoreState;
  saveRequest: HighDistanceSaveRequest;
} {
  if (score.currentDistance <= score.highDistance) {
    return { score, saveRequest: null };
  }

  return {
    score: {
      ...score,
      highDistance: score.currentDistance
    },
    saveRequest: { highDistance: score.currentDistance }
  };
}
