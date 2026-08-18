// Relative, with explicit extensions, unlike the rest of src/. Vercel builds
// this directory with its own compiler settings — nodenext resolution and no
// knowledge of the `~/` mapping — so an aliased or extensionless import fails
// to compile there and the function is silently never deployed. Resolving
// without a path mapping is what keeps one proxy buildable by three
// toolchains. See the import rules in CLAUDE.md.
import { getServerEnv } from "./env.js";
import type { SourceId } from "../types/source.js";

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
  // `in` rather than Object.hasOwn, which would put an ES2022 lib floor under
  // a check that does not need one. UPSTREAMS is a module-local object literal,
  // so there is no inherited key for the two to disagree about.
  return value in UPSTREAMS;
}
