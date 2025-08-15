import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, newsTable, commentsTable } from '../db/schema';
import { deleteComment } from '../handlers/delete_comment';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  role: 'user' as const
};

const testCategory = {
  name: 'Test Category',
  slug: 'test-category',
  description: 'A test category'
};

const testNews = {
  title: 'Test News',
  slug: 'test-news',
  content: 'Test news content',
  excerpt: 'Test excerpt',
  category_id: 1, // Will be updated after category creation
  author_id: 1,   // Will be updated after user creation
  status: 'published' as const
};

const testComment = {
  content: 'This is a test comment',
  news_id: 1,  // Will be updated after news creation
  user_id: 1,  // Will be updated after user creation
  status: 'approved' as const
};

describe('deleteComment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing comment', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const [news] = await db.insert(newsTable).values({
      ...testNews,
      category_id: category.id,
      author_id: user.id
    }).returning().execute();
    const [comment] = await db.insert(commentsTable).values({
      ...testComment,
      news_id: news.id,
      user_id: user.id
    }).returning().execute();

    // Delete the comment
    const result = await deleteComment(comment.id);

    // Should return true indicating successful deletion
    expect(result).toBe(true);

    // Verify comment is deleted from database
    const comments = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, comment.id))
      .execute();

    expect(comments).toHaveLength(0);
  });

  it('should return false when comment does not exist', async () => {
    // Try to delete a non-existent comment
    const result = await deleteComment(999);

    // Should return false indicating comment not found
    expect(result).toBe(false);
  });

  it('should not affect other comments when deleting one', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const [news] = await db.insert(newsTable).values({
      ...testNews,
      category_id: category.id,
      author_id: user.id
    }).returning().execute();

    // Create multiple comments
    const [comment1] = await db.insert(commentsTable).values({
      ...testComment,
      content: 'First comment',
      news_id: news.id,
      user_id: user.id
    }).returning().execute();

    const [comment2] = await db.insert(commentsTable).values({
      ...testComment,
      content: 'Second comment',
      news_id: news.id,
      user_id: user.id
    }).returning().execute();

    // Delete only the first comment
    const result = await deleteComment(comment1.id);

    expect(result).toBe(true);

    // Verify first comment is deleted
    const deletedComment = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, comment1.id))
      .execute();

    expect(deletedComment).toHaveLength(0);

    // Verify second comment still exists
    const remainingComment = await db.select()
      .from(commentsTable)
      .where(eq(commentsTable.id, comment2.id))
      .execute();

    expect(remainingComment).toHaveLength(1);
    expect(remainingComment[0].content).toEqual('Second comment');
  });

  it('should handle deletion with different comment statuses', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [category] = await db.insert(categoriesTable).values(testCategory).returning().execute();
    const [news] = await db.insert(newsTable).values({
      ...testNews,
      category_id: category.id,
      author_id: user.id
    }).returning().execute();

    // Create comments with different statuses
    const [pendingComment] = await db.insert(commentsTable).values({
      ...testComment,
      content: 'Pending comment',
      news_id: news.id,
      user_id: user.id,
      status: 'pending'
    }).returning().execute();

    const [rejectedComment] = await db.insert(commentsTable).values({
      ...testComment,
      content: 'Rejected comment',
      news_id: news.id,
      user_id: user.id,
      status: 'rejected'
    }).returning().execute();

    // Delete pending comment
    const result1 = await deleteComment(pendingComment.id);
    expect(result1).toBe(true);

    // Delete rejected comment
    const result2 = await deleteComment(rejectedComment.id);
    expect(result2).toBe(true);

    // Verify both comments are deleted
    const remainingComments = await db.select()
      .from(commentsTable)
      .execute();

    expect(remainingComments).toHaveLength(0);
  });
});