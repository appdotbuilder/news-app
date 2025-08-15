import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getCategories = async (): Promise<Category[]> => {
  try {
    const results = await db.select()
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.name))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};

export const getCategoryById = async (id: number): Promise<Category | null> => {
  try {
    const results = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch category by ID:', error);
    throw error;
  }
};

export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  try {
    const results = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch category by slug:', error);
    throw error;
  }
};