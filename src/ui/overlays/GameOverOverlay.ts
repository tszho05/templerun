import type { GameState } from "../../game/simulation/GameState";
import { CLASS_NAME_MAX_LENGTH, STUDENT_NUMBER_MAX_LENGTH } from "../../game/persistence/leaderboardStore";
import type { LeaderboardSaveState } from "../AppUiState";

export function renderGameOverOverlay(
  snapshot: Readonly<GameState>,
  saveState: LeaderboardSaveState
): string {
  const score = snapshot.score;
  const saveMarkup = renderSaveMarkup(saveState);

  return `
    <section class="overlay-panel game-over-panel" role="dialog" aria-modal="true" aria-label="遊戲結算">
      <h1>被追上了</h1>
      <div class="summary-grid">
        <div><span>本局距離</span><strong>${Math.floor(score.currentDistance)}m</strong></div>
        <div><span>最高距離</span><strong>${Math.floor(score.highDistance)}m</strong></div>
        <div><span>答對題數</span><strong>${score.correctAnswers}</strong></div>
        <div><span>總題數</span><strong>${score.totalQuestions}</strong></div>
        <div><span>答對率</span><strong>${formatPercent(score.accuracy)}</strong></div>
      </div>
      ${saveMarkup}
      <div class="menu-actions compact">
        <button class="menu-button primary" type="button" data-action="startGame">新遊戲</button>
        <button class="menu-button" type="button" data-action="showLeaderboard">排行榜</button>
      </div>
    </section>
  `;
}

function renderSaveMarkup(saveState: LeaderboardSaveState): string {
  if (saveState.status === "saved") {
    return `<p class="save-message success">${saveState.message}</p>`;
  }

  const error = saveState.status === "error" ? `<p class="save-message error">${saveState.message}</p>` : "";
  const saving = saveState.status === "saving";

  return `
    <form class="leaderboard-save-form" data-save-record="true">
      <label for="leaderboard-class">登記排行榜</label>
      <div class="save-row">
        <input
          id="leaderboard-class"
          name="className"
          maxlength="${CLASS_NAME_MAX_LENGTH}"
          placeholder="班別"
          autocomplete="off"
          ${saving ? "disabled" : ""}
        />
        <input
          name="studentNumber"
          maxlength="${STUDENT_NUMBER_MAX_LENGTH}"
          placeholder="學號"
          autocomplete="off"
          ${saving ? "disabled" : ""}
        />
        <button class="menu-button primary" type="submit" ${saving ? "disabled" : ""}>
          ${saving ? "儲存中" : "儲存紀錄"}
        </button>
      </div>
      ${error}
    </form>
  `;
}

function formatPercent(value: number): string {
  return `${Math.round((Number.isFinite(value) ? value : 0) * 100)}%`;
}
