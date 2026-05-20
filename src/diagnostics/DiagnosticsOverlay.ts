import type { GameState } from "../game/simulation/GameState";
import type { RenderStats } from "../render/app/createRenderer";
import type { DebugFlags } from "./debugFlags";
import type { PerfSample } from "./perf";

export type DiagnosticsOverlay = {
  render(snapshot: Readonly<GameState>, perf: PerfSample, renderStats: RenderStats): void;
  destroy(): void;
};

export function createDiagnosticsOverlay(container: HTMLElement, flags: DebugFlags): DiagnosticsOverlay {
  const root = document.createElement("div");
  root.className = "diagnostics-root";

  if (flags.showPerf || flags.showState || flags.showCollisionWindow) {
    root.classList.add("diagnostics-visible");
  }

  container.append(root);

  return {
    render(snapshot, perf, renderStats) {
      if (!root.classList.contains("diagnostics-visible")) {
        return;
      }

      root.innerHTML = `
        <pre class="diagnostics-panel">mode: ${snapshot.mode}
distance: ${snapshot.distanceMeters.toFixed(1)}
speed: ${snapshot.speed.toFixed(1)}
lane: ${snapshot.runner.laneIndex}
question: ${snapshot.currentQuestion?.id ?? "-"}
pressure: ${snapshot.chase.pressure.toFixed(0)}
fps: ${perf.fps}
frame: ${perf.frameMs.toFixed(1)}ms
objects: ${renderStats.objectCount}</pre>
      `;
    },
    destroy() {
      root.remove();
    }
  };
}
