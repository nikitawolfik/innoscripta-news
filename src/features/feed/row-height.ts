/**
 * The virtualizer positions rows from these numbers while the card and skeleton
 * are sized by Tailwind classes. Tailwind needs literal class names, so the two
 * representations cannot be derived from each other — keeping them adjacent is
 * what stops them drifting apart.
 *
 * Desktop budget at h-48 (192px) minus p-4 (32px) leaves 160px for the column:
 * badge 22 + gap 8 + title 48 + gap 8 + description 40 + gap 8 + author 16 =
 * 150px. Mobile at h-80 (320px) minus p-3 (24px) leaves 296px: image 144 +
 * gap 8 + column 130 = 282px. Change the card's padding, typography or image
 * slot and this arithmetic — and these constants — must be redone.
 */
export const ROW_HEIGHT_MOBILE = 320;
export const ROW_HEIGHT_DESKTOP = 192;

/** Must stay equivalent to the constants above. */
export const ROW_HEIGHT_CLASS = "h-80 md:h-48";

/**
 * Exactly two lines at each breakpoint: 2 x leading-5 (40px) on mobile,
 * 2 x leading-6 (48px) from md up. `shrink-0` is load-bearing — without it a
 * flex parent can compress the box below two lines while `line-clamp-2` still
 * renders two, clipping the second line through the middle of the glyphs.
 */
export const TITLE_CLAMP_CLASS =
  "line-clamp-2 h-10 shrink-0 leading-5 md:h-12 md:leading-6";
