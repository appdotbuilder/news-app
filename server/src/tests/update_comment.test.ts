import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, newsTable, commentsTable } from '../db/schema';
import { type UpdateCommentInput, type CreateUserInput, type CreateCategoryInput, type CreateNewsInput, type CreateCommentInput } from '../schema';
import { updateComment, moderateComment } from '../handlers/update_comment';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'user'
};

const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  slug: 'test-category',
  description: 'A category for testing'
};

const testNews: CreateNewsInput = {
  title: 'Test News',
  slug: 'test-news',
  content: 'This is test news content',
  category_id: 1, // Will be updated after category creation
  author_id: 1, // Will be updated after user creation
  status: 'published'
};

const testComment: CreateCommentInput = {
  content: 'This is a test comment',
  news_id: 1, // Will be updated after news creation
  user_id: 1 // Will be updated after user creation
};

describe('updateComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let categoryId: number;
  let newsId: number;
  let commentId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: 'hashed_password',
        full_name: testUser.full_name,
        role: testUser.role
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    const newsResult = await db.insert(newsTable)
      .values({
        title: testNews.title,
        slug: testNews.slug,
        content: testNews.content,
        category_id: categoryId,
        author_id: userId,
        status: testNews.status,
        views_count: 0
      })
      .returning()
      .execute();
    newsId = newsResult[0].id;

    const commentResult = await db.insert(commentsTable)
      .values({
        content: testComment.content,
        news_id: newsId,
        user_id: userId,
        status: 'pending'
      })
      .returning()
      .execute();
    commentId = commentResult[0].id;
  });

  it('should update comment content', async () => {
    const updateInput: UpdateCommentInput = {
      id: commentId,
      content: 'Updated comment content'
    };

    const result = await updateComment(updateInput);

    expect(result.id).toEqual(commentId);
    expect(result.content).toEqual('Updated comment content');
    expect(result.news_id).toEqual(newsId);
    expect(result.user_id).toEqual(userId);
    expect(result.status).toEqual('pending'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update comment status', async () => {
    const updateInput: UpdateCommentInput = {
      id: commentId,
      status: 'approved'
    };

    const result = await updateComment(updateInput);

    expect(result.id).toEqual(commentId);
    expect(result.content).toEqual(testComment.content); // Should remain unchanged
    expect(result.status).toEqual('approved');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both content and status', async () => {
    const updateInput: UpdateCommentInput = {
      id: commentId,
      content: 'New content',
      status: 'approved'
    };

    const result = await updateComment(updateInput);

    expect(result.id).toEqual(commentId);
    expect(result.content).toEqual('New content');
    expect(result.status).toEqual('approved');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const updateInput: UpdateCommentInput = {
      id: commentId,
      content: 'Database test content',
      status: 'approved'
    };

    await updateComment(updateInput);

    // Verify changes in database
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].content).toEqual('Database test content');
    expect(comments[0].status).toEqual('approved');
    expect(comments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent comment', async () => {
    const updateInput: UpdateCommentInput = {
      id: 99999,
      content: 'This should fail'
    };

    await expect(updateComment(updateInput)).rejects.toThrow(/comment with id 99999 not found/i);
  });
});

describe('moderateComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let categoryId: number;
  let newsId: number;
  let commentId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        username: testUser.username,
        email: testUser.email,
        password_hash: 'hashed_password',
        full_name: testUser.full_name,
        role: testUser.role
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    const newsResult = await db.insert(newsTable)
      .values({
        title: testNews.title,
        slug: testNews.slug,
        content: testNews.content,
        category_id: categoryId,
        author_id: userId,
        status: testNews.status,
        views_count: 0
      })
      .returning()
      .execute();
    newsId = newsResult[0].id;

    const commentResult = await db.insert(commentsTable)
      .values({
        content: testComment.content,
        news_id: newsId,
        user_id: userId,
        status: 'pending'
      })
      .returning()
      .execute();
    commentId = commentResult[0].id;
  });

  it('should approve comment', async () => {
    const result = await moderateComment(commentId, 'approved');

    expect(result.id).toEqual(commentId);
    expect(result.content).toEqual(testComment.content);
    expect(result.status).toEqual('approved');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should reject comment', async () => {
    const result = await moderateComment(commentId, 'rejected');

    expect(result.id).toEqual(commentId);
    expect(result.content).toEqual(testComment.content);
    expect(result.status).toEqual('rejected');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save moderation changes to database', async () => {
    await moderateComment(commentId, 'approved');

    // Verify changes in database
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId))
      .execute();

    expect(comments).toHaveLength(1);
    expect(comments[0].status).toEqual('approved');
    expect(comments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent comment', async () => {
    await expect(moderateComment(99999, 'approved')).rejects.toThrow(/comment with id 99999 not found/i);
  });

  it('should update from approved to rejected', async () => {
    // First approve the comment
    await moderateComment(commentId, 'approved');
    
    // Then reject it
    const result = await moderateComment(commentId, 'rejected');

    expect(result.status).toEqual('rejected');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});