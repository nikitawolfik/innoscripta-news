import { QueryClient } from "@tanstack/react-query";

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 30 * 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        // The upstream APIs are metered (NYT allows 5 req/min), so refetching
        // every time the tab regains focus would burn quota for no benefit.
        refetchOnWindowFocus: false,
      },
    },
  });
}
