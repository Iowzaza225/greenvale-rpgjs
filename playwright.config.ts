import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  retries: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm run preview -- --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: "iphone-webkit",
      use: {
        ...devices["iPhone 14"],
        browserName: "webkit",
      },
    },
  ],
});
