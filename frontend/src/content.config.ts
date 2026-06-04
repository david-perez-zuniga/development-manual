import { defineCollection, z } from 'astro:content';

const fastapiGuide = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    order: z.number(),
  }),
});

export const collections = { 'fastapi-guide': fastapiGuide };
