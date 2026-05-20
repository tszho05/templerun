import type { LaneIndex } from "../runner/RunnerState";

export type ObstacleType = "blocker" | "low";
export type TrackTheme = "playground" | "corridor" | "courtyard" | "stairs";

export type Obstacle = {
  id: string;
  laneIndex: LaneIndex;
  distanceMeters: number;
  type: ObstacleType;
  hasHit: boolean;
};

export type TrackSegment = {
  id: string;
  startMeters: number;
  lengthMeters: number;
  theme: TrackTheme;
};
