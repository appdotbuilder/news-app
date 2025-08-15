import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// Test input with all fields
const testInputComplete: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  role: 'user'
};

// Test input with minimal required fields
const testInputMinimal: CreateUserInput = {
  username: 'minimaluser',
  email: 'minimal@example.com',
  password: 'password123',
  role: 'user'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInputComplete);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.avatar).toEqual('https://example.com/avatar.jpg');
    expect(result.role).toEqual('user');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should create a user with minimal fields', async () => {
    const result = await createUser(testInputMinimal);

    expect(result.username).toEqual('minimaluser');
    expect(result.email).toEqual('minimal@example.com');
    expect(result.full_name).toBeNull();
    expect(result.avatar).toBeNull();
    expect(result.role).toEqual('user');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create admin user when role is specified', async () => {
    const adminInput: CreateUserInput = {
      ...testInputMinimal,
      username: 'adminuser',
      email: 'admin@example.com',
      role: 'admin'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('admin');
    expect(result.username).toEqual('adminuser');
    expect(result.email).toEqual('admin@example.com');
  });

  it('should save user to database', async () => {
    const result = await createUser(testInputComplete);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].avatar).toEqual('https://example.com/avatar.jpg');
    expect(users[0].role).toEqual('user');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password correctly', async () => {
    const result = await createUser(testInputComplete);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash).toContain(':'); // Should contain salt separator
    expect(result.password_hash.length).toBeGreaterThan(50); // Hash + salt should be long

    // Verify the hash is correct by recreating it
    const [hash, salt] = result.password_hash.split(':');
    const expectedHash = createHash('sha256').update('password123' + salt).digest('hex');
    expect(hash).toEqual(expectedHash);

    // Verify wrong password fails
    const wrongHash = createHash('sha256').update('wrongpassword' + salt).digest('hex');
    expect(hash).not.toEqual(wrongHash);
  });

  it('should set default values correctly', async () => {
    const result = await createUser(testInputMinimal);

    expect(result.is_active).toEqual(true); // Default from database
    expect(result.role).toEqual('user'); // From input (Zod default)
    expect(result.full_name).toBeNull(); // Optional field not provided
    expect(result.avatar).toBeNull(); // Optional field not provided
  });

  it('should handle unique constraint violations', async () => {
    // Create first user
    await createUser(testInputComplete);

    // Try to create another user with the same username
    const duplicateUsernameInput: CreateUserInput = {
      ...testInputComplete,
      email: 'different@example.com' // Different email
    };

    await expect(createUser(duplicateUsernameInput))
      .rejects.toThrow(/duplicate key value violates unique constraint|already exists/i);

    // Try to create another user with the same email
    const duplicateEmailInput: CreateUserInput = {
      ...testInputComplete,
      username: 'differentuser', // Different username
      email: 'test@example.com' // Same email
    };

    await expect(createUser(duplicateEmailInput))
      .rejects.toThrow(/duplicate key value violates unique constraint|already exists/i);
  });

  it('should handle null optional fields correctly', async () => {
    const inputWithNulls: CreateUserInput = {
      username: 'nulluser',
      email: 'null@example.com',
      password: 'password123',
      full_name: null,
      avatar: null,
      role: 'user'
    };

    const result = await createUser(inputWithNulls);

    expect(result.full_name).toBeNull();
    expect(result.avatar).toBeNull();
    expect(result.username).toEqual('nulluser');
    expect(result.email).toEqual('null@example.com');
  });

  it('should create multiple users with unique data', async () => {
    const user1 = await createUser({
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123',
      role: 'user'
    });

    const user2 = await createUser({
      username: 'user2',
      email: 'user2@example.com',
      password: 'password456',
      role: 'admin'
    });

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.username).toEqual('user1');
    expect(user2.username).toEqual('user2');
    expect(user1.role).toEqual('user');
    expect(user2.role).toEqual('admin');

    // Verify both are in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});