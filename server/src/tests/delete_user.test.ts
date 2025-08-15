import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, newsTable, commentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteUser } from '../handlers/delete_user';

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should soft delete an existing user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Delete the user
    const result = await deleteUser(userId);

    // Should return true for successful deletion
    expect(result).toBe(true);

    // Verify user is soft deleted (is_active = false)
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].is_active).toBe(false);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return false when trying to delete non-existent user', async () => {
    const result = await deleteUser(999);

    expect(result).toBe(false);
  });

  it('should preserve related news and comments when user is deleted', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'author',
        email: 'author@example.com',
        password_hash: 'hashedpassword',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test news article by the user
    const newsResult = await db.insert(newsTable)
      .values({
        title: 'Test News',
        slug: 'test-news',
        content: 'Test content',
        category_id: categoryId,
        author_id: userId,
        status: 'published'
      })
      .returning()
      .execute();

    const newsId = newsResult[0].id;

    // Create test comment by the user
    await db.insert(commentsTable)
      .values({
        content: 'Test comment',
        news_id: newsId,
        user_id: userId,
        status: 'approved'
      })
      .execute();

    // Delete the user
    const deleteResult = await deleteUser(userId);
    expect(deleteResult).toBe(true);

    // Verify news article still exists and references the user
    const news = await db.select()
      .from(newsTable)
      .where(eq(newsTable.author_id, userId))
      .execute();

    expect(news).toHaveLength(1);
    expect(news[0].title).toEqual('Test News');
    expect(news[0].author_id).toEqual(userId);

    // Verify comment still exists and references the user
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.user_id, userId))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toEqual('Test comment');
    expect(comments[0].user_id).toEqual(userId);

    // Verify user is soft deleted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users[0].is_active).toBe(false);
  });

  it('should update the updated_at timestamp when deleting user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'timestamptest',
        email: 'timestamp@example.com',
        password_hash: 'hashedpassword',
        role: 'user',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const originalUpdatedAt = userResult[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Delete the user
    await deleteUser(userId);

    // Verify updated_at timestamp was changed
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users[0].updated_at).toBeInstanceOf(Date);
    expect(users[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle deletion of already inactive user', async () => {
    // Create test user that is already inactive
    const userResult = await db.insert(usersTable)
      .values({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password_hash: 'hashedpassword',
        role: 'user',
        is_active: false
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Delete the already inactive user
    const result = await deleteUser(userId);

    // Should still return true as the user exists
    expect(result).toBe(true);

    // Verify user remains inactive
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(users[0].is_active).toBe(false);
  });
});