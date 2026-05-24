import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { failCurrentLevel, createInitialGameState, startRun } from "./lib/gameState";
import { DEFAULT_SETTINGS, savePersistedGameState } from "./lib/localStorageState";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

function seedActive() {
  const state = startRun(createInitialGameState());
  savePersistedGameState(state);
  return state;
}

function seedFailed() {
  let state = startRun(createInitialGameState());
  state = failCurrentLevel(state, state.levels[0].mines[0]);
  savePersistedGameState(state);
  return state;
}

function mockBoard() {
  const board = screen.getByRole("application");
  board.setPointerCapture = vi.fn();
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, right: 500, bottom: 500,
    width: 500, height: 500, x: 0, y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  return board;
}

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, "", "/");
  vi.restoreAllMocks();
});

describe("routing", () => {
  it("renders home at /", () => {
    renderAt("/");
    expect(screen.getByRole("button", { name: /new run/i })).toBeInTheDocument();
  });

  it("renders no-active-run message at /game with no state", () => {
    renderAt("/game");
    expect(screen.getByText(/no active run/i)).toBeInTheDocument();
  });

  it("renders game header at /game with active run", () => {
    seedActive();
    renderAt("/game");
    expect(screen.getByText(/lv 1/i)).toBeInTheDocument();
  });

  it("renders settings at /settings", () => {
    renderAt("/settings");
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
  });
});

describe("HomeScreen", () => {
  it("shows only new run with no state", () => {
    renderAt("/");
    expect(screen.getByRole("button", { name: /new run/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resume run/i })).not.toBeInTheDocument();
  });

  it("loads active run from localStorage and shows resume", () => {
    seedActive();
    renderAt("/");
    expect(screen.getByRole("button", { name: /resume run/i })).toBeInTheDocument();
  });

  it("shows confirm gate when new run pressed with active run", () => {
    seedActive();
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: /new run/i }));
    expect(screen.getByRole("button", { name: /confirm new run/i })).toBeInTheDocument();
  });

  it("starts run and navigates to /game", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: /new run/i }));
    expect(window.location.pathname).toBe("/game");
  });

  it("shows failed run ceremony with run ended label", () => {
    seedFailed();
    renderAt("/");
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByText(/run ended/i)).toBeInTheDocument();
  });

  it("navigates to settings screen", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
  });
});

describe("GameScreen", () => {
  it("shows level number and mine count", () => {
    seedActive();
    renderAt("/game");
    expect(screen.getByText(/lv 1/i)).toBeInTheDocument();
    expect(screen.getByText(/0\/6 mines/i)).toBeInTheDocument();
  });

  it("shows back and restart buttons", () => {
    seedActive();
    renderAt("/game");
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restart/i })).toBeInTheDocument();
  });

  it("back button returns to home", () => {
    seedActive();
    renderAt("/game");
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("button", { name: /resume run/i })).toBeInTheDocument();
  });
});

describe("explosion state", () => {
  it("level number text is red when run failed", () => {
    seedFailed();
    renderAt("/game");
    expect(screen.getByText(/lv 1/i)).toHaveClass("text-red-400");
  });

  it("hides mine count when run failed", () => {
    seedFailed();
    renderAt("/game");
    expect(screen.queryByText(/\/6 mines/i)).not.toBeInTheDocument();
  });
});

describe("SettingsScreen", () => {
  it("renders haptics, visual feedback, and reveal mines toggles", () => {
    renderAt("/settings");
    expect(screen.getByText("Haptics")).toBeInTheDocument();
    expect(screen.getByText("Visual feedback")).toBeInTheDocument();
    expect(screen.getByText("Reveal mines")).toBeInTheDocument();
  });

  it("back button returns to home", () => {
    renderAt("/settings");
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByRole("button", { name: /new run/i })).toBeInTheDocument();
  });
});

describe("board pointer events", () => {
  it("board has touch-none class to prevent scroll", () => {
    seedActive();
    renderAt("/game");
    expect(screen.getByRole("application")).toHaveClass("touch-none");
  });

  it("tap within threshold triggers mark", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(board, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(document.querySelectorAll('img[src*="mark"]').length).toBe(1);
  });

  it("movement above 10px does not trigger mark", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(board, { clientX: 25, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(board, { clientX: 25, clientY: 0, pointerId: 1 });

    expect(screen.getByText(/0\/6 mines/i)).toBeInTheDocument();
  });

  it("pointercancel clears active gesture without marking", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerCancel(board);

    // pointerUp after cancel should not mark because ref was cleared
    fireEvent.pointerUp(board, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(screen.getByText(/0\/6 mines/i)).toBeInTheDocument();
  });

  it("does not throw when navigator.vibrate is absent", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    expect(() => {
      fireEvent.pointerDown(board, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(board, { clientX: 102, clientY: 100, pointerId: 1 });
    }).not.toThrow();
  });

  it("falls back gracefully when visual fallback enabled and vibration absent", () => {
    const state = startRun({
      ...createInitialGameState(),
      settings: { ...DEFAULT_SETTINGS, hapticsEnabled: true, visualFallbackEnabled: true },
    });
    savePersistedGameState(state);
    renderAt("/game");
    const board = mockBoard();

    expect(() => {
      fireEvent.pointerDown(board, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(board, { clientX: 102, clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(board, { clientX: 105, clientY: 100, pointerId: 1 });
    }).not.toThrow();
  });

  it("tapping already marked cell does not unmark it", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    // first tap marks
    fireEvent.pointerDown(board, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(board, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(document.querySelectorAll('img[src*="mark"]').length).toBe(1);

    // second tap on same cell is ignored - mark stays
    fireEvent.pointerDown(board, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(board, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(document.querySelectorAll('img[src*="mark"]').length).toBe(1);
  });
});
