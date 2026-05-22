import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  createEmptyPersistedGameState,
  loadPersistedGameState,
  savePersistedGameState,
} from "./localStorageState";

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

    savePersistedGameState(state);

    expect(loadPersistedGameState()).toEqual(state);
  });

  it("recovers from corrupt localStorage data", () => {
    localStorage.setItem(STORAGE_KEY, "{bad json");

    expect(loadPersistedGameState()).toEqual(createEmptyPersistedGameState());
  });
});
