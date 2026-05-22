import type { CellCoord, GameRun, LevelState, PersistedGameState, PlayerStats, Profile } from "../types";
import { buildMinefieldConfig, generateMineCells, resolveMark } from "../game/gameEngine";
import { createEmptyPersistedGameState } from "./localStorageState";

export type ActiveRunSnapshot = {
  profile: Profile;
  run: GameRun;
  currentLevel: LevelState;
};

export function startRun(state: PersistedGameState, profileId = state.selectedProfileId, now = nowIso()): PersistedGameState {
  if (!profileId || !state.profiles.some((profile) => profile.id === profileId)) {
    return state;
  }

  const run: GameRun = {
    id: createId("run"),
    profileId,
    status: "active",
    currentLevelId: "",
    startedAt: now,
    updatedAt: now,
  };
  const currentLevel = createLevel(run.id, 1, now);
  const runWithLevel: GameRun = {
    ...run,
    currentLevelId: currentLevel.id,
  };

  return {
    ...state,
    selectedProfileId: profileId,
    runs: [...state.runs, runWithLevel],
    levels: [...state.levels, currentLevel],
  };
}

export function getActiveRunSnapshot(state: PersistedGameState): ActiveRunSnapshot | null {
  const profile = state.profiles.find((candidate) => candidate.id === state.selectedProfileId);
  if (!profile) {
    return null;
  }

  const run = [...state.runs]
    .reverse()
    .find((candidate) => candidate.profileId === profile.id && candidate.status === "active");
  if (!run) {
    return null;
  }

  const currentLevel = state.levels.find((level) => level.id === run.currentLevelId);
  if (!currentLevel) {
    return null;
  }

  return {
    profile,
    run,
    currentLevel,
  };
}

export function getSelectedRunSnapshot(state: PersistedGameState): ActiveRunSnapshot | null {
  return getSelectedLatestRunSnapshot(state);
}

export function markCurrentLevel(
  state: PersistedGameState,
  cell: CellCoord,
  now = nowIso(),
): PersistedGameState {
  const snapshot = getActiveRunSnapshot(state);
  if (!snapshot) {
    return state;
  }

  const markResult = resolveMark(snapshot.currentLevel, cell, now);
  const updatedLevels = replaceLevel(state.levels, markResult.level);

  if (markResult.outcome === "exploded") {
    return {
      ...state,
      levels: updatedLevels,
      runs: replaceRun(state.runs, {
        ...snapshot.run,
        status: "failed",
        updatedAt: now,
        completedAt: now,
      }),
    };
  }

  if (markResult.outcome === "completed") {
    const nextLevel = createLevel(snapshot.run.id, snapshot.currentLevel.levelNumber + 1, now);
    return {
      ...state,
      levels: [...updatedLevels, nextLevel],
      runs: replaceRun(state.runs, {
        ...snapshot.run,
        currentLevelId: nextLevel.id,
        updatedAt: now,
      }),
    };
  }

  return {
    ...state,
    levels: updatedLevels,
    runs: replaceRun(state.runs, {
      ...snapshot.run,
      updatedAt: now,
    }),
  };
}

export function failCurrentLevel(
  state: PersistedGameState,
  cell: CellCoord,
  now = nowIso(),
): PersistedGameState {
  const snapshot = getActiveRunSnapshot(state);
  if (!snapshot || snapshot.currentLevel.status !== "active") {
    return state;
  }

  const failedLevel: LevelState = {
    ...snapshot.currentLevel,
    status: "exploded",
    explosionCell: cell,
    updatedAt: now,
  };

  return {
    ...state,
    levels: replaceLevel(state.levels, failedLevel),
    runs: replaceRun(state.runs, {
      ...snapshot.run,
      status: "failed",
      updatedAt: now,
      completedAt: now,
    }),
  };
}

export function resetCurrentLevel(state: PersistedGameState, now = nowIso()): PersistedGameState {
  const snapshot = getActiveRunSnapshot(state) ?? getSelectedLatestRunSnapshot(state);
  if (!snapshot) {
    return state;
  }

  return resetSnapshotLevel(state, snapshot, now);
}

