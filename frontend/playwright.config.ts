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
  // CI logs list each test with its browser project; the HTML report is uploaded on failure.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: externalBaseUrl ?? LOCAL_URL,
    trace: "retain-on-failure",
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
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 15"] },
    },
  ],
  webServer: externalBaseUrl ? undefined : {
    command: `npm run dev -- --port ${LOCAL_PORT} --strictPort`,
    url: LOCAL_URL,
    reuseExistingServer: !process.env.CI,
  },
});
