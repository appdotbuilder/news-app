import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, newsTable } from '../db/schema';
import { type PaginationInput, type GetNewsByCategoryInput, type GetNewsBySlugInput } from '../schema';
import { 
  getNews, 
  getAllNews, 
  getNewsById, 
  getNewsBySlug, 
  getNewsByCategory, 
  getFeaturedNews 
} from '../handlers/get_news';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testauthor',
  email: 'author@test.com',
  password_hash: 'hashedpassword123',
  full_name: 'Test Author',
  role: 'user' as const,
  is_active: true
};

const testCategory = {
  name: 'Technology',
  slug: 'technology',
  description: 'Tech news and updates'
};

const testNews = [
  {
    title: 'Published News 1',
    slug: 'published-news-1',
    content: 'Content for published news 1',
    excerpt: 'Excerpt 1',
    category_id: 1,
    author_id: 1,
    status: 'published' as const,
    views_count: 100,
    published_at: new Date('2024-01-01')
  },
  {
    title: 'Published News 2',
    slug: 'published-news-2',
    content: 'Content for published news 2',
    excerpt: 'Excerpt 2',
    category_id: 1,
    author_id: 1,
    status: 'published' as const,
    views_count: 50,
    published_at: new Date('2024-01-02')
  },
  {
    title: 'Draft News',
    slug: 'draft-news',
    content: 'Content for draft news',
    category_id: 1,
    author_id: 1,
    status: 'draft' as const,
    views_count: 0,
    published_at: null
  }
];

