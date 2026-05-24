import { describe, expect, it } from "vitest";
import type { LevelState, MinefieldConfig } from "./types";
import {
  buildMinefieldConfig,
  computeProximity,
  containsCell,
  generateMineCells,
  pointToCell,
  resolveDragCollision,
  resolveMark,
} from "./gameEngine";

const config: MinefieldConfig = {
  rows: 4,
  cols: 4,
  mineCount: 2,
  levelNumber: 1,
  seed: "test-seed",
  generatorVersion: 1,
  proximityRadiusCells: 2,
};

const level = (overrides: Partial<LevelState> = {}): LevelState => ({
  id: "level-1",
  runId: "run-1",
  levelNumber: 1,
  config,
  mines: [
    { row: 1, col: 1 },
    { row: 2, col: 3 },
  ],
  markedCells: [],
  status: "active",
  createdAt: "2026-05-22T00:00:00.000Z",
  updatedAt: "2026-05-22T00:00:00.000Z",
  ...overrides,
});

describe("buildMinefieldConfig", () => {
  it("increases mine count before board size", () => {
    expect(buildMinefieldConfig(1, "seed")).toMatchObject({ rows: 10, cols: 10, mineCount: 6 });
    expect(buildMinefieldConfig(2, "seed")).toMatchObject({ rows: 10, cols: 10, mineCount: 7 });
    expect(buildMinefieldConfig(5, "seed")).toMatchObject({ rows: 10, cols: 10, mineCount: 10 });
  });

  it("increases board size after the density cap", () => {
    expect(buildMinefieldConfig(12, "seed")).toMatchObject({ rows: 12, cols: 12, mineCount: 17 });
  });
});

describe("generateMineCells", () => {
  it("creates the requested number of unique mines deterministically", () => {
    const first = generateMineCells(config);
    const second = generateMineCells(config);
    const uniqueKeys = new Set(first.map((cell) => `${cell.row}:${cell.col}`));

    expect(first).toEqual(second);
    expect(first).toHaveLength(config.mineCount);
    expect(uniqueKeys.size).toBe(config.mineCount);
  });
});

describe("pointToCell", () => {
  it("maps board coordinates to clamped grid cells", () => {
    expect(pointToCell({ x: 25, y: 25 }, { width: 100, height: 100 }, config)).toEqual({ row: 1, col: 1 });
    expect(pointToCell({ x: 999, y: 999 }, { width: 100, height: 100 }, config)).toEqual({ row: 3, col: 3 });
  });
});

describe("computeProximity", () => {
  it("returns high intensity near an unmarked mine", () => {
    const result = computeProximity(
      { x: 37.5, y: 37.5 },
      { width: 100, height: 100 },
      config,
      level().mines,
    );

    expect(result.nearestMine).toEqual({ row: 1, col: 1 });
    expect(result.distanceCells).toBeCloseTo(0);
    expect(result.intensity).toBe(1);
  });

  it("ignores marked mines for live proximity", () => {
    const result = computeProximity(
      { x: 37.5, y: 37.5 },
      { width: 100, height: 100 },
      config,
      level().mines,
      [{ row: 1, col: 1 }],
    );

    expect(result.nearestMine).toEqual({ row: 2, col: 3 });
    expect(result.intensity).toBeLessThan(1);
  });
});

describe("resolveDragCollision", () => {
  it("explodes on an unmarked mine", () => {
    expect(resolveDragCollision({ row: 1, col: 1 }, level().mines)).toEqual({
      exploded: true,
      cell: { row: 1, col: 1 },
    });
  });

  it("does not explode on a marked mine", () => {
    expect(resolveDragCollision({ row: 1, col: 1 }, level().mines, [{ row: 1, col: 1 }])).toEqual({
      exploded: false,
    });
  });
});

describe("resolveMark", () => {
  it("marks a mine", () => {
    const result = resolveMark(level(), { row: 1, col: 1 }, "2026-05-22T00:00:01.000Z");

    expect(result.outcome).toBe("marked");
    expect(containsCell(result.level.markedCells, { row: 1, col: 1 })).toBe(true);
    expect(result.level.markHints?.[0]?.intensity).toBe(1);
    expect(result.level.status).toBe("active");
  });

  it("ignores an already marked cell", () => {
    const alreadyMarked = level({
      markedCells: [{ row: 1, col: 1 }],
      markHints: [{
        cell: { row: 1, col: 1 },
        nearestMine: { row: 1, col: 1 },
        distanceCells: 0,
        intensity: 1,
      }],
    });
    const result = resolveMark(alreadyMarked, { row: 1, col: 1 }, "2026-05-22T00:00:01.000Z");

    expect(result.outcome).toBe("ignored");
    expect(result.level).toBe(alreadyMarked);
  });

  it("marks a safe cell with a proximity hint", () => {
    const result = resolveMark(level(), { row: 0, col: 0 }, "2026-05-22T00:00:01.000Z");

    expect(result.outcome).toBe("marked");
    expect(result.level.status).toBe("active");
    expect(result.level.markedCells).toContainEqual({ row: 0, col: 0 });
    expect(result.level.markHints?.[0]?.cell).toEqual({ row: 0, col: 0 });
    expect(result.level.markHints?.[0]?.intensity).toBeGreaterThan(0);
  });

  it("completes when all mines are marked", () => {
    const result = resolveMark(
      level({ markedCells: [{ row: 1, col: 1 }] }),
      { row: 2, col: 3 },
      "2026-05-22T00:00:01.000Z",
    );

    expect(result.outcome).toBe("completed");
    expect(result.level.status).toBe("completed");
    expect(result.level.completedAt).toBe("2026-05-22T00:00:01.000Z");
  });
});
