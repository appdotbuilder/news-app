import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { getCategories, getCategoryById, getCategoryBySlug } from '../handlers/get_categories';

// Test category data
const testCategory1: CreateCategoryInput = {
  name: 'Technology',
  slug: 'technology',
  description: 'All about technology news'
};

const testCategory2: CreateCategoryInput = {
  name: 'Business',
  slug: 'business',
  description: 'Business and finance news'
};

const testCategory3: CreateCategoryInput = {
  name: 'Sports',
  slug: 'sports',
  description: null
};

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it('should return all categories ordered by name', async () => {
    // Insert categories in different order to test ordering
    await db.insert(categoriesTable).values([
      { name: testCategory3.name, slug: testCategory3.slug, description: testCategory3.description },
      { name: testCategory1.name, slug: testCategory1.slug, description: testCategory1.description },
      { name: testCategory2.name, slug: testCategory2.slug, description: testCategory2.description }
    ]).execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Verify ordering by name (Business, Sports, Technology)
    expect(result[0].name).toEqual('Business');
    expect(result[1].name).toEqual('Sports');
    expect(result[2].name).toEqual('Technology');
    
    // Verify all fields are present
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.slug).toBeDefined();
      expect(category.created_at).toBeInstanceOf(Date);
      expect(category.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should handle categories with null descriptions', async () => {
    await db.insert(categoriesTable).values({
      name: testCategory3.name,
      slug: testCategory3.slug,
      description: testCategory3.description
    }).execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Sports');
    expect(result[0].description).toBeNull();
  });
});

describe('getCategoryById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when category does not exist', async () => {
    const result = await getCategoryById(999);
    expect(result).toBeNull();
  });

  it('should return category when it exists', async () => {
    const insertResult = await db.insert(categoriesTable).values({
      name: testCategory1.name,
      slug: testCategory1.slug,
      description: testCategory1.description
    }).returning().execute();

    const categoryId = insertResult[0].id;
    const result = await getCategoryById(categoryId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(categoryId);
    expect(result!.name).toEqual('Technology');
    expect(result!.slug).toEqual('technology');
    expect(result!.description).toEqual('All about technology news');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return category with null description', async () => {
    const insertResult = await db.insert(categoriesTable).values({
      name: testCategory3.name,
      slug: testCategory3.slug,
      description: testCategory3.description
    }).returning().execute();

    const categoryId = insertResult[0].id;
    const result = await getCategoryById(categoryId);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Sports');
    expect(result!.description).toBeNull();
  });
});

describe('getCategoryBySlug', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when category with slug does not exist', async () => {
    const result = await getCategoryBySlug('non-existent');
    expect(result).toBeNull();
  });

  it('should return category when slug exists', async () => {
    await db.insert(categoriesTable).values({
      name: testCategory1.name,
      slug: testCategory1.slug,
      description: testCategory1.description
    }).execute();

    const result = await getCategoryBySlug('technology');

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Technology');
    expect(result!.slug).toEqual('technology');
    expect(result!.description).toEqual('All about technology news');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should be case sensitive for slug matching', async () => {
    await db.insert(categoriesTable).values({
      name: testCategory1.name,
      slug: testCategory1.slug,
      description: testCategory1.description
    }).execute();

    const result = await getCategoryBySlug('TECHNOLOGY');
    expect(result).toBeNull();
  });

  it('should return correct category when multiple categories exist', async () => {
    await db.insert(categoriesTable).values([
      { name: testCategory1.name, slug: testCategory1.slug, description: testCategory1.description },
      { name: testCategory2.name, slug: testCategory2.slug, description: testCategory2.description }
    ]).execute();

    const result = await getCategoryBySlug('business');

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Business');
    expect(result!.slug).toEqual('business');
    expect(result!.description).toEqual('Business and finance news');
  });

  it('should handle special characters in slugs', async () => {
    const specialSlugCategory = {
      name: 'Tech & Innovation',
      slug: 'tech-innovation',
      description: 'Technology and innovation news'
    };

    await db.insert(categoriesTable).values(specialSlugCategory).execute();

    const result = await getCategoryBySlug('tech-innovation');

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Tech & Innovation');
    expect(result!.slug).toEqual('tech-innovation');
  });
});