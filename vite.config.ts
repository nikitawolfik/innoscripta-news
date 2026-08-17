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
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
