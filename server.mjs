import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getServerEnv } from "./dist-server/env.js";
import { toWebRequest, writeWebResponse } from "./dist-server/node-adapter.js";
import { proxy } from "./dist-server/proxy.js";

const DEFAULT_PORT = 8080;
const DIST_DIRECTORY = fileURLToPath(new URL("./dist/", import.meta.url));
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
  const requestedPath = decodeURIComponent(requestUrl.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath;
  const absolutePath = path.resolve(DIST_DIRECTORY, `.${relativePath}`);
  const safePath = absolutePath.startsWith(`${DIST_DIRECTORY}${path.sep}`)
    ? absolutePath
    : path.join(DIST_DIRECTORY, "index.html");
  const file = await readStaticFile(safePath);
  const resolvedFile =
    file ?? (await readStaticFile(path.join(DIST_DIRECTORY, "index.html")));

  if (!resolvedFile) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const extension = path.extname(file ? safePath : "index.html");
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

  response.writeHead(200, { "Content-Type": contentType });
  response.end(request.method === "HEAD" ? undefined : resolvedFile);
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
