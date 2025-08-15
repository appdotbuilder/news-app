import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createNewsInputSchema,
  updateNewsInputSchema,
  createCommentInputSchema,
  updateCommentInputSchema,
  searchNewsInputSchema,
  loginInputSchema,
  paginationInputSchema,
  getNewsByCategoryInputSchema,
  getNewsBySlugInputSchema
} from './schema';

// Import handlers
// User handlers
import { createUser } from './handlers/create_user';
import { getUsers, getUserById } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { deleteUser } from './handlers/delete_user';
import { login } from './handlers/login';

// Category handlers
import { createCategory } from './handlers/create_category';
import { getCategories, getCategoryById, getCategoryBySlug } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';

// News handlers
import { createNews } from './handlers/create_news';
import { getNews, getAllNews, getNewsById, getNewsBySlug, getNewsByCategory, getFeaturedNews } from './handlers/get_news';
import { updateNews } from './handlers/update_news';
import { deleteNews } from './handlers/delete_news';
import { searchNews } from './handlers/search_news';

// Comment handlers
import { createComment } from './handlers/create_comment';
import { getCommentsByNewsId, getAllComments, getPendingComments } from './handlers/get_comments';
import { updateComment, moderateComment } from './handlers/update_comment';
import { deleteComment } from './handlers/delete_comment';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User procedures
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  getUsers: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getUsers(input)),

  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  deleteUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteUser(input.id)),

  // Category procedures
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getCategories: publicProcedure
    .query(() => getCategories()),

  getCategoryById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCategoryById(input.id)),

  getCategoryBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => getCategoryBySlug(input.slug)),

  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),

  deleteCategory: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCategory(input.id)),

  // News procedures
  createNews: publicProcedure
    .input(createNewsInputSchema)
    .mutation(({ input }) => createNews(input)),

  getNews: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getNews(input)),

  getAllNews: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getAllNews(input)),

  getNewsById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getNewsById(input.id)),

  getNewsBySlug: publicProcedure
    .input(getNewsBySlugInputSchema)
    .query(({ input }) => getNewsBySlug(input)),

  getNewsByCategory: publicProcedure
    .input(getNewsByCategoryInputSchema)
    .query(({ input }) => getNewsByCategory(input)),

  getFeaturedNews: publicProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => getFeaturedNews(input?.limit)),

  updateNews: publicProcedure
    .input(updateNewsInputSchema)
    .mutation(({ input }) => updateNews(input)),

  deleteNews: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteNews(input.id)),

  searchNews: publicProcedure
    .input(searchNewsInputSchema)
    .query(({ input }) => searchNews(input)),

  // Comment procedures
  createComment: publicProcedure
    .input(createCommentInputSchema)
    .mutation(({ input }) => createComment(input)),

  getCommentsByNewsId: publicProcedure
    .input(z.object({ 
      newsId: z.number(),
      pagination: paginationInputSchema.optional()
    }))
    .query(({ input }) => getCommentsByNewsId(input.newsId, input.pagination)),

  getAllComments: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getAllComments(input)),

  getPendingComments: publicProcedure
    .input(paginationInputSchema.optional())
    .query(({ input }) => getPendingComments(input)),

  updateComment: publicProcedure
    .input(updateCommentInputSchema)
    .mutation(({ input }) => updateComment(input)),

  moderateComment: publicProcedure
    .input(z.object({ 
      id: z.number(), 
      status: z.enum(['approved', 'rejected']) 
    }))
    .mutation(({ input }) => moderateComment(input.id, input.status)),

  deleteComment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteComment(input.id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();