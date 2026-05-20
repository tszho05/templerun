import type { AnswerResult } from "../questions/QuestionTypes";
import type { GameConfig } from "../simulation/GameConfig";
import type { ChaseState, MonsterDistanceLevel } from "./ChaseState";

export type ChaseUpdateResult = {
  chase: ChaseState;
  isGameOver: boolean;
};

export function createInitialChaseState(): ChaseState {
  return {
    isInWrongAnswerDanger: false,
    pressure: 0,
    monsterDistanceLevel: "far",
    speedModifier: 1
  };
}

export function applyAnswerToChase(
  chase: ChaseState,
  result: AnswerResult,
  config: GameConfig
): ChaseUpdateResult {
  if (result.status === "correct") {
    const pressure = chase.pressure;
    return {
      chase: {
        ...chase,
        isInWrongAnswerDanger: false,
        pressure,
        monsterDistanceLevel: getMonsterDistanceLevel(pressure, false, config),
        speedModifier: 1
      },
      isGameOver: false
    };
  }

  if (chase.isInWrongAnswerDanger) {
    return {
      chase: {
        ...chase,
        pressure: config.chasePressureMax,
        monsterDistanceLevel: "caught",
        speedModifier: 1
      },
      isGameOver: true
    };
  }

  const pressure = clampPressure(chase.pressure + config.wrongAnswerPressurePenalty, config);
  return {
    chase: {
      ...chase,
      isInWrongAnswerDanger: true,
      pressure,
      monsterDistanceLevel: getMonsterDistanceLevel(pressure, true, config),
      speedModifier: 1
    },
    isGameOver: false
  };
}

export function applyObstacleHitToChase(chase: ChaseState, config: GameConfig): ChaseUpdateResult {
  const pressure = clampPressure(chase.pressure + config.obstaclePressurePenalty, config);
  const isGameOver = pressure >= config.chasePressureMax;

  return {
    chase: {
      ...chase,
      pressure,
      monsterDistanceLevel: isGameOver
        ? "caught"
        : getMonsterDistanceLevel(pressure, chase.isInWrongAnswerDanger, config),
      speedModifier: 1
    },
    isGameOver
  };
}

export function recoverChase(chase: ChaseState, deltaMs: number): ChaseState {
  if (chase.isInWrongAnswerDanger || chase.speedModifier >= 1) {
    return chase;
  }

  return {
    ...chase,
    speedModifier: Math.min(1, chase.speedModifier + deltaMs / 2000)
  };
}

function clampPressure(pressure: number, config: GameConfig): number {
  return Math.min(config.chasePressureMax, Math.max(0, pressure));
}

function getMonsterDistanceLevel(
  pressure: number,
  isInWrongAnswerDanger: boolean,
  config: GameConfig
): MonsterDistanceLevel {
  if (pressure >= config.chasePressureMax) {
    return "caught";
  }
  if (isInWrongAnswerDanger || pressure >= config.chasePressureMax * 0.5) {
    return "near";
  }
  return "far";
}
