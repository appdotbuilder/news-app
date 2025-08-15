import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums for PostgreSQL
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const newsStatusEnum = pgEnum('news_status', ['draft', 'published', 'archived']);
export const commentStatusEnum = pgEnum('comment_status', ['pending', 'approved', 'rejected']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name'),
  avatar: text('avatar'),
  role: userRoleEnum('role').notNull().default('user'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// News table
export const newsTable = pgTable('news', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  featured_image: text('featured_image'),
  category_id: integer('category_id').notNull().references(() => categoriesTable.id),
  author_id: integer('author_id').notNull().references(() => usersTable.id),
  status: newsStatusEnum('status').notNull().default('draft'),
  views_count: integer('views_count').notNull().default(0),
  published_at: timestamp('published_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Comments table
export const commentsTable = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  news_id: integer('news_id').notNull().references(() => newsTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  status: commentStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  news: many(newsTable),
  comments: many(commentsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  news: many(newsTable)
}));

export const newsRelations = relations(newsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [newsTable.category_id],
    references: [categoriesTable.id]
  }),
  author: one(usersTable, {
    fields: [newsTable.author_id],
    references: [usersTable.id]
  }),
  comments: many(commentsTable)
}));

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  news: one(newsTable, {
    fields: [commentsTable.news_id],
    references: [newsTable.id]
  }),
  user: one(usersTable, {
    fields: [commentsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type News = typeof newsTable.$inferSelect;
export type NewNews = typeof newsTable.$inferInsert;

export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  news: newsTable,
  comments: commentsTable
};