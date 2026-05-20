import { describe, expect, it } from "vitest";
import { defaultGameConfig } from "../simulation/GameConfig";
import {
  applyRunnerAction,
  createInitialRunnerState,
  updateRunnerMovement
} from "./RunnerSystem";

describe("RunnerSystem", () => {
  it("keeps lane movement inside the three lanes", () => {
    let runner = createInitialRunnerState();

    runner = applyRunnerAction(runner, { type: "moveLeft" }, 0, defaultGameConfig);
    runner = applyRunnerAction(runner, { type: "moveLeft" }, 0, defaultGameConfig);
    expect(runner.laneIndex).toBe(0);

    runner = applyRunnerAction(runner, { type: "moveRight" }, 0, defaultGameConfig);
    runner = applyRunnerAction(runner, { type: "moveRight" }, 0, defaultGameConfig);
    runner = applyRunnerAction(runner, { type: "moveRight" }, 0, defaultGameConfig);
    expect(runner.laneIndex).toBe(2);
  });

  it("returns jump state to running after its duration", () => {
    const jumping = applyRunnerAction(
      createInitialRunnerState(),
      { type: "jump" },
      1000,
      defaultGameConfig
    );

    expect(jumping.movementState).toBe("jumping");
    expect(updateRunnerMovement(jumping, 1000 + defaultGameConfig.jumpDurationMs - 1).movementState).toBe(
      "jumping"
    );
    expect(updateRunnerMovement(jumping, 1000 + defaultGameConfig.jumpDurationMs).movementState).toBe(
      "running"
    );
  });
});
