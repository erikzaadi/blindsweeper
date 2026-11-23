import { expect, type Locator, type Page } from "@playwright/test";

export type Cell = { row: number; col: number };

export const FIXTURE_ROWS = 10;
export const FIXTURE_COLS = 10;
// Mines stay clear of the top-left corner, where the sound/haptics badges sit over the board.
export const FIXTURE_MINES: Cell[] = [
  { row: 3, col: 7 },
  { row: 7, col: 2 },
  { row: 8, col: 8 },
];
export const SAFE_CELL: Cell = { row: 5, col: 5 };

const NOW = "2026-01-01T00:00:00.000Z";
const PROFILE_ID = "profile_default";

// A v1 save with one active level 1 run and known mine positions.
function fixtureState() {
  return {
    schemaVersion: 1,
    profiles: [{ id: PROFILE_ID, displayName: "Player", createdAt: NOW, updatedAt: NOW }],
    selectedProfileId: PROFILE_ID,
    runs: [{
      id: "run_fixture",
      profileId: PROFILE_ID,
      status: "active",
      currentLevelId: "level_fixture",
      startedAt: NOW,
      updatedAt: NOW,
    }],
    levels: [{
      id: "level_fixture",
      runId: "run_fixture",
      levelNumber: 1,
      config: {
        rows: FIXTURE_ROWS,
        cols: FIXTURE_COLS,
        mineCount: FIXTURE_MINES.length,
        levelNumber: 1,
        seed: "fixture",
        generatorVersion: 1,
        proximityRadiusCells: 4,
      },
      mines: FIXTURE_MINES,
      markedCells: [],
      markHints: [],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    }],
    settings: {
      hapticsEnabled: true,
      audioEnabled: true,
      visualFallbackEnabled: true,
      debugReveal: false,
    },
  };
}

export async function openFixtureGame(page: Page): Promise<Locator> {
  await page.goto("/");
  await page.evaluate((state) => {
    localStorage.clear();
    localStorage.setItem("blindsweeper:v1", JSON.stringify(state));
    localStorage.setItem("blindsweeper:gesture-hint-dismissed", "1");
    localStorage.setItem("blindsweeper:howto-seen", "1");
  }, fixtureState());
  await page.goto("/game");
  const board = page.getByRole("application", { name: /minefield/i });
  await expect(board).toBeVisible();
  return board;
}

export async function cellCenter(board: Locator, cell: Cell): Promise<{ x: number; y: number }> {
  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  return {
    x: box!.x + ((cell.col + 0.5) / FIXTURE_COLS) * box!.width,
    y: box!.y + ((cell.row + 0.5) / FIXTURE_ROWS) * box!.height,
  };
}

// Touch projects tap with the touchscreen; desktop projects click with the mouse.
export async function tapCell(page: Page, board: Locator, cell: Cell, hasTouch: boolean): Promise<void> {
  await board.scrollIntoViewIfNeeded();
  const { x, y } = await cellCenter(board, cell);
  if (hasTouch) {
    await page.touchscreen.tap(x, y);
  } else {
    await page.mouse.click(x, y);
  }
}

// shortcut: Playwright has no cross-engine touch drag, so drags use the mouse everywhere; touch drag is covered on physical devices.
export async function dragBetween(page: Page, board: Locator, from: Cell, to: Cell): Promise<void> {
  await board.scrollIntoViewIfNeeded();
  const start = await cellCenter(board, from);
  const end = await cellCenter(board, to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}
