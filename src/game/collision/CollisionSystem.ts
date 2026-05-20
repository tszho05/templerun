import type { RunnerState } from "../runner/RunnerState";
import type { Obstacle } from "../track/Obstacle";

export type CollisionResult = {
  hitObstacleIds: string[];
};

export function checkObstacleCollisions(
  runner: RunnerState,
  obstacles: readonly Obstacle[],
  distanceMeters: number,
  collisionWindowMeters: number
): CollisionResult {
  const hitObstacleIds = obstacles
    .filter((obstacle) => shouldHitObstacle(runner, obstacle, distanceMeters, collisionWindowMeters))
    .map((obstacle) => obstacle.id);

  return { hitObstacleIds };
}

function shouldHitObstacle(
  runner: RunnerState,
  obstacle: Obstacle,
  distanceMeters: number,
  collisionWindowMeters: number
): boolean {
  if (obstacle.hasHit || obstacle.laneIndex !== runner.laneIndex) {
    return false;
  }

  if (Math.abs(obstacle.distanceMeters - distanceMeters) > collisionWindowMeters) {
    return false;
  }

  if (obstacle.type === "blocker") {
    return true;
  }

  if (obstacle.type === "low") {
    return runner.movementState !== "jumping";
  }

  return false;
}
