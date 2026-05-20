import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const LEADERBOARD_LIMIT = 10;
export const CLASS_NAME_MAX_LENGTH = 12;
export const STUDENT_NUMBER_MAX_LENGTH = 12;

export type LeaderboardScope =
  | { type: "global" }
  | { type: "class"; className: string };

export type LeaderboardRecord = {
  className: string;
  studentNumber: string;
  distanceMeters: number;
};

export type LeaderboardRecordInput = {
  className: string;
  studentNumber: string;
  distanceMeters: number;
};

export type LeaderboardFailureReason =
  | "emptyClass"
  | "emptyStudentNumber"
  | "invalidScore"
  | "missingConfig"
  | "requestFailed";

export type LeaderboardLoadResult =
  | { ok: true; records: LeaderboardRecord[] }
  | { ok: false; reason: "missingConfig" | "requestFailed"; records: LeaderboardRecord[] };

export type LeaderboardSaveResult =
  | { ok: true; record: LeaderboardRecord; records: LeaderboardRecord[] }
  | { ok: false; reason: LeaderboardFailureReason; records: LeaderboardRecord[] };

export type LeaderboardClient = {
  fetchBestRecords(scope: LeaderboardScope): Promise<{ data: unknown; error: unknown }>;
  insertRun(record: LeaderboardRecord): Promise<{ error: unknown }>;
};

let configuredClient: LeaderboardClient | null | undefined;

export function getConfiguredLeaderboardClient(): LeaderboardClient | null {
  if (configuredClient !== undefined) {
    return configuredClient;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    configuredClient = null;
    return configuredClient;
  }

  configuredClient = createSupabaseLeaderboardClient(createClient(url, key));
  return configuredClient;
}

export function createSupabaseLeaderboardClient(supabase: SupabaseClient): LeaderboardClient {
  return {
    async fetchBestRecords(scope) {
      let query = supabase
        .from("leaderboard_best")
        .select("class_name, student_number, distance_meters");

      if (scope.type === "class") {
        query = query.eq("class_name", normalizeText(scope.className, CLASS_NAME_MAX_LENGTH));
      }

      const { data, error } = await query
        .order("distance_meters", { ascending: false })
        .limit(LEADERBOARD_LIMIT);
      return { data, error };
    },
    async insertRun(record) {
      const { error } = await supabase.from("leaderboard_runs").insert({
        class_name: record.className,
        student_number: record.studentNumber,
        distance_meters: record.distanceMeters
      });
      return { error };
    }
  };
}

export async function loadLeaderboard(
  scope: LeaderboardScope,
  client: LeaderboardClient | null = getConfiguredLeaderboardClient()
): Promise<LeaderboardLoadResult> {
  const normalizedScope = normalizeScope(scope);

  if (normalizedScope.type === "class" && !normalizedScope.className) {
    return { ok: true, records: [] };
  }

  if (!client) {
    return { ok: false, reason: "missingConfig", records: [] };
  }

  try {
    const result = await client.fetchBestRecords(normalizedScope);
    if (result.error) {
      return { ok: false, reason: "requestFailed", records: [] };
    }

    return { ok: true, records: normalizeLeaderboardRows(result.data) };
  } catch {
    return { ok: false, reason: "requestFailed", records: [] };
  }
}

export async function saveLeaderboardRecord(
  input: LeaderboardRecordInput,
  client: LeaderboardClient | null = getConfiguredLeaderboardClient()
): Promise<LeaderboardSaveResult> {
  const className = normalizeText(input.className, CLASS_NAME_MAX_LENGTH);
  const studentNumber = normalizeText(input.studentNumber, STUDENT_NUMBER_MAX_LENGTH);
  const distanceMeters = normalizeDistance(input.distanceMeters);

  if (!className) {
    return { ok: false, reason: "emptyClass", records: [] };
  }

  if (!studentNumber) {
    return { ok: false, reason: "emptyStudentNumber", records: [] };
  }

  if (distanceMeters === null) {
    return { ok: false, reason: "invalidScore", records: [] };
  }

  if (!client) {
    return { ok: false, reason: "missingConfig", records: [] };
  }

  const record: LeaderboardRecord = { className, studentNumber, distanceMeters };
  try {
    const insertResult = await client.insertRun(record);
    if (insertResult.error) {
      return { ok: false, reason: "requestFailed", records: [] };
    }
  } catch {
    return { ok: false, reason: "requestFailed", records: [] };
  }

  const recordsResult = await loadLeaderboard({ type: "class", className }, client);
  return {
    ok: true,
    record,
    records: recordsResult.records
  };
}

export function normalizeLeaderboardRows(rows: unknown): LeaderboardRecord[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  const bestByStudent = new Map<string, LeaderboardRecord>();

  for (const row of rows) {
    const record = parseLeaderboardRow(row);
    if (!record) {
      continue;
    }

    const key = `${record.className}\u0000${record.studentNumber}`;
    const existing = bestByStudent.get(key);
    if (!existing || record.distanceMeters > existing.distanceMeters) {
      bestByStudent.set(key, record);
    }
  }

  return [...bestByStudent.values()]
    .sort((a, b) => {
      if (b.distanceMeters !== a.distanceMeters) {
        return b.distanceMeters - a.distanceMeters;
      }
      const classOrder = a.className.localeCompare(b.className, "zh-Hant");
      return classOrder !== 0
        ? classOrder
        : a.studentNumber.localeCompare(b.studentNumber, "zh-Hant", { numeric: true });
    })
    .slice(0, LEADERBOARD_LIMIT);
}

function normalizeScope(scope: LeaderboardScope): LeaderboardScope {
  if (scope.type === "global") {
    return scope;
  }

  return {
    type: "class",
    className: normalizeText(scope.className, CLASS_NAME_MAX_LENGTH)
  };
}

function parseLeaderboardRow(row: unknown): LeaderboardRecord | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const value = row as {
    class_name?: unknown;
    student_number?: unknown;
    distance_meters?: unknown;
  };
  const className = typeof value.class_name === "string"
    ? normalizeText(value.class_name, CLASS_NAME_MAX_LENGTH)
    : "";
  const studentNumber = typeof value.student_number === "string"
    ? normalizeText(value.student_number, STUDENT_NUMBER_MAX_LENGTH)
    : "";
  const distanceMeters = typeof value.distance_meters === "number"
    ? normalizeDistance(value.distance_meters)
    : null;

  if (!className || !studentNumber || distanceMeters === null) {
    return null;
  }

  return { className, studentNumber, distanceMeters };
}

function normalizeText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function normalizeDistance(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}
