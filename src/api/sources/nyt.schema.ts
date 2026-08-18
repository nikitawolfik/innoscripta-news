import { z } from "zod";

import { publishedAtSchema } from "~/api/published-at";

/**
 * NYT returns `multimedia` as an **object**, not the array older integrations
 * expect: `{ caption, credit, default: { url }, thumbnail: { url } }`. Declaring
 * it as an array does not merely lose the image — the whole article fails
 * validation and gets dropped.
 */
const nytImageSchema = z.object({ url: z.string().min(1) }).nullish();

const nytMultimediaSchema = z
  .object({
    default: nytImageSchema,
    thumbnail: nytImageSchema,
  })
  .nullish();

export const nytArticleSchema = z.object({
  _id: z.string().min(1),
  web_url: z.url(),
  snippet: z.string().nullish(),
  abstract: z.string().nullish(),
  lead_paragraph: z.string().nullish(),
  headline: z.object({
    main: z.string().min(1),
  }),
  pub_date: publishedAtSchema,
  section_name: z.string().nullish(),
  byline: z
    .object({
      original: z.string().nullish(),
    })
    .nullish(),
  multimedia: nytMultimediaSchema,
});

export const nytSearchResponseSchema = z.object({
  response: z.object({
    /**
     * `null` — not `[]` — is what NYT sends for a result-less response, which
     * it also does when throttled. Coercing here turns that into an empty page
     * instead of a validation failure the reader sees as "NYT is unavailable".
     */
    docs: z
      .array(z.unknown())
      .nullish()
      .transform((docs) => docs ?? []),
    /** Named `metadata`, not `meta`. */
    metadata: z.object({
      hits: z.number(),
      offset: z.number(),
    }),
  }),
});

export type NytArticle = z.infer<typeof nytArticleSchema>;
