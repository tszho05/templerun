import * as THREE from "three";
import type { TrackSegment, TrackTheme } from "../../game/track/Obstacle";
import type { TrackTexturePaths } from "../loaders/assetManifest";

type TrackMaterials = {
  ground: Record<TrackTheme, THREE.MeshStandardMaterial>;
  wall: Record<TrackTheme, THREE.MeshStandardMaterial>;
  line: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  props: {
    bench: THREE.MeshStandardMaterial;
    bleacher: THREE.MeshStandardMaterial;
    brick: THREE.MeshStandardMaterial;
    foliage: THREE.MeshStandardMaterial;
    locker: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial;
    planter: THREE.MeshStandardMaterial;
    stone: THREE.MeshStandardMaterial;
    trunk: THREE.MeshStandardMaterial;
  };
};

export type TrackView = {
  group: THREE.Group;
  segments: Map<string, THREE.Group>;
  materials: TrackMaterials;
};

const groundFallbackColors: Record<TrackTheme, number> = {
  playground: 0xb95745,
  corridor: 0xd7ceb9,
  courtyard: 0xb97951,
  stairs: 0x9f998d
};

const wallColors: Record<TrackTheme, number> = {
  playground: 0xf0c84b,
  corridor: 0xd6d0bf,
  courtyard: 0x7a9f64,
  stairs: 0x9ba6aa
};

export function createTrackView(texturePaths: Partial<TrackTexturePaths> = {}): TrackView {
  const group = new THREE.Group();
  group.name = "track";

  return {
    group,
    segments: new Map(),
    materials: createTrackMaterials(texturePaths)
  };
}

export function updateTrackView(view: TrackView, segments: readonly TrackSegment[], distanceMeters: number): void {
  const activeIds = new Set(segments.map((segment) => segment.id));

  for (const [id, segmentGroup] of view.segments) {
    if (!activeIds.has(id)) {
      view.group.remove(segmentGroup);
      view.segments.delete(id);
    }
  }

  for (const segment of segments) {
    let segmentGroup = view.segments.get(segment.id);
    if (!segmentGroup) {
      segmentGroup = createTrackSegment(segment, view.materials);
      view.segments.set(segment.id, segmentGroup);
      view.group.add(segmentGroup);
    }

    segmentGroup.position.z = -(segment.startMeters - distanceMeters + segment.lengthMeters / 2);
  }
}

function createTrackMaterials(texturePaths: Partial<TrackTexturePaths>): TrackMaterials {
  const textureLoader = new THREE.TextureLoader();

  return {
    ground: {
      playground: createGroundMaterial(textureLoader, texturePaths.playground, groundFallbackColors.playground),
      corridor: createGroundMaterial(textureLoader, texturePaths.corridor, groundFallbackColors.corridor),
      courtyard: createGroundMaterial(textureLoader, texturePaths.courtyard, groundFallbackColors.courtyard),
      stairs: createGroundMaterial(textureLoader, texturePaths.stairs, groundFallbackColors.stairs)
    },
    wall: {
      playground: new THREE.MeshStandardMaterial({ color: wallColors.playground, roughness: 0.78 }),
      corridor: new THREE.MeshStandardMaterial({ color: wallColors.corridor, roughness: 0.76 }),
      courtyard: new THREE.MeshStandardMaterial({ color: wallColors.courtyard, roughness: 0.82 }),
      stairs: new THREE.MeshStandardMaterial({ color: wallColors.stairs, roughness: 0.8 })
    },
    line: new THREE.MeshStandardMaterial({ color: 0xfff3b0, roughness: 0.8 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72 }),
    props: {
      bench: new THREE.MeshStandardMaterial({ color: 0x6f4a35, roughness: 0.8 }),
      bleacher: new THREE.MeshStandardMaterial({ color: 0x4f6f8f, roughness: 0.72 }),
      brick: new THREE.MeshStandardMaterial({ color: 0xb46f4c, roughness: 0.86 }),
      foliage: new THREE.MeshStandardMaterial({ color: 0x2e9d64, roughness: 0.7 }),
      locker: new THREE.MeshStandardMaterial({ color: 0x5d7895, roughness: 0.66 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x87929a, metalness: 0.15, roughness: 0.52 }),
      planter: new THREE.MeshStandardMaterial({ color: 0x8a5d3b, roughness: 0.82 }),
      stone: new THREE.MeshStandardMaterial({ color: 0xb9b0a1, roughness: 0.82 }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x8f6139, roughness: 0.78 })
    }
  };
}

