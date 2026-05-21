import { applyObstacleHitToChase, applyAnswerToChase, createInitialChaseState, recoverChase } from "../chase/ChaseSystem";
import type { HighDistanceSaveRequest } from "../score/ScoreSystem";
import { applyAnswerToScore, createInitialScoreState, finalizeScore, syncScoreDistance } from "../score/ScoreSystem";
import { checkObstacleCollisions } from "../collision/CollisionSystem";
import type { PlayerAction } from "../input/PlayerAction";
import { QuestionSystem } from "../questions/QuestionSystem";
import type { AnswerResult, QuestionSet } from "../questions/QuestionTypes";
import { applyRunnerAction, createInitialRunnerState, setRunnerSlowed, updateRunnerMovement } from "../runner/RunnerSystem";
import { createSeededRandom, type RandomSource } from "../shared/random";
import {
  clearObstacleSafetyBuffer,
  createInitialTrackState,
  markObstacleHit,
  type TrackState,
  updateTrackState
} from "../track/TrackSystem";
import type { GameConfig } from "./GameConfig";
import { defaultGameConfig } from "./GameConfig";
import type { FeedbackState, GameState } from "./GameState";

export type GameEvent =
  | { type: "questionTriggered"; questionId: string }
  | { type: "answerCorrect"; questionId: string }
  | { type: "answerWrong"; questionId: string }
  | { type: "answerTimeout"; questionId: string }
  | { type: "obstacleHit"; obstacleId: string }
  | { type: "gameOver"; reason: "secondWrongAnswer" | "chasePressure" };

export type SimulationOptions = {
  config?: GameConfig;
  highDistance?: number;
  random?: RandomSource;
};

const FEEDBACK_DURATION_MS = 1200;
const POST_QUESTION_SAFE_SECONDS = 2;

export class SimulationCore {
  private readonly config: GameConfig;
  private readonly questionSystem: QuestionSystem;
  private readonly random: RandomSource;
  private track: TrackState;
  private state: GameState;
  private events: GameEvent[];
  private highDistanceSaveRequest: HighDistanceSaveRequest;

  constructor(questionSet: QuestionSet, options: SimulationOptions = {}) {
    this.config = options.config ?? defaultGameConfig;
    this.random = options.random ?? createSeededRandom(Date.now());
    this.questionSystem = new QuestionSystem(questionSet, this.random);
    this.track = createInitialTrackState();
    this.state = createInitialGameState(this.config, options.highDistance ?? 0);
    this.events = [];
    this.highDistanceSaveRequest = null;
  }

  start(): void {
    if (this.state.mode === "booting") {
      this.state = { ...this.state, mode: "running" };
    }
  }

  restart(highDistance = this.state.score.highDistance): void {
    this.questionSystem.reset();
    this.track = createInitialTrackState();
    this.state = { ...createInitialGameState(this.config, highDistance), mode: "running" };
    this.events = [];
    this.highDistanceSaveRequest = null;
  }

  tick(deltaMs: number): void {
    const safeDeltaMs = Math.max(0, Math.min(deltaMs, 100));
    this.state = { ...this.state, nowMs: this.state.nowMs + safeDeltaMs };

    if (this.state.mode === "running") {
      this.tickRunning(safeDeltaMs);
      return;
    }

    if (this.state.mode === "question") {
      this.tickQuestion();
      return;
    }

    if (this.state.mode === "feedback") {
      this.tickFeedback();
    }
  }

  dispatch(action: PlayerAction): void {
    if (this.state.mode === "running") {
      if (
        action.type === "moveLeft" ||
        action.type === "moveRight" ||
        action.type === "jump"
      ) {
        this.state = {
          ...this.state,
          runner: applyRunnerAction(this.state.runner, action, this.state.nowMs, this.config)
        };
      }
      return;
    }

    if (this.state.mode === "question" && action.type === "answer" && this.state.currentQuestion) {
      this.applyAnswerResult(this.questionSystem.answerQuestion(this.state.currentQuestion, action.choice));
      return;
    }

    if (this.state.mode === "gameOver" && action.type === "restart") {
      this.restart(this.state.score.highDistance);
    }
  }

  getSnapshot(): Readonly<GameState> {
    return this.state;
  }

  consumeEvents(): GameEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  consumeHighDistanceSaveRequest(): HighDistanceSaveRequest {
    const request = this.highDistanceSaveRequest;
    this.highDistanceSaveRequest = null;
    return request;
  }

