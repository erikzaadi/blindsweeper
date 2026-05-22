import { describe, expect, it } from "vitest";
import type { LevelState, MinefieldConfig } from "./types.js";
import {
  buildMinefieldConfig,
  computeProximity,
  containsCell,
  generateMineCells,
  pointToCell,
  resolveDragCollision,
  resolveMark,
} from "./gameEngine.js";

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
    expect(buildMinefieldConfig(1, "seed")).toMatchObject({ rows: 6, cols: 6, mineCount: 3 });
    expect(buildMinefieldConfig(2, "seed")).toMatchObject({ rows: 6, cols: 6, mineCount: 4 });
    expect(buildMinefieldConfig(5, "seed")).toMatchObject({ rows: 6, cols: 6, mineCount: 7 });
  });

  it("increases board size after the density cap", () => {
    expect(buildMinefieldConfig(6, "seed")).toMatchObject({ rows: 8, cols: 8, mineCount: 8 });
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
    expect(result.level.status).toBe("active");
  });

  it("unmarks an already marked mine", () => {
    const result = resolveMark(
      level({ markedCells: [{ row: 1, col: 1 }] }),
      { row: 1, col: 1 },
      "2026-05-22T00:00:01.000Z",
    );

    expect(result.outcome).toBe("unmarked");
    expect(result.level.markedCells).toEqual([]);
    expect(result.level.status).toBe("active");
  });

  it("explodes on an incorrect mark", () => {
    const result = resolveMark(level(), { row: 0, col: 0 }, "2026-05-22T00:00:01.000Z");

    expect(result.outcome).toBe("exploded");
    expect(result.level.status).toBe("exploded");
    expect(result.level.explosionCell).toEqual({ row: 0, col: 0 });
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
