import type { GameState } from "../../game/simulation/GameState";

export function renderFeedbackOverlay(snapshot: Readonly<GameState>): string {
  const feedback = snapshot.feedback;
  if (!feedback) {
    return "";
  }

  const title =
    feedback.status === "correct" ? "答對了" : feedback.status === "timeout" ? "時間到" : "再試一次";
  const statusClass =
    feedback.status === "correct" ? "feedback-correct" : feedback.status === "timeout" ? "feedback-timeout" : "feedback-wrong";

  return `
    <section class="overlay-panel feedback-panel ${statusClass}" role="status" aria-live="polite">
      <strong>${title}</strong>
      <span>正確詞語：${feedback.correctAnswer}</span>
    </section>
  `;
}
