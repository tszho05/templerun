import type { PlayerAction } from "../game/input/PlayerAction";
import type { LeaderboardRecord, LeaderboardScope } from "../game/persistence/leaderboardStore";
import type { GameState } from "../game/simulation/GameState";

export type AppView = "start" | "playing" | "leaderboard";

export type LeaderboardSaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

export type LeaderboardLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

export type AppUiState = {
  view: AppView;
  snapshot: Readonly<GameState>;
  leaderboardRecords: LeaderboardRecord[];
  leaderboardScope: LeaderboardScope;
  leaderboardClassName: string;
  leaderboardLoadState: LeaderboardLoadState;
  leaderboardSaveState: LeaderboardSaveState;
};

export type UiAction =
  | PlayerAction
  | { type: "startGame" }
  | { type: "showLeaderboard" }
  | { type: "showGlobalLeaderboard" }
  | { type: "showClassLeaderboard" }
  | { type: "backToStart" }
  | { type: "saveLeaderboardRecord"; className: string; studentNumber: string };
