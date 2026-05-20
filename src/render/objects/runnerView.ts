import * as THREE from "three";
import type { RunnerState } from "../../game/runner/RunnerState";
import type { RunnerSpritePaths } from "../loaders/assetManifest";

const LANE_WIDTH = 2.4;
const RUN_FRAME_COUNT = 8;
const RUN_FRAME_COLUMNS = 4;
const RUN_FRAME_ROWS = 2;
const RUN_FRAME_DURATION_MS = 75;
const SLOWED_RUN_FRAME_DURATION_MS = 140;

type RunnerSpriteKey = "static" | "run" | "jump";

type RunnerSpriteRuntime = {
  fallback: THREE.Object3D;
  material: THREE.SpriteMaterial;
  sprite: THREE.Sprite;
  textures: Partial<Record<RunnerSpriteKey, THREE.Texture>>;
  activeKey: RunnerSpriteKey | null;
  activeRunFrame: number;
};

const RUNNER_SCALES: Record<RunnerSpriteKey, { width: number; height: number; y: number }> = {
  static: { width: 1.2, height: 1.78, y: 0.92 },
  run: { width: 1.22, height: 1.84, y: 0.96 },
  jump: { width: 1.32, height: 1.92, y: 1 }
};

export function createRunnerView(spritePaths?: RunnerSpritePaths): THREE.Group {
  const group = new THREE.Group();
  group.name = "runner";

  const fallback = createFallbackRunner();
  const material = new THREE.SpriteMaterial({
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = "runner-animated-billboard";
  sprite.visible = false;

  group.add(fallback, sprite);

  const runtime: RunnerSpriteRuntime = {
    fallback,
    material,
    sprite,
    textures: {},
    activeKey: null,
    activeRunFrame: -1
  };
  group.userData.runnerSpriteRuntime = runtime;

  if (spritePaths) {
    loadRunnerTexture(runtime, "static", spritePaths.staticImagePath);
    loadRunnerTexture(runtime, "run", spritePaths.runSheetPath);
    loadRunnerTexture(runtime, "jump", spritePaths.jumpImagePath);
  }

  return group;
}

export function updateRunnerView(group: THREE.Group, runner: RunnerState, nowMs: number): void {
  group.position.x = laneToX(runner.laneIndex);
  group.position.z = 0;
  group.scale.setScalar(1);

  if (runner.movementState === "jumping") {
    const remaining = runner.movementEndsAtMs ? Math.max(0, runner.movementEndsAtMs - nowMs) : 0;
    const progress = 1 - remaining / 850;
    group.position.y = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI) * 1.35;
    setRunnerSprite(group, "jump", nowMs, runner.isSlowed);
    return;
  }

  group.position.y = Math.sin(nowMs / 120) * 0.03;
  setRunnerSprite(group, "run", nowMs, runner.isSlowed);
}

export function laneToX(laneIndex: number): number {
  return (laneIndex - 1) * LANE_WIDTH;
}

function createFallbackRunner(): THREE.Group {
  const fallback = new THREE.Group();
  fallback.name = "runner-low-poly";

  const uniform = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 1.05, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x2f80ed, roughness: 0.55 })
  );
  uniform.position.y = 0.92;
  uniform.castShadow = true;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xffc8a2, roughness: 0.7 })
  );
  head.position.y = 1.62;
  head.castShadow = true;

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.68, 0.2),
    new THREE.MeshStandardMaterial({ color: 0xffb000, roughness: 0.65 })
  );
  backpack.position.set(0, 0.98, 0.3);
  backpack.castShadow = true;

  fallback.add(uniform, head, backpack);
  return fallback;
}

function loadRunnerTexture(runtime: RunnerSpriteRuntime, key: RunnerSpriteKey, imagePath: string): void {
  new THREE.TextureLoader().load(imagePath, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    if (key === "run") {
      texture.repeat.set(1 / RUN_FRAME_COLUMNS, 1 / RUN_FRAME_ROWS);
    } else {
      texture.repeat.set(1, 1);
    }
    runtime.textures[key] = texture;

    if (!runtime.material.map) {
      applyRunnerTexture(runtime, key, 0);
    }
  });
}

function setRunnerSprite(
  group: THREE.Group,
  preferredKey: RunnerSpriteKey,
  nowMs: number,
  isSlowed: boolean
): void {
  const runtime = group.userData.runnerSpriteRuntime as RunnerSpriteRuntime | undefined;
  if (!runtime) {
    return;
  }

  const key = getAvailableSpriteKey(runtime, preferredKey);
  if (!key) {
    runtime.sprite.visible = false;
    runtime.fallback.visible = true;
    return;
  }

  const frame = key === "run" ? getRunFrame(nowMs, isSlowed) : 0;
  const changedFrame = key === "run" && frame !== runtime.activeRunFrame;
  if (key !== runtime.activeKey || changedFrame) {
    applyRunnerTexture(runtime, key, frame);
  }

  const scale = RUNNER_SCALES[key];
  runtime.sprite.position.y = scale.y;
  runtime.sprite.scale.set(scale.width, scale.height, 1);
  runtime.sprite.visible = true;
  runtime.fallback.visible = false;
}

function getAvailableSpriteKey(
  runtime: RunnerSpriteRuntime,
  preferredKey: RunnerSpriteKey
): RunnerSpriteKey | null {
  if (runtime.textures[preferredKey]) {
    return preferredKey;
  }
  if (preferredKey !== "static" && runtime.textures.static) {
    return "static";
  }
  if (preferredKey !== "run" && runtime.textures.run) {
    return "run";
  }
  return null;
}

function getRunFrame(nowMs: number, isSlowed: boolean): number {
  const frameDurationMs = isSlowed ? SLOWED_RUN_FRAME_DURATION_MS : RUN_FRAME_DURATION_MS;
  return Math.floor(nowMs / frameDurationMs) % RUN_FRAME_COUNT;
}

function applyRunnerTexture(runtime: RunnerSpriteRuntime, key: RunnerSpriteKey, frame: number): void {
  const texture = runtime.textures[key];
  if (!texture) {
    return;
  }

  if (key === "run") {
    const row = Math.floor(frame / RUN_FRAME_COLUMNS);
    const column = frame % RUN_FRAME_COLUMNS;
    texture.repeat.set(1 / RUN_FRAME_COLUMNS, 1 / RUN_FRAME_ROWS);
    texture.offset.set(column / RUN_FRAME_COLUMNS, (RUN_FRAME_ROWS - 1 - row) / RUN_FRAME_ROWS);
  } else {
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
  }

  runtime.material.map = texture;
  runtime.material.needsUpdate = true;
  runtime.activeKey = key;
  runtime.activeRunFrame = key === "run" ? frame : -1;
}
