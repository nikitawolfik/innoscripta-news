import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { ThemeProvider } from "~/components/theme-provider";
import { createQueryClient } from "~/lib/query-client";
import { syncStoreAcrossTabs } from "~/lib/sync-store-across-tabs";
import { router } from "~/routes/router";
import {
  PREFERENCES_STORAGE_KEY,
  usePreferencesStore,
} from "~/stores/preferences-store";

import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root is missing from index.html");
}

// Registered once for the app's lifetime, so a preference changed in one tab
// shows up in the others without a reload.
syncStoreAcrossTabs(PREFERENCES_STORAGE_KEY, usePreferencesStore);

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