export function resetRunLevel(state: PersistedGameState, runId: string, now = nowIso()): PersistedGameState {
  const snapshot = getRunSnapshot(state, runId);
  if (!snapshot) {
    return state;
  }

  return resetSnapshotLevel(state, snapshot, now);
}

function resetSnapshotLevel(
  state: PersistedGameState,
  snapshot: ActiveRunSnapshot,
  now: string,
): PersistedGameState {
  const replacementLevel = createLevel(snapshot.run.id, snapshot.currentLevel.levelNumber, now);
  return {
    ...state,
    levels: [...state.levels, replacementLevel],
    runs: replaceRun(state.runs, {
      ...snapshot.run,
      status: "active",
      currentLevelId: replacementLevel.id,
      updatedAt: now,
      completedAt: undefined,
    }),
  };
}

export function getPlayerStats(state: PersistedGameState, profileId: string): PlayerStats {
  const runs = state.runs.filter((run) => run.profileId === profileId);
  const runIds = new Set(runs.map((run) => run.id));
  const levels = state.levels.filter((level) => runIds.has(level.runId));
  const completedLevels = levels.filter((level) => level.status === "completed");
  const activeRun = runs.find((run) => run.status === "active");
  const currentStreak = activeRun
    ? levels.filter((level) => level.runId === activeRun.id && level.status === "completed").length
    : 0;
  const bestStreak = runs.reduce((best, run) => {
    const completedForRun = levels.filter((level) => level.runId === run.id && level.status === "completed").length;
    return Math.max(best, completedForRun);
  }, 0);

  return {
    profileId,
    runsStarted: runs.length,
    levelsCompleted: completedLevels.length,
    explosions: levels.filter((level) => level.status === "exploded").length,
    highestLevelCompleted: completedLevels.reduce((highest, level) => Math.max(highest, level.levelNumber), 0),
    currentStreak,
    bestStreak,
  };
}

export function createInitialGameState(): PersistedGameState {
  return createEmptyPersistedGameState();
}

function createLevel(runId: string, levelNumber: number, now: string): LevelState {
  const config = buildMinefieldConfig(levelNumber, `${runId}:${levelNumber}:${now}`);
  const mines = generateMineCells(config);

  return {
    id: createId("level"),
    runId,
    levelNumber,
    config,
    mines,
    markedCells: [],
    markHints: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

function replaceLevel(levels: LevelState[], updatedLevel: LevelState): LevelState[] {
  return levels.map((level) => level.id === updatedLevel.id ? updatedLevel : level);
}

function replaceRun(runs: GameRun[], updatedRun: GameRun): GameRun[] {
  return runs.map((run) => run.id === updatedRun.id ? updatedRun : run);
}

function getSelectedLatestRunSnapshot(state: PersistedGameState): ActiveRunSnapshot | null {
  const profile = state.profiles.find((candidate) => candidate.id === state.selectedProfileId);
  if (!profile) {
    return null;
  }

  const run = [...state.runs]
    .reverse()
    .find((candidate) => candidate.profileId === profile.id);
  if (!run) {
    return null;
  }

  const currentLevel = state.levels.find((level) => level.id === run.currentLevelId);
  if (!currentLevel) {
    return null;
  }

  return {
    profile,
    run,
    currentLevel,
  };
}

function getRunSnapshot(state: PersistedGameState, runId: string): ActiveRunSnapshot | null {
  const run = state.runs.find((candidate) => candidate.id === runId);
  if (!run) {
    return null;
  }

  const profile = state.profiles.find((candidate) => candidate.id === run.profileId);
  if (!profile) {
    return null;
  }

  const currentLevel = state.levels.find((level) => level.id === run.currentLevelId);
  if (!currentLevel) {
    return null;
  }

  return {
    profile,
    run,
    currentLevel,
  };
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}
