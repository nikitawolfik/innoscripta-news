import { z } from "zod";

const guardianFieldsSchema = z
  .object({
    trailText: z.string().optional(),
    thumbnail: z.string().optional(),
    byline: z.string().optional(),
    body: z.string().optional(),
  })
  .optional();

export const guardianContentSchema = z.object({
  id: z.string().min(1),
  webTitle: z.string().min(1),
  webUrl: z.url(),
  webPublicationDate: z.string().min(1),
  sectionName: z.string().optional(),
  fields: guardianFieldsSchema,
});

export const guardianSearchResponseSchema = z.object({
  response: z.object({
    status: z.string(),
    currentPage: z.number(),
    pages: z.number(),
    results: z.array(z.unknown()),
  }),
});

export const guardianSingleResponseSchema = z.object({
  response: z.object({
    status: z.string(),
    content: z.unknown(),
  }),
});

export const guardianTagsResponseSchema = z.object({
  response: z.object({
    status: z.string(),
    results: z.array(
      z.object({
        id: z.string().min(1),
        webTitle: z.string().min(1),
      }),
    ),
  }),
});

export type GuardianContent = z.infer<typeof guardianContentSchema>;
