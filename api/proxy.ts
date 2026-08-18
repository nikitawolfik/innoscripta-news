// Relative imports with explicit extensions on purpose: Vercel compiles this
// file with its own settings, which know nothing of the `~/` mapping. Everything
// under src/ still uses the alias.
import type { IncomingMessage, ServerResponse } from "node:http";

import { toWebRequest, writeWebResponse } from "../src/server/node-adapter.js";
import { proxy } from "../src/server/proxy.js";

/**
 * Vercel's Node runtime invokes this with Node's own request and response, not
 * the Web pair `proxy` takes — exporting the handler directly crashed every
 * invocation on `new URL()` of a relative path, which surfaces only as
 * FUNCTION_INVOCATION_FAILED.
 *
 * The conversion is the one the Vite plugin and the container server already
 * share, so all three adapters stay a few lines over a single handler.
 */
export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const webRequest = toWebRequest(request, request.url ?? "/");

  await writeWebResponse(response, await proxy(webRequest));
}
