import type { Object3D } from "three";
import type { AssetManifestEntry } from "./assetManifest";

export async function loadGltfAsset(entry: AssetManifestEntry): Promise<Object3D | null> {
  try {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(entry.gltfPath);
    return gltf.scene;
  } catch {
    return null;
  }
}
