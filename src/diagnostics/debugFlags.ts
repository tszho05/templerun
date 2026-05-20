export type DebugFlags = {
  showPerf: boolean;
  showState: boolean;
  showCollisionWindow: boolean;
};

export function readDebugFlags(search = window.location.search): DebugFlags {
  const params = new URLSearchParams(search);
  return {
    showPerf: params.get("debug") === "perf" || params.get("debug") === "all",
    showState: params.get("debug") === "state" || params.get("debug") === "all",
    showCollisionWindow: params.get("debug") === "collision" || params.get("debug") === "all"
  };
}
