export function renderStartOverlay(): string {
  return `
    <section class="menu-panel start-panel" role="dialog" aria-label="開始頁面">
      <h1>詞語大暴走</h1>
      <div class="menu-actions">
        <button class="menu-button primary" type="button" data-action="startGame">新遊戲</button>
        <button class="menu-button" type="button" data-action="showLeaderboard">排行榜</button>
      </div>
    </section>
  `;
}
