import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type PaginationInput, type CreateUserInput } from '../schema';
import { getUsers, getUserById } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (userData: Partial<CreateUserInput> = {}) => {
  const defaultUser: CreateUserInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    full_name: 'Test User',
    avatar: null,
    role: 'user'
  };

  const userToCreate = { ...defaultUser, ...userData };
  // Use simple hash for testing - no need for bcrypt in tests
  const passwordHash = `hashed_${userToCreate.password}`;

  const result = await db.insert(usersTable)
    .values({
      username: userToCreate.username,
      email: userToCreate.email,
      password_hash: passwordHash,
      full_name: userToCreate.full_name,
      avatar: userToCreate.avatar,
      role: userToCreate.role
    })
    .returning()
    .execute();

  return result[0];
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
  });

  it('should return all users without password_hash', async () => {
    // Create test users
    await createTestUser({ username: 'user1', email: 'user1@example.com' });
    await createTestUser({ username: 'user2', email: 'user2@example.com' });

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].username).toBe('user1');
    expect(result[1].username).toBe('user2');

    // Verify password_hash is not included
    result.forEach(user => {
      expect(user).not.toHaveProperty('password_hash');
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.role).toBeDefined();
      expect(user.is_active).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should apply default pagination when no input provided', async () => {
    // Create more users than the default limit
    for (let i = 1; i <= 25; i++) {
      await createTestUser({
        username: `user${i}`,
        email: `user${i}@example.com`
      });
    }

    const result = await getUsers();

    // Should return default limit of 20
    expect(result).toHaveLength(20);
  });

  it('should apply custom pagination', async () => {
    // Create test users
    for (let i = 1; i <= 15; i++) {
      await createTestUser({
        username: `user${i}`,
        email: `user${i}@example.com`
      });
    }

    const paginationInput: PaginationInput = {
      limit: 5,
      offset: 0
    };

    const result = await getUsers(paginationInput);

    expect(result).toHaveLength(5);
  });

  it('should handle pagination with offset', async () => {
    // Create test users
    for (let i = 1; i <= 10; i++) {
      await createTestUser({
        username: `user${i}`,
        email: `user${i}@example.com`
      });
    }

    const paginationInput: PaginationInput = {
      limit: 5,
      offset: 5
    };

    const result = await getUsers(paginationInput);

    expect(result).toHaveLength(5);
    // Verify we got the second batch of users
    expect(result[0].username).toBe('user6');
  });

  it('should return users with correct data types', async () => {
    await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin'
    });

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.full_name).toBe('string');
    expect(user.avatar).toBeNull();
    expect(user.role).toBe('admin');
    expect(typeof user.is_active).toBe('boolean');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when user does not exist', async () => {
    const result = await getUserById(999);

    expect(result).toBeNull();
  });

  it('should return user by id without password_hash', async () => {
    const createdUser = await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin'
    });

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdUser.id);
    expect(result!.username).toBe('testuser');
    expect(result!.email).toBe('test@example.com');
    expect(result!.full_name).toBe('Test User');
    expect(result!.role).toBe('admin');

    // Verify password_hash is not included
    expect(result).not.toHaveProperty('password_hash');
  });

  it('should return user with correct data types', async () => {
    const createdUser = await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      full_name: 'Test User',
      avatar: 'avatar.jpg',
      role: 'user'
    });

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();

    expect(typeof result!.id).toBe('number');
    expect(typeof result!.username).toBe('string');
    expect(typeof result!.email).toBe('string');
    expect(typeof result!.full_name).toBe('string');
    expect(typeof result!.avatar).toBe('string');
    expect(result!.role).toBe('user');
    expect(typeof result!.is_active).toBe('boolean');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle inactive users correctly', async () => {
    // Create user and then update to inactive
    const createdUser = await createTestUser();
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.is_active).toBe(false);
  });

  it('should handle users with null optional fields', async () => {
    const createdUser = await createTestUser({
      username: 'testuser',
      email: 'test@example.com',
      full_name: null, // Explicitly null
      avatar: null // Explicitly null
    });

    const result = await getUserById(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.full_name).toBeNull();
    expect(result!.avatar).toBeNull();
  });
});