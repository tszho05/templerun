import type { GameState } from "../../game/simulation/GameState";

export function renderHud(snapshot: Readonly<GameState>): string {
  return `
    <section class="hud hud-primary" aria-label="遊戲狀態">
      <div class="hud-stat">
        <span class="hud-label">距離</span>
        <strong>${Math.floor(snapshot.score.currentDistance)}m</strong>
      </div>
    </section>
  `;
}
