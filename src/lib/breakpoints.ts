/**
 * Mirrors Tailwind's `md:` breakpoint, which compiles to `(width >= 48rem)`.
 *
 * Written in rem rather than the equivalent 768px on purpose: rem resolves
 * against the root font size, so a reader who raises their browser's default
 * font keeps CSS and JavaScript on the same side of the boundary. With `768px`
 * here they diverge — at a 20px root, `48rem` is 960px.
 *
 * Shared rather than per-feature: the feed sizes its rows from it and the
 * filter bar decides whether the mobile sheet exists at all, and those two must
 * agree with the stylesheet and with each other.
 */
export const DESKTOP_MEDIA_QUERY = "(min-width: 48rem)";