function createGroundMaterial(
  textureLoader: THREE.TextureLoader,
  texturePath: string | undefined,
  fallbackColor: number
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.84 });

  if (texturePath) {
    textureLoader.load(texturePath, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 3);
      texture.needsUpdate = true;

      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    });
  }

  return material;
}

function createTrackSegment(segment: TrackSegment, materials: TrackMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = `track-segment-${segment.theme}`;

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.18, segment.lengthMeters),
    materials.ground[segment.theme]
  );
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  group.add(ground);

  addLaneLines(group, segment.lengthMeters, materials);
  addSideWalls(group, segment.theme, segment.lengthMeters, materials);
  addThemeProps(group, segment.theme, segment.lengthMeters, materials);

  return group;
}

function addLaneLines(group: THREE.Group, lengthMeters: number, materials: TrackMaterials): void {
  for (const x of [-1.2, 1.2]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, lengthMeters), materials.line);
    line.position.set(x, 0.015, 0);
    group.add(line);
  }
}

function addSideWalls(
  group: THREE.Group,
  theme: TrackTheme,
  lengthMeters: number,
  materials: TrackMaterials
): void {
  const wallHeight = theme === "corridor" ? 1.05 : theme === "stairs" ? 0.72 : 0.52;

  for (const x of [-4.45, 4.45]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallHeight, lengthMeters), materials.wall[theme]);
    wall.position.set(x, wallHeight / 2 - 0.05, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  }
}

function addThemeProps(
  group: THREE.Group,
  theme: TrackTheme,
  lengthMeters: number,
  materials: TrackMaterials
): void {
  if (theme === "playground") {
    addPlaygroundProps(group, lengthMeters, materials);
  } else if (theme === "corridor") {
    addCorridorProps(group, lengthMeters, materials);
  } else if (theme === "courtyard") {
    addCourtyardProps(group, lengthMeters, materials);
  } else {
    addStairsProps(group, lengthMeters, materials);
  }
}

function addPlaygroundProps(group: THREE.Group, lengthMeters: number, materials: TrackMaterials): void {
  for (const z of [-lengthMeters * 0.28, lengthMeters * 0.28]) {
    for (const x of [-5.35, 5.35]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.62), materials.props.bleacher);
      bench.position.set(x, 0.32, z);
      bench.castShadow = true;
      group.add(bench);

      const support = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.26, 0.12), materials.props.metal);
      support.position.set(x, 0.15, z + 0.28);
      support.castShadow = true;
      group.add(support);
    }
  }
}

function addCorridorProps(group: THREE.Group, lengthMeters: number, materials: TrackMaterials): void {
  for (const z of [-lengthMeters * 0.34, 0, lengthMeters * 0.34]) {
    for (const x of [-5.05, 5.05]) {
      const column = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.55, 0.36), materials.props.stone);
      column.position.set(x, 0.72, z);
      column.castShadow = true;
      group.add(column);
    }
  }

  for (const x of [-5.22, 5.22]) {
    const lockers = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.86, 2.2), materials.props.locker);
    lockers.position.set(x, 0.45, lengthMeters * 0.18);
    lockers.castShadow = true;
    group.add(lockers);
  }
}

function addCourtyardProps(group: THREE.Group, lengthMeters: number, materials: TrackMaterials): void {
  for (const z of [-lengthMeters * 0.3, lengthMeters * 0.2]) {
    for (const x of [-5.35, 5.35]) {
      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.78), materials.props.planter);
      planter.position.set(x, 0.18, z);
      planter.castShadow = true;
      group.add(planter);

      const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), materials.props.foliage);
      shrub.position.set(x, 0.56, z);
      shrub.castShadow = true;
      group.add(shrub);
    }
  }

  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 0.46), materials.props.bench);
  bench.position.set(-5.35, 0.42, lengthMeters * 0.38);
  bench.castShadow = true;
  group.add(bench);
}

function addStairsProps(group: THREE.Group, lengthMeters: number, materials: TrackMaterials): void {
  for (let z = -lengthMeters / 2 + 2; z < lengthMeters / 2; z += 2) {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(8.12, 0.035, 0.06), materials.trim);
    lip.position.set(0, 0.035, z);
    group.add(lip);
  }

  for (const x of [-4.9, 4.9]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, lengthMeters, 8), materials.props.metal);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(x, 0.82, 0);
    rail.castShadow = true;
    group.add(rail);

    for (let z = -lengthMeters / 2 + 1.5; z < lengthMeters / 2; z += 4.5) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.7, 8), materials.props.metal);
      post.position.set(x, 0.36, z);
      post.castShadow = true;
      group.add(post);
    }
  }
}
