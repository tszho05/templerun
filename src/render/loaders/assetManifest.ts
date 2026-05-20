import type { TrackTheme } from "../../game/track/Obstacle";

export type AssetKey =
  | "runner"
  | "monster"
  | "track"
  | "environment"
  | "blocker"
  | "low";

export type AssetManifestEntry = {
  key: AssetKey;
  gltfPath: string;
  imagePath?: string;
  fallback: "low-poly";
};

export type ObstacleAssetManifestEntry = AssetManifestEntry & {
  key: "blocker" | "low";
  imagePath: string;
  imagePaths: string[];
};

export type RunnerSpritePaths = {
  staticImagePath: string;
  runSheetPath: string;
  jumpImagePath: string;
};

export type RunnerAssetManifestEntry = AssetManifestEntry & {
  key: "runner";
  spritePaths: RunnerSpritePaths;
};

export type TrackTexturePaths = Record<TrackTheme, string>;

export type TrackAssetManifestEntry = AssetManifestEntry & {
  key: "track";
  texturePaths: TrackTexturePaths;
};

export type EnvironmentAssetManifestEntry = {
  key: "environment";
  farBackgroundPath: string;
};

export type AssetManifest = {
  runner: RunnerAssetManifestEntry;
  monster: AssetManifestEntry;
  track: TrackAssetManifestEntry;
  environment: EnvironmentAssetManifestEntry;
  blocker: ObstacleAssetManifestEntry;
  low: ObstacleAssetManifestEntry;
};

const ASSET_ROOT = "/assets/glb";
const SPRITE_ROOT = "/assets/sprites";
const TRACK_ROOT = "/assets/track";
const ENVIRONMENT_ROOT = "/assets/environment";

export const assetManifest: AssetManifest = {
  runner: {
    key: "runner",
    gltfPath: `${ASSET_ROOT}/runner.glb`,
    imagePath: `${SPRITE_ROOT}/runner.png`,
    spritePaths: {
      staticImagePath: `${SPRITE_ROOT}/runner.png`,
      runSheetPath: `${SPRITE_ROOT}/runner-run.png`,
      jumpImagePath: `${SPRITE_ROOT}/runner-jump.png`
    },
    fallback: "low-poly"
  },
  monster: {
    key: "monster",
    gltfPath: `${ASSET_ROOT}/monster.glb`,
    imagePath: `${SPRITE_ROOT}/monster.png`,
    fallback: "low-poly"
  },
  track: {
    key: "track",
    gltfPath: `${ASSET_ROOT}/track.glb`,
    texturePaths: {
      playground: `${TRACK_ROOT}/playground.png`,
      corridor: `${TRACK_ROOT}/corridor.png`,
      courtyard: `${TRACK_ROOT}/courtyard.png`,
      stairs: `${TRACK_ROOT}/stairs.png`
    },
    fallback: "low-poly"
  },
  environment: {
    key: "environment",
    farBackgroundPath: `${ENVIRONMENT_ROOT}/campus-far.png`
  },
  blocker: {
    key: "blocker",
    gltfPath: `${ASSET_ROOT}/blocker.glb`,
    imagePath: `${SPRITE_ROOT}/blocker.png`,
    imagePaths: [
      `${SPRITE_ROOT}/blocker.png`,
      `${SPRITE_ROOT}/blocker-desks.png`,
      `${SPRITE_ROOT}/blocker-cleaning-cart.png`
    ],
    fallback: "low-poly"
  },
  low: {
    key: "low",
    gltfPath: `${ASSET_ROOT}/low-obstacle.glb`,
    imagePath: `${SPRITE_ROOT}/low.png`,
    imagePaths: [
      `${SPRITE_ROOT}/low.png`,
      `${SPRITE_ROOT}/low-skip-rope.png`
    ],
    fallback: "low-poly"
  }
};
