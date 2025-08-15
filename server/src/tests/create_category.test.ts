import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateCategoryInput = {
  name: 'Technology',
  slug: 'technology',
  description: 'Latest technology news and updates'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Technology');
    expect(result.slug).toEqual('technology');
    expect(result.description).toEqual('Latest technology news and updates');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Technology');
    expect(categories[0].slug).toEqual('technology');
    expect(categories[0].description).toEqual('Latest technology news and updates');
    expect(categories[0].created_at).toBeInstanceOf(Date);
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create category with null description when not provided', async () => {
    const inputWithoutDescription: CreateCategoryInput = {
      name: 'Sports',
      slug: 'sports'
    };

    const result = await createCategory(inputWithoutDescription);

    expect(result.name).toEqual('Sports');
    expect(result.slug).toEqual('sports');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should create category with explicit null description', async () => {
    const inputWithNullDescription: CreateCategoryInput = {
      name: 'Entertainment',
      slug: 'entertainment',
      description: null
    };

    const result = await createCategory(inputWithNullDescription);

    expect(result.name).toEqual('Entertainment');
    expect(result.slug).toEqual('entertainment');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should fail when trying to create category with duplicate slug', async () => {
    // Create first category
    await createCategory(testInput);

    // Try to create another category with the same slug
    const duplicateInput: CreateCategoryInput = {
      name: 'Tech News',
      slug: 'technology', // Same slug as the first category
      description: 'Another tech category'
    };

    await expect(createCategory(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should create multiple categories with different slugs', async () => {
    const categories: CreateCategoryInput[] = [
      { name: 'Technology', slug: 'technology', description: 'Tech news' },
      { name: 'Sports', slug: 'sports', description: 'Sports news' },
      { name: 'Politics', slug: 'politics', description: 'Political news' }
    ];

    const results = await Promise.all(
      categories.map(category => createCategory(category))
    );

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.name).toEqual(categories[index].name);
      expect(result.slug).toEqual(categories[index].slug);
      expect(result.description).toEqual(categories[index].description || null);
      expect(result.id).toBeDefined();
    });

    // Verify all categories are in the database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(3);
  });

  it('should preserve exact input values', async () => {
    const specialInput: CreateCategoryInput = {
      name: 'Health & Wellness',
      slug: 'health-wellness',
      description: 'Articles about health, fitness, and general wellness topics'
    };

    const result = await createCategory(specialInput);

    expect(result.name).toEqual(specialInput.name);
    expect(result.slug).toEqual(specialInput.slug);
    expect(result.description).toEqual(specialInput.description || null);
  });
});