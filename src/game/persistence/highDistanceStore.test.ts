import { describe, expect, it } from "vitest";
import {
  HIGH_DISTANCE_STORAGE_KEY,
  loadHighDistance,
  saveHighDistance,
  type StorageAdapter
} from "./highDistanceStore";

function createStorage(initialValue: string | null = null): StorageAdapter & { value: string | null } {
  return {
    value: initialValue,
    getItem() {
      return this.value;
    },
    setItem(_key: string, value: string) {
      this.value = value;
    }
  };
}

describe("highDistanceStore", () => {
  it("loads valid values and falls back to zero for empty or bad data", () => {
    expect(loadHighDistance(createStorage("123"))).toBe(123);
    expect(loadHighDistance(createStorage(null))).toBe(0);
    expect(loadHighDistance(createStorage("bad"))).toBe(0);
  });

  it("saves non-negative finite distances and ignores invalid input", () => {
    const storage = createStorage();

    expect(saveHighDistance(88, storage)).toBe(true);
    expect(storage.value).toBe("88");
    expect(saveHighDistance(-1, storage)).toBe(false);
    expect(storage.value).toBe("88");
  });

  it("uses the expected storage key", () => {
    expect(HIGH_DISTANCE_STORAGE_KEY).toBe("templerun-vocab-high-distance");
  });
});
