import { PerfMeter } from "../diagnostics/perf";
import { createDiagnosticsOverlay } from "../diagnostics/DiagnosticsOverlay";
import { readDebugFlags } from "../diagnostics/debugFlags";
import { loadGameContent } from "../game/content/Content";
import { InputController } from "../game/input/InputController";
import type { PlayerAction } from "../game/input/PlayerAction";
import { loadHighDistance, saveHighDistance } from "../game/persistence/highDistanceStore";
import {
  loadLeaderboard,
  saveLeaderboardRecord,
  type LeaderboardFailureReason,
  type LeaderboardLoadResult,
  type LeaderboardRecord,
  type LeaderboardScope
} from "../game/persistence/leaderboardStore";
import { SimulationCore } from "../game/simulation/SimulationCore";
import { createGameRenderer } from "../render/app/createRenderer";
import { renderSnapshot } from "../render/adapters/renderBridge";
import type { AppView, LeaderboardLoadState, LeaderboardSaveState, UiAction } from "../ui/AppUiState";
import { createOverlayUI } from "../ui/OverlayUI";
import { startGameLoop, type GameLoop } from "./gameLoop";

export type AppInstance = {
  destroy(): void;
};

export function createApp(root: HTMLElement): AppInstance {
  root.replaceChildren();
  const shell = document.createElement("div");
  shell.className = "game-shell";

  const renderRoot = document.createElement("div");
  renderRoot.className = "render-root";
  const uiRoot = document.createElement("div");
  uiRoot.className = "ui-layer-root";
  const diagnosticsRoot = document.createElement("div");
  diagnosticsRoot.className = "diagnostics-layer-root";

  shell.append(renderRoot, uiRoot, diagnosticsRoot);
  root.append(shell);

  try {
    const content = loadGameContent();
    const simulation = new SimulationCore(content.questionSet, {
      highDistance: loadHighDistance()
    });
    let appView: AppView = "start";
    let leaderboardRecords: LeaderboardRecord[] = [];
    let leaderboardScope: LeaderboardScope = { type: "global" };
    let leaderboardClassName = "";
    let leaderboardLoadState: LeaderboardLoadState = { status: "idle" };
    let leaderboardSaveState: LeaderboardSaveState = { status: "idle" };
    let leaderboardRequestId = 0;

    const requestLeaderboard = (scope: LeaderboardScope): void => {
      const requestId = ++leaderboardRequestId;
      leaderboardScope = scope;
      leaderboardRecords = [];
      leaderboardLoadState = { status: "loading" };

      void loadLeaderboard(scope).then((result: LeaderboardLoadResult) => {
        if (requestId !== leaderboardRequestId) {
          return;
        }

        leaderboardRecords = result.records;
        leaderboardLoadState = result.ok
          ? { status: "ready" }
          : { status: "error", message: getLeaderboardLoadErrorMessage(result.reason) };
      });
    };

    const dispatch = (action: UiAction): void => {
      if (action.type === "startGame") {
        simulation.restart(loadHighDistance());
        appView = "playing";
        leaderboardSaveState = { status: "idle" };
        return;
      }

      if (action.type === "showLeaderboard") {
        appView = "leaderboard";
        requestLeaderboard({ type: "global" });
        return;
      }

      if (action.type === "showGlobalLeaderboard") {
        requestLeaderboard({ type: "global" });
        return;
      }

      if (action.type === "showClassLeaderboard") {
        if (!leaderboardClassName) {
          leaderboardScope = { type: "class", className: "" };
          leaderboardRecords = [];
          leaderboardLoadState = { status: "ready" };
          return;
        }

        requestLeaderboard({ type: "class", className: leaderboardClassName });
        return;
      }

      if (action.type === "backToStart") {
        appView = "start";
        leaderboardSaveState = { status: "idle" };
        return;
      }

      if (action.type === "saveLeaderboardRecord") {
        if (
          simulation.getSnapshot().mode !== "gameOver" ||
          leaderboardSaveState.status === "saving" ||
          leaderboardSaveState.status === "saved"
        ) {
          return;
        }

        const score = simulation.getSnapshot().score;
        leaderboardSaveState = { status: "saving" };
        void saveLeaderboardRecord({
          className: action.className,
          studentNumber: action.studentNumber,
          distanceMeters: score.currentDistance
        }).then((result) => {
          if (result.ok) {
            leaderboardClassName = result.record.className;
            leaderboardScope = { type: "class", className: result.record.className };
            leaderboardRecords = result.records;
            leaderboardLoadState = { status: "ready" };
            leaderboardSaveState = { status: "saved", message: "已儲存" };
            return;
          }

          leaderboardSaveState = {
            status: "error",
            message: getLeaderboardSaveErrorMessage(result.reason)
          };
        });
        return;
      }

      if (appView === "playing") {
        simulation.dispatch(action);
      }
    };

    const renderer = createGameRenderer(renderRoot, content.assetManifest, (message) => {
      showBootError(root, message);
    });
    const ui = createOverlayUI(uiRoot, dispatch);
    const input = new InputController({
      target: shell,
      getMode: () => (appView === "playing" ? simulation.getSnapshot().mode : "booting"),
      dispatch: (action: PlayerAction) => dispatch(action)
    });
    const diagnostics = createDiagnosticsOverlay(diagnosticsRoot, readDebugFlags());
    const perf = new PerfMeter();

    const handleResize = (): void => renderer.resize();
    window.addEventListener("resize", handleResize);

    const loop = startGameLoop((deltaMs) => {
      if (appView === "playing") {
        simulation.tick(deltaMs);
      }
      const saveRequest = simulation.consumeHighDistanceSaveRequest();
      if (saveRequest) {
        saveHighDistance(saveRequest.highDistance);
      }

      const snapshot = simulation.getSnapshot();
      renderSnapshot(renderer, snapshot);
      ui.render({
        view: appView,
        snapshot,
        leaderboardRecords,
        leaderboardScope,
        leaderboardClassName,
        leaderboardLoadState,
        leaderboardSaveState
      });
      diagnostics.render(snapshot, perf.update(deltaMs), renderer.getStats());
    });

    return {
      destroy() {
        teardown(loop, input, ui, diagnostics, renderer, handleResize);
      }
    };
  } catch (error) {
    showBootError(root, error instanceof Error ? error.message : "遊戲啟動失敗。");
    return {
      destroy() {
        root.replaceChildren();
      }
    };
  }
}

