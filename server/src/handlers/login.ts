import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// User type without password for secure responses
type UserWithoutPassword = Omit<User, 'password_hash'>;

export const login = async (input: LoginInput): Promise<UserWithoutPassword | null> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return null; // User is deactivated
    }

    // In a real implementation, you would use bcrypt or similar to compare passwords
    // For this example, we'll do a simple string comparison
    // Note: password_hash would typically be a hashed version of the password
    if (user.password_hash !== input.password) {
      return null; // Invalid password
    }

    // Return user data without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};