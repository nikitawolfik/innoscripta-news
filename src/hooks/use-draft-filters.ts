import { useState } from "react";

import { filtersEqual } from "~/lib/filters";
import {
  DEFAULT_FILTERS,
  type Filters,
  type SetFilters,
} from "~/types/filters";

export type DraftFilters = {
  draft: Filters;
  setDraft: SetFilters;
  /** Commits the draft. No-op when nothing changed. */
  apply: () => void;
  /** Clears everything and commits immediately, draft included. */
  reset: () => void;
  /** Abandons the draft, leaving the applied filters untouched. */
  discard: () => void;
  isDirty: boolean;
};

/**
 * Buffers filter edits until they are submitted.
 *
 * Wraps the same `[filters, setFilters]` contract the adapters expose, so it
 * composes over `useUrlFilters` and `usePreferenceFilters` alike and FilterBar
 * still depends on nothing but the tuple.
 *
 * Holds the pending *patch* rather than a whole copy of the filters, which is
 * what removes the need to sync: the draft is derived, so a Back press, a live
 * search commit or a reset flows through on its own instead of racing a
 * `useEffect` that copies state downward.
 */
export function useDraftFilters(
  filters: Filters,
  setFilters: SetFilters,
): DraftFilters {
  const [patch, setPatch] = useState<Partial<Filters>>({});
  const [appliedFrom, setAppliedFrom] = useState<Filters | null>(null);

  // The commit has landed — the applied filters have moved on from what they
  // were when Apply was pressed — so the patch has nothing left to say.
  //
  // Dropping it in `apply` instead does not work: the router schedules its
  // navigation at a lower priority than this local state, so the patch would
  // clear a render before the filters caught up and every control would flash
  // its old value. Holding the patch across that gap is what keeps the trigger
  // labels steady. Adjusting during render costs no extra commit.
  if (appliedFrom !== null && !filtersEqual(appliedFrom, filters)) {
    setAppliedFrom(null);
    setPatch({});
  }

  const draft = { ...filters, ...patch };
  const isDirty = !filtersEqual(draft, filters);

  function setDraft(nextPatch: Partial<Filters>) {
    setPatch((currentPatch) => ({ ...currentPatch, ...nextPatch }));
  }

  function apply() {
    // Guarded, not just disabled in the UI: committing an empty patch would
    // push a history entry that changes nothing, and would arm the release
    // check below against a change that is never coming.
    if (!isDirty) {
      return;
    }

    setAppliedFrom(filters);
    setFilters(patch);
  }

  function reset() {
    setAppliedFrom(null);
    setPatch({});
    setFilters(DEFAULT_FILTERS);
  }

  function discard() {
    setAppliedFrom(null);
    setPatch({});
  }

  return {
    draft,
    setDraft,
    apply,
    reset,
    discard,
    isDirty,
  };
}
