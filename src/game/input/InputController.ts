import type { GameMode } from "../simulation/GameState";
import type { PlayerAction } from "./PlayerAction";

type Point = {
  x: number;
  y: number;
};

export type InputControllerOptions = {
  target: HTMLElement;
  getMode: () => GameMode;
  dispatch: (action: PlayerAction) => void;
  minSwipeDistance?: number;
};

const DEFAULT_MIN_SWIPE_DISTANCE = 36;

export class InputController {
  private readonly target: HTMLElement;
  private readonly getMode: () => GameMode;
  private readonly dispatchAction: (action: PlayerAction) => void;
  private readonly minSwipeDistance: number;
  private touchStart: Point | null;

  constructor(options: InputControllerOptions) {
    this.target = options.target;
    this.getMode = options.getMode;
    this.dispatchAction = options.dispatch;
    this.minSwipeDistance = options.minSwipeDistance ?? DEFAULT_MIN_SWIPE_DISTANCE;
    this.touchStart = null;

    this.target.addEventListener("touchstart", this.handleTouchStart, { passive: true });
    this.target.addEventListener("touchend", this.handleTouchEnd, { passive: true });
    window.addEventListener("keydown", this.handleKeyDown);
  }

  destroy(): void {
    this.target.removeEventListener("touchstart", this.handleTouchStart);
    this.target.removeEventListener("touchend", this.handleTouchEnd);
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  private readonly handleTouchStart = (event: TouchEvent): void => {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    this.touchStart = { x: touch.clientX, y: touch.clientY };
  };

  private readonly handleTouchEnd = (event: TouchEvent): void => {
    const touch = event.changedTouches[0];
    if (!touch || !this.touchStart) {
      return;
    }

    const action = detectSwipeAction(
      this.touchStart,
      { x: touch.clientX, y: touch.clientY },
      this.minSwipeDistance
    );
    this.touchStart = null;

    if (action) {
      this.dispatchIfAllowed(action);
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const action = keyboardActionForKey(event.key);
    if (!action) {
      return;
    }
    this.dispatchIfAllowed(action);
  };

  private dispatchIfAllowed(action: PlayerAction): void {
    if (isActionAllowedForMode(action, this.getMode())) {
      this.dispatchAction(action);
    }
  }
}

export function detectSwipeAction(
  start: Point,
  end: Point,
  minSwipeDistance = DEFAULT_MIN_SWIPE_DISTANCE
): PlayerAction | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < minSwipeDistance) {
    return null;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? { type: "moveLeft" } : { type: "moveRight" };
  }

  return dy < 0 ? { type: "jump" } : null;
}

export function keyboardActionForKey(key: string): PlayerAction | null {
  switch (key) {
    case "ArrowLeft":
    case "a":
    case "A":
      return { type: "moveLeft" };
    case "ArrowRight":
    case "d":
    case "D":
      return { type: "moveRight" };
    case "ArrowUp":
    case "w":
    case "W":
      return { type: "jump" };
    default:
      return null;
  }
}

export function isActionAllowedForMode(action: PlayerAction, mode: GameMode): boolean {
  if (mode === "running") {
    return (
      action.type === "moveLeft" ||
      action.type === "moveRight" ||
      action.type === "jump"
    );
  }

  if (mode === "question") {
    return action.type === "answer";
  }

  if (mode === "gameOver") {
    return action.type === "restart";
  }

  return false;
}
