import * as THREE from "three";
import type { ChaseState } from "../../game/chase/ChaseState";
import { addImageBillboard } from "./spriteBillboard";

export function createMonsterView(imagePath?: string): THREE.Group {
  const group = new THREE.Group();
  group.name = "campus-fantasy-monster";

  const fallback = new THREE.Group();
  fallback.name = "campus-fantasy-monster-low-poly";

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0x8e5cf7, roughness: 0.5 })
  );
  body.position.y = 0.75;
  body.castShadow = true;

  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0xaee6ff, roughness: 0.5 })
  );
  belly.position.set(0, 0.62, -0.35);
  belly.scale.set(1, 0.82, 0.42);

  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.35 });

  for (const x of [-0.22, 0.22]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), eyeMaterial);
    eye.position.set(x, 0.95, -0.54);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pupilMaterial);
    pupil.position.set(x, 0.95, -0.62);
    fallback.add(eye, pupil);
  }

  fallback.add(body, belly);
  group.add(fallback);
  addImageBillboard(group, {
    imagePath,
    name: "campus-fantasy-monster-anime-billboard",
    width: 1.55,
    height: 1.55,
    y: 0.78,
    fallback
  });
  return group;
}

export function updateMonsterView(group: THREE.Group, chase: ChaseState, nowMs: number): void {
  const zByLevel = {
    far: 6.2,
    near: 3.8,
    caught: 1.35
  };

  group.position.set(0, Math.sin(nowMs / 180) * 0.06, zByLevel[chase.monsterDistanceLevel]);
  group.scale.setScalar(chase.monsterDistanceLevel === "near" ? 1.08 : 1);
}
