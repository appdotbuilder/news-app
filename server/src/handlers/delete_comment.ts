import { db } from '../db';
import { commentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteComment = async (id: number): Promise<boolean> => {
  try {
    // Delete the comment record
    const result = await db.delete(commentsTable)
      .where(eq(commentsTable.id, id))
      .execute();

    // Return true if a row was deleted, false if comment not found
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Comment deletion failed:', error);
    throw error;
  }
};