import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User, type PaginationInput } from '../schema';
import { eq } from 'drizzle-orm';

export const getUsers = async (input?: PaginationInput): Promise<User[]> => {
  try {
    // Apply default values if input is not provided
    const { limit = 20, offset = 0 } = input || {};

    // Build query with pagination
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      password_hash: usersTable.password_hash, // Include for proper typing, will exclude below
      full_name: usersTable.full_name,
      avatar: usersTable.avatar,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .limit(limit)
    .offset(offset)
    .execute();

    // Exclude password_hash from returned data for security
    return results.map(user => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }) as User[];
  } catch (error) {
    console.error('Failed to get users:', error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User | null> => {
  try {
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      password_hash: usersTable.password_hash, // Include for proper typing, will exclude below
      full_name: usersTable.full_name,
      avatar: usersTable.avatar,
      role: usersTable.role,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
      updated_at: usersTable.updated_at
    })
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .execute();

    if (results.length === 0) {
      return null;
    }

    // Exclude password_hash from returned data for security
    const { password_hash, ...userWithoutPassword } = results[0];
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Failed to get user by id:', error);
    throw error;
  }
};