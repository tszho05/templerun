import type { AppUiState, UiAction } from "./AppUiState";
import { renderHud } from "./hud/HudView";
import { renderFeedbackOverlay } from "./overlays/FeedbackOverlay";
import { renderGameOverOverlay } from "./overlays/GameOverOverlay";
import { renderLeaderboardOverlay } from "./overlays/LeaderboardOverlay";
import { renderQuestionModal } from "./overlays/QuestionModal";
import { renderStartOverlay } from "./overlays/StartOverlay";

export type OverlayUI = {
  render(state: AppUiState): void;
  destroy(): void;
};

export function createOverlayUI(
  container: HTMLElement,
  dispatch: (action: UiAction) => void
): OverlayUI {
  const root = document.createElement("div");
  root.className = "ui-root";
  container.append(root);
  let lastMarkup = "";

  const handleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    if (
      action === "startGame" ||
      action === "showLeaderboard" ||
      action === "showGlobalLeaderboard" ||
      action === "showClassLeaderboard" ||
      action === "backToStart"
    ) {
      dispatch({ type: action });
      return;
    }

    const choice = target.dataset.choice;
    if (choice) {
      dispatch({ type: "answer", choice });
      return;
    }
  };

  const handleSubmit = (event: SubmitEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || target.dataset.saveRecord !== "true") {
      return;
    }

    event.preventDefault();
    const formData = new FormData(target);
    const className = String(formData.get("className") ?? "");
    const studentNumber = String(formData.get("studentNumber") ?? "");
    dispatch({ type: "saveLeaderboardRecord", className, studentNumber });
  };

  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);

  return {
    render(state) {
      const markup = renderAppUi(state);

      if (markup !== lastMarkup) {
        root.innerHTML = markup;
        lastMarkup = markup;
      }
    },
    destroy() {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("submit", handleSubmit);
      root.remove();
    }
  };
}

function renderAppUi(state: AppUiState): string {
  if (state.view === "start") {
    return `<main class="overlay-layer menu-layer">${renderStartOverlay()}</main>`;
  }

  if (state.view === "leaderboard") {
    return `<main class="overlay-layer menu-layer">${renderLeaderboardOverlay(
      state.leaderboardRecords,
      state.leaderboardScope,
      state.leaderboardClassName,
      state.leaderboardLoadState
    )}</main>`;
  }

  const overlayClass = state.snapshot.mode === "gameOver"
    ? "overlay-layer game-over-layer"
    : "overlay-layer";

  return `
    ${state.snapshot.mode !== "gameOver" ? renderHud(state.snapshot) : ""}
    <main class="${overlayClass}">
      ${state.snapshot.mode === "question" ? renderQuestionModal(state.snapshot) : ""}
      ${state.snapshot.mode === "feedback" ? renderFeedbackOverlay(state.snapshot) : ""}
      ${
        state.snapshot.mode === "gameOver"
          ? renderGameOverOverlay(state.snapshot, state.leaderboardSaveState)
          : ""
      }
    </main>
  `;
}
