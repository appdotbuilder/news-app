import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { createHash, randomBytes } from 'crypto';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Hash the password with salt using Node.js crypto
    const salt = randomBytes(16).toString('hex');
    const password_hash = createHash('sha256').update(input.password + salt).digest('hex') + ':' + salt;

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        full_name: input.full_name || null,
        avatar: input.avatar || null,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};