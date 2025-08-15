import { db } from '../db';
import { newsTable, categoriesTable, usersTable } from '../db/schema';
import { type SearchNewsInput, type News } from '../schema';
import { eq, and, or, ilike, desc, SQL } from 'drizzle-orm';

export const searchNews = async (input: SearchNewsInput): Promise<News[]> => {
  try {
    // Start with base query joining news with categories and users
    let baseQuery = db.select({
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
      updated_at: newsTable.updated_at,
    })
    .from(newsTable)
    .innerJoin(categoriesTable, eq(newsTable.category_id, categoriesTable.id))
    .innerJoin(usersTable, eq(newsTable.author_id, usersTable.id));

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Only search in published news
    conditions.push(eq(newsTable.status, 'published'));

    // Add full-text search conditions for title and content
    const searchTerm = `%${input.query}%`;
    conditions.push(
      or(
        ilike(newsTable.title, searchTerm),
        ilike(newsTable.content, searchTerm)
      )!
    );

    // Add category filter if provided
    if (input.category_id !== undefined) {
      conditions.push(eq(newsTable.category_id, input.category_id));
    }

    // Apply where conditions and build complete query
    const finalQuery = baseQuery
      .where(and(...conditions))
      .orderBy(desc(newsTable.published_at))
      .limit(input.limit)
      .offset(input.offset);

    const results = await finalQuery.execute();

    // Return results (no need for type conversion as all fields are already correct types)
    return results;
  } catch (error) {
    console.error('News search failed:', error);
    throw error;
  }
};