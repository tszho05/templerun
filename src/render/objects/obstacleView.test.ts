import { describe, expect, it } from "vitest";
import { selectObstacleImagePath, type ObstacleImagePaths } from "./obstacleView";

describe("obstacle image selection", () => {
  const imagePaths: ObstacleImagePaths = {
    blocker: ["blocker.png", "blocker-desks.png", "blocker-cleaning-cart.png"],
    low: ["low.png", "low-skip-rope.png"]
  };

  it("keeps image selection stable for the same obstacle id", () => {
    const obstacle = { id: "obstacle-42", type: "blocker" as const };

    expect(selectObstacleImagePath(obstacle, imagePaths)).toBe(
      selectObstacleImagePath(obstacle, imagePaths)
    );
  });

  it("spreads visual variants across obstacle ids", () => {
    const selectedPaths = Array.from({ length: 9 }, (_, index) =>
      selectObstacleImagePath({ id: `obstacle-${index}`, type: "blocker" }, imagePaths)
    );

    expect(new Set(selectedPaths).size).toBeGreaterThan(1);
    expect(selectedPaths.every((path) => imagePaths.blocker?.includes(path ?? ""))).toBe(true);
  });

  it("returns undefined when a type has no image paths", () => {
    expect(
      selectObstacleImagePath({ id: "obstacle-1", type: "low" }, { blocker: ["blocker.png"] })
    ).toBeUndefined();
  });
});
