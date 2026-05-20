import type { GameState } from "../../game/simulation/GameState";

export function renderQuestionModal(snapshot: Readonly<GameState>): string {
  const question = snapshot.currentQuestion;
  if (!question) {
    return "";
  }

  const secondsLeft = Math.max(0, Math.ceil((question.deadlineAtMs - snapshot.nowMs) / 1000));
  const choices = question.choices
    .map(
      (choice) => `
        <button class="choice-button" type="button" data-choice="${escapeHtml(choice)}">
          ${escapeHtml(choice)}
        </button>
      `
    )
    .join("");

  return `
    <section class="overlay-panel question-panel" role="dialog" aria-modal="true" aria-label="中文詞語題">
      <div class="question-timer">${secondsLeft}</div>
      <p class="question-sentence">${escapeHtml(question.sentence)}</p>
      <div class="choice-grid">${choices}</div>
    </section>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