function getLeaderboardLoadErrorMessage(reason: "missingConfig" | "requestFailed"): string {
  if (reason === "missingConfig") {
    return "請先設定 Supabase 連線";
  }
  return "暫時未能載入排行榜";
}

function getLeaderboardSaveErrorMessage(reason: LeaderboardFailureReason): string {
  if (reason === "emptyClass") {
    return "請輸入班別";
  }
  if (reason === "emptyStudentNumber") {
    return "請輸入學號";
  }
  if (reason === "missingConfig") {
    return "請先設定 Supabase 連線";
  }
  if (reason === "requestFailed") {
    return "暫時未能保存紀錄";
  }
  return "紀錄資料無效";
}

function teardown(
  loop: GameLoop,
  input: InputController,
  ui: ReturnType<typeof createOverlayUI>,
  diagnostics: ReturnType<typeof createDiagnosticsOverlay>,
  renderer: ReturnType<typeof createGameRenderer>,
  handleResize: () => void
): void {
  loop.stop();
  input.destroy();
  ui.destroy();
  diagnostics.destroy();
  renderer.destroy();
  window.removeEventListener("resize", handleResize);
}

function showBootError(root: HTMLElement, message: string): void {
  root.innerHTML = `
    <section class="boot-error" role="alert">
      <div>
        <h1>暫時未能啟動遊戲</h1>
        <p>${escapeHtml(message)}</p>
      </div>
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
