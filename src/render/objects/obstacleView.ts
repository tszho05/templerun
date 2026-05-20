import * as THREE from "three";
import type { Obstacle } from "../../game/track/Obstacle";
import { laneToX } from "./runnerView";
import { addImageBillboard } from "./spriteBillboard";

export type ObstacleImagePaths = Partial<Record<Obstacle["type"], readonly string[]>>;

export type ObstacleView = {
  group: THREE.Group;
  meshes: Map<string, THREE.Group>;
  imagePaths: ObstacleImagePaths;
};

export function createObstacleView(imagePaths: ObstacleImagePaths = {}): ObstacleView {
  const group = new THREE.Group();
  group.name = "obstacles";
  return { group, meshes: new Map(), imagePaths };
}

export function updateObstacleView(
  view: ObstacleView,
  obstacles: readonly Obstacle[],
  distanceMeters: number
): void {
  const activeIds = new Set(obstacles.map((obstacle) => obstacle.id));

  for (const [id, mesh] of view.meshes) {
    if (!activeIds.has(id)) {
      view.group.remove(mesh);
      view.meshes.delete(id);
    }
  }

  for (const obstacle of obstacles) {
    let mesh = view.meshes.get(obstacle.id);
    if (!mesh) {
      mesh = createObstacleMesh(obstacle, view.imagePaths);
      view.meshes.set(obstacle.id, mesh);
      view.group.add(mesh);
    }

    mesh.position.set(laneToX(obstacle.laneIndex), 0, -(obstacle.distanceMeters - distanceMeters));
    mesh.visible = !obstacle.hasHit;
  }
}

function createObstacleMesh(obstacle: Obstacle, imagePaths: ObstacleImagePaths): THREE.Group {
  const group = new THREE.Group();
  const fallback = new THREE.Group();
  fallback.name = `${obstacle.type}-low-poly`;

  if (obstacle.type === "blocker") {
    const stackMaterial = new THREE.MeshStandardMaterial({ color: 0xe84a5f, roughness: 0.6 });
    for (let index = 0; index < 3; index += 1) {
      const book = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.9), stackMaterial);
      book.position.y = 0.18 + index * 0.3;
      book.rotation.y = index % 2 === 0 ? 0.05 : -0.05;
      book.castShadow = true;
      fallback.add(book);
    }
    group.add(fallback);
    addImageBillboard(group, {
      imagePath: selectObstacleImagePath(obstacle, imagePaths),
      name: "blocker-anime-billboard",
      width: 1.75,
      height: 1.55,
      y: 0.76,
      fallback
    });
  } else if (obstacle.type === "low") {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: 0xff8a00, roughness: 0.58 })
    );
    cone.position.y = 0.45;
    cone.castShadow = true;
    fallback.add(cone);
    group.add(fallback);
    addImageBillboard(group, {
      imagePath: selectObstacleImagePath(obstacle, imagePaths),
      name: "low-obstacle-anime-billboard",
      width: 1.95,
      height: 1,
      y: 0.48,
      fallback
    });
  }

  return group;
}

export function selectObstacleImagePath(
  obstacle: Pick<Obstacle, "id" | "type">,
  imagePaths: ObstacleImagePaths
): string | undefined {
  const paths = imagePaths[obstacle.type];
  if (!paths || paths.length === 0) {
    return undefined;
  }

  return paths[hashString(obstacle.id) % paths.length];
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
