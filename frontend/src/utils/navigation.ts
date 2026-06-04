import { getCollection } from 'astro:content';

export interface DocEntry {
  slug: string;
  title: string;
  description: string;
  category: string;
  order: number;
}

export interface CategoryGroup {
  category: string;
  label: string;
  items: DocEntry[];
}

const categoryLabels: Record<string, string> = {
  stack: 'Stack Tecnológico',
  arquitectura: 'Arquitectura',
  modelos: 'Modelos SQLAlchemy',
  schemas: 'Schemas Pydantic',
  crud: 'Patrones CRUD',
  convenciones: 'Convenciones',
  errores: 'Manejo de Errores',
  testing: 'Testing',
  seguridad: 'Seguridad',
  reglas: 'Reglas Imperativas',
  enums: 'Enums y Constantes',
  queries: 'Queries y Eager Loading',
  storage: 'Almacenamiento',
  seed: 'Seed Data',
};

export async function getSidebar(): Promise<CategoryGroup[]> {
  const docs = await getCollection('docs');

  const entries: DocEntry[] = docs.map((doc) => ({
    slug: doc.slug,
    title: doc.data.title,
    description: doc.data.description,
    category: doc.data.category,
    order: doc.data.order,
  }));

  const grouped: Record<string, DocEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.category]) {
      grouped[entry.category] = [];
    }
    grouped[entry.category].push(entry);
  }

  return Object.entries(grouped)
    .map(([category, items]) => ({
      category,
      label: categoryLabels[category] || category,
      items: items.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.items[0].order - b.items[0].order);
}
