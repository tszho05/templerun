import type { RandomSource } from "../shared/random";
import { pickOne, shuffle } from "../shared/random";
import type { GameConfig } from "../simulation/GameConfig";
import type { LaneIndex } from "../runner/RunnerState";
import type { Obstacle, ObstacleType, TrackSegment, TrackTheme } from "./Obstacle";

export type TrackState = {
  obstacles: Obstacle[];
  segments: TrackSegment[];
  nextObstacleAtMeters: number;
  obstacleCounter: number;
  segmentCounter: number;
};

const SEGMENT_LENGTH_METERS = 24;
const SEGMENTS_AHEAD = 8;
const RECYCLE_BEHIND_METERS = 20;
const OBSTACLE_LOOKAHEAD_METERS = 90;
const DOUBLE_OBSTACLE_START_METERS = 36;
const DOUBLE_OBSTACLE_PRIMARY_METERS = 180;
const TRIPLE_OBSTACLE_START_METERS = 450;
const EARLY_DOUBLE_OBSTACLE_CHANCE = 0.7;
const PRIMARY_DOUBLE_OBSTACLE_CHANCE = 0.85;
const TRIPLE_OBSTACLE_CHANCE = 0.45;
const LATE_DOUBLE_OBSTACLE_CHANCE = 0.45;
const SINGLE_LOW_OBSTACLE_TYPES: readonly ObstacleType[] = ["blocker", "low"];
const LANE_INDEXES: readonly LaneIndex[] = [0, 1, 2];
const TRACK_THEMES: readonly TrackTheme[] = ["playground", "corridor", "courtyard", "stairs"];

type ObstacleSpawn = Pick<Obstacle, "laneIndex" | "type">;

export function createInitialTrackState(): TrackState {
  return {
    obstacles: [],
    segments: createInitialSegments(),
    nextObstacleAtMeters: 36,
    obstacleCounter: 0,
    segmentCounter: SEGMENTS_AHEAD
  };
}

export function updateTrackState(
  track: TrackState,
  distanceMeters: number,
  config: GameConfig,
  random: RandomSource
): TrackState {
  let nextTrack = recycleSegments(track, distanceMeters);
  nextTrack = spawnObstacles(nextTrack, distanceMeters, config, random);

  return {
    ...nextTrack,
    obstacles: nextTrack.obstacles.filter(
      (obstacle) => obstacle.distanceMeters >= distanceMeters - RECYCLE_BEHIND_METERS
    )
  };
}

export function clearObstacleSafetyBuffer(
  track: TrackState,
  distanceMeters: number,
  safeAheadMeters: number
): TrackState {
  const safeUntilMeters = distanceMeters + Math.max(0, safeAheadMeters);

  return {
    ...track,
    obstacles: track.obstacles.filter(
      (obstacle) => obstacle.distanceMeters < distanceMeters || obstacle.distanceMeters > safeUntilMeters
    ),
    nextObstacleAtMeters: Math.max(track.nextObstacleAtMeters, safeUntilMeters)
  };
}

export function markObstacleHit(track: TrackState, obstacleId: string): TrackState {
  return {
    ...track,
    obstacles: track.obstacles.map((obstacle) =>
      obstacle.id === obstacleId ? { ...obstacle, hasHit: true } : obstacle
    )
  };
}

export function getObstacleSpawnInterval(distanceMeters: number, config: GameConfig): number {
  const difficulty = Math.min(1, distanceMeters / config.difficultyRampDistance);
  const interval =
    config.obstacleSpawnBaseInterval -
    (config.obstacleSpawnBaseInterval - config.obstacleSpawnMinInterval) * difficulty;
  return Math.max(config.obstacleSpawnMinInterval, interval);
}

function createInitialSegments(): TrackSegment[] {
  return Array.from({ length: SEGMENTS_AHEAD }, (_, index) =>
    createSegment(index, index * SEGMENT_LENGTH_METERS)
  );
}

function createSegment(segmentIndex: number, startMeters: number): TrackSegment {
  return {
    id: `segment-${segmentIndex}`,
    startMeters,
    lengthMeters: SEGMENT_LENGTH_METERS,
    theme: getSegmentTheme(segmentIndex)
  };
}

function getSegmentTheme(segmentIndex: number): TrackTheme {
  return TRACK_THEMES[segmentIndex % TRACK_THEMES.length] ?? "playground";
}