describe('get news handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Setup test data before each test
  const setupTestData = async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test category
    const categoryResults = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create test news articles
    const newsResults = await db.insert(newsTable)
      .values(testNews)
      .returning()
      .execute();

    return {
      user: userResults[0],
      category: categoryResults[0],
      news: newsResults
    };
  };

  describe('getNews', () => {
    it('should fetch published news with default pagination', async () => {
      await setupTestData();

      const result = await getNews();

      expect(result).toHaveLength(2); // Only published news
      expect(result[0].status).toEqual('published');
      expect(result[1].status).toEqual('published');
      // Should be ordered by published_at desc (newest first)
      expect(new Date(result[0].published_at!).getTime()).toBeGreaterThan(
        new Date(result[1].published_at!).getTime()
      );
    });

    it('should respect pagination parameters', async () => {
      await setupTestData();

      const input: PaginationInput = {
        limit: 1,
        offset: 0
      };

      const result = await getNews(input);

      expect(result).toHaveLength(1);
      expect(result[0].title).toEqual('Published News 2'); // Newest first
    });

    it('should handle offset pagination', async () => {
      await setupTestData();

      const input: PaginationInput = {
        limit: 1,
        offset: 1
      };

      const result = await getNews(input);

      expect(result).toHaveLength(1);
      expect(result[0].title).toEqual('Published News 1'); // Second newest
    });
  });

  describe('getAllNews', () => {
    it('should fetch all news including drafts', async () => {
      await setupTestData();

      const result = await getAllNews();

      expect(result).toHaveLength(3); // All news including draft
      expect(result.some(news => news.status === 'draft')).toBe(true);
      expect(result.some(news => news.status === 'published')).toBe(true);
    });

    it('should order by created_at desc', async () => {
      await setupTestData();

      const result = await getAllNews();

      // Should be ordered by creation time (newest first)
      for (let i = 0; i < result.length - 1; i++) {
        expect(new Date(result[i].created_at).getTime()).toBeGreaterThanOrEqual(
          new Date(result[i + 1].created_at).getTime()
        );
      }
    });

    it('should respect pagination for all news', async () => {
      await setupTestData();

      const input: PaginationInput = {
        limit: 2,
        offset: 1
      };

      const result = await getAllNews(input);

      expect(result).toHaveLength(2);
    });
  });

  describe('getNewsById', () => {
    it('should fetch news by ID and increment views', async () => {
      const { news } = await setupTestData();
      const initialViews = news[0].views_count;

      const result = await getNewsById(news[0].id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(news[0].id);
      expect(result!.title).toEqual(news[0].title);
      
      // Check that views were incremented
      expect(result!.views_count).toEqual(initialViews + 1);
    });

    it('should return null for non-existent ID', async () => {
      await setupTestData();

      const result = await getNewsById(999);

      expect(result).toBeNull();
    });

    it('should increment views even for draft articles', async () => {
      const { news } = await setupTestData();
      const draftNews = news.find(n => n.status === 'draft')!;
      const initialViews = draftNews.views_count;

      const result = await getNewsById(draftNews.id);

      expect(result).not.toBeNull();
      expect(result!.views_count).toEqual(initialViews + 1);
    });
  });

  describe('getNewsBySlug', () => {
    it('should fetch news by slug and increment views', async () => {
      const { news } = await setupTestData();
      const targetNews = news[0];
      const initialViews = targetNews.views_count;

      const input: GetNewsBySlugInput = {
        slug: targetNews.slug
      };

      const result = await getNewsBySlug(input);

      expect(result).not.toBeNull();
      expect(result!.slug).toEqual(targetNews.slug);
      expect(result!.title).toEqual(targetNews.title);
      
      // Check that views were incremented
      expect(result!.views_count).toEqual(initialViews + 1);
    });

    it('should return null for non-existent slug', async () => {
      await setupTestData();

      const input: GetNewsBySlugInput = {
        slug: 'non-existent-slug'
      };

      const result = await getNewsBySlug(input);

      expect(result).toBeNull();
    });
  });

  describe('getNewsByCategory', () => {
    it('should fetch news by category ID', async () => {
      const { category } = await setupTestData();

      const input: GetNewsByCategoryInput = {
        category_id: category.id,
        limit: 20,
        offset: 0
      };

      const result = await getNewsByCategory(input);

      expect(result).toHaveLength(2); // Only published news
      expect(result.every(news => news.category_id === category.id)).toBe(true);
      expect(result.every(news => news.status === 'published')).toBe(true);
    });

    it('should fetch news by category slug', async () => {
      const { category } = await setupTestData();

      const input: GetNewsByCategoryInput = {
        category_slug: category.slug,
        limit: 20,
        offset: 0
      };

      const result = await getNewsByCategory(input);

      expect(result).toHaveLength(2); // Only published news
      expect(result.every(news => news.category_id === category.id)).toBe(true);
      expect(result.every(news => news.status === 'published')).toBe(true);
    });

    it('should respect pagination in category filtering', async () => {
      await setupTestData();

      const input: GetNewsByCategoryInput = {
        category_id: 1,
        limit: 1,
        offset: 0
      };

      const result = await getNewsByCategory(input);

      expect(result).toHaveLength(1);
      expect(result[0].status).toEqual('published');
    });

    it('should return empty array for non-existent category', async () => {
      await setupTestData();

      const input: GetNewsByCategoryInput = {
        category_id: 999,
        limit: 20,
        offset: 0
      };

      const result = await getNewsByCategory(input);

      expect(result).toHaveLength(0);
    });
  });

  describe('getFeaturedNews', () => {
    it('should fetch news ordered by views count desc', async () => {
      await setupTestData();

      const result = await getFeaturedNews();

      expect(result).toHaveLength(2); // Only published news
      expect(result.every(news => news.status === 'published')).toBe(true);
      
      // Should be ordered by views_count desc (most viewed first)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].views_count).toBeGreaterThanOrEqual(result[i + 1].views_count);
      }
      
      expect(result[0].views_count).toEqual(100); // Highest views first
      expect(result[1].views_count).toEqual(50);
    });

    it('should respect custom limit', async () => {
      await setupTestData();

      const result = await getFeaturedNews(1);

      expect(result).toHaveLength(1);
      expect(result[0].views_count).toEqual(100); // Most viewed article
    });

    it('should return empty array when no published news exists', async () => {
      // Setup only draft news
      await db.insert(usersTable).values(testUser).execute();
      await db.insert(categoriesTable).values(testCategory).execute();
      await db.insert(newsTable).values({
        title: 'Draft Only',
        slug: 'draft-only',
        content: 'Draft content',
        category_id: 1,
        author_id: 1,
        status: 'draft' as const,
        views_count: 0,
        published_at: null
      }).execute();

      const result = await getFeaturedNews();

      expect(result).toHaveLength(0);
    });
  });

  describe('views count increment behavior', () => {
    it('should increment views multiple times for same article', async () => {
      const { news } = await setupTestData();
      const targetId = news[0].id;
      const initialViews = news[0].views_count;

      await getNewsById(targetId);
      await getNewsById(targetId);
      const result = await getNewsById(targetId);

      expect(result!.views_count).toEqual(initialViews + 3);
    });

    it('should handle concurrent view increments', async () => {
      const { news } = await setupTestData();
      const targetId = news[0].id;
      const initialViews = news[0].views_count;

      // Simulate concurrent requests
      await Promise.all([
        getNewsById(targetId),
        getNewsById(targetId),
        getNewsById(targetId)
      ]);

      // Get final state
      const finalResult = await db.select()
        .from(newsTable)
        .where(eq(newsTable.id, targetId))
        .execute();

      expect(finalResult[0].views_count).toEqual(initialViews + 3);
    });
  });
});