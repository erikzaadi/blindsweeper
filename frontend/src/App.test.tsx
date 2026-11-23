import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { failCurrentLevel, createInitialGameState, startRun } from "./lib/gameState";
import { DEFAULT_SETTINGS, savePersistedGameState } from "./lib/localStorageState";
import { FakeAudioContext } from "./test/fakeAudioContext";

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

function firstSafeCellPoint(state: ReturnType<typeof seedActive>) {
  const level = state.levels[0];
  const cellSize = 50;
  for (let row = 0; row < level.config.rows; row += 1) {
    for (let col = 0; col < level.config.cols; col += 1) {
      const mined = level.mines.some((mine) => mine.row === row && mine.col === col);
      if (!mined) {
        return {
          x: col * cellSize + cellSize / 2,
          y: row * cellSize + cellSize / 2,
        };
      }
    }
  }
  throw new Error("Expected at least one safe cell");
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
    expect(screen.getByText(/0\/3 mines/i)).toBeInTheDocument();
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
    expect(screen.queryByText(/\/3 mines/i)).not.toBeInTheDocument();
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
    const state = seedActive();
    renderAt("/game");
    const board = mockBoard();
    const point = firstSafeCellPoint(state);

    fireEvent.pointerDown(board, { clientX: point.x, clientY: point.y, pointerId: 1 });
    fireEvent.pointerMove(board, { clientX: point.x + 12, clientY: point.y, pointerId: 1 });
    fireEvent.pointerUp(board, { clientX: point.x + 12, clientY: point.y, pointerId: 1 });

    expect(screen.getByText(/0\/3 mines/i)).toBeInTheDocument();
  });

  it("pointercancel clears active gesture without marking", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerCancel(board, { pointerId: 1 });

    // pointerUp after cancel should not mark because ref was cleared
    fireEvent.pointerUp(board, { clientX: 100, clientY: 100, pointerId: 1 });

    expect(screen.getByText(/0\/3 mines/i)).toBeInTheDocument();
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

describe("blocked storage", () => {
  it("stays playable and shows a save notice when localStorage is blocked", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
    try {
      renderAt("/");
      expect(screen.getByRole("button", { name: /new run/i })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(/progress can't be saved/i);

      fireEvent.click(screen.getByRole("button", { name: /new run/i }));
      expect(screen.getByText(/lv 1/i)).toBeInTheDocument();
    } finally {
      if (original) {
        Object.defineProperty(window, "localStorage", original);
      } else {
        delete (window as { localStorage?: Storage }).localStorage;
      }
    }
  });
});

describe("enable sound control", () => {
  it("pressing Enable sound with pointer, click or keyboard never probes or marks", async () => {
    FakeAudioContext.reset();
    // Pending resume keeps the button on screen for the whole sequence.
    FakeAudioContext.resumeBehavior = "pending";
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.resetModules();
    try {
      const { App: FreshApp } = await import("./App");
      seedActive();
      window.history.pushState({}, "", "/game");
      render(<FreshApp />);

      const button = screen.getByRole("button", { name: /enable sound/i });
      fireEvent.pointerDown(button, { clientX: 20, clientY: 20, pointerId: 1, pointerType: "touch" });
      fireEvent.pointerUp(button, { clientX: 20, clientY: 20, pointerId: 1, pointerType: "touch" });
      fireEvent.click(button);
      fireEvent.keyDown(button, { key: "Enter" });

      expect(document.querySelectorAll('img[src*="mark"]').length).toBe(0);
      expect(screen.getByText(/0\/3 mines/i)).toBeInTheDocument();
      expect(FakeAudioContext.instances).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
      FakeAudioContext.reset();
    }
  });
});

describe("board gestures", () => {
  function cellPoint(row: number, col: number) {
    return { clientX: col * 50 + 25, clientY: row * 50 + 25 };
  }

  function marks() {
    return document.querySelectorAll('img[src*="mark"]').length;
  }

  it("a second pointer cannot mark or take over the gesture", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { ...cellPoint(0, 0), pointerId: 1, pointerType: "touch" });
    fireEvent.pointerDown(board, { ...cellPoint(4, 4), pointerId: 2, pointerType: "touch" });
    fireEvent.pointerUp(board, { ...cellPoint(4, 4), pointerId: 2, pointerType: "touch" });
    expect(marks()).toBe(0);

    fireEvent.pointerUp(board, { ...cellPoint(0, 0), pointerId: 1, pointerType: "touch" });
    expect(marks()).toBe(1);
  });

  it("right-click does not mark", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { ...cellPoint(0, 0), pointerId: 1, pointerType: "mouse", button: 2 });
    fireEvent.pointerUp(board, { ...cellPoint(0, 0), pointerId: 1, pointerType: "mouse", button: 2 });

    expect(marks()).toBe(0);
  });

  it("left-click marks", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { ...cellPoint(0, 0), pointerId: 1, pointerType: "mouse", button: 0 });
    fireEvent.pointerUp(board, { ...cellPoint(0, 0), pointerId: 1, pointerType: "mouse", button: 0 });

    expect(marks()).toBe(1);
  });

  it("losing pointer capture mid-gesture cancels it", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { ...cellPoint(0, 0), pointerId: 1 });
    fireEvent.lostPointerCapture(board, { pointerId: 1 });
    fireEvent.pointerUp(board, { ...cellPoint(0, 0), pointerId: 1 });

    expect(marks()).toBe(0);
  });

  it("a cancel for another pointer leaves the gesture alone", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { ...cellPoint(0, 0), pointerId: 1 });
    fireEvent.pointerCancel(board, { pointerId: 2 });
    fireEvent.pointerUp(board, { ...cellPoint(0, 0), pointerId: 1 });

    expect(marks()).toBe(1);
  });

  it("still plays when pointer capture fails", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();
    board.setPointerCapture = vi.fn(() => {
      throw new DOMException("No active pointer", "NotFoundError");
    });

    fireEvent.pointerDown(board, { ...cellPoint(0, 0), pointerId: 1 });
    fireEvent.pointerUp(board, { ...cellPoint(0, 0), pointerId: 1 });

    expect(marks()).toBe(1);
  });

  it("an uncaptured pointer leaving the board cancels the gesture", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();
    board.setPointerCapture = vi.fn(() => {
      throw new DOMException("No active pointer", "NotFoundError");
    });

    fireEvent.pointerDown(board, { ...cellPoint(0, 0), pointerId: 1 });
    fireEvent.pointerLeave(board, { pointerId: 1 });
    fireEvent.pointerUp(board, { ...cellPoint(0, 0), pointerId: 1 });

    expect(marks()).toBe(0);
  });

  it("a resize mid-gesture cancels it", () => {
    seedActive();
    renderAt("/game");
    const board = mockBoard();

    fireEvent.pointerDown(board, { ...cellPoint(0, 0), pointerId: 1 });
    fireEvent(window, new Event("resize"));
    fireEvent.pointerUp(board, { ...cellPoint(0, 0), pointerId: 1 });

    expect(marks()).toBe(0);
  });
});
