import { db } from '../db';
import { newsTable, categoriesTable, usersTable } from '../db/schema';
import { type News, type PaginationInput, type GetNewsByCategoryInput, type GetNewsBySlugInput } from '../schema';
import { eq, desc, and, or, sql } from 'drizzle-orm';

export const getNews = async (input?: PaginationInput): Promise<News[]> => {
  try {
    // Apply defaults if input not provided
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;

    const results = await db.select()
      .from(newsTable)
      .where(eq(newsTable.status, 'published'))
      .orderBy(desc(newsTable.published_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Get news failed:', error);
    throw error;
  }
};

export const getAllNews = async (input?: PaginationInput): Promise<News[]> => {
  try {
    // Apply defaults if input not provided
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;

    const results = await db.select()
      .from(newsTable)
      .orderBy(desc(newsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Get all news failed:', error);
    throw error;
  }
};

export const getNewsById = async (id: number): Promise<News | null> => {
  try {
    // First increment the views count
    await db.update(newsTable)
      .set({ views_count: sql`${newsTable.views_count} + 1` })
      .where(eq(newsTable.id, id))
      .execute();

    // Then fetch the article
    const results = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Get news by ID failed:', error);
    throw error;
  }
};

export const getNewsBySlug = async (input: GetNewsBySlugInput): Promise<News | null> => {
  try {
    // First increment the views count
    await db.update(newsTable)
      .set({ views_count: sql`${newsTable.views_count} + 1` })
      .where(eq(newsTable.slug, input.slug))
      .execute();

    // Then fetch the article
    const results = await db.select()
      .from(newsTable)
      .where(eq(newsTable.slug, input.slug))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Get news by slug failed:', error);
    throw error;
  }
};

export const getNewsByCategory = async (input: GetNewsByCategoryInput): Promise<News[]> => {
  try {
    const limit = input.limit;
    const offset = input.offset;

    // Handle category filtering - either by ID or slug
    if (input.category_id) {
      const results = await db.select()
        .from(newsTable)
        .where(
          and(
            eq(newsTable.status, 'published'),
            eq(newsTable.category_id, input.category_id)
          )
        )
        .orderBy(desc(newsTable.published_at))
        .limit(limit)
        .offset(offset)
        .execute();

      return results;
    } else if (input.category_slug) {
      // Need to join with categories table to filter by slug
      const results = await db.select({
        id: newsTable.id,
        title: newsTable.title,
        slug: newsTable.slug,
        content: newsTable.content,
        excerpt: newsTable.excerpt,
        featured_image: newsTable.featured_image,
        category_id: newsTable.category_id,
        author_id: newsTable.author_id,
        status: newsTable.status,
        views_count: newsTable.views_count,
        published_at: newsTable.published_at,
        created_at: newsTable.created_at,
        updated_at: newsTable.updated_at
      })
      .from(newsTable)
      .innerJoin(categoriesTable, eq(newsTable.category_id, categoriesTable.id))
      .where(
        and(
          eq(newsTable.status, 'published'),
          eq(categoriesTable.slug, input.category_slug)
        )
      )
      .orderBy(desc(newsTable.published_at))
      .limit(limit)
      .offset(offset)
      .execute();

      return results;
    }

    // Fallback - should not reach here due to Zod validation
    return [];
  } catch (error) {
    console.error('Get news by category failed:', error);
    throw error;
  }
};

export const getFeaturedNews = async (limit = 5): Promise<News[]> => {
  try {
    const results = await db.select()
      .from(newsTable)
      .where(eq(newsTable.status, 'published'))
      .orderBy(desc(newsTable.views_count))
      .limit(limit)
      .execute();

    return results;
  } catch (error) {
    console.error('Get featured news failed:', error);
    throw error;
  }
};