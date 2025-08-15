import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a test user directly in database
  const createTestUser = async (): Promise<number> => {
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password123',
        full_name: 'Test User',
        avatar: 'avatar.jpg',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    return result[0].id;
  };

  it('should update user username', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'updateduser'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('updateduser');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.full_name).toEqual('Test User'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user email', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      email: 'updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.username).toEqual('testuser'); // Should remain unchanged
  });

  it('should update multiple fields', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'newusername',
      email: 'newemail@example.com',
      full_name: 'New Full Name',
      avatar: 'newavatar.jpg',
      role: 'admin',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.username).toEqual('newusername');
    expect(result.email).toEqual('newemail@example.com');
    expect(result.full_name).toEqual('New Full Name');
    expect(result.avatar).toEqual('newavatar.jpg');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update nullable fields to null', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      full_name: null,
      avatar: null
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(userId);
    expect(result.full_name).toBeNull();
    expect(result.avatar).toBeNull();
  });

  it('should save changes to database', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'dbcheckuser',
      email: 'dbcheck@example.com'
    };

    await updateUser(updateInput);

    // Verify changes in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('dbcheckuser');
    expect(users[0].email).toEqual('dbcheck@example.com');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should only update provided fields', async () => {
    const userId = await createTestUser();

    // Get original user data
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'partialupdateuser'
    };

    const result = await updateUser(updateInput);

    expect(result.username).toEqual('partialupdateuser');
    expect(result.email).toEqual(originalUser[0].email); // Should remain unchanged
    expect(result.full_name).toEqual(originalUser[0].full_name); // Should remain unchanged
    expect(result.role).toEqual(originalUser[0].role); // Should remain unchanged
    expect(result.is_active).toEqual(originalUser[0].is_active); // Should remain unchanged
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateUserInput = {
      id: 999999, // Non-existent ID
      username: 'nonexistentuser'
    };

    expect(updateUser(updateInput)).rejects.toThrow(/user with id 999999 not found/i);
  });

  it('should throw error when updating to duplicate username', async () => {
    // Create first user
    await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hashed_password123',
        role: 'user'
      })
      .execute();

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: 'hashed_password123',
        role: 'user'
      })
      .returning()
      .execute();

    // Try to update user2's username to user1's username
    const updateInput: UpdateUserInput = {
      id: user2Result[0].id,
      username: 'user1' // Duplicate username
    };

    expect(updateUser(updateInput)).rejects.toThrow();
  });

  it('should throw error when updating to duplicate email', async () => {
    // Create first user
    await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hashed_password123',
        role: 'user'
      })
      .execute();

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: 'hashed_password123',
        role: 'user'
      })
      .returning()
      .execute();

    // Try to update user2's email to user1's email
    const updateInput: UpdateUserInput = {
      id: user2Result[0].id,
      email: 'user1@example.com' // Duplicate email
    };

    expect(updateUser(updateInput)).rejects.toThrow();
  });

  it('should update user role correctly', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      role: 'admin'
    };

    const result = await updateUser(updateInput);

    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(true); // Should remain unchanged
  });

  it('should update is_active status', async () => {
    const userId = await createTestUser();

    const updateInput: UpdateUserInput = {
      id: userId,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.is_active).toEqual(false);
    expect(result.role).toEqual('user'); // Should remain unchanged
  });

  it('should update updated_at timestamp', async () => {
    const userId = await createTestUser();
    
    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    const originalUpdatedAt = originalUser[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: userId,
      username: 'timestamptest'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});