import { getCollection } from 'astro:content';

export interface NavItem {
  title: string;
  slug: string;
  description: string;
  category: string;
  order: number;
}

export async function getNavigation(): Promise<NavItem[]> {
  const entries = await getCollection('fastapi-guide');
  return entries
    .map((entry) => ({
      title: entry.data.title,
      slug: entry.slug,
      description: entry.data.description,
      category: entry.data.category,
      order: entry.data.order,
    }))
    .sort((a, b) => a.order - b.order);
}
