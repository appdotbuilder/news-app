import { db } from '../db';
import { newsTable, categoriesTable } from '../db/schema';
import { type UpdateNewsInput, type News } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateNews = async (input: UpdateNewsInput): Promise<News> => {
  try {
    // Check if news exists
    const existingNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, input.id))
      .execute();

    if (existingNews.length === 0) {
      throw new Error(`News article with id ${input.id} not found`);
    }

    // Validate category exists if category_id is being updated
    if (input.category_id !== undefined) {
      const categoryExists = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categoryExists.length === 0) {
        throw new Error(`Category with id ${input.category_id} not found`);
      }
    }

    // Check slug uniqueness if slug is being updated
    if (input.slug !== undefined) {
      const duplicateSlug = await db.select()
        .from(newsTable)
        .where(and(
          eq(newsTable.slug, input.slug),
          ne(newsTable.id, input.id)
        ))
        .execute();

      if (duplicateSlug.length > 0) {
        throw new Error(`News article with slug '${input.slug}' already exists`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.excerpt !== undefined) updateData.excerpt = input.excerpt;
    if (input.featured_image !== undefined) updateData.featured_image = input.featured_image;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.published_at !== undefined) updateData.published_at = input.published_at;

    // Update the news article
    const result = await db.update(newsTable)
      .set(updateData)
      .where(eq(newsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('News update failed:', error);
    throw error;
  }
};