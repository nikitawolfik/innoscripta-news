import type { IncomingHttpHeaders, ServerResponse } from "node:http";

const DEFAULT_HOST = "localhost";

type NodeRequestLike = {
  method?: string;
  headers: IncomingHttpHeaders;
};

/**
 * Converts a Node request into the Web `Request` the proxy handler expects.
 *
 * `requestPath` is passed in rather than read from `request.url` because the
 * two adapters mount differently: Vite's middleware strips the `/api` prefix it
 * is mounted under, while the standalone server sees the full path. Keeping the
 * conversion here is what stops the two from drifting apart.
 */
export function toWebRequest(
  request: NodeRequestLike,
  requestPath: string,
): Request {
  const host = request.headers.host ?? DEFAULT_HOST;

  return new Request(`http://${host}${requestPath}`, {
    method: request.method,
    headers: toWebHeaders(request.headers),
  });
}

export async function writeWebResponse(
  response: ServerResponse,
  webResponse: Response,
): Promise<void> {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(Buffer.from(await webResponse.arrayBuffer()));
}

function toWebHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();

  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return headers;
}
