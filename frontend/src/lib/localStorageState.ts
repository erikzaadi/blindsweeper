import type { GameSettings, PersistedGameState, Profile } from "../types";
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
  audioEnabled: false,
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

export function loadPersistedGameState(storage: Storage = window.localStorage): PersistedGameState {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyPersistedGameState();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isPersistedGameState(parsed)) {
      return ensureDefaultProfile(parsed);
    }

    devLog.warn("[BlindSweeper] Ignoring invalid local state", parsed);
    return createEmptyPersistedGameState();
  } catch (error) {
    devLog.warn("[BlindSweeper] Failed to parse local state", error);
    return createEmptyPersistedGameState();
  }
}

export function savePersistedGameState(
  state: PersistedGameState,
  storage: Storage = window.localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedGameState(storage: Storage = window.localStorage): PersistedGameState {
  storage.removeItem(STORAGE_KEY);
  return createEmptyPersistedGameState();
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
    && Array.isArray(value.profiles)
    && Array.isArray(value.runs)
    && Array.isArray(value.levels)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
