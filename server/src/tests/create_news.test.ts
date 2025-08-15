import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { newsTable, categoriesTable, usersTable } from '../db/schema';
import { type CreateNewsInput } from '../schema';
import { createNews } from '../handlers/create_news';
import { eq } from 'drizzle-orm';

describe('createNews', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async () => {
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    return userResult[0];
  };

  // Helper function to create test category
  const createTestCategory = async () => {
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    return categoryResult[0];
  };

  it('should create a news article with all fields', async () => {
    // Create prerequisite data
    const testUser = await createTestUser();
    const testCategory = await createTestCategory();

    const testInput: CreateNewsInput = {
      title: 'Test News Article',
      slug: 'test-news-article',
      content: 'This is the content of the test news article.',
      excerpt: 'This is an excerpt',
      featured_image: 'https://example.com/image.jpg',
      category_id: testCategory.id,
      author_id: testUser.id,
      status: 'published',
      published_at: new Date('2024-01-01T10:00:00Z')
    };

    const result = await createNews(testInput);

    // Verify all fields
    expect(result.id).toBeDefined();
    expect(result.title).toEqual('Test News Article');
    expect(result.slug).toEqual('test-news-article');
    expect(result.content).toEqual('This is the content of the test news article.');
    expect(result.excerpt).toEqual('This is an excerpt');
    expect(result.featured_image).toEqual('https://example.com/image.jpg');
    expect(result.category_id).toEqual(testCategory.id);
    expect(result.author_id).toEqual(testUser.id);
    expect(result.status).toEqual('published');
    expect(result.views_count).toEqual(0);
    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a news article with minimal required fields', async () => {
    // Create prerequisite data
    const testUser = await createTestUser();
    const testCategory = await createTestCategory();

    const testInput: CreateNewsInput = {
      title: 'Minimal News Article',
      slug: 'minimal-news-article',
      content: 'Minimal content.',
      category_id: testCategory.id,
      author_id: testUser.id,
      status: 'draft'
    };

    const result = await createNews(testInput);

    expect(result.title).toEqual('Minimal News Article');
    expect(result.slug).toEqual('minimal-news-article');
    expect(result.content).toEqual('Minimal content.');
    expect(result.excerpt).toBeNull();
    expect(result.featured_image).toBeNull();
    expect(result.category_id).toEqual(testCategory.id);
    expect(result.author_id).toEqual(testUser.id);
    expect(result.status).toEqual('draft');
    expect(result.published_at).toBeNull();
    expect(result.views_count).toEqual(0);
  });

  it('should save news article to database', async () => {
    // Create prerequisite data
    const testUser = await createTestUser();
    const testCategory = await createTestCategory();

    const testInput: CreateNewsInput = {
      title: 'Database Test Article',
      slug: 'database-test-article',
      content: 'Content for database test.',
      category_id: testCategory.id,
      author_id: testUser.id,
      status: 'draft'
    };

    const result = await createNews(testInput);

    // Verify it was saved to database
    const savedNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, result.id))
      .execute();

    expect(savedNews).toHaveLength(1);
    expect(savedNews[0].title).toEqual('Database Test Article');
    expect(savedNews[0].slug).toEqual('database-test-article');
    expect(savedNews[0].content).toEqual('Content for database test.');
    expect(savedNews[0].category_id).toEqual(testCategory.id);
    expect(savedNews[0].author_id).toEqual(testUser.id);
    expect(savedNews[0].status).toEqual('draft');
  });

  it('should throw error when category does not exist', async () => {
    // Create only user, no category
    const testUser = await createTestUser();

    const testInput: CreateNewsInput = {
      title: 'Test Article',
      slug: 'test-article',
      content: 'Test content.',
      category_id: 99999, // Non-existent category
      author_id: testUser.id,
      status: 'draft'
    };

    await expect(createNews(testInput)).rejects.toThrow(/Category with id 99999 does not exist/i);
  });

  it('should throw error when author does not exist', async () => {
    // Create only category, no user
    const testCategory = await createTestCategory();

    const testInput: CreateNewsInput = {
      title: 'Test Article',
      slug: 'test-article',
      content: 'Test content.',
      category_id: testCategory.id,
      author_id: 99999, // Non-existent user
      status: 'draft'
    };

    await expect(createNews(testInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should throw error when slug already exists', async () => {
    // Create prerequisite data
    const testUser = await createTestUser();
    const testCategory = await createTestCategory();

    // Create first news article
    const firstInput: CreateNewsInput = {
      title: 'First Article',
      slug: 'duplicate-slug',
      content: 'First content.',
      category_id: testCategory.id,
      author_id: testUser.id,
      status: 'draft'
    };

    await createNews(firstInput);

    // Try to create second article with same slug
    const secondInput: CreateNewsInput = {
      title: 'Second Article',
      slug: 'duplicate-slug', // Same slug
      content: 'Second content.',
      category_id: testCategory.id,
      author_id: testUser.id,
      status: 'draft'
    };

    await expect(createNews(secondInput)).rejects.toThrow(/News with slug 'duplicate-slug' already exists/i);
  });

  it('should handle published_at date correctly', async () => {
    // Create prerequisite data
    const testUser = await createTestUser();
    const testCategory = await createTestCategory();

    const publishedDate = new Date('2024-03-15T14:30:00Z');
    const testInput: CreateNewsInput = {
      title: 'Published Article',
      slug: 'published-article',
      content: 'Published content.',
      category_id: testCategory.id,
      author_id: testUser.id,
      status: 'published',
      published_at: publishedDate
    };

    const result = await createNews(testInput);

    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.published_at?.toISOString()).toEqual('2024-03-15T14:30:00.000Z');

    // Verify in database
    const savedNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, result.id))
      .execute();

    expect(savedNews[0].published_at).toBeInstanceOf(Date);
    expect(savedNews[0].published_at?.toISOString()).toEqual('2024-03-15T14:30:00.000Z');
  });
});