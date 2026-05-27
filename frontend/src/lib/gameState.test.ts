import { describe, expect, it } from "vitest";
import {
  advanceToNextLevel,
  createInitialGameState,
  failCurrentLevel,
  getActiveRunSnapshot,
  getSelectedRunSnapshot,
  markCurrentLevel,
  resetRunLevel,
  startRun,
} from "./gameState";

describe("gameState", () => {
  it("starts a run from the default profile", () => {
    const state = createInitialGameState();
    const withRun = startRun(state, state.selectedProfileId, "2026-05-22T00:00:01.000Z");
    const snapshot = getActiveRunSnapshot(withRun);

    expect(snapshot?.profile.displayName).toBe("Player");
    expect(snapshot?.run.status).toBe("active");
    expect(snapshot?.currentLevel.levelNumber).toBe(1);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.currentLevel.mines).toHaveLength(snapshot!.currentLevel.config.mineCount);
  });

  it("marks all mines and advances to the next level", () => {
    let state = createInitialGameState();
    state = startRun(state, state.selectedProfileId, "2026-05-22T00:00:01.000Z");
    const firstLevel = getActiveRunSnapshot(state)?.currentLevel;
    expect(firstLevel).toBeDefined();

    for (const mine of firstLevel!.mines) {
      state = markCurrentLevel(state, mine, "2026-05-22T00:00:02.000Z");
    }

    const completedLevel = state.levels.find((level) => level.id === firstLevel!.id);
    expect(completedLevel?.status).toBe("completed");
    expect(getActiveRunSnapshot(state)?.currentLevel.levelNumber).toBe(1);

    state = advanceToNextLevel(state, "2026-05-22T00:00:03.000Z");
    expect(getActiveRunSnapshot(state)?.currentLevel.levelNumber).toBe(2);
  });

  it("marks a safe cell with a proximity hint", () => {
    let state = createInitialGameState();
    state = startRun(state, state.selectedProfileId, "2026-05-22T00:00:01.000Z");
    const snapshot = getActiveRunSnapshot(state);
    expect(snapshot).toBeDefined();
    const safeCell = findSafeCell(snapshot!.currentLevel.mines);

    state = markCurrentLevel(state, safeCell, "2026-05-22T00:00:02.000Z");

    const nextSnapshot = getActiveRunSnapshot(state);
    expect(nextSnapshot?.run.status).toBe("active");
    expect(nextSnapshot?.currentLevel.status).toBe("active");
    expect(nextSnapshot?.currentLevel.markedCells).toContainEqual(safeCell);
    expect(nextSnapshot?.currentLevel.markHints?.[0]?.cell).toEqual(safeCell);
  });

  it("fails on drag collision and keeps the failed level visible", () => {
    let state = createInitialGameState();
    state = startRun(state, state.selectedProfileId, "2026-05-22T00:00:01.000Z");
    const snapshot = getActiveRunSnapshot(state);
    expect(snapshot).toBeDefined();
    const mine = snapshot!.currentLevel.mines[0];

    state = failCurrentLevel(state, mine, "2026-05-22T00:00:02.000Z");

    const failedSnapshot = getSelectedRunSnapshot(state);
    expect(getActiveRunSnapshot(state)).toBeNull();
    expect(failedSnapshot?.run.status).toBe("failed");
    expect(failedSnapshot?.currentLevel.status).toBe("exploded");
    expect(failedSnapshot?.currentLevel.explosionCell).toEqual(mine);
  });

  it("restarts the displayed failed run", () => {
    let state = createInitialGameState();
    state = startRun(state, state.selectedProfileId, "2026-05-22T00:00:01.000Z");
    const snapshot = getActiveRunSnapshot(state);
    expect(snapshot).toBeDefined();

    state = failCurrentLevel(state, snapshot!.currentLevel.mines[0], "2026-05-22T00:00:02.000Z");
    state = resetRunLevel(state, snapshot!.run.id, "2026-05-22T00:00:03.000Z");

    const restartedSnapshot = getSelectedRunSnapshot(state);
    expect(restartedSnapshot?.run.id).toBe(snapshot!.run.id);
    expect(restartedSnapshot?.run.status).toBe("active");
    expect(restartedSnapshot?.currentLevel.status).toBe("active");
    expect(restartedSnapshot?.currentLevel.id).not.toBe(snapshot!.currentLevel.id);
  });
});

function findSafeCell(mines: Array<{ row: number; col: number }>) {
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      if (!mines.some((mine) => mine.row === row && mine.col === col)) {
        return { row, col };
      }
    }
  }

  throw new Error("No safe cell found");
}
