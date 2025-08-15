import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { newsTable, categoriesTable, usersTable } from '../db/schema';
import { type UpdateNewsInput } from '../schema';
import { updateNews } from '../handlers/update_news';
import { eq } from 'drizzle-orm';

describe('updateNews', () => {
  let testUserId: number;
  let testCategoryId: number;
  let testNewsId: number;
  let secondCategoryId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test categories
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Technology',
        slug: 'technology',
        description: 'Tech news'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    const secondCategoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Sports',
        slug: 'sports',
        description: 'Sports news'
      })
      .returning()
      .execute();
    secondCategoryId = secondCategoryResult[0].id;

    // Create test news article
    const newsResult = await db.insert(newsTable)
      .values({
        title: 'Original Title',
        slug: 'original-title',
        content: 'Original content',
        excerpt: 'Original excerpt',
        featured_image: 'original-image.jpg',
        category_id: testCategoryId,
        author_id: testUserId,
        status: 'draft'
      })
      .returning()
      .execute();
    testNewsId = newsResult[0].id;
  });

  afterEach(resetDB);

  it('should update news article with all fields', async () => {
    const updateInput: UpdateNewsInput = {
      id: testNewsId,
      title: 'Updated Title',
      slug: 'updated-title',
      content: 'Updated content',
      excerpt: 'Updated excerpt',
      featured_image: 'updated-image.jpg',
      category_id: secondCategoryId,
      status: 'published',
      published_at: new Date('2023-12-01')
    };

    const result = await updateNews(updateInput);

    expect(result.id).toEqual(testNewsId);
    expect(result.title).toEqual('Updated Title');
    expect(result.slug).toEqual('updated-title');
    expect(result.content).toEqual('Updated content');
    expect(result.excerpt).toEqual('Updated excerpt');
    expect(result.featured_image).toEqual('updated-image.jpg');
    expect(result.category_id).toEqual(secondCategoryId);
    expect(result.status).toEqual('published');
    expect(result.published_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update news article with partial fields', async () => {
    const updateInput: UpdateNewsInput = {
      id: testNewsId,
      title: 'Partially Updated Title',
      status: 'published'
    };

    const result = await updateNews(updateInput);

    expect(result.id).toEqual(testNewsId);
    expect(result.title).toEqual('Partially Updated Title');
    expect(result.slug).toEqual('original-title'); // Unchanged
    expect(result.content).toEqual('Original content'); // Unchanged
    expect(result.status).toEqual('published'); // Changed
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated news to database', async () => {
    const updateInput: UpdateNewsInput = {
      id: testNewsId,
      title: 'Database Updated Title',
      content: 'Database updated content'
    };

    await updateNews(updateInput);

    const newsInDb = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, testNewsId))
      .execute();

    expect(newsInDb).toHaveLength(1);
    expect(newsInDb[0].title).toEqual('Database Updated Title');
    expect(newsInDb[0].content).toEqual('Database updated content');
    expect(newsInDb[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update nullable fields to null', async () => {
    const updateInput: UpdateNewsInput = {
      id: testNewsId,
      excerpt: null,
      featured_image: null,
      published_at: null
    };

    const result = await updateNews(updateInput);

    expect(result.excerpt).toBeNull();
    expect(result.featured_image).toBeNull();
    expect(result.published_at).toBeNull();
  });

  it('should throw error when news does not exist', async () => {
    const updateInput: UpdateNewsInput = {
      id: 99999,
      title: 'Non-existent News'
    };

    await expect(updateNews(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateNewsInput = {
      id: testNewsId,
      category_id: 99999
    };

    await expect(updateNews(updateInput)).rejects.toThrow(/category.*not found/i);
  });

  it('should throw error when slug already exists', async () => {
    // Create another news article with a different slug
    await db.insert(newsTable)
      .values({
        title: 'Another Article',
        slug: 'another-article',
        content: 'Another content',
        category_id: testCategoryId,
        author_id: testUserId,
        status: 'draft'
      })
      .execute();

    const updateInput: UpdateNewsInput = {
      id: testNewsId,
      slug: 'another-article' // This slug already exists
    };

    await expect(updateNews(updateInput)).rejects.toThrow(/slug.*already exists/i);
  });

  it('should allow updating slug to same value', async () => {
    const updateInput: UpdateNewsInput = {
      id: testNewsId,
      slug: 'original-title', // Same as current slug
      title: 'Updated Title'
    };

    const result = await updateNews(updateInput);

    expect(result.slug).toEqual('original-title');
    expect(result.title).toEqual('Updated Title');
  });

  it('should validate foreign key constraint for category_id', async () => {
    // First verify the category exists
    const validUpdateInput: UpdateNewsInput = {
      id: testNewsId,
      category_id: testCategoryId
    };

    const result = await updateNews(validUpdateInput);
    expect(result.category_id).toEqual(testCategoryId);

    // Then test with invalid category
    const invalidUpdateInput: UpdateNewsInput = {
      id: testNewsId,
      category_id: 99999
    };

    await expect(updateNews(invalidUpdateInput)).rejects.toThrow(/category.*not found/i);
  });
});