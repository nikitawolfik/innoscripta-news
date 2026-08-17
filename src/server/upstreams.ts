import { getServerEnv } from "~/server/env";
import type { SourceId } from "~/types/source";

type QueryAuth = {
  kind: "query";
  param: string;
};

type HeaderAuth = {
  kind: "header";
  name: string;
};

export type Upstream = {
  baseUrl: string;
  auth: QueryAuth | HeaderAuth;
  key: () => string;
};

export const UPSTREAMS: Record<SourceId, Upstream> = {
  newsapi: {
    baseUrl: "https://newsapi.org/v2",
    auth: { kind: "header", name: "X-Api-Key" },
    key: () => getServerEnv().NEWSAPI_KEY,
  },
  guardian: {
    baseUrl: "https://content.guardianapis.com",
    auth: { kind: "query", param: "api-key" },
    key: () => getServerEnv().GUARDIAN_KEY,
  },
  nyt: {
    baseUrl: "https://api.nytimes.com/svc/search/v2",
    auth: { kind: "query", param: "api-key" },
    key: () => getServerEnv().NYT_KEY,
  },
};

export function isSourceId(value: string): value is SourceId {
  return Object.hasOwn(UPSTREAMS, value);
}
