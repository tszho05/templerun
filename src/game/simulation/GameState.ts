import type { ChaseState } from "../chase/ChaseState";
import type { PresentedQuestion, AnswerResultStatus } from "../questions/QuestionTypes";
import type { RunnerState } from "../runner/RunnerState";
import type { ScoreState } from "../score/ScoreState";
import type { Obstacle, TrackSegment } from "../track/Obstacle";

export type GameMode = "booting" | "running" | "question" | "feedback" | "gameOver";

export type FeedbackState = {
  status: AnswerResultStatus;
  correctAnswer: string;
  selectedChoice: string | null;
  endsAtMs: number;
  nextMode: "running" | "gameOver";
};

export type GameState = {
  mode: GameMode;
  nowMs: number;
  distanceMeters: number;
  speed: number;
  nextQuestionAtMeters: number;
  runner: RunnerState;
  obstacles: Obstacle[];
  trackSegments: TrackSegment[];
  currentQuestion: PresentedQuestion | null;
  feedback: FeedbackState | null;
  chase: ChaseState;
  score: ScoreState;
};
