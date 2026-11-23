import type {
  CellCoord,
  GameRun,
  GameRunStatus,
  GameSettings,
  LevelState,
  LevelStatus,
  MarkHint,
  MinefieldConfig,
  PersistedGameState,
  Profile,
} from "../types";
import { devLog } from "./devLog";

export const STORAGE_KEY = "blindsweeper:v1";
export const CURRENT_SCHEMA_VERSION = 1;
export const DEFAULT_PROFILE_ID = "profile_default";

const DEFAULT_PROFILE: Profile = {
  id: DEFAULT_PROFILE_ID,
  displayName: "Player",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const DEFAULT_SETTINGS: GameSettings = {
  hapticsEnabled: true,
  audioEnabled: true,
  visualFallbackEnabled: true,
  debugReveal: false,
};

export function createEmptyPersistedGameState(): PersistedGameState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profiles: [DEFAULT_PROFILE],
    selectedProfileId: DEFAULT_PROFILE_ID,
    runs: [],
    levels: [],
    settings: DEFAULT_SETTINGS,
  };
}

let persistenceDisabled = false;
let storageWarned = false;
let saveFailed = false;
const saveStatusListeners = new Set<() => void>();

// Reading window.localStorage throws SecurityError when site data is blocked.
export function getStorage(): Storage | null {
  if (persistenceDisabled) {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    if (!storageWarned) {
      storageWarned = true;
      console.warn("[BlindSweeper] localStorage unavailable", error);
    }
    return null;
  }
}

// Used by the recovery screen to continue in memory when storage cannot be cleared.
export function disablePersistence(): void {
  persistenceDisabled = true;
}

function setSaveFailed(next: boolean): void {
  if (saveFailed === next) {
    return;
  }
  saveFailed = next;
  saveStatusListeners.forEach((listener) => listener());
}

export function getSaveFailed(): boolean {
  return saveFailed;
}

export function subscribeSaveStatus(listener: () => void): () => void {
  saveStatusListeners.add(listener);
  return () => {
    saveStatusListeners.delete(listener);
  };
}

export function loadPersistedGameState(storage: Storage | null = getStorage()): PersistedGameState {
  if (!storage) {
    return createEmptyPersistedGameState();
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyPersistedGameState();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (isPersistedGameState(parsed)) {
      return ensureDefaultProfile(parsed);
    }

    devLog.warn("[BlindSweeper] Ignoring invalid local state", parsed);
    return createEmptyPersistedGameState();
  } catch (error) {
    devLog.warn("[BlindSweeper] Failed to read local state", error);
    return createEmptyPersistedGameState();
  }
}

// Returns false when the state could not be written (blocked storage or quota).
export function savePersistedGameState(
  state: PersistedGameState,
  storage: Storage | null = getStorage(),
): boolean {
  if (!storage) {
    setSaveFailed(true);
    return false;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaveFailed(false);
    return true;
  } catch (error) {
    if (!saveFailed) {
      console.warn("[BlindSweeper] Failed to save local state", error);
    }
    setSaveFailed(true);
    return false;
  }
}

// Returns false when saved data could not be removed.
export function clearPersistedGameState(storage: Storage | null = getStorage()): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn("[BlindSweeper] Failed to clear local state", error);
    return false;
  }
}

export function readFlag(key: string, storage: Storage | null = getStorage()): boolean {
  try {
    return storage?.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(key: string, storage: Storage | null = getStorage()): void {
  try {
    storage?.setItem(key, "1");
  } catch {
    // A flag that fails to persist only means the hint shows again next visit.
  }
}

function ensureDefaultProfile(state: PersistedGameState): PersistedGameState {
  const hasDefault = state.profiles.some((p) => p.id === DEFAULT_PROFILE_ID);
  if (hasDefault && state.selectedProfileId === DEFAULT_PROFILE_ID) {
    return state;
  }

  return {
    ...state,
    profiles: hasDefault ? state.profiles : [...state.profiles, DEFAULT_PROFILE],
    selectedProfileId: DEFAULT_PROFILE_ID,
  };
}

function isPersistedGameState(value: unknown): value is PersistedGameState {
  if (!isRecord(value)) {
    return false;
  }

  return value.schemaVersion === CURRENT_SCHEMA_VERSION
    && isArrayOf(value.profiles, isProfile)
    && isArrayOf(value.runs, isGameRun)
    && isArrayOf(value.levels, isLevelState)
    && (typeof value.selectedProfileId === "undefined" || typeof value.selectedProfileId === "string")
    && isSettings(value.settings);
}

function isSettings(value: unknown): value is GameSettings {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.hapticsEnabled === "boolean"
    && typeof value.audioEnabled === "boolean"
    && typeof value.visualFallbackEnabled === "boolean"
    && typeof value.debugReveal === "boolean";
}

const RUN_STATUSES: readonly GameRunStatus[] = ["active", "failed", "completed", "abandoned"];
const LEVEL_STATUSES: readonly LevelStatus[] = ["active", "exploded", "completed"];

function isProfile(value: unknown): value is Profile {
  return isRecord(value)
    && isString(value.id)
    && isString(value.displayName)
    && isString(value.createdAt)
    && isString(value.updatedAt);
}

function isGameRun(value: unknown): value is GameRun {
  return isRecord(value)
    && isString(value.id)
    && isString(value.profileId)
    && RUN_STATUSES.includes(value.status as GameRunStatus)
    && isString(value.currentLevelId)
    && isString(value.startedAt)
    && isString(value.updatedAt)
    && isOptional(value.completedAt, isString);
}

function isLevelState(value: unknown): value is LevelState {
  return isRecord(value)
    && isString(value.id)
    && isString(value.runId)
    && isFiniteNumber(value.levelNumber)
    && isMinefieldConfig(value.config)
    && isArrayOf(value.mines, isCellCoord)
    && isArrayOf(value.markedCells, isCellCoord)
    && isOptional(value.markHints, (hints) => isArrayOf(hints, isMarkHint))
    && LEVEL_STATUSES.includes(value.status as LevelStatus)
    && isOptional(value.explosionCell, isCellCoord)
    && isString(value.createdAt)
    && isString(value.updatedAt)
    && isOptional(value.completedAt, isString);
}

function isMinefieldConfig(value: unknown): value is MinefieldConfig {
  return isRecord(value)
    && isFiniteNumber(value.rows)
    && isFiniteNumber(value.cols)
    && isFiniteNumber(value.mineCount)
    && isFiniteNumber(value.levelNumber)
    && isString(value.seed)
    && isFiniteNumber(value.proximityRadiusCells);
}

function isMarkHint(value: unknown): value is MarkHint {
  return isRecord(value)
    && isCellCoord(value.cell)
    && isOptional(value.nearestMine, isCellCoord)
    && isFiniteNumber(value.distanceCells)
    && isFiniteNumber(value.intensity);
}

function isCellCoord(value: unknown): value is CellCoord {
  return isRecord(value) && isFiniteNumber(value.row) && isFiniteNumber(value.col);
}

function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function isOptional(value: unknown, guard: (item: unknown) => boolean): boolean {
  return typeof value === "undefined" || guard(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
