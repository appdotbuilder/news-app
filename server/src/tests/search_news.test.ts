import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, newsTable } from '../db/schema';
import { type SearchNewsInput } from '../schema';
import { searchNews } from '../handlers/search_news';

// Test data setup
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      username: 'testauthor',
      email: 'author@test.com',
      password_hash: 'hashedpassword',
      full_name: 'Test Author',
      role: 'user'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestCategory = async () => {
  const result = await db.insert(categoriesTable)
    .values({
      name: 'Tech News',
      slug: 'tech-news',
      description: 'Technology related news'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestNews = async (authorId: number, categoryId: number, overrides: Partial<any> = {}) => {
  // Generate unique slug if not provided in overrides
  const baseSlug = overrides['slug'] || 'test-article';
  const uniqueSlug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const result = await db.insert(newsTable)
    .values({
      title: 'Test Article',
      slug: overrides['slug'] || uniqueSlug,
      content: 'This is test content about technology',
      excerpt: 'Test excerpt',
      category_id: categoryId,
      author_id: authorId,
      status: 'published',
      published_at: new Date(),
      ...overrides
    })
    .returning()
    .execute();
  return result[0];
};

describe('searchNews', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should search news by title', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    
    // Create test news articles
    await createTestNews(user.id, category.id, {
      title: 'JavaScript Tutorial',
      slug: 'javascript-tutorial',
      content: 'Learn JavaScript basics'
    });
    
    await createTestNews(user.id, category.id, {
      title: 'Python Guide',
      slug: 'python-guide',
      content: 'Python programming guide'
    });

    const input: SearchNewsInput = {
      query: 'JavaScript',
      limit: 20,
      offset: 0
    };

    const results = await searchNews(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('JavaScript Tutorial');
    expect(results[0].status).toEqual('published');
    expect(results[0].category_id).toEqual(category.id);
    expect(results[0].author_id).toEqual(user.id);
  });

  it('should search news by content', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    
    await createTestNews(user.id, category.id, {
      title: 'Programming Tutorial',
      slug: 'programming-tutorial',
      content: 'This article covers React development in detail'
    });
    
    await createTestNews(user.id, category.id, {
      title: 'Web Development',
      slug: 'web-development',
      content: 'Angular framework tutorial'
    });

    const input: SearchNewsInput = {
      query: 'React',
      limit: 20,
      offset: 0
    };

    const results = await searchNews(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Programming Tutorial');
    expect(results[0].content).toContain('React');
  });

  it('should filter by category', async () => {
    const user = await createTestUser();
    const techCategory = await createTestCategory();
    
    // Create second category
    const sportsCategory = await db.insert(categoriesTable)
      .values({
        name: 'Sports',
        slug: 'sports',
        description: 'Sports news'
      })
      .returning()
      .execute();

    // Create news in different categories
    await createTestNews(user.id, techCategory.id, {
      title: 'JavaScript News',
      slug: 'javascript-news',
      content: 'JavaScript update'
    });
    
    await createTestNews(user.id, sportsCategory[0].id, {
      title: 'Football News',
      slug: 'football-news',
      content: 'Football match results'
    });

    const input: SearchNewsInput = {
      query: 'News',
      category_id: techCategory.id,
      limit: 20,
      offset: 0
    };

    const results = await searchNews(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('JavaScript News');
    expect(results[0].category_id).toEqual(techCategory.id);
  });

  it('should only return published news', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    
    // Create published article
    await createTestNews(user.id, category.id, {
      title: 'Published Article',
      slug: 'published-article',
      content: 'This is published content',
      status: 'published'
    });
    
    // Create draft article
    await createTestNews(user.id, category.id, {
      title: 'Draft Article',
      slug: 'draft-article',
      content: 'This is draft content',
      status: 'draft',
      published_at: null
    });
    
    // Create archived article
    await createTestNews(user.id, category.id, {
      title: 'Archived Article',
      slug: 'archived-article',
      content: 'This is archived content',
      status: 'archived'
    });

    const input: SearchNewsInput = {
      query: 'Article',
      limit: 20,
      offset: 0
    };

    const results = await searchNews(input);

    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('Published Article');
    expect(results[0].status).toEqual('published');
  });

  it('should support pagination', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    
    // Create multiple articles with different publish dates
    const baseDate = new Date('2024-01-01');
    
    for (let i = 0; i < 5; i++) {
      const publishDate = new Date(baseDate);
      publishDate.setDate(baseDate.getDate() + i);
      
      await createTestNews(user.id, category.id, {
        title: `Test Article ${i + 1}`,
        slug: `test-article-${i + 1}`,
        content: 'Test content for pagination',
        published_at: publishDate
      });
    }

    // Test first page
    const firstPage: SearchNewsInput = {
      query: 'Test',
      limit: 2,
      offset: 0
    };

    const firstResults = await searchNews(firstPage);
    expect(firstResults).toHaveLength(2);

    // Test second page
    const secondPage: SearchNewsInput = {
      query: 'Test',
      limit: 2,
      offset: 2
    };

    const secondResults = await searchNews(secondPage);
    expect(secondResults).toHaveLength(2);

    // Results should be different
    expect(firstResults[0].id).not.toEqual(secondResults[0].id);
  });

  it('should order results by published date descending', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    
    // Create articles with specific dates
    const olderDate = new Date('2024-01-01');
    const newerDate = new Date('2024-01-02');
    
    await createTestNews(user.id, category.id, {
      title: 'Older Article',
      slug: 'older-article',
      content: 'Search term content',
      published_at: olderDate
    });
    
    await createTestNews(user.id, category.id, {
      title: 'Newer Article',
      slug: 'newer-article',
      content: 'Search term content',
      published_at: newerDate
    });

    const input: SearchNewsInput = {
      query: 'Search term',
      limit: 20,
      offset: 0
    };

    const results = await searchNews(input);

    expect(results).toHaveLength(2);
    expect(results[0].title).toEqual('Newer Article');
    expect(results[1].title).toEqual('Older Article');
    expect(results[0].published_at!.getTime()).toBeGreaterThan(results[1].published_at!.getTime());
  });

  it('should perform case-insensitive search', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    
    await createTestNews(user.id, category.id, {
      title: 'JavaScript Tutorial',
      slug: 'javascript-tutorial-case',
      content: 'Learn JAVASCRIPT basics'
    });

    // Test with lowercase query
    const lowercaseInput: SearchNewsInput = {
      query: 'javascript',
      limit: 20,
      offset: 0
    };

    const lowercaseResults = await searchNews(lowercaseInput);
    expect(lowercaseResults).toHaveLength(1);

    // Test with uppercase query
    const uppercaseInput: SearchNewsInput = {
      query: 'JAVASCRIPT',
      limit: 20,
      offset: 0
    };

    const uppercaseResults = await searchNews(uppercaseInput);
    expect(uppercaseResults).toHaveLength(1);
  });

  it('should return empty array when no results found', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    
    await createTestNews(user.id, category.id, {
      title: 'JavaScript Tutorial',
      slug: 'javascript-tutorial-empty',
      content: 'JavaScript content'
    });

    const input: SearchNewsInput = {
      query: 'NonexistentTerm',
      limit: 20,
      offset: 0
    };

    const results = await searchNews(input);
    expect(results).toHaveLength(0);
  });

  it('should handle special characters in search query', async () => {
    const user = await createTestUser();
    const category = await createTestCategory();
    
    await createTestNews(user.id, category.id, {
      title: 'C++ Programming',
      slug: 'cpp-programming',
      content: 'Learn C++ basics'
    });

    const input: SearchNewsInput = {
      query: 'C++',
      limit: 20,
      offset: 0
    };

    const results = await searchNews(input);
    expect(results).toHaveLength(1);
    expect(results[0].title).toEqual('C++ Programming');
  });
});