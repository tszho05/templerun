import type { GameState } from "../../game/simulation/GameState";
import type { GameRenderer } from "../app/createRenderer";

export function renderSnapshot(renderer: GameRenderer, snapshot: Readonly<GameState>): void {
  renderer.update(snapshot);
}
