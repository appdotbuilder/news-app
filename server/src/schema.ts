import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

// News status enum
export const newsStatusSchema = z.enum(['draft', 'published', 'archived']);
export type NewsStatus = z.infer<typeof newsStatusSchema>;

// Comment status enum
export const commentStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type CommentStatus = z.infer<typeof commentStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string().nullable(),
  avatar: z.string().nullable(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// News schema
export const newsSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string().nullable(),
  featured_image: z.string().nullable(),
  category_id: z.number(),
  author_id: z.number(),
  status: newsStatusSchema,
  views_count: z.number().int(),
  published_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type News = z.infer<typeof newsSchema>;

// Comment schema
export const commentSchema = z.object({
  id: z.number(),
  content: z.string(),
  news_id: z.number(),
  user_id: z.number(),
  status: commentStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Comment = z.infer<typeof commentSchema>;

// Input schemas for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  role: userRoleSchema.default('user')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schemas for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  full_name: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Input schemas for creating categories
export const createCategoryInputSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Input schemas for updating categories
export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Input schemas for creating news
export const createNewsInputSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  content: z.string(),
  excerpt: z.string().nullable().optional(),
  featured_image: z.string().nullable().optional(),
  category_id: z.number(),
  author_id: z.number(),
  status: newsStatusSchema.default('draft'),
  published_at: z.coerce.date().nullable().optional()
});

export type CreateNewsInput = z.infer<typeof createNewsInputSchema>;

// Input schemas for updating news
export const updateNewsInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  excerpt: z.string().nullable().optional(),
  featured_image: z.string().nullable().optional(),
  category_id: z.number().optional(),
  status: newsStatusSchema.optional(),
  published_at: z.coerce.date().nullable().optional()
});

export type UpdateNewsInput = z.infer<typeof updateNewsInputSchema>;

// Input schemas for creating comments
export const createCommentInputSchema = z.object({
  content: z.string().min(1).max(1000),
  news_id: z.number(),
  user_id: z.number()
});

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

// Input schemas for updating comments
export const updateCommentInputSchema = z.object({
  id: z.number(),
  content: z.string().min(1).max(1000).optional(),
  status: commentStatusSchema.optional()
});

export type UpdateCommentInput = z.infer<typeof updateCommentInputSchema>;

// Search input schema
export const searchNewsInputSchema = z.object({
  query: z.string().min(1).max(255),
  category_id: z.number().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

export type SearchNewsInput = z.infer<typeof searchNewsInputSchema>;

// Login input schema
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Pagination input schema
export const paginationInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

// Get news by category input schema
export const getNewsByCategoryInputSchema = z.object({
  category_id: z.number().optional(),
  category_slug: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
}).refine(data => data.category_id || data.category_slug, {
  message: "Either category_id or category_slug must be provided"
});

export type GetNewsByCategoryInput = z.infer<typeof getNewsByCategoryInputSchema>;

// Get news by slug input schema
export const getNewsBySlugInputSchema = z.object({
  slug: z.string()
});

export type GetNewsBySlugInput = z.infer<typeof getNewsBySlugInputSchema>;