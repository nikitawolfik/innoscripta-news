import { useCallback, useMemo } from "react";

import { useSearchParams } from "react-router-dom";

import { parseFilters, serializeFilters } from "~/lib/filters";
import type { Filters, SetFilters } from "~/types/filters";

/**
 * URL-backed filter adapter for `/`: every change lands in the search params,
 * so views are shareable and Back/Forward walks the filter history.
 */
export function useUrlFilters(): [Filters, SetFilters] {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setFilters = useCallback<SetFilters>(
    (patch, options) => {
      setSearchParams(
        (currentParams) =>
          serializeFilters({ ...parseFilters(currentParams), ...patch }),
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  return [filters, setFilters];
}
