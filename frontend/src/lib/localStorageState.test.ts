import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInitialGameState, startRun } from "./gameState";
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  clearPersistedGameState,
  createEmptyPersistedGameState,
  getSaveFailed,
  loadPersistedGameState,
  readFlag,
  savePersistedGameState,
  writeFlag,
} from "./localStorageState";

// Mimics browsers where reading window.localStorage throws (site data blocked).
function blockLocalStorageGetter(): () => void {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  return () => {
    if (original) {
      Object.defineProperty(window, "localStorage", original);
    } else {
      delete (window as { localStorage?: Storage }).localStorage;
    }
  };
}

// Mimics a storage object whose methods throw (quota exceeded, private mode).
function throwingStorage(): Storage {
  const fail = () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  };
  return {
    length: 0,
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

describe("localStorageState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty state when nothing is stored", () => {
    expect(loadPersistedGameState()).toEqual(createEmptyPersistedGameState());
  });

  it("saves and loads valid state", () => {
    const state = {
      ...createEmptyPersistedGameState(),
      settings: {
        ...DEFAULT_SETTINGS,
        debugReveal: true,
      },
    };

    expect(savePersistedGameState(state)).toBe(true);

    expect(loadPersistedGameState()).toEqual(state);
  });

  it("keeps a valid v1 save with runs and levels readable", () => {
    const state = startRun(createInitialGameState());
    savePersistedGameState(state);

    expect(loadPersistedGameState()).toEqual(state);
  });

  it("recovers from corrupt localStorage data", () => {
    localStorage.setItem(STORAGE_KEY, "{bad json");

    expect(loadPersistedGameState()).toEqual(createEmptyPersistedGameState());
  });

  it("recovers from malformed nested records", () => {
    const state = startRun(createInitialGameState());
    const corrupt = {
      ...state,
      levels: [{ ...state.levels[0], mines: [{ row: "0", col: 1 }] }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(corrupt));

    expect(loadPersistedGameState()).toEqual(createEmptyPersistedGameState());
  });

  it("recovers from a run with an unknown status", () => {
    const state = startRun(createInitialGameState());
    const corrupt = {
      ...state,
      runs: [{ ...state.runs[0], status: "paused" }],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(corrupt));

    expect(loadPersistedGameState()).toEqual(createEmptyPersistedGameState());
  });

  describe("when the localStorage getter throws", () => {
    let restore: () => void;

    beforeEach(() => {
      restore = blockLocalStorageGetter();
    });

    afterEach(() => {
      restore();
    });

    it("loads an empty state", () => {
      expect(loadPersistedGameState()).toEqual(createEmptyPersistedGameState());
    });

    it("reports a failed save without throwing", () => {
      expect(savePersistedGameState(createEmptyPersistedGameState())).toBe(false);
      expect(getSaveFailed()).toBe(true);
    });

    it("reports a failed clear without throwing", () => {
      expect(clearPersistedGameState()).toBe(false);
    });

    it("reads flags as unset and ignores flag writes", () => {
      expect(() => writeFlag("blindsweeper:test-flag")).not.toThrow();
      expect(readFlag("blindsweeper:test-flag")).toBe(false);
    });
  });

  describe("when storage methods throw", () => {
    it("loads an empty state", () => {
      expect(loadPersistedGameState(throwingStorage())).toEqual(createEmptyPersistedGameState());
    });

    it("reports a failed save, then clears the failure after a good save", () => {
      expect(savePersistedGameState(createEmptyPersistedGameState(), throwingStorage())).toBe(false);
      expect(getSaveFailed()).toBe(true);

      expect(savePersistedGameState(createEmptyPersistedGameState())).toBe(true);
      expect(getSaveFailed()).toBe(false);
    });

    it("reports a failed clear", () => {
      expect(clearPersistedGameState(throwingStorage())).toBe(false);
    });

    it("handles flag reads and writes", () => {
      expect(readFlag("blindsweeper:test-flag", throwingStorage())).toBe(false);
      expect(() => writeFlag("blindsweeper:test-flag", throwingStorage())).not.toThrow();
    });
  });
});
