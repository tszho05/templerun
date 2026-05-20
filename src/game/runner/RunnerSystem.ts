import type { PlayerAction } from "../input/PlayerAction";
import type { GameConfig } from "../simulation/GameConfig";
import type { LaneIndex, RunnerState } from "./RunnerState";

export function createInitialRunnerState(): RunnerState {
  return {
    laneIndex: 1,
    movementState: "running",
    movementEndsAtMs: null,
    isSlowed: false
  };
}

export function applyRunnerAction(
  runner: RunnerState,
  action: PlayerAction,
  nowMs: number,
  config: GameConfig
): RunnerState {
  switch (action.type) {
    case "moveLeft":
      return { ...runner, laneIndex: clampLane(runner.laneIndex - 1) };
    case "moveRight":
      return { ...runner, laneIndex: clampLane(runner.laneIndex + 1) };
    case "jump":
      if (runner.movementState !== "running") {
        return runner;
      }
      return {
        ...runner,
        movementState: "jumping",
        movementEndsAtMs: nowMs + config.jumpDurationMs
      };
    default:
      return runner;
  }
}

export function updateRunnerMovement(runner: RunnerState, nowMs: number): RunnerState {
  if (runner.movementEndsAtMs === null || nowMs < runner.movementEndsAtMs) {
    return runner;
  }

  return {
    ...runner,
    movementState: "running",
    movementEndsAtMs: null
  };
}

export function setRunnerSlowed(runner: RunnerState, isSlowed: boolean): RunnerState {
  return { ...runner, isSlowed };
}

function clampLane(lane: number): LaneIndex {
  if (lane <= 0) {
    return 0;
  }
  if (lane >= 2) {
    return 2;
  }
  return 1;
}
