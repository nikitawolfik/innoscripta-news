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
   * Runs against **the same Node server the container runs**, not `vite
   * preview`. That distinction matters: a bug in the container's static file
   * handling served every asset as HTML and rendered a blank page, and a
   * preview-server suite could never have seen it.
   *
   * The keys are placeholders. Every `/api/**` call is intercepted in the
   * browser, so nothing reaches an upstream — but the server validates its
   * environment at startup and would refuse to boot without them.
   *
   * The host is pinned to IPv4: a CI runner often resolves `localhost` to
   * `::1` while the URL below is polled over IPv4, and the wait then times out
   * with no error to point at. CI builds in its own step so this timeout
   * covers only start-up.
   */
  webServer: {
    command: isCI ? `node server.mjs` : `npm run build && node server.mjs`,
    env: {
      PORT: String(PORT),
      NEWSAPI_KEY: "e2e-placeholder",
      GUARDIAN_KEY: "e2e-placeholder",
      NYT_KEY: "e2e-placeholder",
    },
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
