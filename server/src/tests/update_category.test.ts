import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type CreateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

// Test category data
const testCategory: CreateCategoryInput = {
  name: 'Technology',
  slug: 'technology',
  description: 'Tech news and updates'
};

const anotherCategory: CreateCategoryInput = {
  name: 'Sports',
  slug: 'sports',
  description: 'Sports news and events'
};

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    // Create test category
    const createResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createResult[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Updated Technology'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Updated Technology');
    expect(result.slug).toEqual('technology'); // Should remain unchanged
    expect(result.description).toEqual('Tech news and updates'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update category slug', async () => {
    // Create test category
    const createResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createResult[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      slug: 'tech-news'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Technology'); // Should remain unchanged
    expect(result.slug).toEqual('tech-news');
    expect(result.description).toEqual('Tech news and updates'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update category description', async () => {
    // Create test category
    const createResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createResult[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      description: 'Updated description for technology news'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Technology'); // Should remain unchanged
    expect(result.slug).toEqual('technology'); // Should remain unchanged
    expect(result.description).toEqual('Updated description for technology news');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null', async () => {
    // Create test category
    const createResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createResult[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      description: null
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Technology'); // Should remain unchanged
    expect(result.slug).toEqual('technology'); // Should remain unchanged
    expect(result.description).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields simultaneously', async () => {
    // Create test category
    const createResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createResult[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Advanced Technology',
      slug: 'advanced-tech',
      description: 'Advanced technology news and insights'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Advanced Technology');
    expect(result.slug).toEqual('advanced-tech');
    expect(result.description).toEqual('Advanced technology news and insights');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated category to database', async () => {
    // Create test category
    const createResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createResult[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Updated Technology',
      description: 'Updated tech description'
    };

    await updateCategory(updateInput);

    // Verify in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Updated Technology');
    expect(categories[0].description).toEqual('Updated tech description');
    expect(categories[0].slug).toEqual('technology'); // Should remain unchanged
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 999,
      name: 'Non-existent Category'
    };

    await expect(updateCategory(updateInput)).rejects.toThrow(/Category with id 999 not found/i);
  });

  it('should throw error when slug already exists on another category', async () => {
    // Create two test categories
    const firstResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const secondResult = await db.insert(categoriesTable)
      .values(anotherCategory)
      .returning()
      .execute();

    const updateInput: UpdateCategoryInput = {
      id: secondResult[0].id,
      slug: 'technology' // Trying to use slug from first category
    };

    await expect(updateCategory(updateInput)).rejects.toThrow(/Category with slug 'technology' already exists/i);
  });

  it('should allow updating category with its own slug', async () => {
    // Create test category
    const createResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createResult[0].id;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Updated Technology',
      slug: 'technology' // Same slug as current
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Updated Technology');
    expect(result.slug).toEqual('technology');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle partial updates correctly', async () => {
    // Create test category
    const createResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = createResult[0].id;
    const originalCreatedAt = createResult[0].created_at;

    const updateInput: UpdateCategoryInput = {
      id: categoryId,
      name: 'Just Name Update'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(categoryId);
    expect(result.name).toEqual('Just Name Update');
    expect(result.slug).toEqual('technology'); // Should remain unchanged
    expect(result.description).toEqual('Tech news and updates'); // Should remain unchanged
    expect(result.created_at).toEqual(originalCreatedAt); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalCreatedAt).toBe(true);
  });
});