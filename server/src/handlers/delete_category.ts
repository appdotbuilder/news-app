import { db } from '../db';
import { categoriesTable, newsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCategory = async (id: number): Promise<boolean> => {
  try {
    // First, check if the category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    if (existingCategory.length === 0) {
      return false; // Category not found
    }

    // Check if the category has associated news articles
    const associatedNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.category_id, id))
      .limit(1)
      .execute();

    if (associatedNews.length > 0) {
      return false; // Category has dependencies, cannot delete
    }

    // Delete the category
    const result = await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
};