import { db } from '../db';
import { commentsTable, usersTable, newsTable } from '../db/schema';
import { type CreateCommentInput, type Comment } from '../schema';
import { eq } from 'drizzle-orm';

export const createComment = async (input: CreateCommentInput): Promise<Comment> => {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Validate that the news article exists
    const news = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, input.news_id))
      .execute();

    if (news.length === 0) {
      throw new Error(`News article with id ${input.news_id} not found`);
    }

    // Insert comment record
    const result = await db.insert(commentsTable)
      .values({
        content: input.content,
        news_id: input.news_id,
        user_id: input.user_id,
        status: 'pending' // Default status for new comments
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Comment creation failed:', error);
    throw error;
  }
};