import type { LeaderboardRecord, LeaderboardScope } from "../../game/persistence/leaderboardStore";
import type { LeaderboardLoadState } from "../AppUiState";

export function renderLeaderboardOverlay(
  records: readonly LeaderboardRecord[],
  scope: LeaderboardScope,
  className: string,
  loadState: LeaderboardLoadState
): string {
  return `
    <section class="menu-panel leaderboard-panel" role="dialog" aria-label="排行榜">
      <h1>排行榜</h1>
      <div class="leaderboard-tabs" role="tablist" aria-label="排行榜範圍">
        <button
          class="leaderboard-tab ${scope.type === "global" ? "active" : ""}"
          type="button"
          data-action="showGlobalLeaderboard"
        >公開</button>
        <button
          class="leaderboard-tab ${scope.type === "class" ? "active" : ""}"
          type="button"
          data-action="showClassLeaderboard"
          ${className ? "" : "disabled"}
        >個人</button>
      </div>
      ${renderRows(records, scope, loadState, className)}
      <div class="menu-actions compact">
        <button class="menu-button primary" type="button" data-action="startGame">新遊戲</button>
        <button class="menu-button" type="button" data-action="backToStart">返回</button>
      </div>
    </section>
  `;
}

function renderRows(
  records: readonly LeaderboardRecord[],
  scope: LeaderboardScope,
  loadState: LeaderboardLoadState,
  className: string
): string {
  if (loadState.status === "loading") {
    return `<p class="empty-leaderboard">載入中</p>`;
  }

  if (loadState.status === "error") {
    return `<p class="empty-leaderboard">${escapeHtml(loadState.message)}</p>`;
  }

  if (records.length === 0) {
    return `<p class="empty-leaderboard">${
      scope.type === "class" && !className ? "尚未有班別" : "暫無紀錄"
    }</p>`;
  }

  return `
    <ol class="leaderboard-list">
      ${records.map(renderRecord).join("")}
    </ol>
  `;
}

function renderRecord(record: LeaderboardRecord, index: number): string {
  return `
    <li class="leaderboard-row">
      <span class="rank">${index + 1}</span>
      <span class="class-name">${escapeHtml(record.className)}</span>
      <span class="student-number">${escapeHtml(record.studentNumber)}</span>
      <strong>${Math.floor(record.distanceMeters)}m</strong>
    </li>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
