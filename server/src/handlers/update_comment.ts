import { db } from '../db';
import { commentsTable } from '../db/schema';
import { type UpdateCommentInput, type Comment, type CommentStatus } from '../schema';
import { eq } from 'drizzle-orm';

export const updateComment = async (input: UpdateCommentInput): Promise<Comment> => {
  try {
    // Check if comment exists
    const existingComment = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, input.id))
      .limit(1)
      .execute();

    if (existingComment.length === 0) {
      throw new Error(`Comment with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof commentsTable.$inferInsert> & { updated_at: Date } = {
      updated_at: new Date()
    };

    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    // Update the comment
    const result = await db.update(commentsTable)
      .set(updateData)
      .where(eq(commentsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Comment update failed:', error);
    throw error;
  }
};

export const moderateComment = async (id: number, status: 'approved' | 'rejected'): Promise<Comment> => {
  try {
    // Check if comment exists
    const existingComment = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, id))
      .limit(1)
      .execute();

    if (existingComment.length === 0) {
      throw new Error(`Comment with id ${id} not found`);
    }

    // Update comment status
    const result = await db.update(commentsTable)
      .set({
        status: status as CommentStatus,
        updated_at: new Date()
      })
      .where(eq(commentsTable.id, id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Comment moderation failed:', error);
    throw error;
  }
};