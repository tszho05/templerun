export type GameLoop = {
  stop(): void;
};

export function startGameLoop(update: (deltaMs: number) => void): GameLoop {
  let frameId = 0;
  let lastTime = performance.now();
  let running = true;

  const frame = (now: number): void => {
    if (!running) {
      return;
    }

    const deltaMs = document.hidden ? 0 : now - lastTime;
    lastTime = now;
    update(deltaMs);
    frameId = requestAnimationFrame(frame);
  };

  frameId = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(frameId);
    }
  };
}
