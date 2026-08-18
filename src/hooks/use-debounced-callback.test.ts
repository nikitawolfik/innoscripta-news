import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedCallback } from "~/hooks/use-debounced-callback";

const DELAY_MS = 400;

describe("useDebouncedCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses a burst into one call carrying the last arguments", () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback(callback, DELAY_MS),
    );

    act(() => {
      result.current("cli");
      result.current("clim");
      result.current("climate");
    });

    act(() => {
      vi.advanceTimersByTime(DELAY_MS - 1);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("climate");
  });

  it("never fires on its own — only a call schedules one", () => {
    const callback = vi.fn();

    renderHook(() => useDebouncedCallback(callback, DELAY_MS));

    act(() => {
      vi.advanceTimersByTime(DELAY_MS * 10);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("calls the callback from the latest render, not the one that scheduled", () => {
    const staleCallback = vi.fn();
    const freshCallback = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback }: { callback: (value: string) => void }) =>
        useDebouncedCallback(callback, DELAY_MS),
      { initialProps: { callback: staleCallback } },
    );

    act(() => {
      result.current("climate");
    });
    rerender({ callback: freshCallback });

    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(staleCallback).not.toHaveBeenCalled();
    expect(freshCallback).toHaveBeenCalledWith("climate");
  });

  it("drops a pending call when the component unmounts", () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback, DELAY_MS),
    );

    act(() => {
      result.current("climate");
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
