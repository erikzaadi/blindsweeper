import { expect, test } from "@playwright/test";
import { FIXTURE_MINES, SAFE_CELL, dragBetween, openFixtureGame, tapCell } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.describe("home screen", () => {
  test("renders new run button with no saved state", async ({ page }) => {
    await expect(page.getByRole("button", { name: /new run/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /resume run/i })).not.toBeVisible();
  });

  test("shows tagline", async ({ page }) => {
    await expect(page.getByText(/feel your way/i)).toBeVisible();
  });

  test("can open and close settings", async ({ page }) => {
    await page.getByRole("button", { name: /settings/i }).click();
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByRole("button", { name: /new run/i })).toBeVisible();
  });
});

test.describe("starting a run", () => {
  test("navigates to /game", async ({ page }) => {
    await page.getByRole("button", { name: /new run/i }).click();
    await expect(page).toHaveURL(/\/game/);
  });

  test("game header shows level 1 and mine count", async ({ page }) => {
    await page.getByRole("button", { name: /new run/i }).click();
    await expect(page.getByText(/lv 1/i)).toBeVisible();
    await expect(page.getByText(/0\/3 mines/i)).toBeVisible();
  });

  test("board is visible and interactive", async ({ page }) => {
    await page.getByRole("button", { name: /new run/i }).click();
    await expect(page.getByRole("application", { name: /minefield/i })).toBeVisible();
  });
});

test.describe("board interaction", () => {
  test("tapping board marks a cell", async ({ page, hasTouch }) => {
    const board = await openFixtureGame(page);

    await tapCell(page, board, SAFE_CELL, hasTouch);

    await expect(board.locator("img[src*='mark']")).toHaveCount(1);
  });

  test("tapping same cell twice does not unmark", async ({ page, hasTouch }) => {
    const board = await openFixtureGame(page);

    await tapCell(page, board, SAFE_CELL, hasTouch);
    await expect(board.locator("img[src*='mark']")).toHaveCount(1);

    await tapCell(page, board, SAFE_CELL, hasTouch);
    await expect(board.locator("img[src*='mark']")).toHaveCount(1);
  });

  test("marking a mine increments the mine count", async ({ page, hasTouch }) => {
    const board = await openFixtureGame(page);

    await tapCell(page, board, FIXTURE_MINES[0], hasTouch);

    await expect(page.getByText(/1\/3 mines/i)).toBeVisible();
  });

  test("marking every mine completes the level", async ({ page, hasTouch }) => {
    const board = await openFixtureGame(page);

    for (const mine of FIXTURE_MINES) {
      await tapCell(page, board, mine, hasTouch);
    }

    await expect(page.getByText(/cleared/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /next level/i })).toBeVisible();
  });

  test("dragging across safe cells does not mark or explode", async ({ page }) => {
    const board = await openFixtureGame(page);

    await dragBetween(page, board, SAFE_CELL, { row: 5, col: 0 });

    await expect(board.locator("img[src*='mark']")).toHaveCount(0);
    await expect(board.locator("img[src*='explosion']")).toHaveCount(0);
    await expect(page.getByText(/0\/3 mines/i)).toBeVisible();
  });

  test("dragging onto an unmarked mine explodes", async ({ page }) => {
    const board = await openFixtureGame(page);

    await dragBetween(page, board, SAFE_CELL, FIXTURE_MINES[0]);

    await expect(board.locator("img[src*='explosion']")).toHaveCount(1);
    // The header hides the mine counter once the run has failed.
    await expect(page.getByText(/\d+\/3 mines/i)).toHaveCount(0);
  });

  test("dragging onto a marked mine does not explode", async ({ page, hasTouch }) => {
    const board = await openFixtureGame(page);

    await tapCell(page, board, FIXTURE_MINES[0], hasTouch);
    await dragBetween(page, board, SAFE_CELL, FIXTURE_MINES[0]);

    await expect(board.locator("img[src*='explosion']")).toHaveCount(0);
  });

  test("restart button resets marked count", async ({ page, hasTouch }) => {
    const board = await openFixtureGame(page);

    await tapCell(page, board, SAFE_CELL, hasTouch);
    await expect(board.locator("img[src*='mark']")).toHaveCount(1);

    await page.getByRole("button", { name: /restart/i }).click();
    await expect(board.locator("img[src*='mark']")).toHaveCount(0);
  });

  test("back button returns to home with resume option", async ({ page }) => {
    await openFixtureGame(page);

    await page.getByRole("button", { name: /back/i }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /resume run/i })).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("browser back and forward move between home and game", async ({ page }) => {
    await page.getByRole("button", { name: /new run/i }).click();
    await expect(page).toHaveURL(/\/game/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /resume run/i })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/game/);
    await expect(page.getByText(/lv 1/i)).toBeVisible();
  });

  test("reload on /game keeps the level and its marks", async ({ page, hasTouch }) => {
    const board = await openFixtureGame(page);
    await tapCell(page, board, FIXTURE_MINES[0], hasTouch);
    await expect(page.getByText(/1\/3 mines/i)).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/game/);
    await expect(page.getByText(/lv 1/i)).toBeVisible();
    await expect(page.getByText(/1\/3 mines/i)).toBeVisible();
    await expect(page.getByRole("application", { name: /minefield/i }).locator("img[src*='mark']")).toHaveCount(1);
  });
});

test.describe("persistence", () => {
  test("active run survives page reload", async ({ page }) => {
    await page.getByRole("button", { name: /new run/i }).click();
    await page.goto("/");
    await page.reload();
    await expect(page.getByRole("button", { name: /resume run/i })).toBeVisible();
  });

  test("resume run opens game at the current level", async ({ page }) => {
    await page.getByRole("button", { name: /new run/i }).click();
    await page.goto("/");
    await page.reload();
    await page.getByRole("button", { name: /resume run/i }).click();
    await expect(page).toHaveURL(/\/game/);
    await expect(page.getByText(/lv 1/i)).toBeVisible();
  });
});
