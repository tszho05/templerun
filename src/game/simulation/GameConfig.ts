export type GameConfig = {
  questionIntervalMeters: 150;
  answerTimeLimitSeconds: 10;
  choiceCount: 3;
  laneCount: 3;
  baseSpeed: number;
  maxSpeed: number;
  speedRecoveryRate: number;
  wrongAnswerSlowdownFactor: number;
  obstacleSpawnBaseInterval: number;
  obstacleSpawnMinInterval: number;
  difficultyRampDistance: number;
  collisionWindowMeters: number;
  jumpDurationMs: number;
  chasePressureMax: number;
  obstaclePressurePenalty: number;
  wrongAnswerPressurePenalty: number;
};

export const defaultGameConfig: GameConfig = {
  questionIntervalMeters: 150,
  answerTimeLimitSeconds: 10,
  choiceCount: 3,
  laneCount: 3,
  baseSpeed: 18,
  maxSpeed: 28,
  speedRecoveryRate: 3,
  wrongAnswerSlowdownFactor: 0.65,
  obstacleSpawnBaseInterval: 28,
  obstacleSpawnMinInterval: 13,
  difficultyRampDistance: 1200,
  collisionWindowMeters: 2,
  jumpDurationMs: 850,
  chasePressureMax: 100,
  obstaclePressurePenalty: 25,
  wrongAnswerPressurePenalty: 20
};
