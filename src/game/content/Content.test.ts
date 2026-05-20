import { describe, expect, it } from "vitest";
import { loadGameContent } from "./Content";

describe("Content", () => {
  it("loads the MVP question bank and stable asset manifest keys", () => {
    const content = loadGameContent();

    expect(content.questionSet.vocabularyPool).toEqual([
      "歡騰",
      "娓娓道來",
      "無言以對",
      "激憤"
    ]);
    expect(content.questionSet.questions).toHaveLength(4);
    expect(Object.keys(content.assetManifest).sort()).toEqual([
      "blocker",
      "environment",
      "low",
      "monster",
      "runner",
      "track"
    ]);
    expect(content.assetManifest.track.texturePaths).toEqual({
      playground: "/assets/track/playground.png",
      corridor: "/assets/track/corridor.png",
      courtyard: "/assets/track/courtyard.png",
      stairs: "/assets/track/stairs.png"
    });
    expect(content.assetManifest.runner.spritePaths).toEqual({
      staticImagePath: "/assets/sprites/runner.png",
      runSheetPath: "/assets/sprites/runner-run.png",
      jumpImagePath: "/assets/sprites/runner-jump.png"
    });
    expect(content.assetManifest.environment.farBackgroundPath).toBe("/assets/environment/campus-far.png");
    expect(content.assetManifest.blocker.imagePath).toBe("/assets/sprites/blocker.png");
    expect(content.assetManifest.blocker.imagePaths).toEqual([
      "/assets/sprites/blocker.png",
      "/assets/sprites/blocker-desks.png",
      "/assets/sprites/blocker-cleaning-cart.png"
    ]);
    expect(content.assetManifest.low.imagePath).toBe("/assets/sprites/low.png");
    expect(content.assetManifest.low.imagePaths).toEqual([
      "/assets/sprites/low.png",
      "/assets/sprites/low-skip-rope.png"
    ]);
  });
});
