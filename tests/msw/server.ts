import { setupServer } from "msw/node";

// Handlers are registered per test via `mswServer.use(...)` so each test names
// the upstream behaviour it exercises (success, empty, 500, 429).
export const mswServer = setupServer();
