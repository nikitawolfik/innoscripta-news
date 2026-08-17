import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Without this, Vite copies public/ into dist-server alongside the bundles.
  publicDir: false,
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        env: fileURLToPath(new URL("./src/server/env.ts", import.meta.url)),
        "node-adapter": fileURLToPath(
          new URL("./src/server/node-adapter.ts", import.meta.url),
        ),
        proxy: fileURLToPath(new URL("./src/server/proxy.ts", import.meta.url)),
      },
      formats: ["es"],
    },
    outDir: "dist-server",
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
