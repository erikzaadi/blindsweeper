import { defineConfig, devices } from "@playwright/test";

const LOCAL_PORT = 3333;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;
// An external PLAYWRIGHT_BASE_URL means that server is already running.
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: externalBaseUrl ?? LOCAL_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: externalBaseUrl ? undefined : {
    command: `npm run dev -- --port ${LOCAL_PORT} --strictPort`,
    url: LOCAL_URL,
    reuseExistingServer: !process.env.CI,
  },
});
