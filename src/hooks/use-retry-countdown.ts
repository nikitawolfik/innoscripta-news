import { useEffect, useRef, useState } from "react";

const TICK_MS = 1_000;

/**
 * Counts down to `retryAt` in whole seconds and fires `onElapsed` once when it
 * reaches zero, so a cooling source auto-recovers without user input. Returns
 * the remaining seconds (0 when `retryAt` is null or in the past).
 */
export function useRetryCountdown(
  retryAt: number | null,
  onElapsed?: () => void,
): number {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    remainingSeconds(retryAt),
  );
  const onElapsedRef = useRef(onElapsed);

  useEffect(() => {
    onElapsedRef.current = onElapsed;
  });

  useEffect(() => {
    setSecondsRemaining(remainingSeconds(retryAt));

    if (retryAt === null || remainingSeconds(retryAt) === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = remainingSeconds(retryAt);
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        clearInterval(intervalId);
        onElapsedRef.current?.();
      }
    }, TICK_MS);

    return () => clearInterval(intervalId);
  }, [retryAt]);

  return secondsRemaining;
}

function remainingSeconds(retryAt: number | null): number {
  if (retryAt === null) {
    return 0;
  }

  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1_000));
}
