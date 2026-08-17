import { loadEnv, type Plugin } from "vite";

// Extension required: this module is pulled into Vite's config graph, which the
// native config loader resolves without extensionless lookup.
import { toWebRequest, writeWebResponse } from "../src/server/node-adapter.ts";

export function apiProxyPlugin(): Plugin {
  return {
    name: "api-proxy",

    config(_userConfig, { mode }) {
      // Vite loads .env files into `import.meta.env`, never into `process.env`,
      // and only exposes VITE_-prefixed keys to the client. The proxy runs
      // server-side and reads `process.env`, so bridge the two here — without
      // this, `cp .env.example .env && npm run dev` cannot find any keys.
      // `??=` keeps real shell environment variables winning over the file.
      for (const [key, value] of Object.entries(
        loadEnv(mode, process.cwd(), ""),
      )) {
        process.env[key] ??= value;
      }
    },

    async configureServer(server) {
      const { getServerEnv } = await server.ssrLoadModule("/src/server/env.ts");

      try {
        getServerEnv();
      } catch (error) {
        // Warn rather than throw: a missing key should not stop the dev server
        // from booting, or nobody can work on the UI without three API keys.
        // Requests to /api then return a 500 that names what is missing.
        server.config.logger.warn(
          `[api-proxy] ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const proxyModule = server.ssrLoadModule("/src/server/proxy.ts");

      server.middlewares.use("/api", async (request, response, next) => {
        try {
          const { proxy } = await proxyModule;
          const webRequest = toWebRequest(request, `/api${request.url ?? "/"}`);

          await writeWebResponse(response, await proxy(webRequest));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
