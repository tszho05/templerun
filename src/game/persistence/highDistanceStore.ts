export const HIGH_DISTANCE_STORAGE_KEY = "templerun-vocab-high-distance";

export type StorageAdapter = Pick<Storage, "getItem" | "setItem">;

export function loadHighDistance(storage: StorageAdapter | null = getBrowserStorage()): number {
  try {
    const rawValue = storage?.getItem(HIGH_DISTANCE_STORAGE_KEY);
    if (!rawValue) {
      return 0;
    }

    const value = Number(rawValue);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveHighDistance(
  distance: number,
  storage: StorageAdapter | null = getBrowserStorage()
): boolean {
  if (!Number.isFinite(distance) || distance < 0) {
    return false;
  }

  try {
    storage?.setItem(HIGH_DISTANCE_STORAGE_KEY, String(distance));
    return true;
  } catch {
    return false;
  }
}

function getBrowserStorage(): StorageAdapter | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}
