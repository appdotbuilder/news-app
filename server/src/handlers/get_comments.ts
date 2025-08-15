import { db } from '../db';
import { commentsTable, usersTable, newsTable } from '../db/schema';
import { type Comment, type PaginationInput } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export const getCommentsByNewsId = async (newsId: number, input?: PaginationInput): Promise<Comment[]> => {
  try {
    const limit = input?.limit || 20;
    const offset = input?.offset || 0;

    // Query approved comments for specific news article with user info
    const results = await db.select()
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.user_id, usersTable.id))
      .where(
        and(
          eq(commentsTable.news_id, newsId),
          eq(commentsTable.status, 'approved')
        )
      )
      .orderBy(desc(commentsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results.map(result => ({
      ...result.comments,
      // Include user info in the comment object for easy access
      user: {
        id: result.users.id,
        username: result.users.username,
        full_name: result.users.full_name,
        avatar: result.users.avatar
      }
    })) as Comment[];
  } catch (error) {
    console.error('Failed to fetch comments by news ID:', error);
    throw error;
  }
};

export const getAllComments = async (input?: PaginationInput): Promise<Comment[]> => {
  try {
    const limit = input?.limit || 20;
    const offset = input?.offset || 0;

    // Query all comments with user and news info for admin dashboard
    const results = await db.select()
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.user_id, usersTable.id))
      .innerJoin(newsTable, eq(commentsTable.news_id, newsTable.id))
      .orderBy(
        desc(commentsTable.status), // Status order: rejected, pending, approved
        desc(commentsTable.created_at)
      )
      .limit(limit)
      .offset(offset)
      .execute();

    return results.map(result => ({
      ...result.comments,
      // Include user and news info for admin context
      user: {
        id: result.users.id,
        username: result.users.username,
        full_name: result.users.full_name
      },
      news: {
        id: result.news.id,
        title: result.news.title,
        slug: result.news.slug
      }
    })) as Comment[];
  } catch (error) {
    console.error('Failed to fetch all comments:', error);
    throw error;
  }
};

export const getPendingComments = async (input?: PaginationInput): Promise<Comment[]> => {
  try {
    const limit = input?.limit || 20;
    const offset = input?.offset || 0;

    // Query pending comments with user and news info for moderation
    const results = await db.select()
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.user_id, usersTable.id))
      .innerJoin(newsTable, eq(commentsTable.news_id, newsTable.id))
      .where(eq(commentsTable.status, 'pending'))
      .orderBy(desc(commentsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results.map(result => ({
      ...result.comments,
      // Include user and news info for moderation context
      user: {
        id: result.users.id,
        username: result.users.username,
        full_name: result.users.full_name,
        email: result.users.email
      },
      news: {
        id: result.news.id,
        title: result.news.title,
        slug: result.news.slug
      }
    })) as Comment[];
  } catch (error) {
    console.error('Failed to fetch pending comments:', error);
    throw error;
  }
};