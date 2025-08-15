import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCategory = async (input: UpdateCategoryInput): Promise<Category> => {
  try {
    // First, check if category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.id))
      .execute();

    if (existingCategory.length === 0) {
      throw new Error(`Category with id ${input.id} not found`);
    }

    // Check if slug is unique (if being updated)
    if (input.slug) {
      const duplicateSlugCategory = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.slug, input.slug))
        .execute();

      // Check if another category has this slug
      if (duplicateSlugCategory.length > 0 && duplicateSlugCategory[0].id !== input.id) {
        throw new Error(`Category with slug '${input.slug}' already exists`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.slug !== undefined) {
      updateData.slug = input.slug;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Update category record
    const result = await db.update(categoriesTable)
      .set(updateData)
      .where(eq(categoriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
};