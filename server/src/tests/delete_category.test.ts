import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, usersTable, newsTable } from '../db/schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing category with no dependencies', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Delete the category
    const result = await deleteCategory(categoryId);

    expect(result).toBe(true);

    // Verify category was deleted
    const deletedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(deletedCategory).toHaveLength(0);
  });

  it('should return false for non-existent category', async () => {
    const result = await deleteCategory(999);

    expect(result).toBe(false);
  });

  it('should return false when category has associated news articles', async () => {
    // Create a test user first (required for news article)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a news article associated with the category
    await db.insert(newsTable)
      .values({
        title: 'Test News',
        slug: 'test-news',
        content: 'Test news content',
        excerpt: 'Test excerpt',
        category_id: categoryId,
        author_id: userId,
        status: 'published',
        views_count: 0
      })
      .execute();

    // Try to delete the category
    const result = await deleteCategory(categoryId);

    expect(result).toBe(false);

    // Verify category still exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(existingCategory).toHaveLength(1);
    expect(existingCategory[0].name).toEqual('Test Category');
  });

  it('should handle database constraints properly', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Protected Category',
        slug: 'protected-category',
        description: 'A category that should be protected'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User 2',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple news articles with the same category
    await db.insert(newsTable)
      .values([
        {
          title: 'First News',
          slug: 'first-news',
          content: 'First news content',
          category_id: categoryId,
          author_id: userId,
          status: 'published',
          views_count: 0
        },
        {
          title: 'Second News',
          slug: 'second-news',
          content: 'Second news content',
          category_id: categoryId,
          author_id: userId,
          status: 'draft',
          views_count: 5
        }
      ])
      .execute();

    // Try to delete the category
    const result = await deleteCategory(categoryId);

    expect(result).toBe(false);

    // Verify all news articles still exist
    const newsArticles = await db.select()
      .from(newsTable)
      .where(eq(newsTable.category_id, categoryId))
      .execute();

    expect(newsArticles).toHaveLength(2);
  });

  it('should verify category exists before checking dependencies', async () => {
    // Create a test user and news article first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser3',
        email: 'test3@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User 3',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a category to get a valid ID, then delete it to create orphaned news
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Temp Category',
        slug: 'temp-category'
      })
      .returning()
      .execute();

    const tempCategoryId = categoryResult[0].id;

    // Try to delete a non-existent category ID that's higher than any existing
    const nonExistentId = tempCategoryId + 1000;
    const result = await deleteCategory(nonExistentId);

    expect(result).toBe(false);
  });
});