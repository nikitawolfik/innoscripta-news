import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Extension required here: Vite's native config loader cannot resolve
// extensionless relative imports inside the config file itself.
import { apiProxyPlugin } from "./vite/api-proxy-plugin.ts";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "test" ? [] : [apiProxyPlugin()]),
  ],
  build: {
    // The default warns at 500 kB of *raw* JavaScript. The entry chunk is
    // ~200 kB gzipped, which is what a reader actually downloads, and it is
    // React plus the router, query client, virtualizer, Radix primitives and
    // zod — no single passenger worth evicting. The detail route is already
    // split out; further splitting would defer the filter bar's calendar,
    // which is not worth the render-timing complexity here.
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
