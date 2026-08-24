import { defineConfig, devices } from "@playwright/test";

const playwrightPort = process.env.PLAYWRIGHT_PORT ?? "3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${playwrightPort}`,
    serviceWorkers: "block",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm serve:static",
    env: { PORT: playwrightPort },
    url: `http://127.0.0.1:${playwrightPort}`,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_PORT,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/offline.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testIgnore: "**/offline.spec.ts",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testIgnore: "**/offline.spec.ts",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "chromium-offline",
      testMatch: "**/offline.spec.ts",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
    },
  ],
});
