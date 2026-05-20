import * as THREE from "three";

export type BillboardOptions = {
  imagePath: string | undefined;
  name: string;
  width: number;
  height: number;
  y: number;
  fallback?: THREE.Object3D;
};

export function addImageBillboard(parent: THREE.Object3D, options: BillboardOptions): void {
  if (!options.imagePath) {
    return;
  }

  const material = new THREE.SpriteMaterial({
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.name = options.name;
  sprite.position.y = options.y;
  sprite.scale.set(options.width, options.height, 1);
  sprite.visible = false;
  parent.add(sprite);

  new THREE.TextureLoader().load(
    options.imagePath,
    (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      material.map = loadedTexture;
      material.needsUpdate = true;
      sprite.visible = true;
      if (options.fallback) {
        options.fallback.visible = false;
      }
    },
    undefined,
    () => {
      sprite.visible = false;
      if (options.fallback) {
        options.fallback.visible = true;
      }
    }
  );
}
