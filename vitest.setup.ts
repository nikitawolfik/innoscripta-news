import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { mswServer } from "./tests/msw/server";

declare global {
  // eslint-disable-next-line no-var -- React reads this exact global.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no layout engine: without a sized viewport and non-zero bounding
// rects the window virtualizer computes a zero-height viewport and renders
// zero rows, making feed tests pass for the wrong reason.
const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 800;

const BOUNDING_RECT: DOMRect = {
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  top: 0,
  left: 0,
  bottom: VIEWPORT_HEIGHT,
  right: VIEWPORT_WIDTH,
  x: 0,
  y: 0,
  toJSON: () => ({}),
};

Object.defineProperty(window, "innerHeight", {
  value: VIEWPORT_HEIGHT,
  writable: true,
});
Object.defineProperty(window, "innerWidth", {
  value: VIEWPORT_WIDTH,
  writable: true,
});
Element.prototype.getBoundingClientRect = () => BOUNDING_RECT;

// Radix primitives (Popover, DropdownMenu, Sheet) touch layout APIs jsdom
// does not implement: ResizeObserver for positioning, pointer capture for
// dismissable layers, scrollIntoView for menu item focus.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as typeof ResizeObserver);
Element.prototype.hasPointerCapture =
  Element.prototype.hasPointerCapture ?? (() => false);
Element.prototype.setPointerCapture =
  Element.prototype.setPointerCapture ?? (() => undefined);
Element.prototype.releasePointerCapture =
  Element.prototype.releasePointerCapture ?? (() => undefined);
Element.prototype.scrollIntoView =
  Element.prototype.scrollIntoView ?? (() => undefined);

// jsdom does not implement matchMedia, which useMediaQuery relies on.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList,
});

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });

  // Node's fetch rejects relative URLs, which is what the source clients use
  // (same-origin `/api/...`). Resolve them against the jsdom origin after MSW
  // has patched fetch so the interceptor still sees every request.
  const mswFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/")) {
      return mswFetch(new URL(input, window.location.origin).toString(), init);
    }

    return mswFetch(input, init);
  };
});

afterEach(() => {
  cleanup();
  mswServer.resetHandlers();
});

afterAll(() => {
  mswServer.close();
});
