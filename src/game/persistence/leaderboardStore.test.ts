import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_LIMIT,
  loadLeaderboard,
  normalizeLeaderboardRows,
  saveLeaderboardRecord,
  type LeaderboardClient,
  type LeaderboardRecord,
  type LeaderboardScope
} from "./leaderboardStore";

type LeaderboardRow = {
  class_name: string;
  student_number: string;
  distance_meters: number;
};

function createClient(rows: LeaderboardRow[] = []): LeaderboardClient & {
  inserted: LeaderboardRecord[];
  scopes: LeaderboardScope[];
} {
  return {
    inserted: [],
    scopes: [],
    async fetchBestRecords(scope) {
      this.scopes.push(scope);
      const scopedRows = scope.type === "class"
        ? rows.filter((row) => row.class_name === scope.className)
        : rows;

      return { data: scopedRows, error: null };
    },
    async insertRun(record) {
      this.inserted.push(record);
      rows.push({
        class_name: record.className,
        student_number: record.studentNumber,
        distance_meters: record.distanceMeters
      });
      return { error: null };
    }
  };
}

describe("leaderboardStore", () => {
  it("keeps only each student's best result", () => {
    const records = normalizeLeaderboardRows([
      { class_name: "3A", student_number: "08", distance_meters: 100 },
      { class_name: "3A", student_number: "08", distance_meters: 180 },
      { class_name: "3A", student_number: "09", distance_meters: 150 },
      { class_name: "3B", student_number: "08", distance_meters: 170 }
    ]);

    expect(records).toEqual([
      { className: "3A", studentNumber: "08", distanceMeters: 180 },
      { className: "3B", studentNumber: "08", distanceMeters: 170 },
      { className: "3A", studentNumber: "09", distanceMeters: 150 }
    ]);
  });

  it("loads the global leaderboard sorted by distance and limited to ten", async () => {
    const client = createClient(
      Array.from({ length: 12 }, (_, index) => ({
        class_name: "3A",
        student_number: `${index + 1}`,
        distance_meters: index
      }))
    );

    const result = await loadLeaderboard({ type: "global" }, client);

    expect(result.ok).toBe(true);
    expect(result.records).toHaveLength(LEADERBOARD_LIMIT);
    expect(result.records[0]?.distanceMeters).toBe(11);
    expect(result.records.at(-1)?.distanceMeters).toBe(2);
  });

  it("loads a class leaderboard for the requested class only", async () => {
    const client = createClient([
      { class_name: "3A", student_number: "01", distance_meters: 90 },
      { class_name: "3B", student_number: "02", distance_meters: 200 },
      { class_name: "3A", student_number: "03", distance_meters: 110 }
    ]);

    const result = await loadLeaderboard({ type: "class", className: "3A" }, client);

    expect(result.ok).toBe(true);
    expect(client.scopes).toEqual([{ type: "class", className: "3A" }]);
    expect(result.records).toEqual([
      { className: "3A", studentNumber: "03", distanceMeters: 110 },
      { className: "3A", studentNumber: "01", distanceMeters: 90 }
    ]);
  });

  it("saves a normalized run and returns the class leaderboard", async () => {
    const client = createClient([
      { class_name: "3A", student_number: "08", distance_meters: 120 }
    ]);

    const result = await saveLeaderboardRecord(
      { className: " 3A ", studentNumber: " 08 ", distanceMeters: 180.8 },
      client
    );

    expect(result.ok).toBe(true);
    expect(client.inserted).toEqual([
      { className: "3A", studentNumber: "08", distanceMeters: 180 }
    ]);
    expect(result.records).toEqual([
      { className: "3A", studentNumber: "08", distanceMeters: 180 }
    ]);
  });

  it("rejects empty identity fields and invalid distances", async () => {
    const client = createClient();

    await expect(saveLeaderboardRecord(
      { className: " ", studentNumber: "08", distanceMeters: 10 },
      client
    )).resolves.toEqual({ ok: false, reason: "emptyClass", records: [] });
    await expect(saveLeaderboardRecord(
      { className: "3A", studentNumber: " ", distanceMeters: 10 },
      client
    )).resolves.toEqual({ ok: false, reason: "emptyStudentNumber", records: [] });
    await expect(saveLeaderboardRecord(
      { className: "3A", studentNumber: "08", distanceMeters: -1 },
      client
    )).resolves.toEqual({ ok: false, reason: "invalidScore", records: [] });
    expect(client.inserted).toEqual([]);
  });

  it("reports missing Supabase configuration without throwing", async () => {
    await expect(loadLeaderboard({ type: "global" }, null))
      .resolves.toEqual({ ok: false, reason: "missingConfig", records: [] });
    await expect(saveLeaderboardRecord(
      { className: "3A", studentNumber: "08", distanceMeters: 10 },
      null
    )).resolves.toEqual({ ok: false, reason: "missingConfig", records: [] });
  });

  it("reports Supabase request failures without throwing", async () => {
    const client: LeaderboardClient = {
      async fetchBestRecords() {
        return { data: null, error: new Error("failed") };
      },
      async insertRun() {
        return { error: new Error("failed") };
      }
    };

    await expect(loadLeaderboard({ type: "global" }, client))
      .resolves.toEqual({ ok: false, reason: "requestFailed", records: [] });
    await expect(saveLeaderboardRecord(
      { className: "3A", studentNumber: "08", distanceMeters: 10 },
      client
    )).resolves.toEqual({ ok: false, reason: "requestFailed", records: [] });
  });
});
