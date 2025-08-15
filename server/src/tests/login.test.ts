import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestUser = async (overrides: Partial<typeof usersTable.$inferInsert> = {}) => {
    const defaultUser = {
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'password123',
      full_name: 'Test User',
      avatar: null,
      role: 'user' as const,
      is_active: true
    };

    const result = await db.insert(usersTable)
      .values({ ...defaultUser, ...overrides })
      .returning()
      .execute();

    return result[0];
  };

  it('should authenticate valid user credentials', async () => {
    // Create test user
    await createTestUser();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result?.email).toEqual('test@example.com');
    expect(result?.username).toEqual('testuser');
    expect(result?.full_name).toEqual('Test User');
    expect(result?.role).toEqual('user');
    expect(result?.is_active).toEqual(true);
    expect(result?.id).toBeDefined();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);

    // Ensure password_hash is not included in response
    expect((result as any).password_hash).toBeUndefined();
  });

  it('should return null for non-existent email', async () => {
    const loginInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    await createTestUser();

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for inactive user', async () => {
    await createTestUser({ is_active: false });

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should authenticate admin user correctly', async () => {
    await createTestUser({
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin',
      full_name: 'Admin User'
    });

    const loginInput: LoginInput = {
      email: 'admin@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result?.role).toEqual('admin');
    expect(result?.username).toEqual('admin');
    expect(result?.full_name).toEqual('Admin User');
  });

  it('should handle user with null full_name and avatar', async () => {
    await createTestUser({
      full_name: null,
      avatar: null
    });

    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result?.full_name).toBeNull();
    expect(result?.avatar).toBeNull();
  });

  it('should be case sensitive for email', async () => {
    await createTestUser({ email: 'Test@Example.Com' });

    // Try with different case
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should authenticate with correct case-sensitive email', async () => {
    await createTestUser({ email: 'Test@Example.Com' });

    const loginInput: LoginInput = {
      email: 'Test@Example.Com',
      password: 'password123'
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result?.email).toEqual('Test@Example.Com');
  });
});