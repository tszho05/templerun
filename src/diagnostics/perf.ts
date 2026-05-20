export type PerfSample = {
  fps: number;
  frameMs: number;
};

export class PerfMeter {
  private frameCount = 0;
  private elapsedMs = 0;
  private latest: PerfSample = { fps: 0, frameMs: 0 };

  update(deltaMs: number): PerfSample {
    this.frameCount += 1;
    this.elapsedMs += deltaMs;
    this.latest = { ...this.latest, frameMs: deltaMs };

    if (this.elapsedMs >= 500) {
      this.latest = {
        fps: Math.round((this.frameCount / this.elapsedMs) * 1000),
        frameMs: deltaMs
      };
      this.frameCount = 0;
      this.elapsedMs = 0;
    }

    return this.latest;
  }
}