function recycleSegments(track: TrackState, distanceMeters: number): TrackState {
  let segments = track.segments.filter(
    (segment) => segment.startMeters + segment.lengthMeters >= distanceMeters - RECYCLE_BEHIND_METERS
  );
  let segmentCounter = track.segmentCounter;
  let lastStart = Math.max(...segments.map((segment) => segment.startMeters));

  while (segments.length < SEGMENTS_AHEAD) {
    lastStart += SEGMENT_LENGTH_METERS;
    segments = [...segments, createSegment(segmentCounter, lastStart)];
    segmentCounter += 1;
  }

  return { ...track, segments, segmentCounter };
}

function spawnObstacles(
  track: TrackState,
  distanceMeters: number,
  config: GameConfig,
  random: RandomSource
): TrackState {
  let nextObstacleAtMeters = track.nextObstacleAtMeters;
  let obstacleCounter = track.obstacleCounter;
  let obstacles = track.obstacles;

  while (nextObstacleAtMeters <= distanceMeters + OBSTACLE_LOOKAHEAD_METERS) {
    const obstacleWave = createObstacleWave(nextObstacleAtMeters, config, random);
    obstacles = [
      ...obstacles,
      ...obstacleWave.map((obstacle) => {
        const id = `obstacle-${obstacleCounter}`;
        obstacleCounter += 1;

        return {
          id,
          laneIndex: obstacle.laneIndex,
          distanceMeters: nextObstacleAtMeters,
          type: obstacle.type,
          hasHit: false
        };
      })
    ];
    nextObstacleAtMeters += getObstacleSpawnInterval(nextObstacleAtMeters, config);
  }

  return { ...track, obstacles, nextObstacleAtMeters, obstacleCounter };
}

function createObstacleWave(
  distanceMeters: number,
  config: GameConfig,
  random: RandomSource
): ObstacleSpawn[] {
  const waveSize = getObstacleWaveSize(distanceMeters, random);

  if (waveSize === 3) {
    return createMixedTripleObstacleWave(config, random);
  }

  if (waveSize === 2) {
    return createDoubleBlockerWave(config, random);
  }

  return [
    {
      laneIndex: pickOne(getLaneIndexes(config), random),
      type: pickOne<ObstacleType>(SINGLE_LOW_OBSTACLE_TYPES, random)
    }
  ];
}

function getObstacleWaveSize(distanceMeters: number, random: RandomSource): 1 | 2 | 3 {
  const roll = random();

  if (distanceMeters >= TRIPLE_OBSTACLE_START_METERS) {
    if (roll < TRIPLE_OBSTACLE_CHANCE) {
      return 3;
    }

    if (roll < TRIPLE_OBSTACLE_CHANCE + LATE_DOUBLE_OBSTACLE_CHANCE) {
      return 2;
    }

    return 1;
  }

  if (distanceMeters >= DOUBLE_OBSTACLE_PRIMARY_METERS) {
    return roll < PRIMARY_DOUBLE_OBSTACLE_CHANCE ? 2 : 1;
  }

  if (distanceMeters >= DOUBLE_OBSTACLE_START_METERS) {
    return roll < EARLY_DOUBLE_OBSTACLE_CHANCE ? 2 : 1;
  }

  return 1;
}

function createDoubleBlockerWave(config: GameConfig, random: RandomSource): ObstacleSpawn[] {
  const lanes = getLaneIndexes(config);
  const safeLane = pickOne(lanes, random);

  return lanes
    .filter((laneIndex) => laneIndex !== safeLane)
    .map((laneIndex) => ({ laneIndex, type: "blocker" }));
}

function createMixedTripleObstacleWave(config: GameConfig, random: RandomSource): ObstacleSpawn[] {
  const lanes = getLaneIndexes(config);
  const lowLaneCount = random() < 0.65 ? 1 : 2;
  const lowLanes = new Set(shuffle(lanes, random).slice(0, lowLaneCount));

  return lanes.map((laneIndex) => ({
    laneIndex,
    type: lowLanes.has(laneIndex) ? "low" : "blocker"
  }));
}

function getLaneIndexes(config: GameConfig): LaneIndex[] {
  return LANE_INDEXES.slice(0, config.laneCount);
}
