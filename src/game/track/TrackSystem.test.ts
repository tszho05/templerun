import { describe, expect, it } from "vitest";
import { createSeededRandom } from "../shared/random";
import { defaultGameConfig } from "../simulation/GameConfig";
import {
  createInitialTrackState,
  getObstacleSpawnInterval,
  type TrackState,
  updateTrackState
} from "./TrackSystem";

describe("TrackSystem", () => {
  it("spawns and recycles obstacles as distance advances", () => {
    const random = createSeededRandom(9);
    let track = createInitialTrackState();

    track = updateTrackState(track, 0, defaultGameConfig, random);
    expect(track.obstacles.length).toBeGreaterThan(0);
    expect(track.obstacles.every((obstacle) => ["blocker", "low"].includes(obstacle.type))).toBe(true);

    const firstObstacleId = track.obstacles[0]?.id;
    track = updateTrackState(track, 250, defaultGameConfig, random);

    expect(track.obstacles.some((obstacle) => obstacle.id === firstObstacleId)).toBe(false);
    expect(track.segments.length).toBeGreaterThan(0);
  });

  it("assigns stable visual themes to generated segments", () => {
    const random = createSeededRandom(9);
    let track = createInitialTrackState();

    expect(track.segments.map((segment) => segment.theme)).toEqual([
      "playground",
      "corridor",
      "courtyard",
      "stairs",
      "playground",
      "corridor",
      "courtyard",
      "stairs"
    ]);

    track = updateTrackState(track, 250, defaultGameConfig, random);

    expect(new Set(track.segments.map((segment) => segment.theme))).toEqual(
      new Set(["playground", "corridor", "courtyard", "stairs"])
    );
  });

  it("can spawn a double obstacle wave that leaves one lane clear", () => {
    const random = createSequenceRandom([0.1, 0.4]);
    let track = createInitialTrackState();

    track = updateTrackState(track, 0, defaultGameConfig, random);
    const firstWave = getObstaclesAtDistance(track, 36);

    expect(firstWave).toHaveLength(2);
    expect(new Set(firstWave.map((obstacle) => obstacle.laneIndex)).size).toBe(2);
    expect(firstWave.every((obstacle) => obstacle.type === "blocker")).toBe(true);
  });

  it("keeps occasional single-obstacle buffer waves", () => {
    const random = createSequenceRandom([0.95, 0.4, 0.2]);
    let track = createInitialTrackState();

    track = updateTrackState(track, 0, defaultGameConfig, random);

    expect(getObstaclesAtDistance(track, 36)).toHaveLength(1);
  });

  it("spawns solvable mixed triple obstacle waves in the midgame", () => {
    const random = createSequenceRandom([0.1, 0.2, 0.4, 0.7]);
    let track = createTrackNearDistance(450, 450);

    track = updateTrackState(track, 450, defaultGameConfig, random);
    const tripleWave = getObstaclesAtDistance(track, 450);
    const obstacleTypes = new Set(tripleWave.map((obstacle) => obstacle.type));

    expect(tripleWave).toHaveLength(3);
    expect(new Set(tripleWave.map((obstacle) => obstacle.laneIndex)).size).toBe(3);
    expect(obstacleTypes).toEqual(new Set(["blocker", "low"]));
    expect(tripleWave.some((obstacle) => obstacle.type === "low")).toBe(true);
  });

  it("ramps difficulty without dropping below the minimum interval", () => {
    const early = getObstacleSpawnInterval(0, defaultGameConfig);
    const late = getObstacleSpawnInterval(9999, defaultGameConfig);

    expect(late).toBeLessThan(early);
    expect(late).toBe(defaultGameConfig.obstacleSpawnMinInterval);
  });
});

function getObstaclesAtDistance(track: TrackState, distanceMeters: number) {
  return track.obstacles.filter((obstacle) => obstacle.distanceMeters === distanceMeters);
}

function createSequenceRandom(values: readonly number[], fallback = 0.99) {
  let index = 0;

  return () => values[index++] ?? fallback;
}

function createTrackNearDistance(distanceMeters: number, nextObstacleAtMeters: number): TrackState {
  return {
    ...createInitialTrackState(),
    nextObstacleAtMeters,
    segments: Array.from({ length: 8 }, (_, index) => ({
      id: `test-segment-${index}`,
      startMeters: distanceMeters - 20 + index * 24,
      lengthMeters: 24,
      theme: "playground" as const
    }))
  };
}
