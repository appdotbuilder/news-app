import { db } from '../db';
import { newsTable, commentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteNews = async (id: number): Promise<boolean> => {
  try {
    // First, check if the news exists
    const existingNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, id))
      .execute();

    if (existingNews.length === 0) {
      return false; // News not found
    }

    // Delete related comments first (cascade deletion)
    await db.delete(commentsTable)
      .where(eq(commentsTable.news_id, id))
      .execute();

    // Delete the news article
    await db.delete(newsTable)
      .where(eq(newsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('News deletion failed:', error);
    throw error;
  }
};