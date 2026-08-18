import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getServerEnv } from "./dist-server/env.js";
import { toWebRequest, writeWebResponse } from "./dist-server/node-adapter.js";
import { proxy } from "./dist-server/proxy.js";

const DEFAULT_PORT = 8080;
// `path.resolve` strips the trailing separator the URL form leaves behind.
// Keeping it would break the containment check below: every real path would
// fail a `dist//` prefix test and fall through to the SPA shell, so every
// asset would be served as HTML and the page would render blank.
const DIST_ROOT = path.resolve(
  fileURLToPath(new URL("./dist/", import.meta.url)),
);
const INDEX_HTML = path.join(DIST_ROOT, "index.html");
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

getServerEnv();

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/api/")) {
      await handleApiRequest(request, response);
      return;
    }

    await handleStaticRequest(request, response);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal Server Error");
  }
});

const port = Number(process.env.PORT) || DEFAULT_PORT;

server.listen(port, "0.0.0.0", () => {
  console.log(`News server listening on port ${port}`);
});

async function handleApiRequest(request, response) {
  const webRequest = toWebRequest(request, request.url ?? "/");

  await writeWebResponse(response, await proxy(webRequest));
}

async function handleStaticRequest(request, response) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  const safePath = resolveWithinDist(requestUrl.pathname);
  const file = safePath ? await readStaticFile(safePath) : null;
  // Anything that is not a real file is a client-side route, so serve the shell
  // and let the router decide — including genuinely unknown paths, which the
  // app renders as its own not-found page.
  const resolvedFile = file ?? (await readStaticFile(INDEX_HTML));

  if (!resolvedFile) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const extension = path.extname(file && safePath ? safePath : INDEX_HTML);
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

  response.writeHead(200, { "Content-Type": contentType });
  response.end(request.method === "HEAD" ? undefined : resolvedFile);
}

/**
 * Resolves a request path inside dist/, or null if it escapes.
 *
 * `DIST_ROOT` carries no trailing separator, so appending one makes this a
 * correct containment test — a sibling directory such as `dist-server` cannot
 * masquerade as being inside it.
 */
function resolveWithinDist(pathname) {
  const requestedPath = decodeURIComponent(pathname);
  const candidate = path.resolve(DIST_ROOT, `.${requestedPath}`);

  return candidate === DIST_ROOT ||
    candidate.startsWith(`${DIST_ROOT}${path.sep}`)
    ? candidate
    : null;
}

async function readStaticFile(filePath) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") {
      return null;
    }

    throw error;
  }
}
