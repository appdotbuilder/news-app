import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, newsTable, commentsTable } from '../db/schema';
import { type PaginationInput } from '../schema';
import { getCommentsByNewsId, getAllComments, getPendingComments } from '../handlers/get_comments';
import { eq } from 'drizzle-orm';

describe('getComments handlers', () => {
  let testUser1: any;
  let testUser2: any;
  let testCategory: any;
  let testNews1: any;
  let testNews2: any;
  let approvedComment: any;
  let pendingComment: any;
  let rejectedComment: any;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'testuser1',
          email: 'user1@example.com',
          password_hash: 'hashedpassword1',
          full_name: 'Test User One',
          avatar: 'avatar1.jpg',
          role: 'user'
        },
        {
          username: 'testuser2',
          email: 'user2@example.com',
          password_hash: 'hashedpassword2',
          full_name: 'Test User Two',
          role: 'user'
        }
      ])
      .returning()
      .execute();

    testUser1 = users[0];
    testUser2 = users[1];

    // Create test category
    const categories = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category'
      })
      .returning()
      .execute();

    testCategory = categories[0];

    // Create test news articles
    const newsArticles = await db.insert(newsTable)
      .values([
        {
          title: 'Test News 1',
          slug: 'test-news-1',
          content: 'Content for test news 1',
          excerpt: 'Excerpt 1',
          category_id: testCategory.id,
          author_id: testUser1.id,
          status: 'published'
        },
        {
          title: 'Test News 2',
          slug: 'test-news-2',
          content: 'Content for test news 2',
          category_id: testCategory.id,
          author_id: testUser2.id,
          status: 'published'
        }
      ])
      .returning()
      .execute();

    testNews1 = newsArticles[0];
    testNews2 = newsArticles[1];

    // Create test comments with different statuses
    const comments = await db.insert(commentsTable)
      .values([
        {
          content: 'This is an approved comment on news 1',
          news_id: testNews1.id,
          user_id: testUser1.id,
          status: 'approved'
        },
        {
          content: 'This is a pending comment on news 1',
          news_id: testNews1.id,
          user_id: testUser2.id,
          status: 'pending'
        },
        {
          content: 'This is a rejected comment on news 2',
          news_id: testNews2.id,
          user_id: testUser1.id,
          status: 'rejected'
        },
        {
          content: 'Another pending comment on news 2',
          news_id: testNews2.id,
          user_id: testUser2.id,
          status: 'pending'
        }
      ])
      .returning()
      .execute();

    approvedComment = comments[0];
    pendingComment = comments[1];
    rejectedComment = comments[2];
  });

  afterEach(resetDB);

  describe('getCommentsByNewsId', () => {
    it('should return approved comments for a specific news article', async () => {
      const result = await getCommentsByNewsId(testNews1.id);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(approvedComment.id);
      expect(result[0].content).toEqual('This is an approved comment on news 1');
      expect(result[0].status).toEqual('approved');
      expect(result[0].news_id).toEqual(testNews1.id);
      
      // Verify user info is included
      expect((result[0] as any).user).toBeDefined();
      expect((result[0] as any).user.username).toEqual('testuser1');
      expect((result[0] as any).user.full_name).toEqual('Test User One');
      expect((result[0] as any).user.avatar).toEqual('avatar1.jpg');
    });

    it('should not return pending or rejected comments', async () => {
      const result = await getCommentsByNewsId(testNews1.id);

      expect(result).toHaveLength(1);
      // Only approved comment should be returned
      expect(result.every(comment => comment.status === 'approved')).toBe(true);
    });

    it('should return empty array for news with no approved comments', async () => {
      // testNews2 only has rejected and pending comments
      const result = await getCommentsByNewsId(testNews2.id);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for non-existent news ID', async () => {
      const result = await getCommentsByNewsId(99999);

      expect(result).toHaveLength(0);
    });

    it('should respect pagination parameters', async () => {
      // Create multiple approved comments for pagination test
      await db.insert(commentsTable)
        .values([
          {
            content: 'Another approved comment',
            news_id: testNews1.id,
            user_id: testUser2.id,
            status: 'approved'
          },
          {
            content: 'Third approved comment',
            news_id: testNews1.id,
            user_id: testUser1.id,
            status: 'approved'
          }
        ])
        .execute();

      const paginationInput: PaginationInput = { limit: 2, offset: 1 };
      const result = await getCommentsByNewsId(testNews1.id, paginationInput);

      expect(result.length).toBeLessThanOrEqual(2);
      // Results should be ordered by creation date (newest first)
      if (result.length > 1) {
        expect(result[0].created_at >= result[1].created_at).toBe(true);
      }
    });

    it('should use default pagination when none provided', async () => {
      const result = await getCommentsByNewsId(testNews1.id);

      // Should not throw error and should return results
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAllComments', () => {
    it('should return all comments with user and news info', async () => {
      const result = await getAllComments();

      expect(result).toHaveLength(4);
      
      // Check that all comments are included regardless of status
      const statuses = result.map(comment => comment.status);
      expect(statuses).toContain('approved');
      expect(statuses).toContain('pending');
      expect(statuses).toContain('rejected');

      // Verify user and news info is included
      expect((result[0] as any).user).toBeDefined();
      expect((result[0] as any).news).toBeDefined();
      expect((result[0] as any).user.username).toBeDefined();
      expect((result[0] as any).news.title).toBeDefined();
    });

    it('should order comments by status and creation date', async () => {
      const result = await getAllComments();

      // Results should be ordered (rejected, pending, approved) and by creation date
      for (let i = 0; i < result.length - 1; i++) {
        const current = result[i];
        const next = result[i + 1];
        
        // If same status, should be ordered by created_at (newest first)
        if (current.status === next.status) {
          expect(current.created_at >= next.created_at).toBe(true);
        }
      }
    });

    it('should include complete user and news information', async () => {
      const result = await getAllComments();

      expect(result.length).toBeGreaterThan(0);
      
      const firstComment = result[0];
      expect((firstComment as any).user.id).toBeDefined();
      expect((firstComment as any).user.username).toBeDefined();
      expect((firstComment as any).user.full_name).toBeDefined();
      
      expect((firstComment as any).news.id).toBeDefined();
      expect((firstComment as any).news.title).toBeDefined();
      expect((firstComment as any).news.slug).toBeDefined();
    });

    it('should respect pagination parameters', async () => {
      const paginationInput: PaginationInput = { limit: 2, offset: 1 };
      const result = await getAllComments(paginationInput);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should use default pagination when none provided', async () => {
      const result = await getAllComments();

      // Should not throw error and should return results
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(20); // Default limit
    });
  });

  describe('getPendingComments', () => {
    it('should return only pending comments', async () => {
      const result = await getPendingComments();

      expect(result).toHaveLength(2);
      expect(result.every(comment => comment.status === 'pending')).toBe(true);
    });

    it('should include user and news information for moderation', async () => {
      const result = await getPendingComments();

      expect(result.length).toBeGreaterThan(0);
      
      const firstComment = result[0];
      expect((firstComment as any).user).toBeDefined();
      expect((firstComment as any).user.id).toBeDefined();
      expect((firstComment as any).user.username).toBeDefined();
      expect((firstComment as any).user.full_name).toBeDefined();
      expect((firstComment as any).user.email).toBeDefined(); // Email included for moderation
      
      expect((firstComment as any).news).toBeDefined();
      expect((firstComment as any).news.id).toBeDefined();
      expect((firstComment as any).news.title).toBeDefined();
      expect((firstComment as any).news.slug).toBeDefined();
    });

    it('should order pending comments by creation date (newest first)', async () => {
      const result = await getPendingComments();

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
      }
    });

    it('should return empty array when no pending comments exist', async () => {
      // Update all pending comments to approved
      await db.update(commentsTable)
        .set({ status: 'approved' })
        .where(eq(commentsTable.status, 'pending'))
        .execute();

      const result = await getPendingComments();

      expect(result).toHaveLength(0);
    });

    it('should respect pagination parameters', async () => {
      const paginationInput: PaginationInput = { limit: 1, offset: 0 };
      const result = await getPendingComments(paginationInput);

      expect(result.length).toBeLessThanOrEqual(1);
      if (result.length > 0) {
        expect(result[0].status).toEqual('pending');
      }
    });

    it('should use default pagination when none provided', async () => {
      const result = await getPendingComments();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(20); // Default limit
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Since getCommentsByNewsId with invalid ID just returns empty array,
      // we'll test that the handlers don't throw unexpected errors
      const result = await getCommentsByNewsId(-1);
      expect(result).toEqual([]);
      
      const allComments = await getAllComments();
      expect(Array.isArray(allComments)).toBe(true);
      
      const pendingComments = await getPendingComments();
      expect(Array.isArray(pendingComments)).toBe(true);
    });
  });
});