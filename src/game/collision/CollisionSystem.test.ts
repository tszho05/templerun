import { describe, expect, it } from "vitest";
import type { RunnerState } from "../runner/RunnerState";
import type { Obstacle } from "../track/Obstacle";
import { checkObstacleCollisions } from "./CollisionSystem";

const baseRunner: RunnerState = {
  laneIndex: 1,
  movementState: "running",
  movementEndsAtMs: null,
  isSlowed: false
};

describe("CollisionSystem", () => {
  it("ignores obstacles in other lanes and obstacles already hit", () => {
    const obstacles: Obstacle[] = [
      { id: "other-lane", laneIndex: 0, distanceMeters: 10, type: "blocker", hasHit: false },
      { id: "already-hit", laneIndex: 1, distanceMeters: 10, type: "blocker", hasHit: true }
    ];

    expect(checkObstacleCollisions(baseRunner, obstacles, 10, 2).hitObstacleIds).toEqual([]);
  });

  it("handles blocker and low obstacle rules", () => {
    const blocker: Obstacle = {
      id: "blocker",
      laneIndex: 1,
      distanceMeters: 10,
      type: "blocker",
      hasHit: false
    };
    const low: Obstacle = { ...blocker, id: "low", type: "low" };

    expect(checkObstacleCollisions(baseRunner, [blocker], 10, 2).hitObstacleIds).toEqual(["blocker"]);
    expect(checkObstacleCollisions(baseRunner, [low], 10, 2).hitObstacleIds).toEqual(["low"]);
    expect(
      checkObstacleCollisions({ ...baseRunner, movementState: "jumping" }, [low], 10, 2)
        .hitObstacleIds
    ).toEqual([]);
  });
});
