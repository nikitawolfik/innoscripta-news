import { useCallback, useEffect, useRef } from "react";

/**
 * Wraps `callback` so calling it schedules the latest arguments and cancels any
 * call still pending — a keystroke burst commits once, at the end.
 *
 * Debounces the *call*, not a value. A `useDebounce(value)` hook has to fire
 * from an effect watching that value, which also fires when the value changes
 * from outside: a reset or a Back press would echo straight back out as a fresh
 * change, and the initial render would commit before the user typed anything.
 * Scheduling only from an event keeps that impossible.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Call sites pass an inline arrow, so the current one has to be read when the
  // timer fires rather than captured when it was scheduled.
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
