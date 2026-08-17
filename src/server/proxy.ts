import { getServerEnv } from "~/server/env";
import { isSourceId, UPSTREAMS } from "~/server/upstreams";
import type { SourceId } from "~/types/source";

// Caching is delegated to the CDN in front of the deployment (and to TanStack
// Query in the browser) rather than held in process. See the README: a shared
// persistent cache belongs in a real backend, not in a proxy this thin.
const SUCCESS_CACHE_CONTROL = "s-maxage=300, stale-while-revalidate=600";
const RATE_LIMIT_CACHE_CONTROL = "no-store";

export async function proxy(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const requestUrl = new URL(request.url);
  const route = parseApiRoute(requestUrl.pathname);

  if (!route || !isSourceId(route.source)) {
    return jsonResponse({ error: "unknown_source" }, 404);
  }

  try {
    getServerEnv();
  } catch (error) {
    // Dev keeps serving so the UI is workable without keys; the message names
    // the missing variables rather than surfacing a stack trace.
    return jsonResponse(
      {
        error: "server_misconfigured",
        message: error instanceof Error ? error.message : "Missing API keys",
      },
      500,
    );
  }

  const { source, upstreamPath } = route;
  const upstream = UPSTREAMS[source];
  const upstreamUrl = new URL(`${upstream.baseUrl}/${upstreamPath}`);

  copySearchParams(requestUrl.searchParams, upstreamUrl.searchParams);

  if (upstream.auth.kind === "query") {
    upstreamUrl.searchParams.set(upstream.auth.param, upstream.key());
  }

  const headers = new Headers({ Accept: "application/json" });

  if (upstream.auth.kind === "header") {
    headers.set(upstream.auth.name, upstream.key());
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(upstreamUrl, { headers });
  } catch {
    return sourceErrorResponse(source, 502);
  }

  if (upstreamResponse.status === 429) {
    return rateLimitResponse(
      source,
      upstreamResponse.headers.get("Retry-After"),
    );
  }

  if (!upstreamResponse.ok) {
    return sourceErrorResponse(source, upstreamResponse.status);
  }

  return new Response(await upstreamResponse.text(), {
    headers: {
      "Cache-Control": SUCCESS_CACHE_CONTROL,
      "Content-Type":
        upstreamResponse.headers.get("Content-Type") ?? "application/json",
    },
  });
}

function parseApiRoute(
  pathname: string,
): { source: string; upstreamPath: string } | null {
  const pathSegments = pathname.split("/").filter(Boolean);

  if (pathSegments[0] !== "api" || !pathSegments[1]) {
    return null;
  }

  return {
    source: pathSegments[1],
    upstreamPath: pathSegments.slice(2).join("/"),
  };
}

function copySearchParams(
  source: URLSearchParams,
  destination: URLSearchParams,
): void {
  for (const [key, value] of source) {
    destination.append(key, value);
  }
}

function sourceErrorResponse(source: SourceId, status: number): Response {
  return jsonResponse({ error: "upstream_error", source }, status);
}

/**
 * Forwards the upstream `Retry-After` verbatim. Interpreting it is the client's
 * job: the feed is what has to pause, count down and stop requesting pages, and
 * that logic has to exist there regardless of what the proxy does.
 */
function rateLimitResponse(
  source: SourceId,
  retryAfter: string | null,
): Response {
  const headers: Record<string, string> = {
    "Cache-Control": RATE_LIMIT_CACHE_CONTROL,
  };

  if (retryAfter) {
    headers["Retry-After"] = retryAfter;
  }

  return jsonResponse({ error: "rate_limited", source }, 429, headers);
}

function jsonResponse(
  body: object,
  status: number,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");

  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}
