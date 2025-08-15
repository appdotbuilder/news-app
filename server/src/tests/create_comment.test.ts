import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { commentsTable, usersTable, newsTable, categoriesTable } from '../db/schema';
import { type CreateCommentInput } from '../schema';
import { createComment } from '../handlers/create_comment';
import { eq } from 'drizzle-orm';

describe('createComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testNewsId: number;

  const setupTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category'
      })
      .returning()
      .execute();

    // Create test news article
    const newsResult = await db.insert(newsTable)
      .values({
        title: 'Test News',
        slug: 'test-news',
        content: 'Test news content',
        category_id: categoryResult[0].id,
        author_id: testUserId,
        status: 'published'
      })
      .returning()
      .execute();
    testNewsId = newsResult[0].id;
  };

  const testInput: CreateCommentInput = {
    content: 'This is a test comment',
    news_id: 0, // Will be set in tests
    user_id: 0  // Will be set in tests
  };

  it('should create a comment with valid data', async () => {
    await setupTestData();
    
    const input: CreateCommentInput = {
      ...testInput,
      news_id: testNewsId,
      user_id: testUserId
    };

    const result = await createComment(input);

    // Verify basic fields
    expect(result.content).toEqual('This is a test comment');
    expect(result.news_id).toEqual(testNewsId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save comment to database', async () => {
    await setupTestData();
    
    const input: CreateCommentInput = {
      ...testInput,
      news_id: testNewsId,
      user_id: testUserId
    };

    const result = await createComment(input);

    // Query database to verify comment was saved
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, result.id))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toEqual('This is a test comment');
    expect(comments[0].news_id).toEqual(testNewsId);
    expect(comments[0].user_id).toEqual(testUserId);
    expect(comments[0].status).toEqual('pending');
    expect(comments[0].created_at).toBeInstanceOf(Date);
    expect(comments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should default status to pending', async () => {
    await setupTestData();
    
    const input: CreateCommentInput = {
      ...testInput,
      news_id: testNewsId,
      user_id: testUserId
    };

    const result = await createComment(input);

    expect(result.status).toEqual('pending');
  });

  it('should throw error when user does not exist', async () => {
    await setupTestData();
    
    const input: CreateCommentInput = {
      ...testInput,
      news_id: testNewsId,
      user_id: 99999 // Non-existent user ID
    };

    await expect(createComment(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should throw error when news article does not exist', async () => {
    await setupTestData();
    
    const input: CreateCommentInput = {
      ...testInput,
      news_id: 99999, // Non-existent news ID
      user_id: testUserId
    };

    await expect(createComment(input)).rejects.toThrow(/News article with id 99999 not found/i);
  });

  it('should handle long comment content correctly', async () => {
    await setupTestData();
    
    const longContent = 'This is a very long comment content that tests the ability to handle larger text inputs. '.repeat(10);
    
    const input: CreateCommentInput = {
      content: longContent,
      news_id: testNewsId,
      user_id: testUserId
    };

    const result = await createComment(input);

    expect(result.content).toEqual(longContent);
    expect(result.content.length).toBeGreaterThan(500);
  });

  it('should create multiple comments for same news article', async () => {
    await setupTestData();
    
    const input1: CreateCommentInput = {
      content: 'First comment',
      news_id: testNewsId,
      user_id: testUserId
    };

    const input2: CreateCommentInput = {
      content: 'Second comment',
      news_id: testNewsId,
      user_id: testUserId
    };

    const result1 = await createComment(input1);
    const result2 = await createComment(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.content).toEqual('First comment');
    expect(result2.content).toEqual('Second comment');
    expect(result1.news_id).toEqual(testNewsId);
    expect(result2.news_id).toEqual(testNewsId);

    // Verify both comments exist in database
    const allComments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.news_id, testNewsId))
      .execute();

    expect(allComments).toHaveLength(2);
  });
});