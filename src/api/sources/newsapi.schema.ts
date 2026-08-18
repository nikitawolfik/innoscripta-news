import { z } from "zod";

import { publishedAtSchema } from "~/api/published-at";

export const newsApiArticleSchema = z.object({
  source: z.object({
    name: z.string().min(1),
  }),
  author: z.string().nullish(),
  title: z.string().min(1),
  description: z.string().nullish(),
  url: z.url(),
  urlToImage: z.url().nullish(),
  publishedAt: publishedAtSchema,
});

export const newsApiSearchResponseSchema = z.object({
  status: z.literal("ok"),
  totalResults: z.number(),
  articles: z.array(z.unknown()),
});

export type NewsApiArticle = z.infer<typeof newsApiArticleSchema>;