  private tickRunning(deltaMs: number): void {
    const recoveredChase = recoverChase(this.state.chase, deltaMs);
    const nowMs = this.state.nowMs;
    const dtSeconds = deltaMs / 1000;
    const targetSpeed = this.getTargetSpeed(recoveredChase.speedModifier);
    const speed = approach(this.state.speed, targetSpeed, this.config.speedRecoveryRate * dtSeconds);
    const distanceMeters = this.state.distanceMeters + speed * dtSeconds;

    this.state = {
      ...this.state,
      chase: recoveredChase,
      speed,
      distanceMeters,
      runner: updateRunnerMovement(
        setRunnerSlowed(this.state.runner, recoveredChase.speedModifier < 1),
        nowMs
      )
    };

    this.track = updateTrackState(this.track, distanceMeters, this.config, this.random);
    this.state = {
      ...this.state,
      obstacles: this.track.obstacles,
      trackSegments: this.track.segments,
      score: syncScoreDistance(this.state.score, distanceMeters)
    };

    this.applyCollisions();

    if (
      this.state.mode === "running" &&
      this.questionSystem.shouldTriggerQuestion(distanceMeters, this.state.nextQuestionAtMeters)
    ) {
      const currentQuestion = this.questionSystem.presentQuestion(nowMs, this.config);
      this.track = clearObstacleSafetyBuffer(
        this.track,
        distanceMeters,
        speed * POST_QUESTION_SAFE_SECONDS
      );
      this.events.push({ type: "questionTriggered", questionId: currentQuestion.id });
      this.state = {
        ...this.state,
        mode: "question",
        currentQuestion,
        obstacles: this.track.obstacles
      };
    }
  }

  private tickQuestion(): void {
    if (!this.state.currentQuestion) {
      return;
    }

    if (this.questionSystem.isTimedOut(this.state.currentQuestion, this.state.nowMs)) {
      this.applyAnswerResult(this.questionSystem.getTimeoutResult(this.state.currentQuestion));
    }
  }

  private tickFeedback(): void {
    if (!this.state.feedback || this.state.nowMs < this.state.feedback.endsAtMs) {
      return;
    }

    if (this.state.feedback.nextMode === "gameOver") {
      this.enterGameOver("secondWrongAnswer");
      return;
    }

    this.state = {
      ...this.state,
      mode: "running",
      feedback: null
    };
  }

  private applyCollisions(): void {
    const result = checkObstacleCollisions(
      this.state.runner,
      this.track.obstacles,
      this.state.distanceMeters,
      this.config.collisionWindowMeters
    );

    for (const obstacleId of result.hitObstacleIds) {
      this.events.push({ type: "obstacleHit", obstacleId });
      this.track = markObstacleHit(this.track, obstacleId);
      const chaseResult = applyObstacleHitToChase(this.state.chase, this.config);
      this.state = {
        ...this.state,
        chase: chaseResult.chase,
        obstacles: this.track.obstacles
      };

      if (chaseResult.isGameOver) {
        this.enterGameOver("chasePressure");
        return;
      }
    }
  }

  private applyAnswerResult(result: AnswerResult): void {
    const chaseResult = applyAnswerToChase(this.state.chase, result, this.config);
    const feedback = createFeedbackState(
      result,
      this.state.nowMs,
      chaseResult.isGameOver ? "gameOver" : "running"
    );

    if (result.status === "correct") {
      this.events.push({ type: "answerCorrect", questionId: result.questionId });
    } else if (result.status === "timeout") {
      this.events.push({ type: "answerTimeout", questionId: result.questionId });
    } else {
      this.events.push({ type: "answerWrong", questionId: result.questionId });
    }

    this.state = {
      ...this.state,
      mode: "feedback",
      currentQuestion: null,
      feedback,
      chase: chaseResult.chase,
      speed: this.state.speed,
      runner: setRunnerSlowed(this.state.runner, false),
      nextQuestionAtMeters: this.state.nextQuestionAtMeters + this.config.questionIntervalMeters,
      score: applyAnswerToScore(this.state.score, result)
    };
  }

  private enterGameOver(reason: "secondWrongAnswer" | "chasePressure"): void {
    const finalized = finalizeScore(this.state.score);
    this.highDistanceSaveRequest = finalized.saveRequest;
    this.events.push({ type: "gameOver", reason });
    this.state = {
      ...this.state,
      mode: "gameOver",
      score: finalized.score,
      feedback: null,
      currentQuestion: null
    };
  }

  private getTargetSpeed(speedModifier: number): number {
    const distanceRamp = Math.min(
      this.config.maxSpeed - this.config.baseSpeed,
      (this.state.distanceMeters / this.config.difficultyRampDistance) *
        (this.config.maxSpeed - this.config.baseSpeed)
    );
    return (this.config.baseSpeed + distanceRamp) * speedModifier;
  }
}

export function createInitialGameState(config: GameConfig, highDistance: number): GameState {
  const track = createInitialTrackState();

  return {
    mode: "booting",
    nowMs: 0,
    distanceMeters: 0,
    speed: config.baseSpeed,
    nextQuestionAtMeters: config.questionIntervalMeters,
    runner: createInitialRunnerState(),
    obstacles: track.obstacles,
    trackSegments: track.segments,
    currentQuestion: null,
    feedback: null,
    chase: createInitialChaseState(),
    score: createInitialScoreState(highDistance)
  };
}

function createFeedbackState(
  result: AnswerResult,
  nowMs: number,
  nextMode: FeedbackState["nextMode"]
): FeedbackState {
  return {
    status: result.status,
    correctAnswer: result.answer,
    selectedChoice: result.selectedChoice,
    endsAtMs: nowMs + FEEDBACK_DURATION_MS,
    nextMode
  };
}

function approach(current: number, target: number, step: number): number {
  if (current < target) {
    return Math.min(target, current + step);
  }
  if (current > target) {
    return Math.max(target, current - step);
  }
  return current;
}
