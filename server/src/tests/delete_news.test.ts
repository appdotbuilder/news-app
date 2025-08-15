import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, newsTable, commentsTable } from '../db/schema';
import { deleteNews } from '../handlers/delete_news';
import { eq } from 'drizzle-orm';

describe('deleteNews', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete news and return true when news exists', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category'
      })
      .returning()
      .execute();

    // Create news article
    const newsResult = await db.insert(newsTable)
      .values({
        title: 'Test News',
        slug: 'test-news',
        content: 'This is test news content',
        excerpt: 'Test excerpt',
        category_id: categoryResult[0].id,
        author_id: userResult[0].id,
        status: 'published'
      })
      .returning()
      .execute();

    const newsId = newsResult[0].id;

    // Delete the news
    const result = await deleteNews(newsId);

    expect(result).toBe(true);

    // Verify news is deleted
    const deletedNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, newsId))
      .execute();

    expect(deletedNews).toHaveLength(0);
  });

  it('should return false when news does not exist', async () => {
    const nonExistentId = 99999;
    const result = await deleteNews(nonExistentId);

    expect(result).toBe(false);
  });

  it('should cascade delete related comments', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category'
      })
      .returning()
      .execute();

    // Create news article
    const newsResult = await db.insert(newsTable)
      .values({
        title: 'Test News',
        slug: 'test-news',
        content: 'This is test news content',
        category_id: categoryResult[0].id,
        author_id: userResult[0].id,
        status: 'published'
      })
      .returning()
      .execute();

    const newsId = newsResult[0].id;

    // Create comments for the news
    await db.insert(commentsTable)
      .values([
        {
          content: 'First comment',
          news_id: newsId,
          user_id: userResult[0].id,
          status: 'approved'
        },
        {
          content: 'Second comment',
          news_id: newsId,
          user_id: userResult[0].id,
          status: 'pending'
        }
      ])
      .execute();

    // Verify comments exist before deletion
    const commentsBefore = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.news_id, newsId))
      .execute();

    expect(commentsBefore).toHaveLength(2);

    // Delete the news
    const result = await deleteNews(newsId);

    expect(result).toBe(true);

    // Verify both news and comments are deleted
    const deletedNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, newsId))
      .execute();

    const remainingComments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.news_id, newsId))
      .execute();

    expect(deletedNews).toHaveLength(0);
    expect(remainingComments).toHaveLength(0);
  });

  it('should not affect other news articles when deleting', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category'
      })
      .returning()
      .execute();

    // Create two news articles
    const newsResults = await db.insert(newsTable)
      .values([
        {
          title: 'News to Delete',
          slug: 'news-to-delete',
          content: 'This news will be deleted',
          category_id: categoryResult[0].id,
          author_id: userResult[0].id,
          status: 'published'
        },
        {
          title: 'News to Keep',
          slug: 'news-to-keep',
          content: 'This news should remain',
          category_id: categoryResult[0].id,
          author_id: userResult[0].id,
          status: 'published'
        }
      ])
      .returning()
      .execute();

    const newsToDeleteId = newsResults[0].id;
    const newsToKeepId = newsResults[1].id;

    // Delete only the first news
    const result = await deleteNews(newsToDeleteId);

    expect(result).toBe(true);

    // Verify only the targeted news is deleted
    const deletedNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, newsToDeleteId))
      .execute();

    const remainingNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, newsToKeepId))
      .execute();

    expect(deletedNews).toHaveLength(0);
    expect(remainingNews).toHaveLength(1);
    expect(remainingNews[0].title).toEqual('News to Keep');
  });

  it('should handle news with no comments', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category'
      })
      .returning()
      .execute();

    // Create news article without comments
    const newsResult = await db.insert(newsTable)
      .values({
        title: 'News Without Comments',
        slug: 'news-without-comments',
        content: 'This news has no comments',
        category_id: categoryResult[0].id,
        author_id: userResult[0].id,
        status: 'draft'
      })
      .returning()
      .execute();

    const newsId = newsResult[0].id;

    // Delete the news
    const result = await deleteNews(newsId);

    expect(result).toBe(true);

    // Verify news is deleted
    const deletedNews = await db.select()
      .from(newsTable)
      .where(eq(newsTable.id, newsId))
      .execute();

    expect(deletedNews).toHaveLength(0);
  });
});