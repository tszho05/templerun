import * as THREE from "three";
import type { GameState } from "../../game/simulation/GameState";
import type { AssetManifest } from "../loaders/assetManifest";
import { createMonsterView, updateMonsterView } from "../objects/monsterView";
import { createObstacleView, updateObstacleView } from "../objects/obstacleView";
import { createRunnerView, updateRunnerView } from "../objects/runnerView";
import { createTrackView, updateTrackView } from "../objects/trackView";

export type RenderStats = {
  objectCount: number;
};

export type GameRenderer = {
  update(snapshot: Readonly<GameState>): void;
  resize(): void;
  getStats(): RenderStats;
  destroy(): void;
};

export function createGameRenderer(
  container: HTMLElement,
  assetManifest: AssetManifest,
  onError: (message: string) => void
): GameRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.append(renderer.domElement);

  const scene = createScene();
  applySceneBackground(scene, assetManifest.environment.farBackgroundPath);
  const camera = createCamera();
  const runnerView = createRunnerView(assetManifest.runner.spritePaths);
  const monsterView = createMonsterView(assetManifest.monster.imagePath);
  const trackView = createTrackView(assetManifest.track.texturePaths);
  const obstacleView = createObstacleView({
    blocker: assetManifest.blocker.imagePaths,
    low: assetManifest.low.imagePaths
  });

  scene.add(trackView.group, obstacleView.group, runnerView, monsterView);

  const handleContextLoss = (event: Event): void => {
    event.preventDefault();
    onError("WebGL context was lost.");
  };
  renderer.domElement.addEventListener("webglcontextlost", handleContextLoss);

  resizeRenderer(renderer, camera, container);

  return {
    update(snapshot) {
      updateTrackView(trackView, snapshot.trackSegments, snapshot.distanceMeters);
      updateObstacleView(obstacleView, snapshot.obstacles, snapshot.distanceMeters);
      updateRunnerView(runnerView, snapshot.runner, snapshot.nowMs);
      updateMonsterView(monsterView, snapshot.chase, snapshot.nowMs);
      updateCamera(camera, runnerView.position.x);
      renderer.render(scene, camera);
    },
    resize() {
      resizeRenderer(renderer, camera, container);
    },
    getStats() {
      return { objectCount: countObjects(scene) };
    },
    destroy() {
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLoss);
      renderer.dispose();
      container.replaceChildren();
      disposeObject(scene);
    }
  };
}

function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaee6ff);
  scene.fog = new THREE.Fog(0xaee6ff, 18, 72);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x6bb56e, 2.2);
  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(5, 9, 6);
  sun.castShadow = true;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 50;
  scene.add(hemiLight, sun);

  return scene;
}

function applySceneBackground(scene: THREE.Scene, imagePath: string): void {
  if (!imagePath) {
    return;
  }

  new THREE.TextureLoader().load(imagePath, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
  });
}

function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
  camera.position.set(0, 5.2, 8.6);
  camera.lookAt(0, 1.1, -14);
  return camera;
}

function updateCamera(camera: THREE.PerspectiveCamera, laneX: number): void {
  camera.position.x += (laneX * 0.2 - camera.position.x) * 0.08;
  camera.lookAt(laneX * 0.18, 1.05, -14);
}

function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  container: HTMLElement
): void {
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function countObjects(object: THREE.Object3D): number {
  let count = 1;
  for (const child of object.children) {
    count += countObjects(child);
  }
  return count;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      disposeMaterial(child.material);
    } else if (child instanceof THREE.Sprite) {
      disposeMaterial(child.material);
    }
  });
}

function disposeMaterial(materialOrMaterials: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(materialOrMaterials) ? materialOrMaterials : [materialOrMaterials];
  for (const material of materials) {
    const mappedMaterial = material as THREE.Material & { map?: THREE.Texture | null };
    mappedMaterial.map?.dispose();
    material.dispose();
  }
}
