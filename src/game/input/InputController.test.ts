import { describe, expect, it } from "vitest";
import { detectSwipeAction, isActionAllowedForMode, keyboardActionForKey } from "./InputController";

describe("InputController", () => {
  it("maps swipe direction to runner actions", () => {
    expect(detectSwipeAction({ x: 100, y: 100 }, { x: 20, y: 105 })?.type).toBe("moveLeft");
    expect(detectSwipeAction({ x: 100, y: 100 }, { x: 180, y: 105 })?.type).toBe("moveRight");
    expect(detectSwipeAction({ x: 100, y: 100 }, { x: 100, y: 20 })?.type).toBe("jump");
    expect(detectSwipeAction({ x: 100, y: 100 }, { x: 100, y: 180 })).toBeNull();
  });

  it("ignores small swipes", () => {
    expect(detectSwipeAction({ x: 0, y: 0 }, { x: 10, y: 10 })).toBeNull();
  });

  it("gates actions by game mode", () => {
    expect(isActionAllowedForMode({ type: "moveLeft" }, "running")).toBe(true);
    expect(isActionAllowedForMode({ type: "moveLeft" }, "question")).toBe(false);
    expect(isActionAllowedForMode({ type: "answer", choice: "歡騰" }, "question")).toBe(true);
    expect(isActionAllowedForMode({ type: "restart" }, "gameOver")).toBe(true);
    expect(isActionAllowedForMode({ type: "restart" }, "feedback")).toBe(false);
  });

  it("provides a keyboard fallback for development checks", () => {
    expect(keyboardActionForKey("ArrowLeft")?.type).toBe("moveLeft");
    expect(keyboardActionForKey("w")?.type).toBe("jump");
    expect(keyboardActionForKey("ArrowDown")).toBeNull();
    expect(keyboardActionForKey("s")).toBeNull();
    expect(keyboardActionForKey("Enter")).toBeNull();
  });
});
