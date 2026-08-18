import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const HOST = "127.0.0.1";
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  /**
   * Runs against the production build. Every upstream call is intercepted in
   * the browser, so no API keys are needed — the dev server would demand them
   * at startup and the suite would stop being runnable by anyone who clones
   * the repo.
   *
   * The host is pinned to IPv4. `vite preview` otherwise binds whatever
   * `localhost` resolves to, which on a CI runner is often `::1`, while the
   * URL below is polled over IPv4 — the server starts, nothing ever answers,
   * and the wait times out with no error to point at.
   *
   * CI builds in its own step so this timeout covers only server startup
   * rather than a cold `tsc` plus two Vite builds.
   */
  webServer: {
    command: isCI
      ? `npx vite preview --port ${PORT} --strictPort --host ${HOST}`
      : `npm run build && npx vite preview --port ${PORT} --strictPort --host ${HOST}`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
