import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    // Perform soft delete by setting is_active to false
    // This preserves data integrity and maintains foreign key relationships
    const result = await db.update(usersTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    // Return true if user was found and updated, false if user not found
    return result.length > 0;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
};