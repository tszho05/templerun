export type LaneIndex = 0 | 1 | 2;

export type RunnerMovementState = "running" | "jumping";

export type RunnerState = {
  laneIndex: LaneIndex;
  movementState: RunnerMovementState;
  movementEndsAtMs: number | null;
  isSlowed: boolean;
};
