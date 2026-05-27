import { expect, test } from "@playwright/test";

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
  test.beforeEach(async ({ page }) => {
    await page.getByRole("button", { name: /new run/i }).click();
  });

  test("tapping board increments marked count", async ({ page }) => {
    const board = page.getByRole("application", { name: /minefield/i });
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    await board.click({
      position: { x: Math.floor(box!.width / 2), y: Math.floor(box!.height / 2) },
    });

    await expect(board.locator("img[src*='mark']")).toHaveCount(1);
  });

  test("tapping same cell twice does not unmark", async ({ page }) => {
    const board = page.getByRole("application", { name: /minefield/i });
    const box = await board.boundingBox();
    expect(box).not.toBeNull();
    const pos = { x: Math.floor(box!.width / 2), y: Math.floor(box!.height / 2) };

    await board.click({ position: pos });
    await expect(board.locator("img[src*='mark']")).toHaveCount(1);

    await board.click({ position: pos });
    await expect(board.locator("img[src*='mark']")).toHaveCount(1);
  });

  test("restart button resets marked count", async ({ page }) => {
    const board = page.getByRole("application", { name: /minefield/i });
    const box = await board.boundingBox();
    expect(box).not.toBeNull();

    await board.click({
      position: { x: Math.floor(box!.width / 2), y: Math.floor(box!.height / 2) },
    });
    await expect(board.locator("img[src*='mark']")).toHaveCount(1);

    await page.getByRole("button", { name: /restart/i }).click();
    await expect(board.locator("img[src*='mark']")).toHaveCount(0);
  });

  test("back button returns to home with resume option", async ({ page }) => {
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /resume run/i })).toBeVisible();
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
