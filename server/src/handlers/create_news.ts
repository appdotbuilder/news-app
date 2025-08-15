import { db } from '../db';
import { newsTable, categoriesTable, usersTable } from '../db/schema';
import { type CreateNewsInput, type News } from '../schema';
import { eq } from 'drizzle-orm';

export const createNews = async (input: CreateNewsInput): Promise<News> => {
  try {
    // Validate that the category exists
    const categoryExists = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .limit(1)
      .execute();

    if (categoryExists.length === 0) {
      throw new Error(`Category with id ${input.category_id} does not exist`);
    }

    // Validate that the author exists
    const authorExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.author_id))
      .limit(1)
      .execute();

    if (authorExists.length === 0) {
      throw new Error(`User with id ${input.author_id} does not exist`);
    }

    // Check slug uniqueness
    const existingNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.slug, input.slug))
      .limit(1)
      .execute();

    if (existingNews.length > 0) {
      throw new Error(`News with slug '${input.slug}' already exists`);
    }

    // Insert the news article
    const result = await db.insert(newsTable)
      .values({
        title: input.title,
        slug: input.slug,
        content: input.content,
        excerpt: input.excerpt || null,
        featured_image: input.featured_image || null,
        category_id: input.category_id,
        author_id: input.author_id,
        status: input.status,
        published_at: input.published_at || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('News creation failed:', error);
    throw error;
  }
};