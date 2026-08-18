import { isValid, parseISO } from "date-fns";
import { z } from "zod";

/**
 * A timestamp the UI can actually format.
 *
 * All three APIs document this field as a date but none of them guarantee it,
 * and date-fns throws a RangeError on one it cannot parse. Thrown from inside
 * a card, that unmounts the feed. Rejecting it here instead drops the single
 * article down the same path as any other malformed item, where it is counted
 * rather than fatal.
 */
export const publishedAtSchema = z
  .string()
  .min(1)
  .refine((value) => isValid(parseISO(value)), {
    message: "expected a parseable ISO 8601 timestamp",
  });
