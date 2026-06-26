import { integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const watchedFilms = pgTable(
  'watched_films',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: text('user_id').notNull(),
    tmdbId: integer('tmdb_id').notNull(),
    watchedAt: timestamp('watched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.tmdbId)],
);

export const ratings = pgTable(
  'ratings',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: text('user_id').notNull(),
    tmdbId: integer('tmdb_id').notNull(),
    score: integer('score').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.tmdbId)],
);
